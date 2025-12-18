# Configuration Guide

Complete guide to configuring Fractary Forge for your project and environment.

## Table of Contents

- [Configuration Files](#configuration-files)
- [Project Configuration](#project-configuration)
- [Global Configuration](#global-configuration)
- [Registry Configuration](#registry-configuration)
- [Environment Variables](#environment-variables)
- [Default Settings](#default-settings)
- [Advanced Configuration](#advanced-configuration)

## Configuration Files

Fractary Forge uses YAML configuration files at different levels:

| File | Location | Purpose |
|------|----------|---------|
| **Project Config** | `.fractary/forge/config.yaml` | Project-specific settings |
| **Global Config** | `~/.fractary/config.yaml` | User-wide default settings |
| **Lockfile** | `.fractary/forge/lockfile.json` | Version locks and integrity hashes |

### Configuration Priority

Settings are merged in this order (later overrides earlier):
1. Global configuration (`~/.fractary/config.yaml`)
2. Project configuration (`.fractary/forge/config.yaml`)
3. Environment variables
4. Command-line flags

## Project Configuration

### Basic Project Config

Located at `.fractary/forge/config.yaml`:

```yaml
# Organization identifier
organization: myorg

# Registry configuration
registry:
  local:
    enabled: true
    agents_path: .fractary/agents
    tools_path: .fractary/tools
    workflows_path: .fractary/workflows

  global:
    enabled: true
    path: ~/.fractary/registry

  stockyard:
    enabled: false
    url: https://stockyard.fractary.dev

# Lockfile settings
lockfile:
  path: .fractary/forge/lockfile.json
  auto_generate: true
  validate_on_install: true

# Update behavior
updates:
  check_frequency: daily
  auto_update: false
  breaking_changes_policy: prompt

# Default settings for new agents
defaults:
  agent:
    model:
      provider: anthropic
      name: claude-sonnet-4
    config:
      temperature: 0.7
      max_tokens: 4096
    tags:
      - assistant

  tool:
    implementation:
      type: function
```

### Initialize Project Config

```bash
# Basic initialization
fractary-forge init --org myorg

# With global registry
fractary-forge init --org myorg --global

# Force overwrite
fractary-forge init --org myorg --force
```

## Global Configuration

### Global Config Location

`~/.fractary/config.yaml`:

```yaml
# Default organization
default_organization: myorg

# Global registry path
global_registry_path: ~/.fractary/registry

# Cache settings
cache:
  enabled: true
  directory: ~/.fractary/cache
  ttl: 3600  # 1 hour in seconds
  max_size: 1073741824  # 1GB in bytes

# Network settings
network:
  timeout: 30000  # 30 seconds
  retry_attempts: 3
  retry_delay: 1000  # 1 second

# Default model preferences
defaults:
  agent:
    model:
      provider: anthropic
      name: claude-sonnet-4

# User authentication
auth:
  tokens: {}  # Managed by login/logout commands
```

## Registry Configuration

### Configure Registries

Registries are sources for plugins and components.

#### Default Registry

```yaml
# In .fractary/forge/config.yaml
registries:
  - name: fractary-core
    type: manifest
    url: https://raw.githubusercontent.com/fractary/plugins/main/registry.json
    enabled: true
    priority: 1
```

#### Multiple Registries

```yaml
registries:
  # Company internal registry (highest priority)
  - name: company-internal
    type: manifest
    url: https://registry.company.com/manifest.json
    enabled: true
    priority: 1
    auth_required: true

  # Public Fractary registry
  - name: fractary-public
    type: manifest
    url: https://registry.fractary.dev/manifest.json
    enabled: true
    priority: 2

  # Development registry
  - name: dev-registry
    type: manifest
    url: https://dev.registry.company.com/manifest.json
    enabled: false  # Disabled by default
    priority: 3
```

#### Add Registry via CLI

```bash
# Add registry
fractary-forge registry add https://registry.example.com \
  --name example-registry \
  --priority 2

# List registries
fractary-forge registry list

# Remove registry
fractary-forge registry remove example-registry
```

### Registry Types

#### Manifest Registry

Standard registry type using JSON manifests:

```yaml
- name: my-registry
  type: manifest
  url: https://example.com/registry.json
  enabled: true
  priority: 1
```

#### Local Directory Registry

Use a local directory as a registry:

```yaml
- name: local-dev
  type: local
  path: /path/to/registry
  enabled: true
  priority: 1
```

## Environment Variables

Override configuration via environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `FORGE_ORG` | Default organization | `FORGE_ORG=myorg` |
| `FORGE_REGISTRY_URL` | Override registry URL | `FORGE_REGISTRY_URL=https://...` |
| `FORGE_CACHE_DIR` | Cache directory | `FORGE_CACHE_DIR=/tmp/forge-cache` |
| `FORGE_CONFIG` | Config file path | `FORGE_CONFIG=/path/to/config.yaml` |
| `FORGE_LOG_LEVEL` | Logging level | `FORGE_LOG_LEVEL=debug` |
| `FORGE_NO_CACHE` | Disable caching | `FORGE_NO_CACHE=true` |

### Using Environment Variables

```bash
# Set for current session
export FORGE_ORG=mycompany
export FORGE_LOG_LEVEL=debug

# Use in commands
FORGE_NO_CACHE=true fractary-forge install @fractary/plugin

# In .env file
echo "FORGE_ORG=myorg" >> .env
echo "FORGE_LOG_LEVEL=info" >> .env
```

## Default Settings

### Agent Defaults

Configure default settings for new agents:

```yaml
defaults:
  agent:
    model:
      provider: anthropic
      name: claude-sonnet-4
      temperature: 0.7
      max_tokens: 4096

    config:
      stream: true
      timeout: 30000

    tags:
      - assistant
      - custom

    metadata:
      created_by: myorg
      environment: production
```

### Tool Defaults

```yaml
defaults:
  tool:
    implementation:
      type: function
      timeout: 10000

    metadata:
      author: myorg
```

### Workflow Defaults

```yaml
defaults:
  workflow:
    version: 1.0.0
    tags:
      - faber

    phases:
      - frame
      - architect
      - build
      - evaluate
      - release
```

## Advanced Configuration

### Multi-Environment Setup

Configure different settings per environment:

```yaml
# .fractary/forge/config.yaml
organization: mycompany

# Common settings
registry:
  local:
    enabled: true

# Environment-specific overrides
environments:
  development:
    defaults:
      agent:
        model:
          name: claude-haiku-4  # Faster, cheaper
    registry:
      stockyard:
        enabled: false
    cache:
      ttl: 300  # 5 minutes

  staging:
    defaults:
      agent:
        model:
          name: claude-sonnet-4
    registry:
      stockyard:
        enabled: true
    cache:
      ttl: 1800  # 30 minutes

  production:
    defaults:
      agent:
        model:
          name: claude-sonnet-4
    registry:
      stockyard:
        enabled: true
    cache:
      ttl: 3600  # 1 hour
```

Use with environment variable:

```bash
export FORGE_ENV=production
fractary-forge agent-create my-agent
```

### Custom Paths

Override default paths:

```yaml
paths:
  agents: custom/agents/directory
  tools: custom/tools/directory
  workflows: custom/workflows/directory
  cache: custom/cache/directory
  lockfile: custom/lockfile.json
```

### Proxy Configuration

Configure proxy for registry access:

```yaml
network:
  proxy:
    enabled: true
    http: http://proxy.company.com:8080
    https: https://proxy.company.com:8443
    no_proxy:
      - localhost
      - 127.0.0.1
      - .company.com
```

### Custom Headers

Add custom headers to registry requests:

```yaml
network:
  headers:
    User-Agent: MyCompany-Forge/1.0
    X-Custom-Header: value
```

### Retry Configuration

Configure retry behavior:

```yaml
network:
  retry:
    attempts: 3
    delay: 1000  # Initial delay in ms
    max_delay: 10000  # Max delay in ms
    backoff_factor: 2  # Exponential backoff multiplier
```

### Cache Configuration

Fine-tune caching behavior:

```yaml
cache:
  enabled: true
  directory: ~/.fractary/cache

  # Time-to-live settings
  ttl:
    manifests: 3600  # 1 hour
    plugins: 86400   # 24 hours
    search: 1800     # 30 minutes

  # Size limits
  max_size: 1073741824  # 1GB total
  max_entry_size: 10485760  # 10MB per entry

  # Cleanup settings
  cleanup:
    enabled: true
    interval: 3600  # Clean every hour
    keep_fresh: true  # Keep fresh entries
```

### Validation Settings

Configure validation strictness:

```yaml
validation:
  # Schema validation
  strict: true
  allow_additional_properties: false

  # Tool reference checking
  check_tool_references: true
  require_tool_versions: false

  # Agent validation
  require_description: true
  require_tags: false
  min_tags: 1
  max_tags: 10
```

### Lockfile Settings

Configure lockfile behavior:

```yaml
lockfile:
  path: .fractary/forge/lockfile.json

  # Auto-generate on install/update
  auto_generate: true

  # Validate integrity on install
  validate_on_install: true

  # Algorithm for integrity hashes
  integrity_algorithm: sha256

  # Include dependencies in lockfile
  include_dependencies: true
```

### Logging Configuration

Configure logging:

```yaml
logging:
  level: info  # error, warn, info, debug, trace

  # Log to file
  file:
    enabled: true
    path: ~/.fractary/logs/forge.log
    max_size: 10485760  # 10MB
    max_files: 5

  # Console output
  console:
    enabled: true
    colors: true
    timestamp: true
```

## Configuration Schema

Full schema reference:

```yaml
# Organization
organization: string

# Paths
paths:
  agents: string
  tools: string
  workflows: string
  cache: string
  lockfile: string

# Registry
registry:
  local:
    enabled: boolean
    agents_path: string
    tools_path: string
    workflows_path: string
  global:
    enabled: boolean
    path: string
  stockyard:
    enabled: boolean
    url: string

# Registries
registries:
  - name: string
    type: manifest | local
    url: string
    path: string
    enabled: boolean
    priority: number
    auth_required: boolean

# Lockfile
lockfile:
  path: string
  auto_generate: boolean
  validate_on_install: boolean
  integrity_algorithm: string
  include_dependencies: boolean

# Updates
updates:
  check_frequency: never | daily | weekly | always
  auto_update: boolean
  breaking_changes_policy: block | prompt | allow

# Cache
cache:
  enabled: boolean
  directory: string
  ttl: number | object
  max_size: number
  max_entry_size: number
  cleanup: object

# Network
network:
  timeout: number
  retry_attempts: number
  retry_delay: number
  proxy: object
  headers: object

# Defaults
defaults:
  agent: object
  tool: object
  workflow: object

# Validation
validation:
  strict: boolean
  allow_additional_properties: boolean
  check_tool_references: boolean
  require_description: boolean

# Logging
logging:
  level: string
  file: object
  console: object

# Environments
environments:
  <env-name>: object
```

## See Also

- [Command Reference](./command-reference.md) - CLI command documentation
- [Getting Started](./getting-started.md) - Installation and basics
- [Workflow Guides](./workflow-guides.md) - Common workflows
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
