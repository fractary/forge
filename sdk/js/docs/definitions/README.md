# Agent & Tool Definition System

A powerful Markdown + YAML frontmatter system for defining, managing, and executing AI agents and tools with full semantic versioning, inheritance, and multi-provider LLM support.

## 🚀 Quick Start

```bash
npm install @fractary/forge
```

```typescript
import { AgentAPI } from '@fractary/forge/definitions';

const agentAPI = new AgentAPI();
const agent = await agentAPI.resolveAgent('my-agent@^1.0.0');
const result = await agent.invoke('Analyze this data...');
console.log(result.output);
```

## ✨ Features

- **Markdown + YAML Frontmatter** - System prompts in Markdown, configuration in YAML frontmatter
- **Backward Compatible** - Legacy pure YAML format still supported
- **Semantic Versioning** - Full npm semver support (^, ~, >=, ranges, etc.)
- **Three-Tier Registry** - Local, global, and remote (Stockyard) resolution
- **LLM Multi-Provider** - Anthropic, OpenAI, and Google support
- **Definition Inheritance** - Extend and override base configurations
- **Tool Dependencies** - Automatic dependency resolution with cycle detection
- **Prompt Caching** - Multi-source caching with configurable TTL
- **Health Checks** - CI/CD validation for production readiness
- **Timeout Handling** - Graceful timeouts with partial output support
- **Type Safety** - Full TypeScript support with Zod validation

## 📚 Documentation

- **[API Reference](./API.md)** - Complete API documentation
- **[Usage Examples](./EXAMPLES.md)** - Comprehensive examples and patterns
- **[SPEC-FORGE-001](../specs/SPEC-FORGE-001-agent-tool-definition-system.md)** - Architecture specification
- **[SPEC-FORGE-008](../specs/SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md)** - Directory structure specification
- **[SPEC-FORGE-009](../../specs/SPEC-FORGE-009-MARKDOWN-FRONTMATTER-FORMAT.md)** - Markdown format specification
- **[Implementation Guide](../specs/SPEC-FORGE-001-IMPLEMENTATION.md)** - Detailed implementation details

## 🏗️ Architecture

### Three-Tier Registry

1. **Local** (`.fractary/agents/{name}/agent.md`, `.fractary/tools/{name}/tool.md`)
   - Project-specific definitions
   - Highest priority in resolution
   - Directory-per-definition structure

2. **Global** (`~/.fractary/registry/agents/{name}@{version}/agent.md`)
   - User-wide shared definitions
   - Versioned storage with semver

3. **Stockyard** (Remote registry - future)
   - Organization/public definitions
   - Centralized distribution

### Component Overview

```
@fractary/forge/definitions
├── api/              # Public APIs (AgentAPI, ToolAPI)
├── schemas/          # Zod validation schemas
├── loaders/          # MarkdownLoader, YAMLLoader, inheritance
├── registry/         # Three-tier resolution with semver
├── executor/         # Tool execution (bash, python, HTTP)
├── factory/          # Agent creation with LangChain
└── caching/          # Prompt caching system
```

## 📖 Usage

### Define an Agent (Markdown Format - Recommended)

Create `.fractary/agents/my-agent/agent.md`:

```markdown
---
name: my-agent
type: agent
description: A helpful assistant
version: "1.0.0"
tags: [assistant, general]
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096
tools:
  - web-search
  - calculator
caching:
  enabled: true
  cache_sources:
    - type: file
      path: ./docs/context.md
      label: Context Documentation
      ttl: 3600
---

# My Agent

You are a helpful assistant that provides clear, concise responses.

## Responsibilities

- Answer user questions accurately
- Search the web when needed
- Perform calculations

## Guidelines

- Be concise and direct
- Use tools when appropriate
- Cite sources for factual claims
```

<details>
<summary>Legacy YAML Format (Still Supported)</summary>

Create `.fractary/agents/my-agent/agent.yaml`:

```yaml
name: my-agent
type: agent
description: A helpful assistant
version: 1.0.0
tags: [assistant, general]
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096
system_prompt: |
  You are a helpful assistant.
  Provide clear, concise responses.
tools:
  - web-search
  - calculator
caching:
  enabled: true
  cache_sources:
    - type: file
      path: ./docs/context.md
      label: Context Documentation
      ttl: 3600
```
</details>

### Define a Tool (Markdown Format - Recommended)

Create `.fractary/tools/calculator/tool.md`:

```markdown
---
name: calculator
type: tool
description: Perform mathematical calculations
version: "1.0.0"
tags: [math, utility]
parameters:
  expression:
    type: string
    description: Mathematical expression to evaluate
    required: true
implementation:
  type: bash
  bash:
    command: echo "$(( ${expression} ))"
    sandbox:
      enabled: true
      max_execution_time: 5000
---

# Calculator Tool

Evaluates mathematical expressions safely in a sandboxed environment.

## Usage

Pass a mathematical expression in the `expression` parameter.

## Examples

- `2 + 2` → 4
- `15 * 23` → 345
- `(10 + 5) * 2` → 30

## Safety

This tool runs in a sandboxed environment with a 5-second timeout.
```

<details>
<summary>Legacy YAML Format (Still Supported)</summary>

Create `.fractary/tools/calculator/tool.yaml`:

```yaml
name: calculator
type: tool
description: Perform mathematical calculations
version: 1.0.0
tags: [math, utility]
parameters:
  expression:
    type: string
    description: Mathematical expression to evaluate
    required: true
implementation:
  type: bash
  bash:
    command: echo "$(( ${expression} ))"
    sandbox:
      enabled: true
      max_execution_time: 5000
```
</details>

### Use in Code

```typescript
import { AgentAPI, ToolAPI } from '@fractary/forge/definitions';

const agentAPI = new AgentAPI();
const toolAPI = new ToolAPI();

// Use agent
const agent = await agentAPI.resolveAgent('my-agent');
const result = await agent.invoke('What is 15 * 23?');
console.log(result.output);

// Execute tool directly
const calcResult = await toolAPI.executeTool('calculator', {
  expression: '15 * 23'
});
console.log(calcResult.output); // 345
```

## 🔍 Version Resolution

```typescript
// Latest version
await agentAPI.resolveAgent('my-agent');

// Exact version
await agentAPI.resolveAgent('my-agent@1.0.0');

// Caret range (^1.0.0 = >=1.0.0 <2.0.0)
await agentAPI.resolveAgent('my-agent@^1.0.0');

// Tilde range (~1.2.3 = >=1.2.3 <1.3.0)
await agentAPI.resolveAgent('my-agent@~1.2.3');

// Greater than
await agentAPI.resolveAgent('my-agent@>=1.5.0');

// Complex ranges
await agentAPI.resolveAgent('my-agent@>=1.0.0 <2.0.0 || >=3.0.0');

// X-ranges
await agentAPI.resolveAgent('my-agent@1.x');
```

## 🧬 Inheritance

```yaml
# base-agent.yaml
name: base-agent
type: agent
description: Base configuration
version: 1.0.0
tags: [base]
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: "Base prompt"
tools: [tool1, tool2]

---
# specialized-agent.yaml
name: specialized-agent
type: agent
description: Specialized agent
extends: base-agent  # Inherits everything from base
version: 1.1.0
tags: [specialized]
tools: [tool3]  # Merged with base tools
system_prompt: "Specialized prompt"  # Overrides base
```

## 🏥 Health Checks

```typescript
const health = await agentAPI.healthCheck('my-agent');

if (health.healthy) {
  console.log('✅ Agent is production-ready');
} else {
  console.error('❌ Issues found:');
  console.error('Definition:', health.checks.definition);
  console.error('Tools:', health.checks.tools);
  console.error('LLM:', health.checks.llm);
  console.error('Cache:', health.checks.cache_sources);
}
```

Use in CI/CD:

```bash
npm run health-check && npm run deploy
```

## ⚙️ Configuration

### Forge Config

```typescript
// forge.config.js
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
      }
    },
    caching: {
      enabled: true,
      defaultTtl: 3600,
      sourceTtls: {
        file: 3600,
        glob: 1800,
        codex: 7200
      }
    },
    execution: {
      defaultTimeout: 120000  // 2 minutes
    }
  }
};
```

## 🛠️ Tool Types

### Bash Tools

```yaml
implementation:
  type: bash
  bash:
    command: echo "Hello ${name}"
    sandbox:
      enabled: true
      allowlisted_commands: [echo, cat]
      network_access: false
      max_execution_time: 10000
      env_vars: [PATH]
```

### Python Tools

```yaml
implementation:
  type: python
  python:
    module: my_module
    function: process_data
```

### HTTP Tools

```yaml
implementation:
  type: http
  http:
    method: POST
    url: https://api.example.com/endpoint
    headers:
      Content-Type: application/json
    body_template: '{"input": "${input}"}'
```

## 🔗 Tool Dependencies

```yaml
name: complex-workflow
type: tool
description: Multi-step workflow
version: 1.0.0
depends_on:  # Execute these first, in order
  - data-loader
  - data-validator
parameters: {}
implementation:
  type: bash
  bash:
    command: process-validated-data.sh
```

## 📦 Prompt Caching

```yaml
caching:
  enabled: true
  cache_sources:
    # File source
    - type: file
      path: ./docs/guide.md
      label: User Guide
      ttl: 3600  # 1 hour

    # Glob pattern
    - type: glob
      pattern: ./docs/**/*.md
      label: All Docs
      ttl: 1800  # 30 minutes

    # Codex reference
    - type: codex
      uri: codex://org/project/api-ref
      label: API Reference
      ttl: 7200  # 2 hours

    # Inline content
    - type: inline
      content: "Static context"
      label: System Context
      # No TTL = never expires
```

## 🔐 Environment Variables

Required for LLM providers:

```bash
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here
export GOOGLE_API_KEY=your-key-here
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Health check agents
npm run health-check
```

## 📊 Performance

- **Registry Lookup**: < 10ms (cached), < 100ms (first load)
- **Semver Resolution**: < 5ms for 100+ versions
- **Inheritance Resolution**: < 20ms for 3-level depth
- **Cache Hit Ratio**: > 95% for frequently accessed content

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

## 🔗 Links

- **GitHub**: https://github.com/fractary/forge
- **Documentation**: https://docs.fractary.com
- **Issues**: https://github.com/fractary/forge/issues
- **Examples**: https://github.com/fractary/forge-examples

## 🙏 Acknowledgments

Built with:
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [LangChain](https://github.com/langchain-ai/langchainjs) - LLM integration
- [semver](https://github.com/npm/node-semver) - Version resolution
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - YAML frontmatter parsing
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parsing

---

**Status**: ✅ Production Ready (v1.0.0)

For detailed examples and patterns, see [EXAMPLES.md](./EXAMPLES.md).
