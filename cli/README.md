# @fractary/forge-cli

Command-line interface for Fractary Forge - Create, manage, and publish AI agent definitions.

## Installation

```bash
npm install -g @fractary/forge-cli
```

## Quick Start

```bash
# Initialize forge configuration
fractary-forge init

# Create a new agent
fractary-forge agent-create my-agent --description "My helpful agent"

# List available agents
fractary-forge agent-list

# Get agent information
fractary-forge agent-info my-agent
```

## Commands

### Configuration

#### `init`
Initialize Forge configuration for agent/tool management.

```bash
fractary-forge init [options]

Options:
  --org <slug>    Organization slug (e.g., "fractary")
  --global        Also initialize global registry (~/.fractary/registry)
  --force         Overwrite existing configuration
```

### Agent Management

#### `agent-create`
Create a new agent definition.

```bash
fractary-forge agent-create <name> [options]

Arguments:
  name                    Agent name (lowercase-with-hyphens)

Options:
  --description <text>    Agent description
  --model <provider>      LLM provider (anthropic|openai|google)
  --model-name <name>     Model name (e.g., claude-sonnet-4)
  --tools <tools>         Tool references (comma-separated)
  --prompt <text>         System prompt
  --extends <agent>       Extend existing agent
  --interactive           Interactive creation mode
```

#### `agent-info`
Show agent information.

```bash
fractary-forge agent-info <name> [options]

Arguments:
  name               Agent name (with optional version, e.g., agent@1.0.0)

Options:
  --json             Output as JSON
  --show-tools       Show detailed tool information
  --show-prompt      Include full system prompt
```

#### `agent-list`
List available agents.

```bash
fractary-forge agent-list [options]

Options:
  --tags <tags>    Filter by tags (comma-separated)
  --json           Output as JSON
```

#### `agent-validate`
Validate agent definition.

```bash
fractary-forge agent-validate <name> [options]

Arguments:
  name                Agent name (with optional version)

Options:
  --strict            Enable strict validation
  --check-tools       Verify all tool references exist
  --json              Output as JSON
```

### Registry Management

#### `install`
Install plugin from registry.

```bash
fractary-forge install <plugin> [options]

Arguments:
  plugin              Plugin name or URL

Options:
  --version <ver>     Specific version to install
  --dev               Install as dev dependency
  --global            Install globally
```

#### `uninstall`
Uninstall plugin.

```bash
fractary-forge uninstall <plugin> [options]

Arguments:
  plugin              Plugin name

Options:
  --global            Uninstall from global registry
```

#### `list`
List installed plugins.

```bash
fractary-forge list [options]

Options:
  --type <type>       Filter by type (agent|tool)
  --scope <scope>     Filter by scope (local|global|project)
  --json              Output as JSON
```

#### `info`
Show plugin information.

```bash
fractary-forge info <plugin> [options]

Arguments:
  plugin              Plugin name

Options:
  --json              Output as JSON
```

#### `search`
Search registry for plugins.

```bash
fractary-forge search <query> [options]

Arguments:
  query               Search query

Options:
  --type <type>       Filter by type (agent|tool)
  --tags <tags>       Filter by tags (comma-separated)
  --limit <n>         Limit results
  --json              Output as JSON
```

#### `lock`
Lock plugin versions.

```bash
fractary-forge lock [options]

Options:
  --update            Update lockfile with current versions
```

#### `update`
Update plugins.

```bash
fractary-forge update [plugin] [options]

Arguments:
  plugin              Specific plugin to update (optional)

Options:
  --major             Allow major version updates
  --dry-run           Show what would be updated without updating
```

### Fork and Merge

#### `fork`
Fork a component for customization.

```bash
fractary-forge fork <source> [options]

Arguments:
  source              Component to fork

Options:
  --name <name>       Custom name for fork
  --local             Fork to local registry
```

#### `merge`
Merge upstream changes into forked component.

```bash
fractary-forge merge [options]

Options:
  --strategy <type>   Merge strategy (auto|manual|local|upstream)
  --dry-run           Show changes without applying
```

### Registry Configuration

#### `registry add`
Add a registry source.

```bash
fractary-forge registry add <url> [options]

Arguments:
  url                 Registry URL

Options:
  --name <name>       Registry name
  --priority <n>      Priority order
```

#### `registry list`
List configured registries.

```bash
fractary-forge registry list [options]

Options:
  --json              Output as JSON
```

#### `registry remove`
Remove a registry source.

```bash
fractary-forge registry remove <name>

Arguments:
  name                Registry name
```

### Cache Management

#### `cache clear`
Clear registry cache.

```bash
fractary-forge cache clear [options]

Options:
  --all               Clear all cache
  --expired           Clear only expired entries
  --pattern <glob>    Clear matching pattern
```

#### `cache stats`
Show cache statistics.

```bash
fractary-forge cache stats [options]

Options:
  --json              Output as JSON
```

### Authentication

#### `login`
Authenticate with registry.

```bash
fractary-forge login [options]

Options:
  --registry <url>    Registry URL
  --token <token>     Authentication token
```

#### `logout`
Clear authentication.

```bash
fractary-forge logout [options]

Options:
  --registry <url>    Registry URL (logout from specific registry)
  --all               Logout from all registries
```

#### `whoami`
Show current user.

```bash
fractary-forge whoami [options]

Options:
  --registry <url>    Check specific registry
  --json              Output as JSON
```

## Configuration

Forge uses a YAML configuration file at `.fractary/forge/config.yaml`:

```yaml
organization: my-org

registry:
  local:
    enabled: true
    agents_path: .fractary/agents
    tools_path: .fractary/tools
  global:
    enabled: true
    path: ~/.fractary/registry
  stockyard:
    enabled: false
    url: https://stockyard.fractary.dev

lockfile:
  path: .fractary/forge/lockfile.json
  auto_generate: true
  validate_on_install: true

updates:
  check_frequency: daily
  auto_update: false
  breaking_changes_policy: prompt

defaults:
  agent:
    model:
      provider: anthropic
      name: claude-sonnet-4
    config:
      temperature: 0.7
      max_tokens: 4096
  tool:
    implementation:
      type: function
```

## Agent Definition Format

Agents are defined in YAML format:

```yaml
name: my-agent
type: agent
description: My helpful agent
version: 1.0.0
tags:
  - helper
  - assistant

llm:
  provider: anthropic
  model: claude-sonnet-4
  temperature: 0.7
  max_tokens: 4096

system_prompt: |
  You are a helpful agent that assists with tasks.

tools:
  - file-reader
  - web-search
```

## Directory Structure

```
.fractary/
├── forge/
│   ├── config.yaml       # Forge configuration
│   └── lockfile.json     # Version lockfile
├── agents/               # Local agent definitions
│   └── my-agent.yaml
└── tools/                # Local tool definitions
    └── my-tool.yaml
```

## Development

This CLI is part of the [Fractary Forge](https://github.com/fractary/forge) monorepo.

### Building from Source

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node bin/fractary-forge.js --help
```

### Project Structure

```
/cli/
├── package.json
├── tsconfig.json
├── bin/
│   └── fractary-forge.js     # Binary entry point
├── src/
│   ├── index.ts              # Main CLI program
│   ├── client/               # SDK client wrapper
│   ├── commands/             # CLI commands
│   │   ├── init.ts
│   │   ├── agent/            # Agent commands
│   │   └── registry/         # Registry commands
│   ├── utils/                # Utility modules
│   └── config/               # Configuration management
└── dist/                     # Compiled output
```

## License

MIT - See [LICENSE](../LICENSE) for details.

## Related

- [Forge SDK](../sdk/js/) - JavaScript SDK for Forge
- [Forge Agents](../.fractary/agents/) - Agent definitions
- [Forge Tools](../.fractary/tools/) - Tool definitions
