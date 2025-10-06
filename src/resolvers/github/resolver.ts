/**
 * GitHub Resolver for Forge Assets
 * Handles fetching bundles and starters directly from GitHub repositories
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';
import { minimatch } from 'minimatch';
import { logger } from '../../logger';
import { ForgeError, ErrorCode } from '../../errors';
import type { BundleManifest, StarterManifest, AssetIdentifier, AssetLocation, AssetPackage } from '../../types';

export interface GitHubResolverOptions {
  token?: string;
  defaultOrg?: string;
  cacheDir?: string;
  apiBaseUrl?: string;
}

export class GitHubResolver {
  private token?: string;
  private defaultOrg: string;
  private cacheDir: string;
  private apiBaseUrl: string;

  constructor(options: GitHubResolverOptions = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.defaultOrg = options.defaultOrg || 'fractary';
    this.cacheDir =
      options.cacheDir || path.join(process.env.HOME || '.', '.forge', 'cache', 'github');
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.github.com';
  }

  /**
   * Parse asset identifier string into components
   */
  parseIdentifier(identifier: string): AssetIdentifier {
    // Pattern: [owner/]repo[@ref]
    const match = identifier.match(/^(?:([^/]+)\/)?([^@]+)(?:@(.+))?$/);

    if (!match) {
      throw new ForgeError(ErrorCode.INVALID_INPUT, `Invalid asset identifier: ${identifier}`);
    }

    const [, owner, repo, ref] = match;

    return {
      owner,
      repo,
      ref,
      type: this.inferAssetType(repo),
    };
  }

  /**
   * Infer asset type from repository name
   */
  private inferAssetType(repo: string): 'bundle' | 'starter' | undefined {
    if (repo.startsWith('forge-bundle-')) {
      return 'bundle';
    } else if (repo.startsWith('forge-starter-')) {
      return 'starter';
    }
    return undefined;
  }

  /**
   * Resolve identifier to full asset location
   */
  async resolve(identifier: string): Promise<AssetLocation> {
    const parsed = this.parseIdentifier(identifier);

    const owner = parsed.owner || this.defaultOrg;
    const ref = parsed.ref || (await this.getDefaultBranch(owner, parsed.repo));

    return {
      protocol: 'github',
      owner,
      repo: parsed.repo,
      ref,
      path: undefined,
    };
  }

  /**
   * Fetch asset package from GitHub
   */
  async fetch(location: AssetLocation): Promise<AssetPackage> {
    logger.startSpinner(
      `Fetching ${location.owner}/${location.repo}@${location.ref} from GitHub...`
    );

    // Check cache first
    const cached = await this.getCached(location);
    if (cached) {
      logger.succeedSpinner(`Using cached version of ${location.owner}/${location.repo}`);
      return cached;
    }

    // Fetch from GitHub
    logger.updateSpinner(`Resolving download URL for ${location.owner}/${location.repo}...`);
    const tarballUrl = await this.getTarballUrl(location);

    logger.updateSpinner(`Downloading ${location.owner}/${location.repo}...`);
    const tarballData = await this.downloadTarball(tarballUrl);

    logger.updateSpinner(`Extracting ${location.owner}/${location.repo}...`);
    const files = await this.extractTarball(tarballData);

    // Find and load manifest
    logger.updateSpinner(`Loading manifest for ${location.owner}/${location.repo}...`);
    const manifestFile = this.findManifestFile(files);
    if (!manifestFile) {
      logger.failSpinner(`No manifest found in ${location.owner}/${location.repo}`);
      throw new ForgeError(
        ErrorCode.MANIFEST_NOT_FOUND,
        `No manifest found in ${location.owner}/${location.repo}`
      );
    }

    const manifest = JSON.parse(files.get(manifestFile)!.toString()) as
      | BundleManifest
      | StarterManifest;

    // Filter files based on manifest patterns
    logger.updateSpinner(`Filtering files for ${location.owner}/${location.repo}...`);
    const filteredFiles = this.filterFiles(files, manifest);

    // Get commit info
    const commitInfo = await this.getCommitInfo(location);

    const packageData: AssetPackage = {
      manifest,
      files: filteredFiles,
      metadata: {
        version: location.ref || 'latest',
        commit: commitInfo.sha,
        timestamp: new Date(commitInfo.date),
        source: `github:${location.owner}/${location.repo}`,
        resolver: 'github',
      },
    };

    // Cache the package
    logger.updateSpinner(`Caching ${location.owner}/${location.repo}...`);
    await this.cachePackage(location, packageData);

    logger.succeedSpinner(`Successfully fetched ${location.owner}/${location.repo}`);
    return packageData;
  }

  /**
   * Get default branch for repository
   */
  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    try {
      const data = await this.apiRequest(`/repos/${owner}/${repo}`);
      return data.default_branch || 'main';
    } catch (error) {
      logger.debug(`Failed to get default branch, using 'main': ${error}`);
      return 'main';
    }
  }

  /**
   * Get tarball URL for repository
   */
  private async getTarballUrl(location: AssetLocation): Promise<string> {
    const { owner, repo, ref } = location;

    // Try to get release tarball first if ref looks like a version
    if (ref && /^v?\d+\.\d+\.\d+/.test(ref)) {
      try {
        const releases = await this.apiRequest(`/repos/${owner}/${repo}/releases`);
        const release = releases.find((r: any) => r.tag_name === ref || r.tag_name === `v${ref}`);
        if (release && release.tarball_url) {
          return release.tarball_url;
        }
      } catch (error) {
        logger.debug(`Failed to get release tarball, falling back to archive: ${error}`);
      }
    }

    // Fall back to archive endpoint
    return `${this.apiBaseUrl}/repos/${owner}/${repo}/tarball/${ref || 'main'}`;
  }

  /**
   * Download tarball from URL with progress tracking
   */
  private async downloadTarball(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let downloadedSize = 0;

      const options: any = {
        headers: {
          'User-Agent': 'forge-sdk',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `token ${this.token}`;
      }

      https
        .get(url, options, (response: any) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              this.downloadTarball(redirectUrl).then(resolve).catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            logger.failSpinner();
            reject(
              new ForgeError(
                ErrorCode.NETWORK_ERROR,
                `Failed to download tarball: ${response.statusCode} ${response.statusMessage}`
              )
            );
            return;
          }

          // Get total size if available
          const contentLength = response.headers['content-length'];
          if (contentLength) {
            totalSize = parseInt(contentLength, 10);
          }

          response.on('data', (chunk: any) => {
            chunks.push(chunk);
            downloadedSize += chunk.length;

            // Update progress if we know the total size
            if (totalSize > 0) {
              const percent = Math.round((downloadedSize / totalSize) * 100);
              logger.updateSpinner(
                `Downloading... ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`
              );
            } else {
              logger.updateSpinner(`Downloading... ${(downloadedSize / 1024 / 1024).toFixed(1)}MB`);
            }
          });

          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        })
        .on('error', reject);
    });
  }

  /**
   * Extract files from tarball
   */
  private async extractTarball(tarballData: Buffer): Promise<Map<string, Buffer>> {
    // This is a simplified version - in production, use a proper tar library
    // For now, we'll use the tar command via child_process
    const tempDir = path.join(this.cacheDir, 'temp', Date.now().toString());
    const tarPath = path.join(tempDir, 'archive.tar.gz');

    await fs.ensureDir(tempDir);
    await fs.writeFile(tarPath, tarballData);

    try {
      // Define helper function at the top of try block
      const files = new Map<string, Buffer>();

      async function readFilesRecursive(dir: string, prefix = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(prefix, entry.name);

          if (entry.isDirectory()) {
            await readFilesRecursive(fullPath, relativePath);
          } else if (entry.isFile()) {
            const content = await fs.readFile(fullPath);
            files.set(relativePath, content);
          }
        }
      }

      execSync(`tar -xzf archive.tar.gz`, { cwd: tempDir });

      // Find extracted directory (GitHub tarballs have a root directory)
      const dirs = await fs.readdir(tempDir);
      const extractedDir = dirs.find((d) => d !== 'archive.tar.gz');

      if (!extractedDir) {
        throw new ForgeError(ErrorCode.EXTRACTION_ERROR, 'Failed to extract tarball');
      }

      // Read all files into map
      const rootPath = path.join(tempDir, extractedDir);

      await readFilesRecursive(rootPath);
      return files;
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
  }

  /**
   * Find manifest file in extracted files
   */
  private findManifestFile(files: Map<string, Buffer>): string | undefined {
    const manifestNames = [
      'bundle.manifest.json',
      'starter.manifest.json',
      'forge.manifest.json',
      'manifest.json',
    ];

    for (const name of manifestNames) {
      if (files.has(name)) {
        return name;
      }
    }

    return undefined;
  }

  /**
   * Get commit information
   */
  private async getCommitInfo(location: AssetLocation): Promise<{ sha: string; date: string }> {
    try {
      const { owner, repo, ref } = location;
      const commits = await this.apiRequest(
        `/repos/${owner}/${repo}/commits?sha=${ref || 'main'}&per_page=1`
      );

      if (commits && commits[0]) {
        return {
          sha: commits[0].sha,
          date: commits[0].commit.author.date,
        };
      }
    } catch (error) {
      logger.debug(`Failed to get commit info: ${error}`);
    }

    return {
      sha: 'unknown',
      date: new Date().toISOString(),
    };
  }

  /**
   * Make GitHub API request
   */
  private async apiRequest(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.apiBaseUrl}${endpoint}`;

      const options: any = {
        headers: {
          'User-Agent': 'forge-sdk',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `token ${this.token}`;
      }

      https
        .get(url, options, (response: any) => {
          let data = '';

          response.on('data', (chunk: any) => (data += chunk));
          response.on('end', () => {
            try {
              if (response.statusCode === 200) {
                resolve(JSON.parse(data));
              } else {
                reject(new Error(`API request failed: ${response.statusCode} ${data}`));
              }
            } catch (error) {
              reject(error);
            }
          });
          response.on('error', reject);
        })
        .on('error', reject);
    });
  }

  /**
   * Get cached package if available
   */
  private async getCached(location: AssetLocation): Promise<AssetPackage | null> {
    const cacheKey = `${location.owner}-${location.repo}-${location.ref || 'latest'}`;
    const cachePath = path.join(this.cacheDir, cacheKey, 'package.json');

    try {
      if (await fs.pathExists(cachePath)) {
        const stats = await fs.stat(cachePath);
        const age = Date.now() - stats.mtimeMs;

        // Cache for 1 hour for branches, 24 hours for tags
        const maxAge =
          location.ref && /^v?\d+\.\d+\.\d+/.test(location.ref)
            ? 24 * 60 * 60 * 1000
            : 60 * 60 * 1000;

        if (age < maxAge) {
          const cached = await fs.readJson(cachePath);

          // Reconstruct files map
          const filesDir = path.join(this.cacheDir, cacheKey, 'files');
          const files = new Map<string, Buffer>();

          // Define helper function
          async function loadFiles(dir: string, prefix = '') {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relativePath = path.join(prefix, entry.name);

              if (entry.isDirectory()) {
                await loadFiles(fullPath, relativePath);
              } else if (entry.isFile()) {
                const content = await fs.readFile(fullPath);
                files.set(relativePath, content);
              }
            }
          }

          if (await fs.pathExists(filesDir)) {
            await loadFiles(filesDir);
          }

          return {
            ...cached,
            files,
          };
        }
      }
    } catch (error) {
      logger.debug(`Cache read failed: ${error}`);
    }

    return null;
  }

  /**
   * Cache package for future use
   */
  private async cachePackage(location: AssetLocation, packageData: AssetPackage): Promise<void> {
    const cacheKey = `${location.owner}-${location.repo}-${location.ref || 'latest'}`;
    const cacheDir = path.join(this.cacheDir, cacheKey);

    try {
      await fs.ensureDir(cacheDir);

      // Save package metadata
      const { files, ...metadata } = packageData;
      await fs.writeJson(path.join(cacheDir, 'package.json'), metadata);

      // Save files
      const filesDir = path.join(cacheDir, 'files');
      await fs.ensureDir(filesDir);

      for (const [filePath, content] of files) {
        const fullPath = path.join(filesDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
      }

      logger.debug(`Cached package: ${cacheKey}`);
    } catch (error) {
      logger.debug(`Cache write failed: ${error}`);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await fs.remove(this.cacheDir);
    logger.info('GitHub cache cleared');
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Set default organization
   */
  setDefaultOrg(org: string): void {
    this.defaultOrg = org;
  }

  /**
   * Get default file exclusion patterns
   */
  private getDefaultExclusions(): string[] {
    return [
      // Git and version control
      '.git/**',
      '.gitignore',
      '.gitattributes',

      // GitHub
      '.github/**',

      // Documentation (bundle-specific)
      'README.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      'LICENSE',
      'LICENSE.md',

      // Development and testing
      'tests/**',
      'test/**',
      '__tests__/**',
      '*.test.ts',
      '*.test.js',
      '*.spec.ts',
      '*.spec.js',

      // Examples and demos
      'examples/**',
      'example/**',
      'demo/**',
      'demos/**',

      // Environment and config (samples are ok, actual files excluded)
      '.env',
      '.env.local',
      '.env.*.local',

      // Build artifacts
      'node_modules/**',
      'dist/**',
      'build/**',

      // IDE and editor
      '.vscode/**',
      '.idea/**',
      '.cursor/**',

      // Temp and cache
      '.temp/**',
      'temp/**',
      '.cache/**',

      // OS files
      '.DS_Store',
      'Thumbs.db',
    ];
  }

  /**
   * Filter files based on manifest inclusion/exclusion patterns
   */
  private filterFiles(
    files: Map<string, Buffer>,
    manifest: BundleManifest | StarterManifest
  ): Map<string, Buffer> {
    const filtered = new Map<string, Buffer>();

    // Always exclude manifest files themselves
    const alwaysExclude = [
      'bundle.manifest.json',
      'starter.manifest.json',
      'forge.manifest.json',
      'manifest.json',
    ];

    // Determine filtering mode
    if (manifest.files && manifest.files.length > 0) {
      // Explicit inclusion mode - only include files matching patterns
      for (const [filePath, content] of files) {
        // Skip always-excluded files
        if (alwaysExclude.includes(filePath)) {
          continue;
        }

        // Check if file matches any inclusion pattern
        const included = manifest.files.some((pattern) =>
          minimatch(filePath, pattern, { dot: true })
        );

        if (included) {
          filtered.set(filePath, content);
        }
      }
    } else {
      // Exclusion mode - include all except excluded patterns
      const exclusions = [
        ...this.getDefaultExclusions(),
        ...(manifest.exclude || []),
      ];

      for (const [filePath, content] of files) {
        // Skip always-excluded files
        if (alwaysExclude.includes(filePath)) {
          continue;
        }

        // Check if file matches any exclusion pattern
        const excluded = exclusions.some((pattern) =>
          minimatch(filePath, pattern, { dot: true })
        );

        if (!excluded) {
          filtered.set(filePath, content);
        }
      }
    }

    logger.debug(
      `Filtered ${files.size} files to ${filtered.size} distributable files`
    );

    return filtered;
  }
}
