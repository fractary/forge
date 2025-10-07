---
title: Code Examples
description: Common patterns and recipes for using @fractary/forge SDK
visibility: public
---

# Code Examples

Common patterns and recipes for using the `@fractary/forge` SDK.

## Basic Asset Resolution

### Fetch from GitHub

```typescript
import { ResolverManager } from '@fractary/forge';

const manager = new ResolverManager({
  githubToken: process.env.GITHUB_TOKEN,
  defaultOrg: 'fractary'
});

// Fetch a specific version
const asset = await manager.resolveAsset('fractary/forge-bundle-auth@v1.0.0');

console.log(`Name: ${asset.manifest.name}`);
console.log(`Version: ${asset.metadata.version}`);
console.log(`Files: ${asset.files.size}`);
console.log(`Source: ${asset.metadata.source}`);
```

### Fetch Latest Version

```typescript
// Omit @version to get default branch
const asset = await manager.resolveAsset('fractary/forge-bundle-auth');
```

### Fetch from Catalog

```typescript
// Add a catalog
await manager.addCatalog('https://catalog.fractary.com/assets.json');

// Resolve by catalog ID
const asset = await manager.resolveAsset('auth-bundle');
```

## Working with Asset Files

### Extract All Files

```typescript
import { fs } from '@fractary/forge';

const asset = await manager.resolveAsset('fractary/forge-bundle-auth@v1.0.0');

const targetDir = './src/bundles/auth';
await fs.ensureDir(targetDir);

for (const [filePath, content] of asset.files) {
  const fullPath = fs.joinPath(targetDir, filePath);
  await fs.ensureDir(fs.dirname(fullPath));
  await fs.writeFile(fullPath, content);
}

console.log(`Extracted ${asset.files.size} files to ${targetDir}`);
```

### Filter Specific Files

```typescript
// Only extract TypeScript files
for (const [filePath, content] of asset.files) {
  if (filePath.endsWith('.ts')) {
    const fullPath = fs.joinPath(targetDir, filePath);
    await fs.writeFile(fullPath, content);
  }
}
```

### Process Files Before Writing

```typescript
// Replace template variables
const replacements = {
  '{{projectName}}': 'my-app',
  '{{author}}': 'John Doe'
};

for (const [filePath, content] of asset.files) {
  let fileContent = content.toString();

  // Replace variables
  for (const [key, value] of Object.entries(replacements)) {
    fileContent = fileContent.replace(new RegExp(key, 'g'), value);
  }

  const fullPath = fs.joinPath(targetDir, filePath);
  await fs.writeFile(fullPath, fileContent);
}
```

## Search and Discovery

### Search All Catalogs

```typescript
const results = await manager.searchAssets('authentication');

console.log(`Found ${results.length} assets:`);
results.forEach(entry => {
  console.log(`\n${entry.name}`);
  console.log(`  Description: ${entry.description}`);
  console.log(`  Repository: ${entry.repository}`);
  console.log(`  Tags: ${entry.tags.join(', ')}`);
});
```

### Filter by Type

```typescript
// Search only for bundles
const bundles = await manager.searchAssets('authentication', 'bundle');

// Search only for starters
const starters = await manager.searchAssets('nextjs', 'starter');
```

### List All Available Assets

```typescript
const allBundles = await manager.listAssets('bundle');
const allStarters = await manager.listAssets('starter');

console.log(`Available bundles: ${allBundles.length}`);
console.log(`Available starters: ${allStarters.length}`);
```

## Custom Resolvers

### Implement a Custom Resolver

```typescript
import { type IResolver, type AssetPackage } from '@fractary/forge';

class NpmResolver implements IResolver {
  name = 'npm';

  canResolve(identifier: string): boolean {
    return identifier.startsWith('npm:');
  }

  async resolve(identifier: string): Promise<AssetPackage> {
    const packageName = identifier.replace('npm:', '');

    // Fetch from npm registry
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    const data = await response.json();

    // Download tarball
    const tarballUrl = data.versions[data['dist-tags'].latest].dist.tarball;
    const tarball = await fetch(tarballUrl);
    const buffer = await tarball.arrayBuffer();

    // Extract and process...
    // (implementation details omitted)

    return {
      manifest: {
        id: packageName,
        name: data.name,
        version: data['dist-tags'].latest,
        description: data.description
      },
      files: new Map(),  // Processed files
      metadata: {
        version: data['dist-tags'].latest,
        commit: 'npm',
        timestamp: new Date(),
        source: `npm:${packageName}`,
        resolver: 'npm'
      }
    };
  }
}

// Register the resolver
const manager = new ResolverManager();
manager.registerResolver(new NpmResolver());

// Use it
const asset = await manager.resolveAsset('npm:lodash');
```

### Database Resolver Example

```typescript
class DatabaseResolver implements IResolver {
  name = 'database';

  constructor(private db: Database) {}

  canResolve(identifier: string): boolean {
    return identifier.startsWith('db:');
  }

  async resolve(identifier: string): Promise<AssetPackage> {
    const assetId = identifier.replace('db:', '');

    // Query database
    const asset = await this.db.query(
      'SELECT * FROM assets WHERE id = ?',
      [assetId]
    );

    if (!asset) {
      throw new ForgeError(
        ErrorCode.ASSET_NOT_FOUND,
        `Asset not found: ${assetId}`
      );
    }

    // Load files from blob storage
    const files = new Map<string, Buffer>();
    for (const file of asset.files) {
      const content = await this.loadFileFromStorage(file.path);
      files.set(file.path, content);
    }

    return {
      manifest: JSON.parse(asset.manifest),
      files,
      metadata: {
        version: asset.version,
        timestamp: new Date(asset.updated_at),
        source: `db:${assetId}`,
        resolver: 'database'
      }
    };
  }

  private async loadFileFromStorage(path: string): Promise<Buffer> {
    // Load from S3, Azure Blob, etc.
  }
}
```

## Configuration Management

### Load and Modify Global Config

```typescript
import { configManager } from '@fractary/forge';

// Load config
const config = await configManager.loadGlobalConfig();

// Modify settings
config.resolvers = config.resolvers || {};
config.resolvers.github = {
  token: process.env.GITHUB_TOKEN,
  defaultOrg: 'my-company',
  enterprise: 'https://github.company.com/api/v3'
};

config.cache = {
  enabled: true,
  ttl: 7200000,  // 2 hours
  dir: '/custom/cache/path'
};

// Save config
await configManager.saveGlobalConfig(config);
```

### Environment-Based Configuration

```typescript
import { getDefaultGlobalConfig } from '@fractary/forge';

// Start with defaults
const config = getDefaultGlobalConfig();

// Override from environment
if (process.env.CI) {
  config.cache!.enabled = false;  // Disable cache in CI
  config.features!.telemetry = false;
}

if (process.env.FORGE_GITHUB_TOKEN) {
  config.resolvers.github = {
    token: process.env.FORGE_GITHUB_TOKEN,
    defaultOrg: process.env.FORGE_DEFAULT_ORG || 'fractary'
  };
}

const manager = new ResolverManager();
// Use custom config...
```

### Project-Specific Configuration

```typescript
// Load project config
const projectConfig = await configManager.loadProjectConfig();

if (projectConfig) {
  console.log(`Project: ${projectConfig.name}`);
  console.log(`Bundles installed: ${projectConfig.bundles?.length || 0}`);

  // Add a bundle
  projectConfig.bundles = projectConfig.bundles || [];
  projectConfig.bundles.push({
    name: 'forge-bundle-auth',
    version: '1.0.0',
    source: 'github:fractary/forge-bundle-auth'
  });

  await configManager.saveProjectConfig(projectConfig);
}
```

## Caching

### Custom Cache TTL

```typescript
import { CacheManager } from '@fractary/forge';

const cache = new CacheManager({
  enabled: true,
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
  dir: './my-cache'
});

// Use cache
await cache.set('my-key', { data: 'value' });
const value = await cache.get('my-key');
```

### Conditional Caching

```typescript
const cache = new CacheManager();

// Disable cache in development
if (process.env.NODE_ENV === 'development') {
  cache.disable();
}

// Clear cache on demand
if (forceRefresh) {
  await cache.clear();
}
```

### Cache Statistics

```typescript
const stats = await cache.getStats();

console.log(`Cache Statistics:`);
console.log(`  Total entries: ${stats.entries}`);
console.log(`  Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

if (stats.oldestEntry) {
  const age = Date.now() - stats.oldestEntry;
  console.log(`  Oldest entry: ${Math.floor(age / 60000)} minutes ago`);
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import {
  ForgeError,
  ErrorCode,
  isForgeError,
  getUserFriendlyMessage
} from '@fractary/forge';

async function fetchAsset(identifier: string) {
  try {
    const asset = await manager.resolveAsset(identifier);
    return asset;

  } catch (error) {
    if (isForgeError(error)) {
      // Handle known Forge errors
      console.error(`Error [${error.code}]: ${getUserFriendlyMessage(error.code)}`);

      switch (error.code) {
        case ErrorCode.AUTHENTICATION_FAILED:
          console.log('Please set GITHUB_TOKEN environment variable');
          break;

        case ErrorCode.ASSET_NOT_FOUND:
          console.log(`Try searching: forge search ${identifier}`);
          break;

        case ErrorCode.NETWORK_ERROR:
          console.log('Check your internet connection and try again');
          break;

        case ErrorCode.MANIFEST_NOT_FOUND:
          console.log('The asset is missing a manifest file');
          break;

        default:
          console.log('An unexpected error occurred');
      }

      // Log details in debug mode
      if (process.env.DEBUG) {
        console.error('Details:', error.details);
        console.error('Stack:', error.stack);
      }

    } else {
      // Handle unexpected errors
      console.error('Unexpected error:', error);
    }

    throw error;
  }
}
```

### Retry Logic

```typescript
async function fetchWithRetry(
  identifier: string,
  maxRetries: number = 3
): Promise<AssetPackage> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await manager.resolveAsset(identifier);
    } catch (error) {
      lastError = error as Error;

      if (isForgeError(error) && error.code === ErrorCode.NETWORK_ERROR) {
        console.log(`Attempt ${attempt}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }

  throw lastError!;
}
```

## Logging

### Custom Log Levels

```typescript
import { logger } from '@fractary/forge';

// Set log level
logger.setLevel('debug');  // debug | info | warn | error | silent

// Log messages
logger.debug('Detailed debug information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred');
logger.success('Operation successful!');
```

### Progress Indicators

```typescript
import { logger } from '@fractary/forge';

async function downloadAsset(identifier: string) {
  logger.startSpinner(`Fetching ${identifier}...`);

  try {
    logger.updateSpinner('Resolving asset...');
    const location = await manager.getGitHubResolver().resolve(identifier);

    logger.updateSpinner('Downloading files...');
    const asset = await manager.getGitHubResolver().fetch(location);

    logger.updateSpinner('Processing files...');
    // ... process files

    logger.succeedSpinner(`Successfully fetched ${asset.manifest.name}`);
    return asset;

  } catch (error) {
    logger.failSpinner('Failed to fetch asset');
    throw error;
  }
}
```

### Custom Logger

```typescript
import { Logger } from '@fractary/forge';

const customLogger = new Logger('info');

// Use in your application
customLogger.info('Starting application...');

// Disable logging for tests
if (process.env.NODE_ENV === 'test') {
  customLogger.setLevel('silent');
}
```

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import { ResolverManager } from '@fractary/forge';

const app = express();
const manager = new ResolverManager();

app.get('/api/assets/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    const results = await manager.searchAssets(q as string, type as any);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/assets/:identifier', async (req, res) => {
  try {
    const asset = await manager.resolveAsset(req.params.identifier);
    res.json({
      name: asset.manifest.name,
      version: asset.metadata.version,
      files: Array.from(asset.files.keys())
    });
  } catch (error) {
    res.status(404).json({ error: 'Asset not found' });
  }
});

app.listen(3000);
```

### GitHub Actions Workflow

```yaml
name: Fetch Assets
on: [push]

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install @fractary/forge

      - name: Fetch assets
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node -e "
          const { ResolverManager } = require('@fractary/forge');
          (async () => {
            const manager = new ResolverManager();
            const asset = await manager.resolveAsset('fractary/forge-bundle-auth');
            console.log('Fetched:', asset.manifest.name);
          })();
          "
```

## Next Steps

- [API Reference](./api.md) - Complete API documentation
- [Resolvers Guide](./resolvers.md) - Custom resolver development
- [CLI Integration](./cli.md) - Using with Forge CLI
