# Changelog

All notable changes to the @fractary/forge SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-06

### Added

**Core Infrastructure**
- Error handling with `ForgeError` class and `ErrorCode` enum
- Logger with spinner support (ora integration)
- File system utilities (async wrappers for fs-extra)
- Configuration manager for global and project configs
- Cache manager with TTL support

**Resolvers**
- `GitHubResolver`: Full GitHub API integration
  - Tarball download and extraction
  - Smart caching (1hr for branches, 24hr for releases)
  - File filtering based on manifest patterns
  - Authentication via GitHub tokens
- `CatalogResolver`: JSON catalog support
  - Multi-catalog management
  - Asset search and discovery
  - Offline support with disk caching
- `LocalResolver`: Local and embedded assets
  - File:// URL support
  - Embedded asset loading
- `ResolverManager`: Unified API
  - Multi-resolver routing with fallback strategies
  - Custom resolver registration via `IResolver` interface

**Types**
- Comprehensive TypeScript definitions
- Asset manifests (Bundle, Starter, Project)
- Ownership rules and merge results
- Validation types
- Configuration types

**Package Exports**
- Main entry: `@fractary/forge`
- Subpath exports: `/resolvers`, `/types`, `/config`, `/cache`, `/errors`

### Technical Details
- **Language**: TypeScript 5.3.3
- **Module System**: CommonJS (ESM support planned for v1.1.0)
- **Node Version**: >=18.0.0
- **Bundle Size**: ~3,500 LOC extracted from forge-cli
- **Dependencies**: chalk, ora, fs-extra, glob, minimatch, semver, js-yaml

### Known Limitations
- ESM support deferred to v1.1.0
- No unit tests yet (coming in v1.0.1)
- Documentation stubs (full docs coming soon)
- Registry resolver not yet implemented
- Merge engine placeholder only

### Migration from forge-cli
This SDK extracts core functionality from `forge-cli` into a reusable package. The forge-cli project will be updated to consume this SDK in a future release.

[1.0.0]: https://github.com/fractary/forge/releases/tag/v1.0.0
