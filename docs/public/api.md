---
title: API Reference
description: Complete API reference for @fractary/forge SDK
visibility: public
---

# API Reference

Complete API documentation for the `@fractary/forge` SDK.

## ResolverManager

The main entry point for asset resolution.

### Constructor

```typescript
new ResolverManager(options?: ResolverOptions)
```

**Options:**
- `githubToken?: string` - GitHub authentication token
- `defaultOrg?: string` - Default GitHub organization (default: 'fractary')
- `catalogs?: string[]` - Catalog URLs to register
- `useLocal?: boolean` - Enable local/embedded assets (default: true)

**Example:**
```typescript
import { ResolverManager } from '@fractary/forge';

const manager = new ResolverManager({
  githubToken: process.env.GITHUB_TOKEN,
  defaultOrg: 'my-org',
  catalogs: ['https://catalog.example.com/assets.json'],
  useLocal: true
});
```

### Methods

#### `resolveAsset(identifier, type?)`

Resolve and fetch an asset by identifier.

```typescript
async resolveAsset(
  identifier: string,
  type?: 'bundle' | 'starter'
): Promise<AssetPackage>
```

**Parameters:**
- `identifier` - Asset identifier (e.g., 'owner/repo@ref')
- `type` - Optional asset type hint

**Returns:** `Promise<AssetPackage>` with:
- `manifest: BundleManifest | StarterManifest` - Asset manifest
- `files: Map<string, Buffer>` - Asset files
- `metadata` - Version, commit, timestamp, source info

**Example:**
```typescript
const asset = await manager.resolveAsset('fractary/forge-bundle-auth@v1.0.0');
console.log(asset.manifest.name);
console.log(asset.metadata.version);
```

#### `searchAssets(query, type?)`

Search for assets across all catalogs.

```typescript
async searchAssets(
  query: string,
  type?: 'bundle' | 'starter'
): Promise<CatalogEntry[]>
```

**Example:**
```typescript
const results = await manager.searchAssets('authentication', 'bundle');
results.forEach(entry => {
  console.log(`${entry.name}: ${entry.description}`);
});
```

#### `listAssets(type?)`

List all available assets from catalogs.

```typescript
async listAssets(type?: 'bundle' | 'starter'): Promise<CatalogEntry[]>
```

#### `registerResolver(resolver)`

Register a custom resolver.

```typescript
registerResolver(resolver: IResolver): void
```

**Example:**
```typescript
import { type IResolver } from '@fractary/forge';

class CustomResolver implements IResolver {
  name = 'custom';
  canResolve(id: string) { return id.startsWith('custom:'); }
  async resolve(id: string) { /* implementation */ }
}

manager.registerResolver(new CustomResolver());
```

#### `clearCache()`

Clear all resolver caches.

```typescript
async clearCache(): Promise<void>
```

## GitHubResolver

Resolver for GitHub repositories.

### Constructor

```typescript
new GitHubResolver(options?: GitHubResolverOptions)
```

**Options:**
- `token?: string` - GitHub API token
- `defaultOrg?: string` - Default organization
- `cacheDir?: string` - Cache directory path
- `apiBaseUrl?: string` - GitHub API base URL (for Enterprise)

### Methods

#### `resolve(identifier)`

Parse and resolve a GitHub identifier.

```typescript
async resolve(identifier: string): Promise<AssetLocation>
```

#### `fetch(location)`

Fetch asset from GitHub.

```typescript
async fetch(location: AssetLocation): Promise<AssetPackage>
```

**CLI Usage:**
```bash
# Uses GitHubResolver internally
forge install fractary/forge-bundle-auth@v1.0.0
```

## CatalogResolver

Resolver for JSON asset catalogs.

### Methods

#### `addCatalog(source)`

Add a catalog source.

```typescript
async addCatalog(source: CatalogSource): Promise<void>
```

**Source:**
- `url: string` - Catalog URL (HTTP, HTTPS, or file://)
- `name?: string` - Display name
- `token?: string` - Authorization token
- `priority?: number` - Priority (higher = checked first)

**Example:**
```typescript
const catalog = manager.getCatalogResolver();
await catalog.addCatalog({
  url: 'https://catalog.example.com/assets.json',
  name: 'Company Catalog',
  priority: 10
});
```

#### `search(query, type?)`

Search catalog entries.

```typescript
async search(
  query: string,
  type?: 'bundle' | 'starter'
): Promise<CatalogEntry[]>
```

**CLI Usage:**
```bash
# Uses CatalogResolver internally
forge search authentication
forge list --type bundle
```

## ConfigManager

Manages global and project configurations.

### Methods

#### `loadGlobalConfig()`

Load global configuration.

```typescript
async loadGlobalConfig(): Promise<ForgeConfig>
```

**Config Location:** `~/.forge/config.json`

#### `saveGlobalConfig(config)`

Save global configuration.

```typescript
async saveGlobalConfig(config: ForgeConfig): Promise<void>
```

#### `loadProjectConfig(projectDir?)`

Load project configuration.

```typescript
async loadProjectConfig(projectDir?: string): Promise<ProjectConfig | null>
```

**Config Location:** `.forge/project.json`

**CLI Usage:**
```bash
# View/edit configs
forge config get github.token
forge config set github.token ghp_...
```

## CacheManager

Manages caching with TTL support.

### Constructor

```typescript
new CacheManager(options?: CacheOptions)
```

**Options:**
- `enabled?: boolean` - Enable caching (default: true)
- `ttl?: number` - Time-to-live in milliseconds (default: 3600000)
- `dir?: string` - Cache directory

### Methods

#### `get<T>(key)`

Get cached value.

```typescript
async get<T>(key: string): Promise<T | null>
```

#### `set<T>(key, data)`

Set cached value.

```typescript
async set<T>(key: string, data: T): Promise<void>
```

#### `clear()`

Clear all cache.

```typescript
async clear(): Promise<void>
```

**CLI Usage:**
```bash
# Clear all caches
forge cache clear
```

## Error Handling

### ForgeError

Custom error class with error codes.

```typescript
class ForgeError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  )
}
```

### ErrorCode Enum

```typescript
enum ErrorCode {
  // General
  UNKNOWN = 'UNKNOWN',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',

  // File system
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  // Assets
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  MANIFEST_NOT_FOUND = 'MANIFEST_NOT_FOUND',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_JSON = 'INVALID_JSON',

  // ... more codes
}
```

**Example:**
```typescript
import { ForgeError, ErrorCode, isForgeError } from '@fractary/forge';

try {
  await manager.resolveAsset('invalid/asset');
} catch (error) {
  if (isForgeError(error)) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.code === ErrorCode.AUTHENTICATION_FAILED) {
      console.log('Please check your GitHub token');
    }
  }
}
```

## Logger

Configurable logger with spinner support.

### Methods

```typescript
logger.debug(message: string): void
logger.info(message: string): void
logger.warn(message: string): void
logger.error(message: string | Error): void
logger.success(message: string): void

// Spinner methods
logger.startSpinner(text: string): void
logger.updateSpinner(text: string): void
logger.succeedSpinner(text?: string): void
logger.failSpinner(text?: string): void
```

**Example:**
```typescript
import { logger } from '@fractary/forge';

logger.info('Starting asset fetch...');
logger.startSpinner('Downloading...');
// ... operation
logger.succeedSpinner('Download complete!');
```

**Configuration:**
```typescript
import { Logger } from '@fractary/forge';

const customLogger = new Logger('debug'); // Set log level
customLogger.setLevel('silent'); // Disable all logs
```

**Environment Variable:**
```bash
export FORGE_LOG_LEVEL=debug  # debug | info | warn | error | silent
```

## File System Utilities

Async file system operations.

```typescript
import { fs } from '@fractary/forge';

// Check existence
await fs.exists(path)
await fs.isDirectory(path)
await fs.isFile(path)

// Read/Write
await fs.readFile(path)
await fs.writeFile(path, content)
await fs.readJson<T>(path)
await fs.writeJson(path, data)

// Copy
await fs.copyFile(src, dest, { overwrite: true })
await fs.copyDir(src, dest)

// Search
await fs.findFiles('**/*.ts', { cwd: '.', ignore: ['node_modules'] })

// Path utilities
fs.resolvePath(...paths)
fs.joinPath(...paths)
fs.dirname(path)
fs.basename(path)
```

## Types

### AssetPackage

```typescript
interface AssetPackage {
  manifest: BundleManifest | StarterManifest;
  files: Map<string, Buffer>;
  metadata: {
    version: string;
    commit?: string;
    timestamp: Date;
    source: string;
    resolver: string;
  };
}
```

### BundleManifest

```typescript
interface BundleManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  author?: { name?: string; email?: string; url?: string };
  license?: string;
  ownership?: Record<string, OwnershipRule>;
  dependencies?: {
    bundles?: string[];
    npm?: Record<string, string>;
  };
  files?: string[];  // Inclusion patterns
  exclude?: string[]; // Exclusion patterns
  // ... more fields
}
```

### ForgeConfig

```typescript
interface ForgeConfig {
  resolvers: {
    default?: 'github' | 'gitlab' | 'catalog' | string;
    github?: GitHubResolverConfig;
    catalog?: CatalogResolverConfig;
  };
  cache?: CacheConfig;
  defaults?: {
    organization?: string;
    starter?: string;
    bundle?: string;
  };
  features?: {
    telemetry?: boolean;
    updateCheck?: boolean;
  };
  paths?: {
    cache?: string;
    templates?: string;
  };
}
```

## Next Steps

- [Resolvers Guide](./resolvers.md) - Detailed resolver documentation
- [Configuration](./configuration.md) - Configuration options
- [Examples](./examples.md) - Code examples
