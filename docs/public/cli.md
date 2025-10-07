---
title: CLI Integration
description: Using @fractary/forge SDK with Forge CLI
visibility: public
---

# CLI Integration

The Forge CLI (`@fractary/forge-cli`) is built on top of the `@fractary/forge` SDK. This guide shows how CLI commands map to SDK functionality, useful for understanding the SDK or building your own CLI tools.

## CLI to SDK Mapping

### Installation Commands

#### `forge install <identifier>`

Installs a bundle into your project.

**CLI Command:**
```bash
forge install fractary/forge-bundle-auth@v1.0.0
```

**SDK Equivalent:**
```typescript
import { ResolverManager } from '@fractary/forge';
import { fs } from '@fractary/forge';

const manager = new ResolverManager({
  githubToken: process.env.GITHUB_TOKEN
});

// Resolve and fetch the bundle
const asset = await manager.resolveAsset(
  'fractary/forge-bundle-auth@v1.0.0',
  'bundle'
);

// Install files to project
const targetDir = './src/bundles/auth';
await fs.ensureDir(targetDir);

for (const [filePath, content] of asset.files) {
  const fullPath = fs.joinPath(targetDir, filePath);
  await fs.ensureDir(fs.dirname(fullPath));
  await fs.writeFile(fullPath, content.toString());
}

// Update project manifest
const projectConfig = await configManager.loadProjectConfig();
if (projectConfig) {
  projectConfig.bundles = projectConfig.bundles || [];
  projectConfig.bundles.push({
    name: asset.manifest.id,
    version: asset.manifest.version,
    source: asset.metadata.source
  });
  await configManager.saveProjectConfig(projectConfig);
}
```

### Search Commands

#### `forge search <query>`

Searches for assets in catalogs.

**CLI Command:**
```bash
forge search authentication
```

**SDK Equivalent:**
```typescript
const manager = new ResolverManager();

// Search across all catalogs
const results = await manager.searchAssets('authentication');

results.forEach(entry => {
  console.log(`${entry.name}`);
  console.log(`  ${entry.description}`);
  console.log(`  Repository: ${entry.repository}`);
  console.log(`  Version: ${entry.version}`);
  console.log(`  Tags: ${entry.tags.join(', ')}`);
});
```

#### `forge list [--type bundle|starter]`

Lists all available assets.

**CLI Command:**
```bash
forge list --type bundle
```

**SDK Equivalent:**
```typescript
const manager = new ResolverManager();

const bundles = await manager.listAssets('bundle');

console.log(`Found ${bundles.length} bundles:`);
bundles.forEach(bundle => {
  console.log(`- ${bundle.name} (${bundle.version})`);
});
```

### Project Creation

#### `forge create <name> --starter <identifier>`

Creates a new project from a starter.

**CLI Command:**
```bash
forge create my-app --starter fractary/forge-starter-nextjs
```

**SDK Equivalent:**
```typescript
const manager = new ResolverManager();

// Resolve starter
const starter = await manager.resolveAsset(
  'fractary/forge-starter-nextjs',
  'starter'
);

// Create project directory
const projectDir = './my-app';
await fs.ensureDir(projectDir);

// Copy starter files
for (const [filePath, content] of starter.files) {
  const targetPath = fs.joinPath(projectDir, filePath);
  await fs.ensureDir(fs.dirname(targetPath));
  await fs.writeFile(targetPath, content);
}

// Process template variables if configured
if (starter.manifest.configuration?.replacements) {
  // Replace {{projectName}} etc in files
}

// Initialize project config
const projectConfig: ProjectConfig = {
  name: 'my-app',
  version: '0.1.0',
  starter: starter.manifest.id,
  bundles: []
};
await configManager.saveProjectConfig(projectConfig, projectDir);

console.log(`Created project: ${projectDir}`);
```

### Configuration Commands

#### `forge config get <key>`

Gets a configuration value.

**CLI Command:**
```bash
forge config get github.token
```

**SDK Equivalent:**
```typescript
import { configManager } from '@fractary/forge';

const config = await configManager.loadGlobalConfig();

// Access nested config value
const token = config.resolvers?.github?.token;
console.log(token || '(not set)');
```

#### `forge config set <key> <value>`

Sets a configuration value.

**CLI Command:**
```bash
forge config set github.token ghp_abc123
```

**SDK Equivalent:**
```typescript
import { configManager } from '@fractary/forge';

const config = await configManager.loadGlobalConfig();

// Set nested value
config.resolvers = config.resolvers || {};
config.resolvers.github = config.resolvers.github || {};
config.resolvers.github.token = 'ghp_abc123';

await configManager.saveGlobalConfig(config);
console.log('Configuration updated');
```

### Cache Commands

#### `forge cache clear`

Clears all caches.

**CLI Command:**
```bash
forge cache clear
```

**SDK Equivalent:**
```typescript
const manager = new ResolverManager();

await manager.clearCache();
console.log('All caches cleared');
```

#### `forge cache stats`

Shows cache statistics.

**SDK Equivalent:**
```typescript
import { CacheManager } from '@fractary/forge';

const cache = new CacheManager();
const stats = await cache.getStats();

console.log(`Cache Statistics:`);
console.log(`  Entries: ${stats.entries}`);
console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Oldest: ${stats.oldestEntry ? new Date(stats.oldestEntry).toISOString() : 'N/A'}`);
console.log(`  Newest: ${stats.newestEntry ? new Date(stats.newestEntry).toISOString() : 'N/A'}`);
```

### Status Commands

#### `forge status`

Shows project status and installed bundles.

**SDK Equivalent:**
```typescript
import { configManager } from '@fractary/forge';

const projectConfig = await configManager.loadProjectConfig();

if (!projectConfig) {
  console.log('Not in a Forge project');
  process.exit(1);
}

console.log(`Project: ${projectConfig.name} v${projectConfig.version}`);

if (projectConfig.starter) {
  console.log(`Starter: ${projectConfig.starter}`);
}

if (projectConfig.bundles && projectConfig.bundles.length > 0) {
  console.log(`\nInstalled Bundles:`);
  projectConfig.bundles.forEach(bundle => {
    console.log(`  - ${bundle.name}@${bundle.version}`);
  });
} else {
  console.log('\nNo bundles installed');
}
```

### Validation Commands

#### `forge validate`

Validates project manifests.

**SDK Equivalent:**
```typescript
import { configManager, fs } from '@fractary/forge';

// Validate project config
const projectConfig = await configManager.loadProjectConfig();
if (!projectConfig) {
  throw new Error('No project configuration found');
}

// Validate each bundle manifest
for (const bundle of projectConfig.bundles || []) {
  const manifestPath = `./src/bundles/${bundle.name}/bundle.manifest.json`;

  if (await fs.exists(manifestPath)) {
    const manifest = await fs.readJson(manifestPath);

    // Check required fields
    if (!manifest.id || !manifest.version || !manifest.name) {
      console.error(`Invalid manifest: ${manifestPath}`);
    } else {
      console.log(`✓ ${manifest.name} is valid`);
    }
  } else {
    console.warn(`⚠ Manifest not found: ${manifestPath}`);
  }
}
```

## Building Your Own CLI

You can use the SDK to build custom CLI tools:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { ResolverManager } from '@fractary/forge';

const program = new Command();

program
  .name('my-forge-cli')
  .description('Custom Forge CLI')
  .version('1.0.0');

program
  .command('install <identifier>')
  .description('Install an asset')
  .action(async (identifier) => {
    const manager = new ResolverManager({
      githubToken: process.env.GITHUB_TOKEN
    });

    const asset = await manager.resolveAsset(identifier);
    console.log(`Installing ${asset.manifest.name}...`);

    // Your installation logic here
  });

program.parse();
```

## Error Handling in CLI

Proper error handling for CLI applications:

```typescript
import { ForgeError, ErrorCode, getUserFriendlyMessage } from '@fractary/forge';

try {
  await manager.resolveAsset(identifier);
} catch (error) {
  if (error instanceof ForgeError) {
    // Show user-friendly message
    console.error(`Error: ${getUserFriendlyMessage(error.code)}`);

    // Provide helpful suggestions
    switch (error.code) {
      case ErrorCode.AUTHENTICATION_FAILED:
        console.log('\nTip: Set your GitHub token:');
        console.log('  export GITHUB_TOKEN=your_token_here');
        console.log('  Or: forge config set github.token your_token_here');
        break;

      case ErrorCode.ASSET_NOT_FOUND:
        console.log('\nTip: Search for available assets:');
        console.log('  forge search <query>');
        console.log('  forge list');
        break;
    }

    process.exit(1);
  } else {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}
```

## Environment Variables

The SDK respects these environment variables (same as CLI):

```bash
# GitHub authentication
export GITHUB_TOKEN=ghp_...

# Default organization
export FORGE_DEFAULT_ORG=my-org

# Log level
export FORGE_LOG_LEVEL=debug  # debug | info | warn | error | silent

# Cache directory
export FORGE_CACHE_DIR=/custom/cache/path

# Feature flags
export FORGE_TELEMETRY=false
export FORGE_UPDATE_CHECK=true
```

## Configuration Files

Both CLI and SDK use the same configuration files:

**Global Config:** `~/.forge/config.json`
```json
{
  "resolvers": {
    "default": "github",
    "github": {
      "token": "ghp_...",
      "defaultOrg": "fractary"
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600000,
    "dir": "~/.forge/cache"
  }
}
```

**Project Config:** `.forge/project.json`
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "starter": "forge-starter-nextjs",
  "bundles": [
    {
      "name": "forge-bundle-auth",
      "version": "1.0.0",
      "source": "github:fractary/forge-bundle-auth"
    }
  ]
}
```

## Next Steps

- [API Reference](./api.md) - Complete SDK API
- [Examples](./examples.md) - More code examples
- [Forge CLI Repository](https://github.com/fractary/forge-cli)
