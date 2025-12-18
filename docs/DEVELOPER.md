# Developer Guide

Complete guide for contributing to Fractary Forge.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Building and Testing](#building-and-testing)
- [Contributing](#contributing)
- [Code Standards](#code-standards)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- TypeScript knowledge
- Familiarity with monorepos (npm workspaces)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/fractary/forge.git
cd forge

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Development Setup

### Monorepo Structure

Fractary Forge uses npm workspaces to manage multiple packages:

```
forge/
├── sdk/
│   ├── js/                 # @fractary/forge (TypeScript SDK)
│   └── python/             # forge-py (Python SDK) [Future]
├── cli/                    # @fractary/forge-cli
├── mcp/
│   └── server/             # @fractary/forge-mcp
├── plugins/                # Official plugins
├── docs/                   # Documentation
├── specs/                  # Specifications
└── package.json            # Root package
```

### Package Dependencies

```
┌─────────────────────────────────────────┐
│            Root Package                  │
└─────────────────────────────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐
│   SDK   │ │   CLI   │ │   MCP    │
│ (forge) │ │         │ │  Server  │
└─────────┘ └─────────┘ └──────────┘
      ▲           │           │
      └───────────┴───────────┘
         depends on SDK
```

### Development Workflow

```bash
# Install dependencies
npm install

# Build in watch mode (all packages)
npm run dev

# Or build specific package
cd sdk/js && npm run dev
cd cli && npm run dev
cd mcp/server && npm run dev
```

### Environment Variables

Create `.env` file in project root:

```bash
# Development
NODE_ENV=development

# Registry configuration
FORGE_REGISTRY_URL=https://raw.githubusercontent.com/fractary/plugins/main/registry.json

# Cache configuration
FORGE_CACHE_DIR=~/.fractary/cache
FORGE_CACHE_TTL=3600

# Logging
LOG_LEVEL=debug
```

## Project Structure

### SDK Package (`sdk/js`)

```
sdk/js/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── client.ts                # ForgeClient
│   ├── resolvers/               # Resolution system
│   │   ├── local.ts
│   │   ├── global.ts
│   │   ├── remote.ts
│   │   └── index.ts
│   ├── definitions/             # Asset definitions
│   │   ├── schemas/             # Zod schemas
│   │   ├── parser.ts
│   │   └── validator.ts
│   ├── cache/                   # Cache management
│   │   ├── manager.ts
│   │   └── index.ts
│   ├── config/                  # Configuration
│   │   ├── loader.ts
│   │   └── index.ts
│   ├── errors/                  # Error classes
│   │   ├── base.ts
│   │   ├── asset-errors.ts
│   │   └── index.ts
│   ├── exporters/               # Export system
│   │   ├── langchain/
│   │   ├── claude/
│   │   ├── n8n/
│   │   └── index.ts
│   ├── logger/                  # Logging
│   │   └── index.ts
│   ├── fs/                      # File system utilities
│   │   └── index.ts
│   └── types/                   # TypeScript types
│       └── index.ts
├── tests/                       # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── README.md
```

### CLI Package (`cli`)

```
cli/
├── src/
│   ├── index.ts                 # Main CLI entry
│   ├── client/                  # Forge client wrapper
│   │   ├── forge-client.ts
│   │   └── get-client.ts
│   ├── commands/                # CLI commands
│   │   ├── init.ts
│   │   ├── agent/
│   │   │   ├── create.ts
│   │   │   ├── info.ts
│   │   │   ├── list.ts
│   │   │   └── validate.ts
│   │   └── registry/
│   │       ├── install.ts
│   │       ├── uninstall.ts
│   │       ├── list.ts
│   │       └── ...
│   ├── config/                  # CLI config
│   ├── types/                   # CLI types
│   └── utils/                   # CLI utilities
├── bin/
│   └── fractary-forge.js        # CLI executable
├── tests/
├── package.json
└── tsconfig.json
```

### MCP Server (`mcp/server`)

```
mcp/server/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── server.ts                # MCP server implementation
│   ├── tools/                   # MCP tool implementations
│   │   ├── agent-list.ts
│   │   ├── agent-get.ts
│   │   ├── plugin-install.ts
│   │   └── ...
│   └── types.ts                 # MCP types
├── tests/
├── package.json
└── tsconfig.json
```

## Building and Testing

### Build Commands

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@fractary/forge
npm run build --workspace=@fractary/forge-cli
npm run build --workspace=@fractary/forge-mcp

# Clean build artifacts
npm run clean

# Clean and rebuild
npm run clean && npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=resolver.test.ts

# Run tests for specific package
npm test --workspace=@fractary/forge
```

### Test Structure

```typescript
// Example test file: tests/unit/resolvers/local.test.ts
import { LocalResolver } from '../../../src/resolvers/local';
import { vol } from 'memfs';

// Mock file system
jest.mock('fs/promises', () => require('memfs').fs.promises);

describe('LocalResolver', () => {
  let resolver: LocalResolver;

  beforeEach(() => {
    // Reset mock filesystem
    vol.reset();

    // Setup test fixtures
    vol.fromJSON({
      '.fractary/agents/test-agent.md': `---
name: test-agent
version: 1.0.0
type: agent
---
# Test Agent
`,
    });

    resolver = new LocalResolver({
      enabled: true,
      paths: ['.fractary/agents', '.fractary/tools']
    });
  });

  describe('resolve', () => {
    it('should resolve existing agent', async () => {
      const result = await resolver.resolve('test-agent', 'agent');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-agent');
      expect(result?.version).toBe('1.0.0');
    });

    it('should return null for non-existent agent', async () => {
      const result = await resolver.resolve('non-existent', 'agent');

      expect(result).toBeNull();
    });
  });
});
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
# Run TypeScript compiler (type check only)
npx tsc --noEmit

# Run for specific package
cd sdk/js && npx tsc --noEmit
```

## Contributing

### Workflow

1. **Fork the repository**

```bash
# Fork on GitHub, then clone
git clone https://github.com/YOUR_USERNAME/forge.git
cd forge
git remote add upstream https://github.com/fractary/forge.git
```

2. **Create a feature branch**

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature
```

3. **Make changes**

```bash
# Make your changes
# Write tests
# Update documentation
```

4. **Test your changes**

```bash
# Run tests
npm test

# Check linting
npm run lint

# Build
npm run build
```

5. **Commit with conventional commits**

```bash
git add .
git commit -m "feat(resolver): add custom resolver support"

# Conventional commit types:
# - feat: New feature
# - fix: Bug fix
# - docs: Documentation only
# - style: Formatting, missing semicolons, etc.
# - refactor: Code restructuring
# - test: Adding tests
# - chore: Maintenance tasks
```

6. **Push and create PR**

```bash
git push origin feature/my-feature
# Create PR on GitHub
```

### Pull Request Guidelines

**PR Title Format:**
```
<type>(<scope>): <description>

Examples:
feat(cli): add agent validation command
fix(resolver): handle edge case in version resolution
docs(api): update ForgeClient documentation
```

**PR Description Template:**

```markdown
## Description
Brief description of changes

## Motivation
Why is this change necessary?

## Changes
- List of changes
- Another change

## Testing
How was this tested?

## Breaking Changes
List any breaking changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] No linting errors
- [ ] All tests passing
```

## Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface AgentConfig {
  name: string;
  version: string;
  llm: LLMConfig;
}

function createAgent(config: AgentConfig): Agent {
  // Implementation
}

// ❌ Bad: Implicit any
function createAgent(config) {
  // Implementation
}
```

### Error Handling

```typescript
// ✅ Good: Custom error classes with context
class AssetNotFoundError extends ForgeError {
  constructor(name: string, type: AssetType) {
    super(`${type} '${name}' not found`);
    this.code = 'ASSET_NOT_FOUND';
    this.details = { name, type };
  }
}

throw new AssetNotFoundError('my-agent', 'agent');

// ❌ Bad: Generic errors
throw new Error('not found');
```

### Async/Await

```typescript
// ✅ Good: Proper error handling
async function resolveAgent(name: string): Promise<Agent> {
  try {
    const result = await resolver.resolve(name, 'agent');
    if (!result) {
      throw new AssetNotFoundError(name, 'agent');
    }
    return result;
  } catch (error) {
    logger.error('Resolution failed', { name, error });
    throw error;
  }
}

// ❌ Bad: Unhandled rejections
async function resolveAgent(name: string) {
  const result = await resolver.resolve(name, 'agent');
  return result;
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class LocalResolver { }

// Functions/methods: camelCase
function resolveAgent() { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_CACHE_TTL = 3600;

// Interfaces: PascalCase (no 'I' prefix)
interface ResolverConfig { }

// Types: PascalCase
type AssetType = 'agent' | 'tool' | 'workflow';

// Files: kebab-case
// local-resolver.ts
// agent-validator.ts
```

### Documentation

```typescript
/**
 * Resolves an asset from configured sources
 *
 * @param name - Asset name (e.g., 'my-agent')
 * @param type - Asset type ('agent', 'tool', or 'workflow')
 * @param version - Optional version constraint (semver)
 * @returns Resolved asset or null if not found
 *
 * @example
 * ```typescript
 * const agent = await resolver.resolve('my-agent', 'agent', '^1.0.0');
 * ```
 */
async function resolve(
  name: string,
  type: AssetType,
  version?: string
): Promise<ResolvedAsset | null> {
  // Implementation
}
```

## Release Process

### Versioning

Fractary Forge follows [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features (backwards compatible)
- **Patch (0.0.X)**: Bug fixes

### Release Checklist

1. **Update version**

```bash
# Update version in package.json files
# SDK
cd sdk/js
npm version minor  # or major/patch

# CLI
cd ../../cli
npm version minor

# MCP Server
cd ../mcp/server
npm version minor
```

2. **Update CHANGELOG.md**

```markdown
## [1.2.0] - 2025-12-17

### Added
- Custom resolver support
- Agent validation command

### Changed
- Improved error messages

### Fixed
- Version resolution edge case
```

3. **Run full test suite**

```bash
npm run clean
npm install
npm run build
npm test
npm run lint
```

4. **Create release commit**

```bash
git add .
git commit -m "chore(release): 1.2.0"
git tag v1.2.0
```

5. **Push to GitHub**

```bash
git push origin main
git push origin v1.2.0
```

6. **Publish to npm**

```bash
# SDK
cd sdk/js
npm publish

# CLI
cd ../../cli
npm publish

# MCP Server
cd ../mcp/server
npm publish
```

7. **Create GitHub release**

- Go to GitHub releases
- Create new release from tag
- Copy CHANGELOG.md entry
- Publish release

## Development Tips

### Debugging

```typescript
// Use DEBUG environment variable
DEBUG=forge:* npm test

// In code
import debug from 'debug';
const log = debug('forge:resolver');

log('Resolving %s from %s', name, source);
```

### Testing with Local CLI

```bash
# Link CLI globally
cd cli
npm link

# Now you can use it
fractary-forge --version

# Unlink when done
npm unlink -g @fractary/forge-cli
```

### Hot Reload Development

```bash
# Terminal 1: Watch SDK
cd sdk/js
npm run dev

# Terminal 2: Watch CLI
cd cli
npm run dev

# Terminal 3: Test changes
fractary-forge agent-list
```

## Common Tasks

### Adding a New Command

1. Create command file: `cli/src/commands/my-command.ts`
2. Implement command logic
3. Export from `cli/src/commands/index.ts`
4. Add to CLI in `cli/src/index.ts`
5. Add tests
6. Update documentation

### Adding a New Resolver

1. Create resolver: `sdk/js/src/resolvers/my-resolver.ts`
2. Implement `Resolver` interface
3. Add configuration type
4. Add tests
5. Update documentation

### Adding a New Exporter

1. Create exporter: `sdk/js/src/exporters/my-format/`
2. Implement exporter logic
3. Add to exporter factory
4. Add tests
5. Update documentation

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/fractary/forge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fractary/forge/discussions)
- **Discord**: [Fractary Community](https://discord.gg/fractary)
- **Email**: dev@fractary.com
