# Fractary Forge Naming Conventions

This document defines the **official naming conventions** for all Fractary Forge systems to ensure consistency, discoverability, and cross-system alignment.

---

## Core Principle: {noun}-{action}

**The noun ALWAYS comes first, followed by the action.**

This pattern applies across all systems with case style variations appropriate to each language/platform.

### Why {noun}-{action}?

1. **Logical Grouping**: All operations on the same noun are grouped together
2. **Autocomplete Friendly**: Type `agent` and see all agent operations
3. **Scalability**: Easy to add new nouns and actions without conflicts
4. **Consistency**: Single pattern across JavaScript, Python, CLI, and MCP

---

## System-Specific Conventions

### JavaScript SDK (`@fractary/forge`)

**Pattern**: `{noun}{Action}` in camelCase

```javascript
// AgentAPI
agentResolve()        // ✅ Correct
agentHas()           // ✅ Correct
agentInfoGet()       // ✅ Correct
agentList()          // ✅ Correct
agentHealthCheck()   // ✅ Correct
agentCacheRefresh()  // ✅ Correct

// ToolAPI
toolResolve()        // ✅ Correct
toolHas()            // ✅ Correct
toolInfoGet()        // ✅ Correct
toolList()           // ✅ Correct
toolExecute()        // ✅ Correct

// Wrong - action comes first
resolveAgent()       // ❌ Wrong
getAgentInfo()       // ❌ Wrong
executeTool()        // ❌ Wrong
```

**Rules**:
- First word: lowercase noun (agent, tool, cache, config, fork)
- Subsequent words: PascalCase (Resolve, InfoGet, List)
- No underscores or hyphens
- Example: `agentCacheRefresh()` = agent (noun) + cache (qualifier) + refresh (action)

---

### Python SDK (`fractary-forge`)

**Pattern**: `{noun}_{action}` in snake_case

```python
# AgentRegistry
agent_resolve()        # ✅ Correct
agent_has()           # ✅ Correct
agent_info_get()      # ✅ Correct
agent_list()          # ✅ Correct
agent_health_check()  # ✅ Correct
agent_cache_refresh() # ✅ Correct

# ToolRegistry
tool_resolve()        # ✅ Correct
tool_has()            # ✅ Correct
tool_info_get()       # ✅ Correct
tool_list()           # ✅ Correct
tool_execute()        # ✅ Correct

# Wrong - action comes first
resolve_agent()       # ❌ Wrong
get_agent_info()      # ❌ Wrong
execute_tool()        # ❌ Wrong
```

**Rules**:
- All lowercase
- Words separated by underscores
- Noun always first
- Example: `agent_cache_refresh()` = agent (noun) + cache (qualifier) + refresh (action)

---

### CLI Commands (`fractary-forge`)

**Pattern**: `{noun}-{action}` in kebab-case

```bash
# Agent commands
fractary-forge agent-info         # ✅ Correct
fractary-forge agent-list         # ✅ Correct
fractary-forge agent-validate     # ✅ Correct
fractary-forge agent-create       # ✅ Correct

# Tool commands
fractary-forge tool-info          # ✅ Correct
fractary-forge tool-list          # ✅ Correct
fractary-forge tool-validate      # ✅ Correct
fractary-forge tool-create        # ✅ Correct

# Registry commands
fractary-forge registry add       # ✅ Correct (subcommand style)
fractary-forge cache clear        # ✅ Correct (subcommand style)

# Wrong - action comes first
fractary-forge info-agent         # ❌ Wrong
fractary-forge list-tools         # ❌ Wrong
```

**Rules**:
- All lowercase
- Words separated by hyphens
- Noun always first
- May use subcommand style for multi-word nouns (e.g., `registry add`)
- Example: `agent-create` = agent (noun) + create (action)

---

### MCP Tools (`@fractary/forge-mcp`)

**Pattern**: `fractary_forge_{noun}_{action}` in snake_case with prefix

```
# Agent tools
fractary_forge_agent_info         # ✅ Correct
fractary_forge_agent_list         # ✅ Correct
fractary_forge_agent_validate     # ✅ Correct

# Tool tools
fractary_forge_tool_info          # ✅ Correct
fractary_forge_tool_list          # ✅ Correct
fractary_forge_tool_validate      # ✅ Correct

# Config tools
fractary_forge_config_get         # ✅ Correct
fractary_forge_config_show        # ✅ Correct
fractary_forge_config_registry_list  # ✅ Correct

# Cache tools
fractary_forge_cache_stats        # ✅ Correct
fractary_forge_cache_clear        # ✅ Correct

# Fork tools
fractary_forge_fork_list          # ✅ Correct
fractary_forge_fork_info          # ✅ Correct
fractary_forge_fork_diff          # ✅ Correct
fractary_forge_fork_check         # ✅ Correct

# Plugin tools
fractary_forge_plugin_list        # ✅ Correct
fractary_forge_plugin_info        # ✅ Correct
fractary_forge_plugin_search      # ✅ Correct

# Wrong - missing prefix or wrong order
agent_info                        # ❌ Wrong (missing prefix)
forge_agent_info                  # ❌ Wrong (wrong prefix)
fractary_forge_info_agent         # ❌ Wrong (action first)
```

**Rules**:
- ALL tools MUST have `fractary_forge_` prefix (prevents conflicts with other MCP servers)
- After prefix: `{noun}_{action}` pattern
- All lowercase snake_case
- Example: `fractary_forge_agent_info` = fractary_forge (prefix) + agent (noun) + info (action)

**Why the prefix?**
- MCP servers from different vendors run in the same namespace
- The `fractary_forge_` prefix ensures our tools never conflict with others
- While some MCP clients provide automatic namespacing, we maintain our own prefix for maximum compatibility

---

### Claude Plugin Commands

**Pattern**: `fractary-forge-agent:{noun}-{action}` in kebab-case with prefix

```
# Agent commands
fractary-forge-agent:agent-create        # ✅ Correct
fractary-forge-agent:agent-validate      # ✅ Correct

# Plugin commands
fractary-forge-agent:plugin-create       # ✅ Correct
fractary-forge-agent:plugin-validate     # ✅ Correct

# Workflow commands
fractary-forge-agent:workflow-create     # ✅ Correct

# Wrong - old prefix or wrong pattern
fractary-faber-agent:create-agent        # ❌ Wrong (old prefix + action first)
fractary-forge-agent:create-agent        # ❌ Wrong (action first)
```

**Rules**:
- Plugin prefix: `fractary-forge-agent:` (note: was `fractary-faber-agent:` before v1.2.0)
- After colon: `{noun}-{action}` in kebab-case
- Example: `fractary-forge-agent:agent-create` = plugin prefix + agent (noun) + create (action)

---

## Nouns Used in Fractary Forge

| Noun | Description | Examples |
|------|-------------|----------|
| `agent` | AI agent definitions | agent_resolve, agent_info_get, agent_list |
| `tool` | Tool definitions and execution | tool_resolve, tool_execute, tool_info_get |
| `plugin` | Plugin/package management | plugin_install, plugin_list, plugin_search |
| `config` | Configuration management | config_get, config_show, config_init |
| `cache` | Cache operations | cache_clear, cache_stats, cache_refresh |
| `registry` | Registry management | registry_add, registry_remove, registry_list |
| `fork` | Fork management | fork_list, fork_info, fork_diff, fork_check |
| `workflow` | Workflow creation (Claude plugin) | workflow_create |

---

## Common Actions

| Action | Meaning | Examples |
|--------|---------|----------|
| `resolve` | Find and load a definition | agent_resolve, tool_resolve |
| `get` | Retrieve information | agent_info_get, config_get |
| `list` | List available items | agent_list, tool_list, plugin_list |
| `has` | Check existence | agent_has, tool_has |
| `create` | Create new item | agent_create, workflow_create |
| `validate` | Validate definition | agent_validate, tool_validate |
| `execute` | Run/execute | tool_execute |
| `install` | Install package | plugin_install |
| `search` | Search for items | plugin_search |
| `clear` | Clear/reset | cache_clear |
| `refresh` | Update/refresh | cache_refresh |
| `diff` | Show differences | fork_diff |
| `check` | Health/status check | agent_health_check, fork_check |

---

## Comparison: Old vs New

### Before v1.2.0 (❌ Inconsistent)

```javascript
// JavaScript SDK - action first
resolveAgent()          // ❌ Inconsistent
getAgentInfo()          // ❌ Inconsistent
executeTool()           // ❌ Inconsistent

// CLI - noun first
agent-info              // ✅ Already correct
tool-list               // ✅ Already correct

// MCP - noun first
fractary_forge_agent_info  // ✅ Already correct

// Python SDK - didn't exist
```

### After v1.2.0 (✅ Consistent)

```javascript
// JavaScript SDK - noun first
agentResolve()          // ✅ Consistent
agentInfoGet()          // ✅ Consistent
toolExecute()           // ✅ Consistent

// CLI - noun first
agent-info              // ✅ Consistent
tool-list               // ✅ Consistent

// MCP - noun first
fractary_forge_agent_info  // ✅ Consistent

// Python SDK - noun first
agent_resolve()         // ✅ Consistent
agent_info_get()        // ✅ Consistent
tool_execute()          // ✅ Consistent
```

---

## Quick Reference Table

| System | Pattern | Example | Case Style |
|--------|---------|---------|------------|
| **JavaScript SDK** | {noun}{Action} | `agentResolve()` | camelCase |
| **Python SDK** | {noun}_{action} | `agent_resolve()` | snake_case |
| **CLI** | {noun}-{action} | `agent-info` | kebab-case |
| **MCP** | fractary_forge_{noun}_{action} | `fractary_forge_agent_info` | snake_case + prefix |
| **Claude Plugin** | fractary-forge-agent:{noun}-{action} | `fractary-forge-agent:agent-create` | kebab-case + prefix |

---

## Guidelines for New Operations

When adding new operations to Fractary Forge:

1. **Identify the noun**: What entity are you operating on? (agent, tool, config, etc.)
2. **Identify the action**: What operation are you performing? (resolve, get, list, create, etc.)
3. **Apply the pattern**: Put noun first, then action, using the case style for your system
4. **Check consistency**: Does a similar operation already exist? Use the same action verb

### Examples

Adding a new "export" action for agents:

```javascript
// JavaScript SDK
agentExport()                           // ✅ Correct

// Python SDK
agent_export()                          // ✅ Correct

// CLI
fractary-forge agent-export             // ✅ Correct

// MCP
fractary_forge_agent_export             // ✅ Correct
```

Adding a new "workflow" noun:

```javascript
// JavaScript SDK
workflowCreate()                        // ✅ Correct
workflowList()                          // ✅ Correct

// Python SDK
workflow_create()                       // ✅ Correct
workflow_list()                         // ✅ Correct

// CLI
fractary-forge workflow-create          // ✅ Correct
fractary-forge workflow-list            // ✅ Correct

// MCP
fractary_forge_workflow_create          // ✅ Correct
fractary_forge_workflow_list            // ✅ Correct
```

---

## Enforcement

- **TypeScript/JavaScript**: Enforced through code structure and PR reviews
- **Python**: Enforced through linting and type checking
- **CLI**: Enforced through command registration
- **MCP**: Enforced through tool registration
- **Documentation**: This document is the source of truth

---

## References

- **Migration Guide**: See [MIGRATION-GUIDE-v1.2.0.md](../MIGRATION-GUIDE-v1.2.0.md)
- **Specification**: See [specs/SPEC-20251217-system-alignment.md](../specs/SPEC-20251217-system-alignment.md)
- **JavaScript SDK**: See [sdk/js/README.md](../sdk/js/README.md)
- **Python SDK**: See [sdk/python/README.md](../sdk/python/README.md)

---

**Last Updated**: 2025-12-17
**Version**: 1.2.0
