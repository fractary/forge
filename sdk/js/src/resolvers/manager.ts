/**
 * Resolver Manager for Forge SDK
 * Unified interface for managing multiple resolvers
 */

import { logger } from '../logger';
import { ForgeError, ErrorCode } from '../errors';
import type { AssetPackage } from '../types';
import { GitHubResolver } from './github';
import { CatalogResolver, type CatalogEntry } from './catalog';
import { LocalResolver } from './local';

export interface ResolverOptions {
  githubToken?: string;
  defaultOrg?: string;
  catalogs?: string[];
  useLocal?: boolean;
}

/**
 * Base resolver interface
 */
export interface IResolver {
  name: string;
  canResolve(identifier: string): boolean;
  resolve(identifier: string): Promise<AssetPackage>;
}

/**
 * ResolverManager - Main entry point for asset resolution
 */
export class ResolverManager {
  private github: GitHubResolver;
  private catalog: CatalogResolver;
  private local: LocalResolver;
  private customResolvers: IResolver[] = [];
  private useLocal: boolean;

  constructor(options: ResolverOptions = {}) {
    this.github = new GitHubResolver({
      token: options.githubToken,
      defaultOrg: options.defaultOrg || 'fractary',
    });

    this.catalog = new CatalogResolver();
    this.local = new LocalResolver();
    this.useLocal = options.useLocal !== false; // Default to true

    // Initialize catalogs if provided
    if (options.catalogs) {
      this.initializeCatalogs(options.catalogs);
    }
  }

  /**
   * Initialize catalogs from URLs
   */
  private async initializeCatalogs(catalogUrls: string[]): Promise<void> {
    for (const url of catalogUrls) {
      try {
        await this.catalog.addCatalog({ url });
      } catch (error) {
        logger.warn(`Failed to add catalog ${url}: ${error}`);
      }
    }
  }

  /**
   * Register a custom resolver
   */
  registerResolver(resolver: IResolver): void {
    this.customResolvers.push(resolver);
    logger.debug(`Registered custom resolver: ${resolver.name}`);
  }

  /**
   * Resolve and fetch an asset by identifier
   */
  async resolveAsset(identifier: string, type?: 'bundle' | 'starter'): Promise<AssetPackage> {
    logger.info(`Resolving asset: ${identifier}`);

    // Try custom resolvers first
    for (const resolver of this.customResolvers) {
      if (resolver.canResolve(identifier)) {
        logger.debug(`Using custom resolver: ${resolver.name}`);
        try {
          return await resolver.resolve(identifier);
        } catch (error) {
          logger.debug(`Custom resolver ${resolver.name} failed: ${error}`);
        }
      }
    }

    // Try different resolution strategies
    const strategies = [
      () => this.resolveFromCatalog(identifier, type),
      () => this.resolveFromGitHub(identifier),
      () => this.resolveFromLocal(identifier, type),
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error as Error;
        logger.debug(`Resolution strategy failed: ${error}`);
      }
    }

    throw new ForgeError(
      ErrorCode.ASSET_NOT_FOUND,
      `Failed to resolve asset "${identifier}": ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Resolve from catalog
   */
  private async resolveFromCatalog(
    identifier: string,
    type?: 'bundle' | 'starter'
  ): Promise<AssetPackage> {
    logger.debug(`Attempting catalog resolution: ${identifier}`);

    const entry = await this.catalog.findAsset(identifier, type);
    if (!entry) {
      throw new ForgeError(ErrorCode.ASSET_NOT_FOUND, `Asset not found in catalogs: ${identifier}`);
    }

    // Use GitHub resolver to fetch the actual asset
    const location = await this.github.resolve(entry.repository);
    return this.github.fetch(location);
  }

  /**
   * Resolve directly from GitHub
   */
  private async resolveFromGitHub(identifier: string): Promise<AssetPackage> {
    logger.debug(`Attempting GitHub resolution: ${identifier}`);

    // Check if identifier looks like a GitHub reference
    if (!identifier.includes('/') && !identifier.startsWith('forge-')) {
      throw new ForgeError(ErrorCode.INVALID_INPUT, 'Not a valid GitHub identifier');
    }

    const location = await this.github.resolve(identifier);
    return this.github.fetch(location);
  }

  /**
   * Resolve from local/embedded assets
   */
  private async resolveFromLocal(
    identifier: string,
    type?: 'bundle' | 'starter'
  ): Promise<AssetPackage> {
    if (!this.useLocal) {
      throw new ForgeError(ErrorCode.ASSET_NOT_FOUND, 'Local assets are disabled');
    }

    return this.local.resolve(identifier, type);
  }

  /**
   * List all available assets from catalogs
   */
  async listAssets(type?: 'bundle' | 'starter'): Promise<CatalogEntry[]> {
    const results: CatalogEntry[] = [];

    // Get from catalogs
    const { bundles, starters } = await this.catalog.getAllAssets();

    if (!type || type === 'bundle') {
      results.push(...bundles);
    }

    if (!type || type === 'starter') {
      results.push(...starters);
    }

    return results;
  }

  /**
   * Search for assets across all catalogs
   */
  async searchAssets(query: string, type?: 'bundle' | 'starter'): Promise<CatalogEntry[]> {
    return this.catalog.search(query, type);
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.github.clearCache();
    await this.catalog.clearCache();
    logger.info('All caches cleared');
  }

  /**
   * Get the GitHub resolver instance
   */
  getGitHubResolver(): GitHubResolver {
    return this.github;
  }

  /**
   * Get the catalog resolver instance
   */
  getCatalogResolver(): CatalogResolver {
    return this.catalog;
  }

  /**
   * Get the local resolver instance
   */
  getLocalResolver(): LocalResolver {
    return this.local;
  }

  /**
   * Add a catalog source
   */
  async addCatalog(url: string, name?: string, priority?: number): Promise<void> {
    await this.catalog.addCatalog({ url, name, priority });
  }

  /**
   * Remove a catalog source
   */
  removeCatalog(url: string): void {
    this.catalog.removeCatalog(url);
  }

  /**
   * List configured catalogs
   */
  listCatalogs() {
    return this.catalog.listCatalogs();
  }
}

// Export default instance creator
export function createResolverManager(options?: ResolverOptions): ResolverManager {
  return new ResolverManager(options);
}
