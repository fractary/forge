---
title: Forge SDK
description: Core SDK for Forge asset management with multi-resolver architecture
visibility: public
---

# Forge SDK

The `@fractary/forge` SDK is a powerful TypeScript library for managing project assets (bundles and starters) across multiple version control systems. It provides a plugin-based resolver architecture that supports GitHub, catalogs, local assets, and custom sources.

## Overview

Forge SDK enables you to:

- **Fetch assets** from GitHub repositories, JSON catalogs, or local filesystems
- **Manage configurations** for global and project-level settings
- **Cache assets** intelligently with configurable TTL
- **Extend resolvers** with custom asset sources via plugin architecture
- **Type-safe operations** with comprehensive TypeScript definitions

## Quick Start

### Installation

```bash
npm install @fractary/forge
```

### Basic Usage

```typescript
import { ResolverManager, GitHubResolver } from '@fractary/forge';

// Create resolver manager
const manager = new ResolverManager({
  githubToken: process.env.GITHUB_TOKEN,
  defaultOrg: 'fractary'
});

// Resolve and fetch an asset
const asset = await manager.resolveAsset('fractary/forge-bundle-auth@v1.0.0');

console.log(asset.manifest.name);
console.log(`Downloaded ${asset.files.size} files`);

// Access files
for (const [path, content] of asset.files) {
  console.log(`- ${path} (${content.length} bytes)`);
}
```

## Architecture

The SDK uses a resolver-based architecture:

```
┌─────────────────────────────────────────┐
│        ResolverManager                  │
│  (Routes requests to resolvers)         │
└────┬───────────┬────────────┬───────────┘
     │           │            │
     ▼           ▼            ▼
┌──────────┐ ┌────────┐ ┌─────────┐
│ GitHub   │ │Catalog │ │  Local  │
│Resolver  │ │Resolver│ │ Resolver│
└──────────┘ └────────┘ └─────────┘
```

## Asset Identifier Formats

The SDK supports multiple identifier formats:

| Format | Example | Resolver |
|--------|---------|----------|
| Owner/repo@ref | `fractary/forge-bundle-auth@v1.0.0` | GitHub |
| Catalog ID | `auth-bundle` | Catalog |
| File path | `file:///path/to/asset` | Local |
| Relative path | `./bundles/custom` | Local |

## Core Components

### Resolvers

- **[GitHubResolver](./resolvers.md#github)** - Fetch from GitHub repositories
- **[CatalogResolver](./resolvers.md#catalog)** - Search JSON catalogs
- **[LocalResolver](./resolvers.md#local)** - Load local/embedded assets
- **[Custom Resolvers](./resolvers.md#custom)** - Implement your own

### Configuration

- **[Global Config](./configuration.md#global)** - System-wide settings (`~/.forge/config.json`)
- **[Project Config](./configuration.md#project)** - Project-level settings (`.forge/project.json`)
- **[Environment Variables](./configuration.md#environment)** - Override configs via env vars

### Utilities

- **[Cache Manager](./api.md#cache-manager)** - Intelligent caching with TTL
- **[Error Handling](./api.md#error-handling)** - Typed errors with user-friendly messages
- **[Logger](./api.md#logger)** - Configurable logging with spinner support

## Using with Forge CLI

The Forge CLI (`@fractary/forge-cli`) is built on top of this SDK. When you use CLI commands, you're leveraging the SDK under the hood:

```bash
# Install a bundle (uses GitHubResolver)
forge install fractary/forge-bundle-auth@v1.0.0

# Search for assets (uses CatalogResolver)
forge search authentication

# Create a project from starter (uses ResolverManager)
forge create my-app --starter nextjs
```

See the [CLI Integration](./cli.md) guide for details on how CLI commands map to SDK functionality.

## Key Features

### 🔌 Plugin Architecture
Register custom resolvers to fetch assets from any source:

```typescript
import { ResolverManager, type IResolver } from '@fractary/forge';

class MyResolver implements IResolver {
  name = 'my-resolver';

  canResolve(identifier: string): boolean {
    return identifier.startsWith('my:');
  }

  async resolve(identifier: string): Promise<AssetPackage> {
    // Your custom logic
  }
}

manager.registerResolver(new MyResolver());
```

### 💾 Smart Caching
Automatic caching with configurable TTL:
- **Branches**: 1 hour cache
- **Release tags**: 24 hour cache
- **Custom TTL**: Configure per-resolver

### 🔧 Flexible Configuration
Hierarchical configuration system:
1. Default settings
2. Global config (`~/.forge/config.json`)
3. Project config (`.forge/project.json`)
4. Environment variables
5. Runtime options

### 📝 Type Safety
Comprehensive TypeScript definitions for:
- Asset manifests (Bundle, Starter)
- Resolver interfaces
- Configuration schemas
- Error types

## Next Steps

- **[API Reference](./api.md)** - Complete API documentation
- **[Resolvers Guide](./resolvers.md)** - Working with asset resolvers
- **[Configuration](./configuration.md)** - Configuring the SDK
- **[CLI Integration](./cli.md)** - Using with Forge CLI
- **[Examples](./examples.md)** - Code examples and recipes

## Resources

- [GitHub Repository](https://github.com/fractary/forge)
- [Forge CLI](https://github.com/fractary/forge-cli)
- [Issue Tracker](https://github.com/fractary/forge/issues)
- [Specification](../specs/SPEC-000001-forge-sdk-extraction.md)

## Version

Current version: **1.0.0**

- **Node.js**: >=18.0.0
- **Module System**: CommonJS (ESM support coming in v1.1.0)
- **License**: MIT
