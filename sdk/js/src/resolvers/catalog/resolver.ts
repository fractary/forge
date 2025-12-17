/**
 * Catalog Resolver for Forge Assets
 * Handles static JSON catalogs for asset discovery
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as https from 'https';
import { logger } from '../../logger';
import { ForgeError, ErrorCode } from '../../errors';
import type { CatalogSource } from '../../types';

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  repository: string;
  version: string;
  tags: string[];
  private?: boolean;
  deprecated?: boolean;
}

export interface Catalog {
  version: string;
  name: string;
  description?: string;
  updated: string;
  bundles: CatalogEntry[];
  starters: CatalogEntry[];
}

export class CatalogResolver {
  private catalogs: CatalogSource[] = [];
  private cache: Map<string, { catalog: Catalog; timestamp: number }> = new Map();
  private cacheDir: string;
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(process.env.HOME || '.', '.forge', 'cache', 'catalogs');
  }

  /**
   * Add a catalog source
   */
  async addCatalog(source: CatalogSource): Promise<void> {
    // Validate URL
    if (
      !source.url.startsWith('http://') &&
      !source.url.startsWith('https://') &&
      !source.url.startsWith('file://')
    ) {
      throw new ForgeError(ErrorCode.INVALID_INPUT, 'Catalog URL must be HTTP, HTTPS, or file://');
    }

    // Check if already exists
    const existing = this.catalogs.findIndex((c) => c.url === source.url);
    if (existing >= 0) {
      this.catalogs[existing] = source;
    } else {
      this.catalogs.push(source);
    }

    // Sort by priority
    this.catalogs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    logger.info(`Added catalog: ${source.name || source.url}`);
  }

  /**
   * Remove a catalog source
   */
  removeCatalog(url: string): void {
    const index = this.catalogs.findIndex((c) => c.url === url);
    if (index >= 0) {
      this.catalogs.splice(index, 1);
      this.cache.delete(url);
      logger.info(`Removed catalog: ${url}`);
    }
  }

  /**
   * List configured catalogs
   */
  listCatalogs(): CatalogSource[] {
    return [...this.catalogs];
  }

  /**
   * Fetch and parse a catalog
   */
  async fetchCatalog(source: CatalogSource, silent: boolean = false): Promise<Catalog> {
    // Check cache
    const cached = this.cache.get(source.url);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug(`Using cached catalog: ${source.url}`);
      return cached.catalog;
    }

    if (!silent) {
      logger.startSpinner(`Loading catalog from ${source.name || source.url}...`);
    }

    let data: string;

    if (source.url.startsWith('file://')) {
      // Local file
      const filePath = source.url.replace('file://', '');
      data = await fs.readFile(filePath, 'utf8');
    } else {
      // Remote URL
      data = await this.downloadCatalog(source);
    }

    // Parse and validate
    if (!silent) {
      logger.updateSpinner(`Parsing catalog from ${source.name || source.url}...`);
    }
    const catalog = this.parseCatalog(data);
    this.validateCatalog(catalog);

    // Cache the result
    if (!silent) {
      logger.updateSpinner(`Caching catalog from ${source.name || source.url}...`);
    }
    this.cache.set(source.url, {
      catalog,
      timestamp: Date.now(),
    });

    // Also save to disk cache
    await this.saveToDiskCache(source, catalog);

    if (!silent) {
      logger.succeedSpinner(
        `Loaded catalog: ${catalog.name} (${catalog.bundles.length} bundles, ${catalog.starters.length} starters)`
      );
    }
    return catalog;
  }

  /**
   * Download catalog from URL
   */
  private async downloadCatalog(source: CatalogSource): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(source.url);

      const options: any = {
        headers: {
          'User-Agent': 'forge-sdk',
          Accept: 'application/json',
        },
      };

      if (source.token) {
        options.headers['Authorization'] = `Bearer ${source.token}`;
      }

      https
        .get(url, options, (response: any) => {
          if (response.statusCode !== 200) {
            reject(
              new ForgeError(
                ErrorCode.NETWORK_ERROR,
                `Failed to fetch catalog: ${response.statusCode} ${response.statusMessage}`
              )
            );
            return;
          }

          let data = '';
          response.on('data', (chunk: any) => (data += chunk));
          response.on('end', () => resolve(data));
          response.on('error', reject);
        })
        .on('error', reject);
    });
  }

  /**
   * Parse catalog JSON
   */
  private parseCatalog(data: string): Catalog {
    try {
      return JSON.parse(data) as Catalog;
    } catch (error) {
      throw new ForgeError(ErrorCode.INVALID_JSON, `Failed to parse catalog: ${error}`);
    }
  }

  /**
   * Validate catalog structure
   */
  private validateCatalog(catalog: Catalog): void {
    if (!catalog.version) {
      throw new ForgeError(ErrorCode.VALIDATION_ERROR, 'Catalog missing version');
    }

    if (!catalog.name) {
      throw new ForgeError(ErrorCode.VALIDATION_ERROR, 'Catalog missing name');
    }

    if (!Array.isArray(catalog.bundles)) {
      throw new ForgeError(ErrorCode.VALIDATION_ERROR, 'Catalog bundles must be an array');
    }

    if (!Array.isArray(catalog.starters)) {
      throw new ForgeError(ErrorCode.VALIDATION_ERROR, 'Catalog starters must be an array');
    }

    // Validate each entry
    for (const bundle of catalog.bundles) {
      this.validateEntry(bundle, 'bundle');
    }

    for (const starter of catalog.starters) {
      this.validateEntry(starter, 'starter');
    }
  }

  /**
   * Validate catalog entry
   */
  private validateEntry(entry: CatalogEntry, type: string): void {
    const required = ['id', 'name', 'description', 'repository', 'version'];

    for (const field of required) {
      if (!(field in entry)) {
        throw new ForgeError(
          ErrorCode.VALIDATION_ERROR,
          `${type} entry missing required field: ${field}`
        );
      }
    }

    if (!Array.isArray(entry.tags)) {
      throw new ForgeError(ErrorCode.VALIDATION_ERROR, `${type} entry tags must be an array`);
    }
  }

  /**
   * Search all catalogs for assets
   */
  async search(query: string, type?: 'bundle' | 'starter'): Promise<CatalogEntry[]> {
    logger.startSpinner(`Searching catalogs for "${query}"...`);
    const results: CatalogEntry[] = [];
    const seen = new Set<string>();

    for (const source of this.catalogs) {
      try {
        logger.updateSpinner(`Searching ${source.name || source.url}...`);
        const catalog = await this.fetchCatalog(source, true);

        // Search bundles
        if (!type || type === 'bundle') {
          for (const bundle of catalog.bundles) {
            if (this.matchesQuery(bundle, query) && !seen.has(bundle.id)) {
              results.push(bundle);
              seen.add(bundle.id);
            }
          }
        }

        // Search starters
        if (!type || type === 'starter') {
          for (const starter of catalog.starters) {
            if (this.matchesQuery(starter, query) && !seen.has(starter.id)) {
              results.push(starter);
              seen.add(starter.id);
            }
          }
        }
      } catch (error) {
        logger.stopSpinner();
        logger.warn(`Failed to search catalog ${source.url}: ${error}`);
      }
    }

    logger.succeedSpinner(`Found ${results.length} matching assets`);
    return results;
  }

  /**
   * Check if entry matches search query
   */
  private matchesQuery(entry: CatalogEntry, query: string): boolean {
    const searchText = query.toLowerCase();

    return (
      entry.id.toLowerCase().includes(searchText) ||
      entry.name.toLowerCase().includes(searchText) ||
      entry.description.toLowerCase().includes(searchText) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(searchText))
    );
  }

  /**
   * Get all assets from all catalogs
   */
  async getAllAssets(): Promise<{ bundles: CatalogEntry[]; starters: CatalogEntry[] }> {
    const bundles: CatalogEntry[] = [];
    const starters: CatalogEntry[] = [];
    const seenBundles = new Set<string>();
    const seenStarters = new Set<string>();

    for (const source of this.catalogs) {
      try {
        const catalog = await this.fetchCatalog(source, true);

        for (const bundle of catalog.bundles) {
          if (!seenBundles.has(bundle.id)) {
            bundles.push(bundle);
            seenBundles.add(bundle.id);
          }
        }

        for (const starter of catalog.starters) {
          if (!seenStarters.has(starter.id)) {
            starters.push(starter);
            seenStarters.add(starter.id);
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch catalog ${source.url}: ${error}`);
      }
    }

    return { bundles, starters };
  }

  /**
   * Find asset by ID
   */
  async findAsset(id: string, type?: 'bundle' | 'starter'): Promise<CatalogEntry | null> {
    logger.startSpinner(`Searching for asset "${id}"...`);
    for (const source of this.catalogs) {
      try {
        logger.updateSpinner(`Checking ${source.name || source.url}...`);
        const catalog = await this.fetchCatalog(source, true);

        if (!type || type === 'bundle') {
          const bundle = catalog.bundles.find((b) => b.id === id);
          if (bundle) {
            logger.succeedSpinner(`Found bundle: ${bundle.name}`);
            return bundle;
          }
        }

        if (!type || type === 'starter') {
          const starter = catalog.starters.find((s) => s.id === id);
          if (starter) {
            logger.succeedSpinner(`Found starter: ${starter.name}`);
            return starter;
          }
        }
      } catch (error) {
        logger.stopSpinner();
        logger.warn(`Failed to fetch catalog ${source.url}: ${error}`);
      }
    }

    logger.failSpinner(`Asset "${id}" not found in any catalog`);
    return null;
  }

  /**
   * Save catalog to disk cache
   */
  private async saveToDiskCache(source: CatalogSource, catalog: Catalog): Promise<void> {
    try {
      await fs.ensureDir(this.cacheDir);

      const filename =
        source.url
          .replace(/[^a-z0-9]/gi, '-')
          .replace(/-+/g, '-')
          .toLowerCase() + '.json';

      const cachePath = path.join(this.cacheDir, filename);
      await fs.writeJson(cachePath, catalog, { spaces: 2 });

      logger.debug(`Saved catalog to disk cache: ${cachePath}`);
    } catch (error) {
      logger.debug(`Failed to save catalog to disk cache: ${error}`);
    }
  }

  /**
   * Load catalogs from disk cache (for offline support)
   */
  async loadFromDiskCache(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.cacheDir))) {
        return;
      }

      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const cachePath = path.join(this.cacheDir, file);
            const catalog = await fs.readJson(cachePath);

            // Add to memory cache
            const url = `file://${cachePath}`;
            this.cache.set(url, {
              catalog,
              timestamp: Date.now(),
            });

            logger.debug(`Loaded catalog from disk cache: ${file}`);
          } catch (error) {
            logger.debug(`Failed to load cached catalog ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to load disk cache: ${error}`);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await fs.remove(this.cacheDir);
    logger.info('Catalog cache cleared');
  }

  /**
   * Refresh all catalogs
   */
  async refresh(): Promise<void> {
    this.cache.clear();

    for (const source of this.catalogs) {
      try {
        await this.fetchCatalog(source);
      } catch (error) {
        logger.warn(`Failed to refresh catalog ${source.url}: ${error}`);
      }
    }

    logger.info('All catalogs refreshed');
  }
}
