# Command Reference

Complete reference for all Fractary Forge CLI commands.

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Configuration Commands](#configuration-commands)
- [Agent Management](#agent-management)
- [Registry Management](#registry-management)
- [Fork & Merge Operations](#fork--merge-operations)
- [Cache Management](#cache-management)
- [Authentication](#authentication)
- [Registry Configuration](#registry-configuration)

## Overview

Fractary Forge CLI provides a comprehensive set of commands for managing AI agents, tools, and plugins. All commands follow the pattern:

```bash
fractary-forge <command> [arguments] [options]
```

## Quick Reference

| Category | Command | Description |
|----------|---------|-------------|
| **Configuration** | `init` | Initialize Forge configuration |
| **Agent Management** | `agent-create` | Create a new agent definition |
| | `agent-info` | Show agent information |
| | `agent-list` | List available agents |
| | `agent-validate` | Validate agent definition |
| **Registry** | `install` | Install plugin from registry |
| | `uninstall` | Uninstall plugin |
| | `list` | List installed plugins |
| | `info` | Show plugin information |
| | `search` | Search registry for plugins |
| | `lock` | Lock plugin versions |
| | `update` | Update plugins |
| **Fork & Merge** | `fork` | Fork a component for customization |
| | `merge` | Merge upstream changes |
| **Cache** | `cache clear` | Clear registry cache |
| | `cache stats` | Show cache statistics |
| **Authentication** | `login` | Authenticate with registry |
| | `logout` | Clear authentication |
| | `whoami` | Show current user |
| **Registry Config** | `registry add` | Add a registry source |
| | `registry list` | List configured registries |
| | `registry remove` | Remove a registry source |

## Configuration Commands

### init

Initialize Forge configuration for agent/tool management.

**Syntax:**
```bash
fractary-forge init [options]
```

**Options:**
- `--org <slug>` - Organization slug (e.g., "fractary")
- `--global` - Also initialize global registry (~/.fractary/registry)
- `--force` - Overwrite existing configuration

**Examples:**

```bash
# Initialize with organization
fractary-forge init --org myorg

# Initialize both local and global
fractary-forge init --org myorg --global

# Force overwrite existing config
fractary-forge init --org myorg --force
```

**Creates:**
- `.fractary/forge/config.yaml` - Local configuration
- `.fractary/agents/` - Agent definitions directory
- `.fractary/tools/` - Tool definitions directory
- `~/.fractary/registry/` - Global registry (if --global)

---

## Agent Management

### agent-create

Create a new agent definition.

**Syntax:**
```bash
fractary-forge agent-create <name> [options]
```

**Arguments:**
- `name` - Agent name (lowercase-with-hyphens)

**Options:**
- `--description <text>` - Agent description
- `--model <provider>` - LLM provider (anthropic|openai|google)
- `--model-name <name>` - Model name (e.g., claude-sonnet-4)
- `--tools <tools>` - Tool references (comma-separated)
- `--prompt <text>` - System prompt
- `--extends <agent>` - Extend existing agent
- `--interactive` - Interactive creation mode

**Examples:**

```bash
# Create a simple agent
fractary-forge agent-create my-assistant \
  --description "My helpful assistant" \
  --model anthropic \
  --model-name claude-sonnet-4

# Create agent with tools
fractary-forge agent-create code-reviewer \
  --description "Code review assistant" \
  --tools "web-search,file-reader,code-analyzer" \
  --prompt "You are an expert code reviewer."

# Create agent extending another
fractary-forge agent-create specialized-assistant \
  --extends my-assistant \
  --description "Specialized version"

# Interactive mode
fractary-forge agent-create my-agent --interactive
```

**Output:**
Creates `.fractary/agents/<name>.yaml` with the agent definition.

---

### agent-info

Show detailed information about a specific agent.

**Syntax:**
```bash
fractary-forge agent-info <name> [options]
```

**Arguments:**
- `name` - Agent name (with optional version, e.g., agent@1.0.0)

**Options:**
- `--json` - Output as JSON
- `--show-tools` - Show detailed tool information
- `--show-prompt` - Include full system prompt

**Examples:**

```bash
# Show agent info
fractary-forge agent-info my-assistant

# Show with full details
fractary-forge agent-info my-assistant --show-tools --show-prompt

# JSON output
fractary-forge agent-info my-assistant --json
```

**Output:**
```
Name: my-assistant
Version: 1.0.0
Description: My helpful assistant
Model: anthropic/claude-sonnet-4
Tools: web-search, file-reader
Location: local (.fractary/agents/)
```

---

### agent-list

List available agents with optional filtering.

**Syntax:**
```bash
fractary-forge agent-list [options]
```

**Options:**
- `--tags <tags>` - Filter by tags (comma-separated)
- `--json` - Output as JSON

**Examples:**

```bash
# List all agents
fractary-forge agent-list

# Filter by tags
fractary-forge agent-list --tags "assistant,chat"

# JSON output
fractary-forge agent-list --json
```

**Output:**
```
Available Agents:
  my-assistant@1.0.0        My helpful assistant
  code-reviewer@1.0.0       Code review assistant
  data-analyst@1.0.0        Data analysis specialist

Total: 3 agents
```

---

### agent-validate

Validate an agent definition against the schema.

**Syntax:**
```bash
fractary-forge agent-validate <name> [options]
```

**Arguments:**
- `name` - Agent name (with optional version)

**Options:**
- `--strict` - Enable strict validation
- `--check-tools` - Verify all tool references exist
- `--json` - Output as JSON

**Examples:**

```bash
# Validate agent
fractary-forge agent-validate my-assistant

# Strict validation with tool checking
fractary-forge agent-validate my-assistant --strict --check-tools
```

**Output:**
```
✓ Agent definition is valid
✓ All tool references exist
✓ Schema validation passed
```

---

## Registry Management

### install

Install a plugin from the registry.

**Syntax:**
```bash
fractary-forge install <plugin> [options]
```

**Arguments:**
- `plugin` - Plugin name or URL

**Options:**
- `--version <ver>` - Specific version to install
- `--dev` - Install as dev dependency
- `--global` - Install globally (~/.fractary/registry)
- `--force` - Force reinstall if already installed
- `--agents-only` - Install only agents
- `--tools-only` - Install only tools
- `--dry-run` - Show what would be installed

**Examples:**

```bash
# Install latest version
fractary-forge install @fractary/faber-plugin

# Install specific version
fractary-forge install @fractary/faber-plugin --version 1.2.0

# Install globally
fractary-forge install @fractary/faber-plugin --global

# Install only agents
fractary-forge install @fractary/faber-plugin --agents-only

# Dry run
fractary-forge install @fractary/faber-plugin --dry-run
```

**Output:**
```
Installing @fractary/faber-plugin@1.2.0...
✓ Downloaded plugin manifest
✓ Verified checksums
✓ Installed 5 agents
✓ Installed 12 tools
✓ Installed 3 workflows

Installation complete!
```

---

### uninstall

Uninstall a plugin.

**Syntax:**
```bash
fractary-forge uninstall <plugin> [options]
```

**Arguments:**
- `plugin` - Plugin name

**Options:**
- `--global` - Uninstall from global registry

**Examples:**

```bash
# Uninstall local plugin
fractary-forge uninstall @fractary/faber-plugin

# Uninstall global plugin
fractary-forge uninstall @fractary/faber-plugin --global
```

**Output:**
```
Uninstalling @fractary/faber-plugin...
✓ Removed 5 agents
✓ Removed 12 tools
✓ Removed 3 workflows

Uninstall complete!
```

---

### list

List installed plugins.

**Syntax:**
```bash
fractary-forge list [options]
```

**Options:**
- `--type <type>` - Filter by type (agent|tool)
- `--scope <scope>` - Filter by scope (local|global|project)
- `--json` - Output as JSON

**Examples:**

```bash
# List all plugins
fractary-forge list

# List only agents
fractary-forge list --type agent

# List global plugins
fractary-forge list --scope global

# JSON output
fractary-forge list --json
```

**Output:**
```
Installed Plugins:

Local (.fractary/):
  @fractary/faber-plugin@1.2.0
    5 agents, 12 tools, 3 workflows

Global (~/.fractary/registry/):
  @fractary/base-agents@2.0.0
    10 agents, 5 tools

Total: 2 plugins
```

---

### info

Show detailed information about a plugin.

**Syntax:**
```bash
fractary-forge info <plugin> [options]
```

**Arguments:**
- `plugin` - Plugin name

**Options:**
- `--json` - Output as JSON

**Examples:**

```bash
# Show plugin info
fractary-forge info @fractary/faber-plugin

# JSON output
fractary-forge info @fractary/faber-plugin --json
```

**Output:**
```
@fractary/faber-plugin@1.2.0

Description: FABER workflow plugin for agent development
Author: Fractary Team
License: MIT

Components:
  Agents: 5
  Tools: 12
  Workflows: 3
  Commands: 2

Location: local (.fractary/)
Installed: 2025-12-17
```

---

### search

Search the registry for available plugins.

**Syntax:**
```bash
fractary-forge search <query> [options]
```

**Arguments:**
- `query` - Search query

**Options:**
- `--type <type>` - Filter by type (agent|tool)
- `--tags <tags>` - Filter by tags (comma-separated)
- `--limit <n>` - Limit results (default: 20)
- `--json` - Output as JSON

**Examples:**

```bash
# Search for plugins
fractary-forge search "coding assistant"

# Filter by type and tags
fractary-forge search "assistant" --type agent --tags "coding,review"

# Limit results
fractary-forge search "data" --limit 10
```

**Output:**
```
Search results for "coding assistant":

@fractary/code-assistant@1.5.0
  AI coding assistant with multi-language support
  Downloads: 1.2k | Rating: 4.8/5

@fractary/code-reviewer@2.0.0
  Expert code review agent
  Downloads: 850 | Rating: 4.6/5

Found 2 plugins
```

---

### lock

Generate or update the lockfile with current plugin versions.

**Syntax:**
```bash
fractary-forge lock [options]
```

**Options:**
- `--update` - Update lockfile with current versions

**Examples:**

```bash
# Generate lockfile
fractary-forge lock

# Update existing lockfile
fractary-forge lock --update
```

**Output:**
```
Generating lockfile...
✓ Locked 3 plugins
✓ Locked 15 agents
✓ Locked 27 tools

Lockfile saved to .fractary/forge/lockfile.json
```

---

### update

Update installed plugins to latest versions.

**Syntax:**
```bash
fractary-forge update [plugin] [options]
```

**Arguments:**
- `plugin` - Specific plugin to update (optional, updates all if omitted)

**Options:**
- `--major` - Allow major version updates
- `--dry-run` - Show what would be updated without updating

**Examples:**

```bash
# Update all plugins
fractary-forge update

# Update specific plugin
fractary-forge update @fractary/faber-plugin

# Allow major updates
fractary-forge update --major

# Dry run
fractary-forge update --dry-run
```

**Output:**
```
Checking for updates...

Updates available:
  @fractary/faber-plugin: 1.2.0 → 1.3.0
  @fractary/base-agents: 2.0.0 → 2.1.0

Apply updates? (y/n)
```

---

## Fork & Merge Operations

### fork

Fork a component for customization.

**Syntax:**
```bash
fractary-forge fork <source> [options]
```

**Arguments:**
- `source` - Component to fork (e.g., @plugin/agent-name)

**Options:**
- `--name <name>` - Custom name for fork
- `--local` - Fork to local registry (.fractary/)

**Examples:**

```bash
# Fork an agent
fractary-forge fork @fractary/base-assistant

# Fork with custom name
fractary-forge fork @fractary/base-assistant --name my-assistant

# Fork to local
fractary-forge fork @fractary/base-assistant --local
```

**Output:**
```
Forking @fractary/base-assistant...
✓ Created fork: my-assistant
✓ Tracking upstream: @fractary/base-assistant@1.0.0
✓ Saved to .fractary/agents/my-assistant.yaml

You can now customize the forked agent.
```

---

### merge

Merge upstream changes into forked component.

**Syntax:**
```bash
fractary-forge merge [options]
```

**Options:**
- `--strategy <type>` - Merge strategy (auto|manual|local|upstream)
- `--dry-run` - Show changes without applying

**Examples:**

```bash
# Auto merge
fractary-forge merge

# Manual conflict resolution
fractary-forge merge --strategy manual

# Dry run
fractary-forge merge --dry-run
```

**Output:**
```
Checking for upstream updates...

Updates available for:
  my-assistant: 1.0.0 → 1.1.0

Merging changes...
✓ No conflicts detected
✓ Merged successfully

Updated 1 component
```

---

## Cache Management

### cache clear

Clear the registry cache.

**Syntax:**
```bash
fractary-forge cache clear [options]
```

**Options:**
- `--all` - Clear all cache entries
- `--expired` - Clear only expired entries
- `--pattern <glob>` - Clear matching pattern

**Examples:**

```bash
# Clear all cache
fractary-forge cache clear --all

# Clear expired entries
fractary-forge cache clear --expired

# Clear by pattern
fractary-forge cache clear --pattern "@fractary/*"
```

**Output:**
```
Clearing cache...
✓ Cleared 15 entries
✓ Freed 2.3 MB

Cache cleared successfully
```

---

### cache stats

Show cache statistics.

**Syntax:**
```bash
fractary-forge cache stats [options]
```

**Options:**
- `--json` - Output as JSON

**Examples:**

```bash
# Show cache stats
fractary-forge cache stats

# JSON output
fractary-forge cache stats --json
```

**Output:**
```
Cache Statistics:

Total entries: 25
Fresh entries: 20
Expired entries: 5
Total size: 4.7 MB
Cache directory: ~/.fractary/cache/manifests
```

---

## Authentication

### login

Authenticate with a registry.

**Syntax:**
```bash
fractary-forge login [options]
```

**Options:**
- `--registry <url>` - Registry URL
- `--token <token>` - Authentication token

**Examples:**

```bash
# Interactive login
fractary-forge login

# Login with token
fractary-forge login --token ghp_xxxxxxxxxxxxx

# Login to specific registry
fractary-forge login --registry https://registry.example.com
```

**Output:**
```
Authenticating with registry...
✓ Authentication successful

Logged in as: username
```

---

### logout

Clear authentication credentials.

**Syntax:**
```bash
fractary-forge logout [options]
```

**Options:**
- `--registry <url>` - Logout from specific registry
- `--all` - Logout from all registries

**Examples:**

```bash
# Logout from default registry
fractary-forge logout

# Logout from specific registry
fractary-forge logout --registry https://registry.example.com

# Logout from all
fractary-forge logout --all
```

**Output:**
```
Logging out...
✓ Cleared authentication credentials

Logged out successfully
```

---

### whoami

Show current authenticated user.

**Syntax:**
```bash
fractary-forge whoami [options]
```

**Options:**
- `--registry <url>` - Check specific registry
- `--json` - Output as JSON

**Examples:**

```bash
# Show current user
fractary-forge whoami

# Check specific registry
fractary-forge whoami --registry https://registry.example.com

# JSON output
fractary-forge whoami --json
```

**Output:**
```
Authenticated as: username
Registry: https://registry.fractary.dev
```

---

## Registry Configuration

### registry add

Add a custom registry source.

**Syntax:**
```bash
fractary-forge registry add <url> [options]
```

**Arguments:**
- `url` - Registry URL

**Options:**
- `--name <name>` - Registry name
- `--priority <n>` - Priority order (lower = higher priority)

**Examples:**

```bash
# Add registry
fractary-forge registry add https://registry.example.com --name example

# Add with priority
fractary-forge registry add https://internal.company.com/registry \
  --name company-internal \
  --priority 1
```

**Output:**
```
Adding registry...
✓ Registry added: example
✓ URL: https://registry.example.com
✓ Priority: 2

Registry configured successfully
```

---

### registry list

List all configured registries.

**Syntax:**
```bash
fractary-forge registry list [options]
```

**Options:**
- `--json` - Output as JSON

**Examples:**

```bash
# List registries
fractary-forge registry list

# JSON output
fractary-forge registry list --json
```

**Output:**
```
Configured Registries:

1. fractary-core (priority: 1)
   URL: https://registry.fractary.dev
   Status: enabled

2. company-internal (priority: 2)
   URL: https://internal.company.com/registry
   Status: enabled

Total: 2 registries
```

---

### registry remove

Remove a registry source.

**Syntax:**
```bash
fractary-forge registry remove <name>
```

**Arguments:**
- `name` - Registry name

**Examples:**

```bash
# Remove registry
fractary-forge registry remove example
```

**Output:**
```
Removing registry...
✓ Registry removed: example

Registry removed successfully
```

---

## Global Options

These options work with all commands:

- `--help` / `-h` - Show command help
- `--version` / `-v` - Show CLI version
- `--verbose` - Enable verbose logging
- `--quiet` / `-q` - Suppress non-error output

**Examples:**

```bash
# Show help
fractary-forge --help
fractary-forge install --help

# Show version
fractary-forge --version

# Verbose mode
fractary-forge install @fractary/faber-plugin --verbose

# Quiet mode
fractary-forge list --quiet
```

---

## See Also

- [Getting Started Guide](./getting-started.md) - Installation and first steps
- [Workflow Guides](./workflow-guides.md) - Common workflows and patterns
- [API Reference](./api-reference.md) - SDK API documentation
- [Configuration Guide](./configuration.md) - Configuration options
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
