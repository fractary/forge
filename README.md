# @fractary/forge

Core SDK for Forge asset management with multi-resolver architecture.

## Overview

`@fractary/forge` is a powerful SDK for managing project assets (bundles and starters) across multiple version control systems. It provides a plugin-based resolver architecture that supports GitHub, GitLab, Bitbucket, and custom source control providers.

## Features

- 🔌 **Plugin-Based Resolvers**: Extensible architecture for multiple VCS providers
- 🌐 **Multi-VCS Support**: GitHub, Catalog, Local/Embedded assets
- 📦 **Asset Management**: Bundles and starters with ownership rules
- 💾 **Smart Caching**: Intelligent caching with configurable TTL
- 🔧 **Configuration**: Flexible multi-resolver configuration
- 📝 **TypeScript**: Full TypeScript support with comprehensive types
- 🎯 **CommonJS**: CJS support (ESM coming in v1.1.0)

## Installation

```bash
npm install @fractary/forge
```

## Quick Start

```typescript
import { ResolverManager, GitHubResolver } from '@fractary/forge';

// Initialize resolver manager
const manager = new ResolverManager();

// Register GitHub resolver
manager.registerResolver(new GitHubResolver({
  token: process.env.GITHUB_TOKEN,
  defaultOrg: 'fractary'
}));

// Resolve and fetch an asset
const asset = await manager.resolveAsset('fractary/forge-bundle-auth@v1.0.0');

console.log(asset.manifest.name);
console.log(`${asset.files.size} files`);
```

## Documentation

📖 Full documentation coming soon! For now, see:
- [Specification](./docs/specs/SPEC-000001-forge-sdk-extraction.md) - Complete implementation spec
- TypeScript definitions in `dist/` for API reference
- Examples below for common usage

## Architecture

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

## Supported Resolvers

- **GitHub**: Fetch assets from GitHub repositories via API
- **Catalog**: Static JSON catalog for asset discovery and search
- **Local**: Local filesystem and embedded asset support
- **Custom**: Implement `IResolver` interface for custom sources

## Asset Identifier Formats

```
github:owner/repo@ref          → GitHubResolver
catalog:asset-id               → CatalogResolver
file:///path/to/asset          → LocalResolver
owner/repo@ref                 → Default resolver
```

## Configuration

```typescript
import { ConfigManager } from '@fractary/forge';

const configMgr = new ConfigManager();
const config = await configMgr.loadGlobalConfig();

// Config supports multiple resolvers
config.resolvers.github = {
  token: process.env.GITHUB_TOKEN,
  defaultOrg: 'fractary'
};

config.resolvers.default = 'github';
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

## License

MIT © Fractary

## Links

- [GitHub Repository](https://github.com/fractary/forge)
- [Documentation](https://docs.fractary.com/forge)
- [CLI Tool](https://github.com/fractary/forge-cli)
