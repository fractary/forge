# SPEC-000001: Extract Forge Core SDK from forge-cli

**Status:** Draft
**Created:** 2025-10-06
**Author:** Claude Code
**Related Projects:**
- `/mnt/c/GitHub/fractary/forge` (this SDK project)
- `/mnt/c/GitHub/fractary/forge-cli` (source CLI project)

---

## 1. Executive Summary

This specification outlines the extraction of core Forge functionality from the `forge-cli` monolithic CLI application into a standalone SDK package `@fractary/forge`. The SDK will provide reusable components for asset resolution, caching, configuration management, and file operations, enabling other Forge ecosystem tools to leverage the same core logic.

### 1.1 Goals

1. **Separation of Concerns**: Extract CLI-agnostic core logic into a reusable SDK
2. **Code Reusability**: Enable forge-cli and future tools to use the same battle-tested core
3. **Type Safety**: Provide comprehensive TypeScript type definitions
4. **Dual Module Support**: Support both CommonJS and ESM consumption
5. **npm Publishing**: Prepare for publication to GitHub Package Registry

### 1.2 Non-Goals

- This is NOT a breaking change for forge-cli (backward compatibility maintained)
- NOT migrating CLI-specific command implementations
- NOT changing external APIs or behaviors of forge-cli
- NOT implementing new features (extraction only)

---

## 2. Current State Analysis

### 2.1 forge SDK Project (`/mnt/c/GitHub/fractary/forge`)

**Current Structure:**
```
forge/
├── src/
│   ├── types/          # ✅ Core types extracted (8 files)
│   │   ├── assets.ts
│   │   ├── cache.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── ownership.ts
│   │   ├── resolvers.ts
│   │   └── validation.ts
│   ├── cache/          # ❌ Empty
│   ├── config/         # ❌ Empty
│   ├── errors/         # ❌ Empty
│   ├── fs/             # ❌ Empty
│   ├── logger/         # ❌ Empty
│   ├── merge/          # ❌ Empty
│   ├── registry/       # ❌ Empty
│   └── resolvers/      # ❌ Empty (subdirs: catalog/, github/, local/)
├── tests/unit/         # ❌ Empty subdirectories
├── dist/               # ⚠️  Partial build (types only, no ESM .mjs files)
└── package.json        # ⚠️  Configured but incomplete
```

**Issues Identified:**
1. ❌ **No ESM build output** (`.mjs` files missing despite config)
2. ❌ **No implementation code** (only type definitions exist)
3. ❌ **Broken package exports** (references non-existent subpaths)
4. ❌ **No tests** (empty test directories, prepublishOnly will fail)
5. ❌ **Missing docs** (README links to non-existent documentation)

### 2.2 forge-cli Project (`/mnt/c/GitHub/fractary/forge-cli`)

**Structure to Extract From:**
```
forge-cli/src/
├── resolvers/
│   ├── github.ts       # 662 lines - GitHub asset resolver
│   ├── catalog.ts      # 456 lines - Catalog resolver
│   └── index.ts        # 390 lines - Unified resolver manager
├── utils/
│   ├── config.ts       # Config management
│   ├── errors.ts       # Error handling
│   ├── fs.ts           # File operations
│   └── logger.ts       # Logging utilities
├── merge/
│   └── index.ts        # Placeholder (Phase 2)
├── registry/
│   └── index.ts        # Registry operations
└── types/
    └── index.ts        # Type definitions (already extracted)
```

**Key Components:**
- ✅ **GitHubResolver**: Full GitHub API integration with caching
- ✅ **CatalogResolver**: JSON catalog parsing and search
- ✅ **AssetResolver**: Unified resolution with fallback strategies
- ✅ **ConfigManager**: Global and project config management
- ✅ **ForgeError**: Custom error classes
- ✅ **File utilities**: Async fs operations
- ✅ **Logger**: Spinner-based CLI logger

---

## 3. Architecture

### 3.1 Module Structure

```
@fractary/forge/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types/                      # [EXISTS] Type definitions
│   │   ├── index.ts
│   │   ├── assets.ts
│   │   ├── cache.ts
│   │   ├── config.ts
│   │   ├── ownership.ts
│   │   ├── resolvers.ts
│   │   └── validation.ts
│   ├── resolvers/                  # [NEW] Asset resolvers
│   │   ├── index.ts
│   │   ├── base.ts                 # Base resolver interface
│   │   ├── manager.ts              # ResolverManager (main API)
│   │   ├── github/
│   │   │   ├── index.ts
│   │   │   └── resolver.ts         # GitHubResolver
│   │   ├── catalog/
│   │   │   ├── index.ts
│   │   │   └── resolver.ts         # CatalogResolver
│   │   └── local/
│   │       ├── index.ts
│   │       └── resolver.ts         # LocalResolver (embedded)
│   ├── cache/                      # [NEW] Caching layer
│   │   ├── index.ts
│   │   ├── manager.ts              # Cache management
│   │   └── types.ts                # Cache-specific types
│   ├── config/                     # [NEW] Configuration
│   │   ├── index.ts
│   │   ├── manager.ts              # ConfigManager
│   │   └── defaults.ts             # Default configs
│   ├── errors/                     # [NEW] Error handling
│   │   ├── index.ts
│   │   ├── codes.ts                # Error code enum
│   │   └── forge-error.ts          # ForgeError class
│   ├── fs/                         # [NEW] File operations
│   │   ├── index.ts
│   │   └── utils.ts                # Async fs utilities
│   ├── logger/                     # [NEW] Logging
│   │   ├── index.ts
│   │   ├── logger.ts               # Logger class
│   │   └── types.ts                # Log levels, etc.
│   └── utils/                      # [NEW] Shared utilities
│       ├── index.ts
│       └── validation.ts           # Validation helpers
├── tests/                          # [NEW] Test suites
│   └── unit/
│       ├── resolvers/
│       ├── config/
│       ├── cache/
│       └── errors/
└── dist/                           # [BUILD] Output
    ├── index.js                    # CJS bundle
    ├── index.mjs                   # ESM bundle
    ├── index.d.ts                  # Type definitions
    ├── resolvers/                  # Subpath exports
    ├── config/
    ├── cache/
    └── types/
```

### 3.2 Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./resolvers": {
      "import": "./dist/resolvers/index.mjs",
      "require": "./dist/resolvers/index.js",
      "types": "./dist/resolvers/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./config": {
      "import": "./dist/config/index.mjs",
      "require": "./dist/config/index.js",
      "types": "./dist/config/index.d.ts"
    },
    "./cache": {
      "import": "./dist/cache/index.mjs",
      "require": "./dist/cache/index.js",
      "types": "./dist/cache/index.d.ts"
    },
    "./errors": {
      "import": "./dist/errors/index.mjs",
      "require": "./dist/errors/index.js",
      "types": "./dist/errors/index.d.ts"
    }
  }
}
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Core Infrastructure

#### Task 1.1: Error Handling
**Source:** `forge-cli/src/utils/errors.ts`
**Destination:** `forge/src/errors/`

Extract:
- `ErrorCode` enum
- `ForgeError` class
- Error formatting utilities

#### Task 1.2: Logger
**Source:** `forge-cli/src/utils/logger.ts`
**Destination:** `forge/src/logger/`

Extract:
- Logger class with spinner support (using `ora`)
- Log level management
- Remove CLI-specific formatting (keep SDK-friendly)

#### Task 1.3: File System Utilities
**Source:** `forge-cli/src/utils/fs.ts`
**Destination:** `forge/src/fs/`

Extract:
- Async file operations wrappers
- Path utilities
- Safe read/write operations

### 4.2 Phase 2: Configuration Management

#### Task 2.1: Config Manager
**Source:** `forge-cli/src/utils/config.ts`
**Destination:** `forge/src/config/`

Extract:
- `ConfigManager` class
- Global config (`~/.forge/config.json`)
- Project config (`.forge/project.json`)
- Environment variable merging
- Default configuration

**Changes Required:**
- Remove cosmiconfig dependency (use direct fs-extra)
- Simplify for SDK usage (no CLI prompts)

### 4.3 Phase 3: Resolvers

#### Task 3.1: GitHub Resolver
**Source:** `forge-cli/src/resolvers/github.ts`
**Destination:** `forge/src/resolvers/github/resolver.ts`

Extract (662 lines):
- `GitHubResolver` class
- API client methods
- Tarball download/extraction
- Caching logic
- File filtering based on manifest patterns

**Dependencies:**
- `https` (Node.js)
- `fs-extra`
- `minimatch`
- `logger`, `errors`

#### Task 3.2: Catalog Resolver
**Source:** `forge-cli/src/resolvers/catalog.ts`
**Destination:** `forge/src/resolvers/catalog/resolver.ts`

Extract (456 lines):
- `CatalogResolver` class
- Catalog fetching (HTTP/file)
- Search functionality
- Disk caching
- Validation

#### Task 3.3: Local Resolver
**Source:** `forge-cli/src/resolvers/index.ts` (embedded logic)
**Destination:** `forge/src/resolvers/local/resolver.ts`

Extract:
- Embedded asset loading
- Local file system resolution
- Manifest loading

#### Task 3.4: Resolver Manager
**Source:** `forge-cli/src/resolvers/index.ts`
**Destination:** `forge/src/resolvers/manager.ts`

Extract:
- `AssetResolver` class → `ResolverManager`
- Multi-resolver routing
- Fallback strategies
- Asset search/list

**API Design:**
```typescript
class ResolverManager {
  registerResolver(resolver: IResolver): void;
  resolveAsset(identifier: string): Promise<AssetPackage>;
  searchAssets(query: string): Promise<CatalogEntry[]>;
  listAssets(): Promise<CatalogEntry[]>;
}
```

### 4.4 Phase 4: Caching Layer

#### Task 4.1: Cache Manager
**Source:** Extracted from resolvers
**Destination:** `forge/src/cache/manager.ts`

Create:
- Unified cache interface
- TTL management
- Disk cache operations
- Memory cache layer
- Cache statistics

### 4.5 Phase 5: Build System

#### Task 5.1: Fix TypeScript Build
**Files:** `tsconfig.json`, `tsconfig.esm.json`

Issues to fix:
1. ESM build not generating `.mjs` files
2. Subpath exports not building correctly

**Solution:**
- Use `tsup` or `rollup` for dual builds
- Or: Fix TypeScript config + manual renaming script

#### Task 5.2: Build Script
```json
{
  "scripts": {
    "build": "npm run build:cjs && npm run build:esm",
    "build:cjs": "tsc",
    "build:esm": "tsc -p tsconfig.esm.json && node scripts/rename-esm.js"
  }
}
```

### 4.6 Phase 6: Testing

#### Task 6.1: Unit Tests
Create test suites for:
- `ErrorCode` and `ForgeError`
- `ConfigManager` (mock fs)
- `GitHubResolver` (mock HTTP)
- `CatalogResolver` (mock HTTP)
- `ResolverManager`
- Cache operations

**Coverage Target:** 80% (matching jest.config.js)

#### Task 6.2: Integration Tests
- End-to-end resolver tests
- Config loading from fixtures
- Cache persistence

### 4.7 Phase 7: Documentation

#### Task 7.1: API Documentation
Create: `docs/api.md`

Document:
- `ResolverManager` API
- `ConfigManager` API
- Error handling
- Type definitions

#### Task 7.2: Resolver Development Guide
Create: `docs/resolvers.md`

Document:
- How to create custom resolvers
- Resolver interface
- Registration process

#### Task 7.3: Configuration Guide
Create: `docs/configuration.md`

Document:
- Config file formats
- Environment variables
- Per-resolver configuration

#### Task 7.4: Examples
Create: `docs/examples.md`

Provide:
- Basic usage examples
- Custom resolver example
- Configuration examples

---

## 5. Extraction Guidelines

### 5.1 Code Adaptation Rules

1. **Remove CLI Dependencies**
   - Remove `commander` usage
   - Remove interactive prompts
   - Keep logging but make it optional

2. **Maintain Type Safety**
   - All extracted code must be TypeScript
   - No `any` types without justification
   - Comprehensive JSDoc comments

3. **Error Handling**
   - Use `ForgeError` consistently
   - Include error codes for all error paths
   - Provide helpful error messages

4. **Async/Await**
   - All I/O operations must be async
   - Use Promise-based APIs
   - No callbacks

5. **Dependency Management**
   - Minimize new dependencies
   - Reuse existing: `fs-extra`, `minimatch`, `semver`, `glob`, `js-yaml`
   - Keep `chalk` and `ora` for logging

### 5.2 File Mapping

| forge-cli Source | forge SDK Destination | LOC | Status |
|------------------|----------------------|-----|--------|
| `resolvers/github.ts` | `resolvers/github/resolver.ts` | 662 | ❌ TODO |
| `resolvers/catalog.ts` | `resolvers/catalog/resolver.ts` | 456 | ❌ TODO |
| `resolvers/index.ts` | `resolvers/manager.ts` | 390 | ❌ TODO |
| `utils/config.ts` | `config/manager.ts` | ~200 | ❌ TODO |
| `utils/errors.ts` | `errors/forge-error.ts` | ~150 | ❌ TODO |
| `utils/fs.ts` | `fs/utils.ts` | ~200 | ❌ TODO |
| `utils/logger.ts` | `logger/logger.ts` | ~100 | ❌ TODO |
| `types/index.ts` | `types/*.ts` | - | ✅ DONE |

---

## 6. Testing Strategy

### 6.1 Test Structure

```
tests/unit/
├── resolvers/
│   ├── github.test.ts
│   ├── catalog.test.ts
│   ├── local.test.ts
│   └── manager.test.ts
├── config/
│   └── manager.test.ts
├── cache/
│   └── manager.test.ts
├── errors/
│   └── forge-error.test.ts
└── fs/
    └── utils.test.ts
```

### 6.2 Mocking Strategy

- **HTTP Calls**: Mock with `nock` or manual mocks
- **File System**: Use `memfs` or `mock-fs`
- **Environment**: Mock `process.env`
- **Time**: Mock `Date.now()` for cache tests

### 6.3 Coverage Requirements

Per `jest.config.js`:
```json
{
  "branches": 70,
  "functions": 75,
  "lines": 80,
  "statements": 80
}
```

---

## 7. Build Configuration

### 7.1 TypeScript Configuration

**tsconfig.json (CommonJS):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**tsconfig.esm.json (ESM):**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "outDir": "./dist/esm",
    "declaration": false
  }
}
```

**Post-build script (`scripts/rename-esm.js`):**
```javascript
// Rename .js to .mjs in dist/esm
// Copy .d.ts from dist to dist/esm
```

### 7.2 Alternative: Use tsup

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts"
  }
}
```

---

## 8. Migration Strategy for forge-cli

### 8.1 Phase 1: SDK Installation

```bash
cd /mnt/c/GitHub/fractary/forge-cli
npm install @fractary/forge@1.0.0
```

### 8.2 Phase 2: Gradual Migration

Replace imports incrementally:

**Before:**
```typescript
import { GitHubResolver } from './resolvers/github';
import { ForgeError, ErrorCode } from './utils/errors';
```

**After:**
```typescript
import { GitHubResolver, ForgeError, ErrorCode } from '@fractary/forge';
```

### 8.3 Phase 3: Remove Duplicated Code

Delete files after migration:
- `src/resolvers/github.ts`
- `src/resolvers/catalog.ts`
- `src/resolvers/index.ts`
- `src/utils/config.ts`
- `src/utils/errors.ts`
- `src/utils/fs.ts`
- `src/utils/logger.ts`

Keep:
- `src/commands/*` (CLI-specific)
- `src/cli.ts` (CLI entry point)
- CLI-specific utilities

---

## 9. Publishing Checklist

### 9.1 Pre-publish Requirements

- [ ] All source files extracted and adapted
- [ ] TypeScript builds successfully (CJS + ESM)
- [ ] All tests pass (`npm test`)
- [ ] Test coverage meets thresholds (80%+)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatted (`npm run format`)
- [ ] Documentation complete (API, guides, examples)
- [ ] README accurate and comprehensive
- [ ] LICENSE file present
- [ ] CHANGELOG.md created
- [ ] package.json metadata complete
  - [ ] Version: 1.0.0
  - [ ] Repository URL correct
  - [ ] Keywords appropriate
  - [ ] Dependencies minimal
- [ ] Package exports tested locally
  - [ ] `npm pack` → inspect tarball
  - [ ] Install in test project
  - [ ] Test CJS import
  - [ ] Test ESM import
  - [ ] Test subpath exports

### 9.2 Publishing Commands

```bash
# Dry run
npm publish --dry-run

# Publish to GitHub Package Registry
npm publish
```

### 9.3 Post-publish Verification

```bash
# In forge-cli project
npm install @fractary/forge@1.0.0
# Verify imports work
npm run build
npm test
```

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ESM build issues | High | Test thoroughly, use tsup if needed |
| Type definition errors | High | Validate with `tsc --noEmit` |
| Missing dependencies | Medium | Audit all imports carefully |
| Breaking changes in forge-cli | High | Maintain 100% API compatibility |
| Test coverage gaps | Medium | Prioritize critical paths first |

### 10.2 Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incomplete extraction | High | Follow file mapping checklist |
| Lost functionality | High | Integration tests in forge-cli |
| Version sync issues | Medium | Use exact versions initially |

---

## 11. Success Criteria

1. ✅ SDK builds without errors (CJS + ESM)
2. ✅ All tests pass with 80%+ coverage
3. ✅ forge-cli can install and use SDK without changes
4. ✅ No duplicate code between forge-cli and SDK
5. ✅ Published to npm successfully
6. ✅ Documentation complete and accurate
7. ✅ No breaking changes in forge-cli functionality

---

## 12. Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Infrastructure | Errors, Logger, FS | 2-3 hours |
| Phase 2: Configuration | ConfigManager | 1-2 hours |
| Phase 3: Resolvers | GitHub, Catalog, Local, Manager | 4-6 hours |
| Phase 4: Caching | CacheManager | 1-2 hours |
| Phase 5: Build | Fix ESM, test builds | 2-3 hours |
| Phase 6: Testing | Unit + integration tests | 4-6 hours |
| Phase 7: Documentation | API docs, guides, examples | 2-3 hours |
| **Total** | | **16-25 hours** |

---

## 13. Open Questions

1. **Should we use `tsup` or stick with pure TypeScript?**
   - Recommendation: Use `tsup` for simpler dual-format builds

2. **How should cache be shared between SDK instances?**
   - Recommendation: Singleton pattern with lazy initialization

3. **Should logger be always included or optional peer dependency?**
   - Recommendation: Include but make output optional (silent mode)

4. **Version strategy for initial release?**
   - Recommendation: Start at 1.0.0 (semantic versioning)

5. **Should we extract registry code now or later?**
   - Recommendation: Later (Phase 2) - minimal usage in current code

---

## 14. References

- **forge SDK**: `/mnt/c/GitHub/fractary/forge`
- **forge-cli**: `/mnt/c/GitHub/fractary/forge-cli`
- **GitHub Packages**: https://docs.github.com/en/packages
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/

---

## Appendix A: Example Usage

### A.1 Basic Resolution

```typescript
import { ResolverManager, GitHubResolver } from '@fractary/forge';

const manager = new ResolverManager();
manager.registerResolver(new GitHubResolver({
  token: process.env.GITHUB_TOKEN,
  defaultOrg: 'fractary'
}));

const asset = await manager.resolveAsset('forge-bundle-auth@v1.0.0');
console.log(asset.manifest.name);
console.log(`${asset.files.size} files`);
```

### A.2 Configuration

```typescript
import { ConfigManager } from '@fractary/forge/config';

const configMgr = new ConfigManager();
const config = await configMgr.loadGlobalConfig();

config.github.token = 'ghp_...';
await configMgr.saveGlobalConfig(config);
```

### A.3 Custom Resolver

```typescript
import { ResolverManager, IResolver } from '@fractary/forge/resolvers';

class MyResolver implements IResolver {
  name = 'my-resolver';

  canResolve(identifier: string): boolean {
    return identifier.startsWith('my:');
  }

  async resolve(identifier: string): Promise<AssetPackage> {
    // Custom logic
  }
}

manager.registerResolver(new MyResolver());
```

---

**End of Specification**
