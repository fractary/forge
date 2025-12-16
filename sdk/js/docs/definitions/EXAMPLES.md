# Agent & Tool Definition System - Examples

## Table of Contents

- [Basic Agent Usage](#basic-agent-usage)
- [Tool Execution](#tool-execution)
- [Agent with Custom Tools](#agent-with-custom-tools)
- [Inheritance Examples](#inheritance-examples)
- [Tool Dependencies](#tool-dependencies)
- [Prompt Caching](#prompt-caching)
- [Health Checks in CI/CD](#health-checks-in-cicd)
- [Multi-Provider Setup](#multi-provider-setup)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Agent Usage

### Simple Data Analysis Agent

**Definition (`.fractary/agents/data-analyst.yaml`):**
```yaml
name: data-analyst
type: agent
description: Analyzes data and generates insights
version: 1.0.0
tags:
  - analysis
  - data

llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.3
  max_tokens: 4096

system_prompt: |
  You are a data analysis expert.
  When analyzing data:
  1. Identify key patterns and trends
  2. Provide statistical insights
  3. Suggest actionable recommendations
  4. Format outputs as structured JSON when possible

tools:
  - csv-reader
  - statistics-calculator
```

**Usage:**
```typescript
import { AgentAPI } from '@fractary/forge/definitions';

const agentAPI = new AgentAPI();

async function analyzeData() {
  // Load the agent
  const analyst = await agentAPI.resolveAgent('data-analyst');

  // Execute analysis
  const result = await analyst.invoke(
    'Analyze the sales data and identify top 3 trends',
    { dataSource: 'Q4_2024_sales.csv' }
  );

  console.log('Analysis:', result.output);

  // Access structured output if available
  if (result.structured_output) {
    const insights = result.structured_output;
    console.log('Top trends:', insights.trends);
    console.log('Recommendations:', insights.recommendations);
  }

  // Check token usage
  console.log(`Tokens used: ${result.usage?.input_tokens + result.usage?.output_tokens}`);
}

analyzeData().catch(console.error);
```

---

## Tool Execution

### CSV Processing Tool

**Definition (`.fractary/tools/csv-processor.yaml`):**
```yaml
name: csv-processor
type: tool
description: Process and transform CSV files
version: 1.0.0
tags:
  - data
  - csv
  - processing

parameters:
  input_file:
    type: string
    description: Path to input CSV file
    required: true

  operation:
    type: string
    description: Operation to perform
    required: true
    enum: [aggregate, filter, sort, transform]

  output_file:
    type: string
    description: Path to output CSV file
    required: false
    default: output.csv

  config:
    type: object
    description: Operation-specific configuration
    required: false
    properties:
      group_by:
        type: string
        description: Column to group by
        required: false
      filter_expression:
        type: string
        description: Filter expression
        required: false

implementation:
  type: bash
  bash:
    command: |
      python3 -c "
      import pandas as pd
      import json
      import sys

      df = pd.read_csv('${input_file}')
      operation = '${operation}'
      config = json.loads('${config}') if '${config}' else {}

      if operation == 'aggregate' and config.get('group_by'):
          result = df.groupby(config['group_by']).sum()
      elif operation == 'filter' and config.get('filter_expression'):
          result = df.query(config['filter_expression'])
      else:
          result = df

      result.to_csv('${output_file}', index=False)
      print(json.dumps({'rows': len(result), 'columns': len(result.columns)}))
      "
    sandbox:
      enabled: true
      allowlisted_commands: [python3]
      network_access: false
      max_execution_time: 30000
      env_vars: [PATH, PYTHONPATH]

output:
  type: object
  properties:
    rows:
      type: integer
    columns:
      type: integer
```

**Usage:**
```typescript
import { ToolAPI } from '@fractary/forge/definitions';

const toolAPI = new ToolAPI();

async function processCSV() {
  const result = await toolAPI.executeTool('csv-processor', {
    input_file: './data/sales.csv',
    operation: 'aggregate',
    config: {
      group_by: 'region'
    }
  }, {
    timeout: 60000 // 60 seconds
  });

  if (result.success) {
    console.log('Processing complete:', result.output);
    console.log(`Execution time: ${result.duration_ms}ms`);
  } else {
    if (result.timeout) {
      console.error('Operation timed out after 60 seconds');
      console.log('Partial output:', result.output);
    } else {
      console.error('Error:', result.error);
    }
  }
}
```

---

## Agent with Custom Tools

**Definition:**
```yaml
name: code-reviewer
type: agent
description: AI-powered code review assistant
version: 1.0.0
tags: [code, review, quality]

llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.2

system_prompt: |
  You are an expert code reviewer.
  Review code for:
  - Best practices
  - Security vulnerabilities
  - Performance issues
  - Code style and readability

tools:
  - git-diff-reader  # External tool

custom_tools:
  - name: eslint-runner
    type: tool
    description: Run ESLint on JavaScript/TypeScript files
    version: 1.0.0
    tags: [linting, javascript]
    parameters:
      file_path:
        type: string
        description: Path to file to lint
        required: true
    implementation:
      type: bash
      bash:
        command: npx eslint "${file_path}" --format json
        sandbox:
          enabled: true
          allowlisted_commands: [npx, node]
          max_execution_time: 10000

  - name: security-scanner
    type: tool
    description: Scan for security vulnerabilities
    version: 1.0.0
    tags: [security]
    parameters:
      directory:
        type: string
        description: Directory to scan
        required: true
    implementation:
      type: bash
      bash:
        command: npm audit --json --prefix "${directory}"
```

**Usage:**
```typescript
async function reviewCode() {
  const reviewer = await agentAPI.resolveAgent('code-reviewer');

  const result = await reviewer.invoke(
    'Review the authentication module for security issues',
    {
      filePath: './src/auth/',
      focusAreas: ['security', 'best-practices']
    }
  );

  console.log('Review:', result.output);
}
```

---

## Inheritance Examples

### Base Agent Configuration

**base-analyst.yaml:**
```yaml
name: base-analyst
type: agent
description: Base configuration for all analyst agents
version: 1.0.0
tags: [base, analyst]

llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.5
  max_tokens: 4096

system_prompt: |
  You are a professional analyst.
  Always provide evidence-based insights.

tools:
  - data-loader
  - report-generator

config:
  max_retries: 3
  timeout: 60000
```

**Extended Agents:**

**financial-analyst.yaml:**
```yaml
name: financial-analyst
type: agent
description: Specialized in financial analysis
extends: base-analyst  # Inherits all base properties
version: 1.1.0
tags: [financial, trading]

system_prompt: |
  You are a financial analyst specializing in market analysis.
  Focus on:
  - Market trends
  - Risk assessment
  - Investment opportunities

tools:
  - stock-ticker  # Adds to base tools
  - financial-calculator

config:
  timeout: 120000  # Overrides base timeout
  decimal_precision: 4  # Adds new config
```

**marketing-analyst.yaml:**
```yaml
name: marketing-analyst
type: agent
description: Specialized in marketing analytics
extends: base-analyst
version: 1.1.0
tags: [marketing, campaigns]

llm:
  temperature: 0.7  # Overrides base temperature

system_prompt: |
  You are a marketing analyst.
  Focus on:
  - Campaign performance
  - Customer segmentation
  - ROI analysis

tools:
  - social-media-analyzer
  - sentiment-analyzer
```

**Usage:**
```typescript
// Both agents share base configuration but have specialized capabilities
const financialAnalyst = await agentAPI.resolveAgent('financial-analyst');
const marketingAnalyst = await agentAPI.resolveAgent('marketing-analyst');

// Financial analysis
const financialReport = await financialAnalyst.invoke(
  'Analyze AAPL stock performance for Q4 2024'
);

// Marketing analysis
const marketingReport = await marketingAnalyst.invoke(
  'Evaluate social media campaign effectiveness'
);
```

---

## Tool Dependencies

**Example: Multi-Step Data Pipeline**

**data-loader.yaml:**
```yaml
name: data-loader
type: tool
description: Load data from various sources
version: 1.0.0
tags: [data, loader]

parameters:
  source:
    type: string
    description: Data source URL or path
    required: true

implementation:
  type: bash
  bash:
    command: curl -s "${source}" > /tmp/raw_data.json
```

**data-validator.yaml:**
```yaml
name: data-validator
type: tool
description: Validate loaded data
version: 1.0.0
depends_on:
  - data-loader  # Executes after data-loader
tags: [data, validation]

parameters:
  schema:
    type: string
    description: JSON schema for validation
    required: true

implementation:
  type: python
  python:
    module: json_validator
    function: validate_file
```

**data-transformer.yaml:**
```yaml
name: data-transformer
type: tool
description: Transform validated data
version: 1.0.0
depends_on:
  - data-loader
  - data-validator  # Executes after both dependencies
tags: [data, transform]

parameters:
  transformation:
    type: string
    description: Transformation to apply
    required: true

implementation:
  type: bash
  bash:
    command: jq '${transformation}' /tmp/raw_data.json
```

**Usage:**
```typescript
// Dependencies are automatically resolved and executed in order
const result = await toolAPI.executeTool('data-transformer', {
  source: 'https://api.example.com/data',
  schema: './schemas/data.schema.json',
  transformation: '.results | map({id, name, value})'
});

// Execution order:
// 1. data-loader runs first
// 2. data-validator runs after loader
// 3. data-transformer runs after both
```

---

## Prompt Caching

**Example: Agent with Multi-Source Caching**

**Definition:**
```yaml
name: documentation-assistant
type: agent
description: Helps users navigate and understand documentation
version: 1.0.0
tags: [docs, help]

llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022

system_prompt: |
  You are a documentation assistant.
  Help users find information and understand concepts.

tools: []

caching:
  enabled: true
  cache_sources:
    # Local files - cached for 1 hour
    - type: file
      path: ./docs/README.md
      label: Main Documentation
      ttl: 3600

    # All markdown files - cached for 30 minutes
    - type: glob
      pattern: ./docs/**/*.md
      label: All Documentation Files
      ttl: 1800

    # Remote codex content - cached for 2 hours
    - type: codex
      uri: codex://myorg/myproject/api-reference
      label: API Reference
      ttl: 7200

    # Static context - never expires
    - type: inline
      label: System Guidelines
      content: |
        Guidelines for responses:
        1. Be concise and clear
        2. Provide code examples when relevant
        3. Link to specific documentation sections
```

**Usage:**
```typescript
const docAssistant = await agentAPI.resolveAgent('documentation-assistant');

// First invocation - caches all sources
const result1 = await docAssistant.invoke(
  'How do I configure authentication?'
);

// Subsequent invocations use cached content (faster)
const result2 = await docAssistant.invoke(
  'Show me an example of JWT configuration'
);

// Manually refresh cache when docs are updated
await agentAPI.refreshCache('documentation-assistant');
```

---

## Health Checks in CI/CD

**Example: Pre-Deployment Validation**

```typescript
// ci-health-check.ts
import { AgentAPI } from '@fractary/forge/definitions';

const agentAPI = new AgentAPI();

async function validateAgents() {
  const agentsToCheck = [
    'customer-support',
    'data-analyst',
    'code-reviewer'
  ];

  let allHealthy = true;

  for (const agentName of agentsToCheck) {
    console.log(`\nChecking ${agentName}...`);

    const health = await agentAPI.healthCheck(agentName);

    if (health.healthy) {
      console.log(`✓ ${agentName} is healthy (${health.duration_ms}ms)`);
    } else {
      console.error(`✗ ${agentName} health check failed:`);
      allHealthy = false;

      // Report specific failures
      if (!health.checks.definition.passed) {
        console.error(`  - Definition error: ${health.checks.definition.error}`);
      }

      if (!health.checks.tools.passed) {
        console.error(`  - Missing tools:`);
        health.checks.tools.missing?.forEach(tool => {
          console.error(`    * ${tool}`);
        });
      }

      if (!health.checks.llm.passed) {
        console.error(`  - LLM configuration: ${health.checks.llm.error}`);
      }

      if (!health.checks.cache_sources.passed) {
        console.error(`  - Inaccessible cache sources:`);
        health.checks.cache_sources.inaccessible?.forEach(source => {
          console.error(`    * ${source}`);
        });
      }
    }
  }

  if (!allHealthy) {
    console.error('\n❌ Some agents failed health checks');
    process.exit(1);
  }

  console.log('\n✅ All agents passed health checks');
}

validateAgents().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});
```

**GitHub Actions Workflow:**
```yaml
name: Agent Health Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - name: Run agent health checks
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run health-check
```

---

## Multi-Provider Setup

**Example: Same Agent, Different Providers**

**anthropic-agent.yaml:**
```yaml
name: assistant
type: agent
description: General purpose assistant
version: 1.0.0
tags: [general, anthropic]

llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.7

system_prompt: "You are a helpful assistant."
tools: []
```

**openai-agent.yaml:**
```yaml
name: assistant-openai
type: agent
description: OpenAI variant of assistant
extends: assistant
version: 1.0.0
tags: [general, openai]

llm:
  provider: openai
  model: gpt-4-turbo-preview
  # temperature inherited from base
```

**google-agent.yaml:**
```yaml
name: assistant-google
type: agent
description: Google variant of assistant
extends: assistant
version: 1.0.0
tags: [general, google]

llm:
  provider: google
  model: gemini-pro
```

**Usage:**
```typescript
// Switch providers based on configuration or availability
const provider = process.env.LLM_PROVIDER || 'anthropic';

let assistant;
switch (provider) {
  case 'openai':
    assistant = await agentAPI.resolveAgent('assistant-openai');
    break;
  case 'google':
    assistant = await agentAPI.resolveAgent('assistant-google');
    break;
  default:
    assistant = await agentAPI.resolveAgent('assistant');
}

const result = await assistant.invoke('Hello, how can you help me?');
```

---

## Advanced Patterns

### Versioned Agent Rollout

```typescript
// Gradual rollout strategy
async function getAgent(userId: string) {
  const userHash = hashCode(userId);
  const rolloutPercent = 10; // 10% of users get v2

  const version = (userHash % 100) < rolloutPercent ? '^2.0.0' : '^1.0.0';

  return await agentAPI.resolveAgent(`customer-support@${version}`);
}

// A/B testing
async function abTestAgents(prompt: string) {
  const [resultA, resultB] = await Promise.all([
    agentAPI.resolveAgent('assistant@1.0.0').then(a => a.invoke(prompt)),
    agentAPI.resolveAgent('assistant@2.0.0').then(a => a.invoke(prompt)),
  ]);

  // Compare results, track metrics, etc.
  return {
    v1: resultA,
    v2: resultB,
  };
}
```

### Error Handling and Retries

```typescript
import { ForgeError, isForgeError } from '@fractary/forge';

async function executeWithRetry(agentName: string, prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const agent = await agentAPI.resolveAgent(agentName);
      return await agent.invoke(prompt);
    } catch (error) {
      if (isForgeError(error)) {
        switch (error.code) {
          case 'AGENT_NOT_FOUND':
            console.error(`Agent ${agentName} not found`);
            throw error; // Don't retry

          case 'TOOL_EXECUTION_TIMEOUT':
            console.warn(`Attempt ${attempt}: Tool timeout`);
            if (attempt === maxRetries) throw error;
            await sleep(1000 * attempt); // Exponential backoff
            continue;

          case 'SCHEMA_VALIDATION_ERROR':
            console.error('Invalid agent definition:', error.details);
            throw error; // Don't retry

          default:
            console.warn(`Attempt ${attempt}: ${error.message}`);
            if (attempt === maxRetries) throw error;
            await sleep(1000 * attempt);
        }
      } else {
        throw error;
      }
    }
  }
}
```

---

## Best Practices

1. **Version Your Agents**: Always specify semantic versions
2. **Use Health Checks**: Validate in CI/CD before deployment
3. **Cache Wisely**: Set appropriate TTLs for cache sources
4. **Handle Timeouts**: Set realistic timeouts for tools
5. **Monitor Usage**: Track token usage and costs
6. **Test Thoroughly**: Test agents and tools in isolation
7. **Document Clearly**: Provide clear descriptions and examples
8. **Use Inheritance**: Share common configurations
9. **Tag Consistently**: Use tags for organization and filtering
10. **Secure Credentials**: Never hardcode API keys in definitions

---

For more information, see the [API Documentation](./API.md).
