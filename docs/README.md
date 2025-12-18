# Fractary Forge Documentation

Welcome to the Fractary Forge documentation! This directory contains comprehensive guides, API references, and examples for using Fractary Forge.

## 📚 Documentation Structure

### Getting Started

- **[Getting Started Guide](./guides/getting-started.md)** - Quick start guide for new users
- **[Configuration Guide](./guides/configuration.md)** - Complete configuration reference
- **[Command Reference](./guides/command-reference.md)** - All CLI commands documented

### Core Documentation

- **[API Reference](./API.md)** - Complete SDK and CLI API documentation
- **[SDK Guide](./SDK.md)** - Detailed guide for using the JavaScript/TypeScript SDK
- **[MCP Server Guide](./MCP_SERVER.md)** - Using Forge with Claude via MCP
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design principles
- **[Developer Guide](./DEVELOPER.md)** - Contributing to Fractary Forge

### Guides & Workflows

- **[Workflow Guides](./guides/workflow-guides.md)** - Common patterns and workflows
- **[Basic Usage Examples](./examples/basic-usage.md)** - Simple examples to get started
- **[Advanced Workflows](./examples/advanced-workflows.md)** - Complex patterns and use cases

## 🚀 Quick Links

### For Users

| I want to... | Read this |
|--------------|-----------|
| Get started quickly | [Getting Started Guide](./guides/getting-started.md) |
| Learn CLI commands | [Command Reference](./guides/command-reference.md) |
| Configure Forge | [Configuration Guide](./guides/configuration.md) |
| See examples | [Basic Usage](./examples/basic-usage.md) |
| Fork and merge | [Workflow Guides](./guides/workflow-guides.md) |
| Use with Claude | [MCP Server Guide](./MCP_SERVER.md) |

### For Developers

| I want to... | Read this |
|--------------|-----------|
| Use the SDK | [SDK Guide](./SDK.md) |
| Understand architecture | [Architecture](./ARCHITECTURE.md) |
| Contribute code | [Developer Guide](./DEVELOPER.md) |
| See API reference | [API Reference](./API.md) |
| Build plugins | [Advanced Workflows](./examples/advanced-workflows.md) |

## 📖 Documentation by Use Case

### Use Case 1: Managing AI Agents

**Goal:** Create, manage, and share AI agent definitions

**Read:**
1. [Getting Started](./guides/getting-started.md) - Basic concepts
2. [Command Reference](./guides/command-reference.md) - Agent management commands
3. [Workflow Guides](./guides/workflow-guides.md) - Agent development workflow

**Key Sections:**
- Creating agents
- Validating definitions
- Managing tools
- Sharing agents via plugins

### Use Case 2: Using Forge SDK

**Goal:** Integrate Forge into your application

**Read:**
1. [SDK Guide](./SDK.md) - SDK overview and installation
2. [API Reference](./API.md) - Complete API documentation
3. [Basic Usage Examples](./examples/basic-usage.md) - Code examples

**Key Sections:**
- ForgeClient initialization
- Agent resolution
- Error handling
- Custom resolvers

### Use Case 3: Claude Desktop Integration

**Goal:** Use Forge from Claude Desktop via MCP

**Read:**
1. [MCP Server Guide](./MCP_SERVER.md) - Installation and configuration
2. [Getting Started](./guides/getting-started.md) - Understanding agents
3. [Basic Usage Examples](./examples/basic-usage.md) - Usage patterns

**Key Sections:**
- MCP installation
- Claude Desktop configuration
- Available tools
- Usage examples

### Use Case 4: Fork and Customize

**Goal:** Fork existing agents and merge upstream changes

**Read:**
1. [Workflow Guides](./guides/workflow-guides.md) - Fork workflow
2. [Advanced Workflows](./examples/advanced-workflows.md) - Detailed examples
3. [Command Reference](./guides/command-reference.md) - Fork commands

**Key Sections:**
- Forking components
- Customization
- Upstream merging
- Conflict resolution

### Use Case 5: Plugin Development

**Goal:** Create and publish plugins

**Read:**
1. [Advanced Workflows](./examples/advanced-workflows.md) - Plugin development
2. [Developer Guide](./DEVELOPER.md) - Development setup
3. [Architecture](./ARCHITECTURE.md) - Plugin system design

**Key Sections:**
- Plugin structure
- Manifest format
- Publishing
- Versioning

### Use Case 6: Contributing

**Goal:** Contribute to Fractary Forge

**Read:**
1. [Developer Guide](./DEVELOPER.md) - Setup and workflow
2. [Architecture](./ARCHITECTURE.md) - System design
3. [API Reference](./API.md) - Existing APIs

**Key Sections:**
- Development setup
- Code standards
- Testing
- Pull requests

## 📋 Complete Documentation Index

### Guides

```
docs/guides/
├── getting-started.md      # Quick start guide
├── command-reference.md    # CLI command reference
├── configuration.md        # Configuration guide
└── workflow-guides.md      # Common workflows
```

### Examples

```
docs/examples/
├── basic-usage.md          # Basic examples
└── advanced-workflows.md   # Advanced patterns
```

### Reference Documentation

```
docs/
├── API.md                  # API reference
├── SDK.md                  # SDK guide
├── MCP_SERVER.md          # MCP server guide
├── ARCHITECTURE.md        # Architecture documentation
└── DEVELOPER.md           # Developer guide
```

## 🎯 Documentation Features

### For Different Skill Levels

**Beginners:**
- Start with [Getting Started](./guides/getting-started.md)
- Read [Basic Usage Examples](./examples/basic-usage.md)
- Review [Command Reference](./guides/command-reference.md)

**Intermediate Users:**
- Read [Workflow Guides](./guides/workflow-guides.md)
- Study [SDK Guide](./SDK.md)
- Explore [Advanced Workflows](./examples/advanced-workflows.md)

**Advanced Users:**
- Review [Architecture](./ARCHITECTURE.md)
- Study [Developer Guide](./DEVELOPER.md)
- Read [API Reference](./API.md)

### By Component

**CLI Users:**
- [Getting Started](./guides/getting-started.md)
- [Command Reference](./guides/command-reference.md)
- [Configuration Guide](./guides/configuration.md)

**SDK Users:**
- [SDK Guide](./SDK.md)
- [API Reference](./API.md)
- [Basic Usage Examples](./examples/basic-usage.md)

**MCP Users:**
- [MCP Server Guide](./MCP_SERVER.md)
- [Getting Started](./guides/getting-started.md)

**Contributors:**
- [Developer Guide](./DEVELOPER.md)
- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)

## 🔍 Finding What You Need

### Search by Topic

**Agents:**
- Creating: [Getting Started](./guides/getting-started.md#your-first-agent)
- Managing: [Command Reference](./guides/command-reference.md#agent-management)
- SDK: [SDK Guide](./SDK.md#agents-api)

**Tools:**
- Creating: [Getting Started](./guides/getting-started.md#working-with-tools)
- Managing: [Command Reference](./guides/command-reference.md#tool-management)
- SDK: [SDK Guide](./SDK.md#tools-api)

**Plugins:**
- Installing: [Getting Started](./guides/getting-started.md#installing-plugins)
- Developing: [Advanced Workflows](./examples/advanced-workflows.md#plugin-development)
- Publishing: [Developer Guide](./DEVELOPER.md#release-process)

**Configuration:**
- Project: [Configuration Guide](./guides/configuration.md#project-configuration)
- Global: [Configuration Guide](./guides/configuration.md#global-configuration)
- Registries: [Configuration Guide](./guides/configuration.md#registry-configuration)

**Workflows:**
- Fork/Merge: [Workflow Guides](./guides/workflow-guides.md#fork-and-merge-workflows)
- Multi-Registry: [Advanced Workflows](./examples/advanced-workflows.md#multi-registry-setup)
- Export: [Advanced Workflows](./examples/advanced-workflows.md#export-to-frameworks)

## 🛠️ Documentation Conventions

### Code Blocks

Shell commands:
```bash
fractary-forge init
```

TypeScript/JavaScript:
```typescript
import { ForgeClient } from '@fractary/forge';
const client = new ForgeClient();
```

YAML (agent definitions):
```yaml
name: my-agent
version: 1.0.0
type: agent
```

JSON (configuration):
```json
{
  "version": "1.0.0"
}
```

### Callouts

- **💡 Tip:** Helpful hints and best practices
- **⚠️ Warning:** Important warnings and gotchas
- **🔒 Security:** Security-related notes
- **📝 Note:** Additional information
- **🚀 New:** New features or recent changes

### File Paths

- Absolute paths: `/absolute/path/to/file`
- Relative paths: `./relative/path/to/file`
- User home: `~/path/from/home`
- Current directory: `.fractary/`

### Command Conventions

- `<required>` - Required argument
- `[optional]` - Optional argument
- `--flag` - Command flag
- `$VAR` - Environment variable

## 📚 External Resources

### Official Links

- **Website:** [https://fractary.com](https://fractary.com)
- **GitHub:** [https://github.com/fractary/forge](https://github.com/fractary/forge)
- **NPM Package:** [https://www.npmjs.com/package/@fractary/forge](https://www.npmjs.com/package/@fractary/forge)

### Community

- **Discord:** [Fractary Community](https://discord.gg/fractary)
- **Discussions:** [GitHub Discussions](https://github.com/fractary/forge/discussions)
- **Issues:** [GitHub Issues](https://github.com/fractary/forge/issues)

### Learning Resources

- **Blog:** [Fractary Blog](https://blog.fractary.com)
- **Tutorials:** [Fractary Tutorials](https://fractary.com/tutorials)
- **Examples:** [GitHub Examples](https://github.com/fractary/forge-examples)

## 🤝 Contributing to Documentation

Found an error? Want to improve the docs?

1. **Fork the repository**
2. **Edit documentation** (in `docs/` directory)
3. **Submit a pull request**

See [Developer Guide](./DEVELOPER.md#contributing) for details.

### Documentation Style Guide

- Use clear, concise language
- Include code examples
- Add links to related sections
- Follow existing structure
- Test all code examples

## 📝 Documentation Version

This documentation is for:
- **Forge SDK:** v1.1.3
- **Forge CLI:** v1.0.0
- **Forge MCP:** v1.0.0

**Last Updated:** December 17, 2025

## 🔄 Recent Updates

- Added comprehensive MCP server documentation
- Updated SDK guide with TypeScript examples
- Added advanced workflow examples
- Expanded architecture documentation
- Added developer contribution guide

## 📬 Feedback

We'd love to hear your feedback on the documentation!

- **Issues:** [Report documentation issues](https://github.com/fractary/forge/issues/new?labels=documentation)
- **Suggestions:** [Share ideas](https://github.com/fractary/forge/discussions)
- **Email:** docs@fractary.com

---

**Happy Building with Fractary Forge! 🚀**
