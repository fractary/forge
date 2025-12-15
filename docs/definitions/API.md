# Agent & Tool Definition System API

## Overview

The Agent & Tool Definition System provides a powerful way to define, manage, and execute AI agents and tools using YAML definitions with full semantic versioning support.

## Table of Contents

- [Quick Start](#quick-start)
- [AgentAPI](#agentapi)
- [ToolAPI](#toolapi)
- [Definition Schemas](#definition-schemas)
- [Registry System](#registry-system)
- [Advanced Features](#advanced-features)

---

## Quick Start

```typescript
import { AgentAPI, ToolAPI } from '@fractary/forge/definitions';

// Initialize APIs
const agentAPI = new AgentAPI();
const toolAPI = new ToolAPI();

// Load an agent
const agent = await agentAPI.resolveAgent('my-agent@^1.0.0');
const result = await agent.invoke('Generate a report about Q4 performance');
console.log(result.output);

// Execute a tool directly
const toolResult = await toolAPI.executeTool('data-processor', {
  input: 'sales-data.csv',
  format: 'json'
});
```

---

## AgentAPI

### `resolveAgent(name: string): Promise<ExecutableAgentInterface>`

Resolves and loads an executable agent by name with version constraint.

**Parameters:**
- `name` - Agent identifier with optional version (e.g., `"my-agent"`, `"my-agent@^1.0.0"`)

**Returns:** ExecutableAgentInterface with `invoke()` method

**Example:**
```typescript
const agent = await agentAPI.resolveAgent('data-analyst@^2.0.0');

const result = await agent.invoke('Analyze the sales trends', {
  period: 'Q4-2024',
  region: 'North America'
});

console.log(result.output);
console.log(result.structured_output); // Parsed JSON if available
console.log(result.usage); // Token usage stats
```

---

### `hasAgent(name: string): Promise<boolean>`

Checks if an agent exists in the registry.

**Parameters:**
- `name` - Agent identifier

**Returns:** `true` if agent exists, `false` otherwise

**Example:**
```typescript
if (await agentAPI.hasAgent('my-agent')) {
  const agent = await agentAPI.resolveAgent('my-agent');
  // Use agent
}
```

---

### `getAgentInfo(name: string): Promise<AgentInfo>`

Retrieves metadata about an agent without loading it.

**Parameters:**
- `name` - Agent identifier

**Returns:** AgentInfo object

**Example:**
```typescript
const info = await agentAPI.getAgentInfo('my-agent@1.0.0');
console.log(`Name: ${info.name}`);
console.log(`Version: ${info.version}`);
console.log(`Description: ${info.description}`);
console.log(`Tags: ${info.tags.join(', ')}`);
console.log(`Source: ${info.source}`); // local, global, or stockyard
```

---

### `healthCheck(name: string): Promise<HealthCheckResult>`

Performs comprehensive health check for CI/CD validation.

**Parameters:**
- `name` - Agent identifier

**Returns:** HealthCheckResult with detailed check information

**Example:**
```typescript
const health = await agentAPI.healthCheck('my-agent');

if (health.healthy) {
  console.log('✓ Agent is healthy');
} else {
  console.error('✗ Agent health check failed:');

  if (!health.checks.definition.passed) {
    console.error(`  - Definition: ${health.checks.definition.error}`);
  }

  if (!health.checks.tools.passed) {
    console.error(`  - Missing tools: ${health.checks.tools.missing?.join(', ')}`);
  }

  if (!health.checks.llm.passed) {
    console.error(`  - LLM: ${health.checks.llm.error}`);
  }

  if (!health.checks.cache_sources.passed) {
    console.error(`  - Inaccessible cache sources: ${health.checks.cache_sources.inaccessible?.join(', ')}`);
  }
}
```

---

### `refreshCache(name: string): Promise<void>`

Manually refreshes prompt cache for an agent.

**Parameters:**
- `name` - Agent identifier

**Example:**
```typescript
await agentAPI.refreshCache('my-agent');
console.log('Cache refreshed successfully');
```

---

### `listAgents(filters?: { tags?: string[] }): Promise<AgentInfo[]>`

Lists available agents with optional filtering.

**Parameters:**
- `filters` (optional) - Filtering options

**Returns:** Array of AgentInfo objects

**Example:**
```typescript
const allAgents = await agentAPI.listAgents();
const analysisAgents = await agentAPI.listAgents({ tags: ['analysis'] });
```

---

## ToolAPI

### `executeTool(name: string, params: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult>`

Executes a tool with the given parameters.

**Parameters:**
- `name` - Tool identifier with optional version
- `params` - Tool parameters
- `options` (optional) - Execution options (timeout, env)

**Returns:** ToolResult with output, success status, and metadata

**Example:**
```typescript
const result = await toolAPI.executeTool('csv-processor@^1.0.0', {
  file: './data.csv',
  operation: 'aggregate',
  groupBy: 'category'
}, {
  timeout: 30000 // 30 seconds
});

if (result.success) {
  console.log('Output:', result.output);
  console.log(`Executed in ${result.duration_ms}ms`);
} else {
  if (result.timeout) {
    console.error('Tool execution timed out');
    console.log('Partial output:', result.output);
  } else {
    console.error('Tool execution failed:', result.error);
  }
}
```

---

### `hasTool(name: string): Promise<boolean>`

Checks if a tool exists in the registry.

**Parameters:**
- `name` - Tool identifier

**Returns:** `true` if tool exists, `false` otherwise

---

### `getToolInfo(name: string): Promise<ToolInfo>`

Retrieves metadata about a tool.

**Parameters:**
- `name` - Tool identifier

**Returns:** ToolInfo object

**Example:**
```typescript
const info = await toolAPI.getToolInfo('csv-processor');
console.log(`${info.name} v${info.version}`);
console.log(info.description);
```

---

### `listTools(filters?: { tags?: string[] }): Promise<ToolInfo[]>`

Lists available tools with optional filtering.

**Parameters:**
- `filters` (optional) - Filtering options

**Returns:** Array of ToolInfo objects

---

## Definition Schemas

### Agent Definition (YAML)

```yaml
name: data-analyst
type: agent
description: An AI agent for data analysis
version: 1.0.0
author: Your Name
tags:
  - analysis
  - data
  - reporting

llm:
  provider: anthropic  # anthropic, openai, or google
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096

system_prompt: |
  You are a data analysis expert.
  Analyze data thoroughly and provide actionable insights.

tools:
  - csv-processor
  - chart-generator

custom_tools:
  - name: inline-calculator
    type: tool
    description: Quick calculator
    version: 1.0.0
    tags: [math]
    parameters:
      expression:
        type: string
        description: Math expression
        required: true
    implementation:
      type: bash
      bash:
        command: echo "$(( ${expression} ))"

caching:
  enabled: true
  cache_sources:
    - type: file
      path: ./context/data-guide.md
      label: Data Analysis Guide
      ttl: 3600
    - type: inline
      label: System Context
      content: "Use structured formats for all outputs."

config:
  max_retries: 3
  timeout: 60000
```

---

### Tool Definition (YAML)

```yaml
name: csv-processor
type: tool
description: Process CSV files with various operations
version: 1.0.0
author: Your Name
tags:
  - data
  - csv

parameters:
  file:
    type: string
    description: Path to CSV file
    required: true
  operation:
    type: string
    description: Operation to perform
    required: true
    enum: [aggregate, filter, transform]
  groupBy:
    type: string
    description: Column to group by
    required: false

implementation:
  type: bash
  bash:
    command: python3 ./scripts/csv_processor.py "${file}" "${operation}" "${groupBy}"
    sandbox:
      enabled: true
      allowlisted_commands: [python3]
      network_access: false
      max_execution_time: 30000
      env_vars: [PATH, PYTHONPATH]

output:
  type: object
  properties:
    result:
      type: array
    summary:
      type: string
```

---

## Registry System

### Three-Tier Resolution

1. **Local** (`.fractary/agents/`, `.fractary/tools/`)
2. **Global** (`~/.fractary/registry/`)
3. **Stockyard** (remote registry - future)

### Version Constraints

Supports full npm semver syntax:

- **Exact**: `1.0.0`
- **Caret**: `^1.0.0` (>=1.0.0 <2.0.0)
- **Tilde**: `~1.2.3` (>=1.2.3 <1.3.0)
- **Ranges**: `>=1.0.0 <2.0.0`
- **X-Ranges**: `1.x`, `1.2.x`
- **OR**: `^1.0.0 || ^2.0.0`
- **Latest**: `latest` or omit version

---

## Advanced Features

### Definition Inheritance

```yaml
# base-agent.yaml
name: base-agent
type: agent
description: Base agent
version: 1.0.0
tags: [base]
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Base prompt
tools: [tool1, tool2]

---
# extended-agent.yaml
name: extended-agent
type: agent
description: Extended agent
extends: base-agent  # Inherits from base-agent
version: 1.1.0
tags: [extended]
tools: [tool3]  # Merged with base tools
system_prompt: Overridden prompt
```

### Tool Dependencies

```yaml
name: complex-tool
type: tool
description: Tool with dependencies
version: 1.0.0
tags: []
depends_on:  # These tools execute first
  - prerequisite-tool
  - another-tool
parameters: {}
implementation:
  type: bash
  bash:
    command: echo "Complex operation"
```

### Prompt Caching

```yaml
caching:
  enabled: true
  cache_sources:
    - type: file
      path: ./docs/api.md
      label: API Documentation
      ttl: 3600  # 1 hour

    - type: glob
      pattern: ./docs/**/*.md
      label: All Documentation
      ttl: 1800  # 30 minutes

    - type: codex
      uri: codex://org/project/path
      label: Codex Content
      ttl: 7200  # 2 hours

    - type: inline
      content: "Static context that never expires"
      label: System Context
      # No TTL = never expires
```

---

## Configuration

### Forge Config

```typescript
// .forgerc or forge.config.js
export default {
  definitions: {
    registry: {
      local: {
        enabled: true,
        paths: ['.fractary/agents', '.fractary/tools']
      },
      global: {
        enabled: true,
        path: '~/.fractary/registry'
      },
      stockyard: {
        enabled: false,
        url: 'https://stockyard.fractary.com',
        apiKey: process.env.STOCKYARD_API_KEY
      }
    },
    caching: {
      enabled: true,
      defaultTtl: 3600,  // 1 hour default
      sourceTtls: {
        file: 3600,
        glob: 1800,
        codex: 7200,
        inline: Infinity
      }
    },
    validation: {
      strict: true,
      warnOnMissingTools: true
    },
    execution: {
      defaultTimeout: 120000  // 2 minutes
    }
  }
};
```

---

## Error Handling

```typescript
import { ForgeError, isForgeError } from '@fractary/forge';

try {
  const agent = await agentAPI.resolveAgent('my-agent');
  const result = await agent.invoke('task');
} catch (error) {
  if (isForgeError(error)) {
    switch (error.code) {
      case 'AGENT_NOT_FOUND':
        console.error(`Agent not found: ${error.message}`);
        break;
      case 'SCHEMA_VALIDATION_ERROR':
        console.error('Invalid definition:', error.details);
        break;
      case 'TOOL_EXECUTION_TIMEOUT':
        console.error('Tool timed out:', error.message);
        break;
      default:
        console.error(`Error [${error.code}]: ${error.message}`);
    }
  } else {
    throw error;
  }
}
```

---

## Best Practices

1. **Version Constraints**: Use semver ranges (^, ~) for flexibility
2. **Health Checks**: Run in CI/CD pipelines before deployment
3. **Caching**: Set appropriate TTLs based on content update frequency
4. **Timeouts**: Configure realistic timeouts for tool execution
5. **Inheritance**: Use for shared configurations, override as needed
6. **Tags**: Use for organization and filtering
7. **Dependencies**: Minimize tool dependencies to avoid complexity
8. **Testing**: Test agents and tools in isolation before integration

---

## Migration Guide

### From Manual LangChain Usage

**Before:**
```typescript
import { ChatAnthropic } from '@langchain/anthropic';

const llm = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
});

const result = await llm.invoke('prompt');
```

**After:**
```yaml
# agent.yaml
name: my-agent
type: agent
version: 1.0.0
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
system_prompt: "..."
tools: []
```

```typescript
const agent = await agentAPI.resolveAgent('my-agent');
const result = await agent.invoke('prompt');
```

---

## Support

- **Documentation**: [docs.fractary.com](https://docs.fractary.com)
- **Issues**: [github.com/fractary/forge/issues](https://github.com/fractary/forge/issues)
- **Examples**: [github.com/fractary/forge-examples](https://github.com/fractary/forge-examples)
