# Forge Registry Module

This module provides the core SDK for Fractary's plugin installation and registry management system. It is designed to be consumed by the `fractary/cli` project to implement the `fractary forge` command suite.

## Architecture

The registry module implements a **three-tier resolution system**:

1. **Local Project** (`.fractary/`) - Project-specific plugins and components
2. **Global User** (`~/.fractary/registry/`) - User-wide installations
3. **Remote Registries** - Manifest-based or Stockyard API registries

## Usage (for fractary/cli)

### Installing a Plugin

```typescript
import { Registry } from '@fractary/forge';

// Install plugin to global location
const result = await Registry.installer.installPlugin(
  '@fractary/faber-plugin',
  {
    scope: 'global',
    dryRun: false,
  }
);

if (result.success) {
  console.log(`Installed ${result.name} to ${result.path}`);
  console.log(`Components: ${JSON.stringify(result.installed)}`);
} else {
  console.error(`Installation failed: ${result.error}`);
}
```

### Resolving Components

```typescript
import { Registry } from '@fractary/forge';

// Resolve agent from any source (local, global, or remote)
const resolved = await Registry.resolver.resolve(
  '@fractary/faber-plugin/frame-agent',
  'agent'
);

if (resolved) {
  console.log(`Found ${resolved.name} from ${resolved.source}`);
  if (resolved.path) {
    // Local or global installation
    console.log(`Path: ${resolved.path}`);
  } else if (resolved.url) {
    // Remote registry
    console.log(`URL: ${resolved.url}`);
  }
}
```

### Managing Registries

```typescript
import { Registry } from '@fractary/forge';

// Add a registry
await Registry.configManager.addRegistry(
  {
    name: 'fractary-core',
    type: 'manifest',
    url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
    enabled: true,
    priority: 1,
    cache_ttl: 3600,
  },
  'global' // or 'local'
);

// Load current configuration
const config = await Registry.configManager.loadConfig();
console.log(`Configured registries: ${config.config.registries.length}`);

// List enabled registries
const enabled = Registry.getEnabledRegistries(config.config);
console.log(`Enabled registries: ${enabled.map(r => r.name).join(', ')}`);
```

### Searching Plugins

```typescript
import { Registry } from '@fractary/forge';

// Search for plugins across all registries
const results = await Registry.resolver.search('faber', undefined, {
  tag: 'workflow',
});

for (const result of results) {
  console.log(`${result.name}@${result.version} from ${result.source}`);
}
```

### Listing Installed Components

```typescript
import { Registry } from '@fractary/forge';

// List all installed plugins globally
const plugins = await Registry.resolver.listInstalled('plugin', 'global');

for (const plugin of plugins) {
  console.log(`${plugin.name} at ${plugin.path}`);
}

// List all installed agents (local + global)
const agents = await Registry.resolver.listInstalled('agent', 'all');
```

### Cache Management

```typescript
import { Registry } from '@fractary/forge';

// Get cache statistics
const stats = await Registry.manifestCache.getStats();
console.log(`Cache entries: ${stats.total_entries}`);
console.log(`Fresh: ${stats.fresh_entries}, Expired: ${stats.expired_entries}`);

// Clean up expired entries
const removed = await Registry.manifestCache.cleanup();
console.log(`Removed ${removed} expired entries`);

// Invalidate specific registry cache
await Registry.manifestCache.invalidate('fractary-core');

// Force refresh a registry
await Registry.manifestResolver.refresh({
  name: 'fractary-core',
  type: 'manifest',
  url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
  enabled: true,
  priority: 1,
});
```

## CLI Command Mapping

Here's how the CLI commands map to SDK methods:

### `fractary forge registry add`
```typescript
await Registry.configManager.addRegistry(registryConfig, scope);
```

### `fractary forge registry list`
```typescript
const config = await Registry.configManager.loadConfig();
// Display config.config.registries
```

### `fractary forge registry remove`
```typescript
await Registry.configManager.removeRegistry(registryName, scope);
```

### `fractary forge registry refresh`
```typescript
await Registry.manifestResolver.refresh(registry);
// or
await Registry.manifestCache.invalidate(registryName);
```

### `fractary forge install`
```typescript
await Registry.installer.installPlugin(pluginName, {
  scope: options.global ? 'global' : 'local',
  force: options.force,
  agentsOnly: options.agentsOnly,
  // ... other options
});
```

### `fractary forge uninstall`
```typescript
await Registry.installer.uninstallPlugin(pluginName, scope);
```

### `fractary forge list`
```typescript
await Registry.resolver.listInstalled(type, scope);
```

### `fractary forge search`
```typescript
await Registry.resolver.search(query, type, { registry, tag });
```

## Type Exports

All types are exported from the main package:

```typescript
import type {
  // Manifests
  RegistryManifest,
  PluginManifest,
  RegistryPluginReference,
  PluginItem,
  PluginHook,
  PluginCommand,
  PluginWorkflow,
  PluginTemplate,

  // Configuration
  RegistryConfig,
  RegistryForgeConfig,
  InstallConfig,
  RegistryAuth,

  // Resolution
  ResolvedComponent,
  ComponentType,
  ResolveOptions,

  // Installation
  InstallOptions,
  InstallResult,

  // Cache
  ManifestCache,
  CacheStats,
} from '@fractary/forge';
```

## Singleton Instances

For convenience, singleton instances are exported:

```typescript
import { Registry } from '@fractary/forge';

// These are all singletons
Registry.resolver        // Main resolver
Registry.installer       // Plugin installer
Registry.configManager   // Config management
Registry.manifestCache   // Manifest cache
Registry.localResolver   // Local file system resolver
Registry.manifestResolver // Remote manifest resolver
```

You can also create new instances if needed:

```typescript
import { Registry } from '@fractary/forge';

// Create a resolver for a specific directory
const customResolver = new Registry.Resolver('/path/to/project');

// Create a custom cache manager
const customCache = new Registry.ManifestCacheManager('/custom/cache/path');
```

## Related Specifications

- [SPEC-FORGE-005: Registry Manifest System](../../docs/specs/SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md)
- [IMPL-20251215-CROSS-PROJECT-ROADMAP.md](../../docs/specs/IMPL-20251215-CROSS-PROJECT-ROADMAP.md)
- [Issue #6: Implement Forge Registry System](https://github.com/fractary/forge/issues/6)

## Next Steps

The registry SDK is complete. The `fractary/cli` project will:

1. Create CLI command handlers that call these SDK methods
2. Format output for user-friendly display
3. Handle user input and validation
4. Provide interactive prompts where needed
5. Implement the `fractary forge` command suite
