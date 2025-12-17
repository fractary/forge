# Migration Guide: Fractary Forge v1.2.0

## Breaking Changes: SDK Naming Convention Update

Version 1.2.0 introduces a **breaking change** to align all SDK methods with the `{noun}{Action}` naming convention. This improves API discoverability and consistency across the JavaScript SDK, Python SDK, CLI, and MCP server.

---

## JavaScript SDK (@fractary/forge)

### Overview

All SDK method names have been updated to follow the `{noun}{Action}` camelCase pattern, where the **noun comes first**, then the **action**.

### Why This Change?

1. **Consistency**: Aligns with Python SDK (`agent_resolve`), CLI (`agent-info`), and MCP (`fractary_forge_agent_info`)
2. **Discoverability**: Logical grouping makes it easier to find related methods (all agent methods start with `agent`)
3. **Future-proof**: Scalable pattern as the API grows

### Migration Steps

#### 1. Update AgentAPI Method Calls

| Old Method (v1.1.x) | New Method (v1.2.0) |
|---------------------|---------------------|
| `resolveAgent()` | `agentResolve()` |
| `hasAgent()` | `agentHas()` |
| `getAgentInfo()` | `agentInfoGet()` |
| `listAgents()` | `agentList()` |
| `healthCheck()` | `agentHealthCheck()` |
| `refreshCache()` | `agentCacheRefresh()` |

**Before:**
```javascript
import { AgentAPI } from '@fractary/forge';

const agentAPI = new AgentAPI();

// Old naming
const agent = await agentAPI.resolveAgent('my-agent');
const exists = await agentAPI.hasAgent('my-agent');
const info = await agentAPI.getAgentInfo('my-agent');
const agents = await agentAPI.listAgents({ tags: ['production'] });
const health = await agentAPI.healthCheck('my-agent');
await agentAPI.refreshCache('my-agent');
```

**After:**
```javascript
import { AgentAPI } from '@fractary/forge';

const agentAPI = new AgentAPI();

// New naming - noun comes first
const agent = await agentAPI.agentResolve('my-agent');
const exists = await agentAPI.agentHas('my-agent');
const info = await agentAPI.agentInfoGet('my-agent');
const agents = await agentAPI.agentList({ tags: ['production'] });
const health = await agentAPI.agentHealthCheck('my-agent');
await agentAPI.agentCacheRefresh('my-agent');
```

#### 2. Update ToolAPI Method Calls

| Old Method (v1.1.x) | New Method (v1.2.0) |
|---------------------|---------------------|
| `executeTool()` | `toolExecute()` |
| `hasTool()` | `toolHas()` |
| `getToolInfo()` | `toolInfoGet()` |
| `listTools()` | `toolList()` |

**Before:**
```javascript
import { ToolAPI } from '@fractary/forge';

const toolAPI = new ToolAPI();

// Old naming
const result = await toolAPI.executeTool('formatter', { code: 'const x = 1' });
const exists = await toolAPI.hasTool('formatter');
const info = await toolAPI.getToolInfo('formatter');
const tools = await toolAPI.listTools({ tags: ['utility'] });
```

**After:**
```javascript
import { ToolAPI } from '@fractary/forge';

const toolAPI = new ToolAPI();

// New naming - noun comes first
const result = await toolAPI.toolExecute('formatter', { code: 'const x = 1' });
const exists = await toolAPI.toolHas('formatter');
const info = await toolAPI.toolInfoGet('formatter');
const tools = await toolAPI.toolList({ tags: ['utility'] });
```

#### 3. Update DefinitionResolver Method Calls

| Old Method (v1.1.x) | New Method (v1.2.0) |
|---------------------|---------------------|
| `resolveAgent()` | `agentResolve()` |
| `resolveTool()` | `toolResolve()` |

**Before:**
```javascript
import { DefinitionResolver } from '@fractary/forge';

const resolver = new DefinitionResolver();

// Old naming
const agent = await resolver.resolveAgent('my-agent');
const tool = await resolver.resolveTool('my-tool');
```

**After:**
```javascript
import { DefinitionResolver } from '@fractary/forge';

const resolver = new DefinitionResolver();

// New naming - noun comes first
const agent = await resolver.agentResolve('my-agent');
const tool = await resolver.toolResolve('my-tool');
```

---

## Automated Migration

### Using Find and Replace

You can use these find-and-replace patterns to migrate your codebase:

#### AgentAPI
```bash
# Regex patterns for find-and-replace
agentAPI\.resolveAgent\(     → agentAPI.agentResolve(
agentAPI\.hasAgent\(         → agentAPI.agentHas(
agentAPI\.getAgentInfo\(     → agentAPI.agentInfoGet(
agentAPI\.listAgents\(       → agentAPI.agentList(
agentAPI\.healthCheck\(      → agentAPI.agentHealthCheck(
agentAPI\.refreshCache\(     → agentAPI.agentCacheRefresh(
```

#### ToolAPI
```bash
# Regex patterns for find-and-replace
toolAPI\.executeTool\(       → toolAPI.toolExecute(
toolAPI\.hasTool\(           → toolAPI.toolHas(
toolAPI\.getToolInfo\(       → toolAPI.toolInfoGet(
toolAPI\.listTools\(         → toolAPI.toolList(
```

#### DefinitionResolver
```bash
# Regex patterns for find-and-replace
resolver\.resolveAgent\(     → resolver.agentResolve(
resolver\.resolveTool\(      → resolver.toolResolve(
```

### Using sed (Unix/Linux/macOS)

```bash
# Update all TypeScript/JavaScript files in your project
find . -name "*.ts" -o -name "*.js" | xargs sed -i \
  -e 's/agentAPI\.resolveAgent(/agentAPI.agentResolve(/g' \
  -e 's/agentAPI\.hasAgent(/agentAPI.agentHas(/g' \
  -e 's/agentAPI\.getAgentInfo(/agentAPI.agentInfoGet(/g' \
  -e 's/agentAPI\.listAgents(/agentAPI.agentList(/g' \
  -e 's/agentAPI\.healthCheck(/agentAPI.agentHealthCheck(/g' \
  -e 's/agentAPI\.refreshCache(/agentAPI.agentCacheRefresh(/g' \
  -e 's/toolAPI\.executeTool(/toolAPI.toolExecute(/g' \
  -e 's/toolAPI\.hasTool(/toolAPI.toolHas(/g' \
  -e 's/toolAPI\.getToolInfo(/toolAPI.toolInfoGet(/g' \
  -e 's/toolAPI\.listTools(/toolAPI.toolList(/g' \
  -e 's/resolver\.resolveAgent(/resolver.agentResolve(/g' \
  -e 's/resolver\.resolveTool(/resolver.toolResolve(/g'
```

---

## Python SDK (New in v1.2.0)

The Python SDK is **brand new** in v1.2.0 and follows the `{noun}_{action}` snake_case convention from the start. No migration needed!

```python
from fractary_forge import AgentRegistry, ToolRegistry

# Agent operations
registry = AgentRegistry()
agent = registry.agent_resolve('my-agent')
info = registry.agent_info_get('my-agent')
agents = registry.agent_list()

# Tool operations
tool_registry = ToolRegistry()
tool = tool_registry.tool_resolve('my-tool')
info = tool_registry.tool_info_get('my-tool')
tools = tool_registry.tool_list()
```

---

## CLI (fractary-forge)

The CLI already follows `{noun}-{action}` kebab-case naming. No changes required.

```bash
# Already using noun-action pattern
fractary-forge agent-info my-agent
fractary-forge agent-list
fractary-forge tool-info my-tool
fractary-forge tool-list
```

---

## MCP Server (@fractary/forge-mcp)

MCP tools already follow `fractary_forge_{noun}_{action}` naming. No changes required.

```
fractary_forge_agent_info
fractary_forge_agent_list
fractary_forge_tool_info
fractary_forge_tool_list
```

---

## Naming Convention Reference

### Pattern: {noun}{Action}

The **noun** always comes **first**, followed by the **action**.

| ❌ Old (Wrong) | ✅ New (Correct) | Why? |
|---------------|------------------|------|
| `resolveAgent()` | `agentResolve()` | Agent is the noun, resolve is the action |
| `getAgentInfo()` | `agentInfoGet()` | Agent/info is the noun, get is the action |
| `executeTool()` | `toolExecute()` | Tool is the noun, execute is the action |
| `listAgents()` | `agentList()` | Agent is the noun, list is the action |

### System-Specific Conventions

| System | Case Style | Example | Pattern |
|--------|------------|---------|---------|
| **JavaScript SDK** | camelCase | `agentResolve()` | {noun}{Action} |
| **Python SDK** | snake_case | `agent_resolve()` | {noun}_{action} |
| **CLI** | kebab-case | `agent-info` | {noun}-{action} |
| **MCP Tools** | snake_case + prefix | `fractary_forge_agent_info` | fractary_forge_{noun}_{action} |

---

## Testing Your Migration

After migrating, verify your code works:

```javascript
import { AgentAPI, ToolAPI } from '@fractary/forge';

// Test AgentAPI
const agentAPI = new AgentAPI();
try {
  const agent = await agentAPI.agentResolve('test-agent');
  console.log('✓ AgentAPI migration successful');
} catch (error) {
  console.error('✗ AgentAPI migration failed:', error.message);
}

// Test ToolAPI
const toolAPI = new ToolAPI();
try {
  const tools = await toolAPI.toolList();
  console.log('✓ ToolAPI migration successful');
} catch (error) {
  console.error('✗ ToolAPI migration failed:', error.message);
}
```

---

## Rollback Plan

If you need to rollback to v1.1.x:

```bash
# Downgrade to previous version
npm install @fractary/forge@1.1.3

# Or use exact version in package.json
{
  "dependencies": {
    "@fractary/forge": "1.1.3"
  }
}
```

---

## Support

- **Issues**: https://github.com/fractary/forge/issues
- **Documentation**: https://github.com/fractary/forge#readme
- **Changelog**: https://github.com/fractary/forge/blob/main/CHANGELOG.md

---

## Summary

- ✅ JavaScript SDK: All methods renamed to {noun}{Action}
- ✅ Python SDK: New in v1.2.0, follows {noun}_{action} from start
- ✅ CLI: No changes, already follows {noun}-{action}
- ✅ MCP: No changes, already follows fractary_forge_{noun}_{action}

**Time to migrate**: 5-15 minutes for most projects using automated find-and-replace
