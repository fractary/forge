# Advanced Workflow Examples

Advanced patterns and workflows for power users of Fractary Forge.

## Table of Contents

- [Fork and Merge Workflows](#fork-and-merge-workflows)
- [Multi-Registry Setup](#multi-registry-setup)
- [Custom Resolvers](#custom-resolvers)
- [Plugin Development](#plugin-development)
- [Export to Frameworks](#export-to-frameworks)

## Fork and Merge Workflows

### Forking a Component

Fork allows you to customize existing agents or tools while tracking upstream changes.

```bash
# Fork an agent from the registry
fractary-forge fork faber-planner my-custom-planner

# This creates a new agent that extends the original
# File: .fractary/agents/my-custom-planner.md
```

The forked agent:

```markdown
---
name: my-custom-planner
version: 1.0.0
type: agent
extends: faber-planner@1.0.0
fork:
  source: faber-planner
  version: 1.0.0
  timestamp: 2025-12-17T10:30:00Z
description: Customized FABER planner for my project
llm:
  temperature: 0.8  # Override temperature
---

# Custom System Prompt

[Your customizations here]

The base prompt from faber-planner will be inherited unless overridden.
```

### Checking for Upstream Updates

```bash
# Check if upstream has updates
fractary-forge fork check-updates my-custom-planner

# Output:
# ✓ Upstream updates available
#   faber-planner: 1.0.0 → 1.2.0
#   Changes:
#     - Added new planning strategies
#     - Improved error handling
#     - Updated system prompt
```

### Merging Upstream Changes

```bash
# Merge upstream changes automatically
fractary-forge merge my-custom-planner

# Or merge with manual conflict resolution
fractary-forge merge my-custom-planner --manual

# Output:
# ✓ Merged faber-planner@1.2.0 into my-custom-planner
# ✓ No conflicts detected
# ✓ Agent updated successfully
```

### Handling Merge Conflicts

If there are conflicts:

```bash
fractary-forge merge my-custom-planner --manual

# Output:
# ⚠ Conflicts detected in:
#   - system_prompt
#   - llm.temperature
#
# Conflict resolution file created: .fractary/agents/my-custom-planner.conflicts.md
```

Edit the conflicts file to resolve:

```markdown
# Merge Conflicts for my-custom-planner

## Conflict 1: system_prompt

### Upstream (faber-planner@1.2.0)
```
You are a FABER workflow planner. Your goal is to create detailed plans...
[New improved prompt]
```

### Local (my-custom-planner@1.0.0)
```
You are a custom planner for my project. Focus on...
[Your custom prompt]
```

### Resolution
```
You are a custom FABER workflow planner for my project.
[Merged version combining both]
```

## Conflict 2: llm.temperature

### Upstream: 0.7
### Local: 0.8
### Resolution: 0.8
```

Then apply the resolution:

```bash
fractary-forge merge apply my-custom-planner
```

## Multi-Registry Setup

### Configuring Multiple Registries

```bash
# Add a custom registry
fractary-forge registry add my-company \
  --url https://registry.mycompany.com/forge.json \
  --priority 1

# Add a public registry
fractary-forge registry add community \
  --url https://community-forge.dev/registry.json \
  --priority 2

# List configured registries
fractary-forge registry list

# Output:
# Configured Registries:
#   1. my-company (priority 1)
#      https://registry.mycompany.com/forge.json
#   2. fractary-core (priority 2)
#      https://raw.githubusercontent.com/fractary/plugins/main/registry.json
#   3. community (priority 3)
#      https://community-forge.dev/registry.json
```

### Registry Priority and Resolution

When multiple registries are configured, Forge resolves in this order:

1. **Local** (.fractary/) - Project-specific installations
2. **Global** (~/.fractary/registry/) - User-wide installations
3. **Remote** - By priority (1 = highest)

```typescript
// SDK example: Custom resolution strategy
import { ForgeClient } from '@fractary/forge';

const client = new ForgeClient({
  resolvers: {
    local: { enabled: true },
    global: { enabled: true },
    remote: {
      enabled: true,
      registries: [
        {
          name: 'my-company',
          url: 'https://registry.mycompany.com/forge.json',
          priority: 1
        },
        {
          name: 'fractary-core',
          url: 'https://raw.githubusercontent.com/fractary/plugins/main/registry.json',
          priority: 2
        }
      ]
    }
  }
});

// This will search:
// 1. .fractary/agents/my-agent.md
// 2. ~/.fractary/registry/agents/my-agent.md
// 3. my-company registry
// 4. fractary-core registry
const agent = await client.agents.get('my-agent');
```

### Private Registries with Authentication

```bash
# Add authenticated registry
fractary-forge registry add private-registry \
  --url https://private.mycompany.com/forge.json \
  --auth token

# You'll be prompted for token
# Or set via environment variable
export FORGE_REGISTRY_TOKEN=your-token-here

fractary-forge install @mycompany/private-plugin
```

## Custom Resolvers

### Implementing a Custom Resolver

```typescript
import { Resolver, ResolverConfig, ResolvedAsset } from '@fractary/forge';

/**
 * Custom resolver that loads from a database
 */
export class DatabaseResolver implements Resolver {
  name = 'database';

  constructor(private dbConnection: any) {}

  async resolve(
    name: string,
    type: 'agent' | 'tool' | 'workflow',
    version?: string
  ): Promise<ResolvedAsset | null> {
    const query = `
      SELECT * FROM forge_assets
      WHERE name = ? AND type = ? AND version = ?
    `;

    const result = await this.dbConnection.query(query, [
      name,
      type,
      version || 'latest'
    ]);

    if (!result.length) {
      return null;
    }

    const asset = result[0];

    return {
      name: asset.name,
      version: asset.version,
      type: asset.type,
      source: 'database',
      content: asset.content,
      metadata: JSON.parse(asset.metadata)
    };
  }

  async list(type?: string): Promise<Array<{ name: string; version: string }>> {
    const query = type
      ? 'SELECT name, version FROM forge_assets WHERE type = ?'
      : 'SELECT name, version FROM forge_assets';

    const results = await this.dbConnection.query(
      query,
      type ? [type] : []
    );

    return results;
  }
}

// Use custom resolver
import { ForgeClient } from '@fractary/forge';

const dbResolver = new DatabaseResolver(dbConnection);

const client = new ForgeClient({
  customResolvers: [dbResolver]
});

// Now agents can be loaded from database
const agent = await client.agents.get('db-stored-agent');
```

### Git-Based Resolver

```typescript
import { Resolver } from '@fractary/forge';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Resolver that clones from Git repositories
 */
export class GitResolver implements Resolver {
  name = 'git';

  constructor(
    private cacheDir: string = path.join(os.homedir(), '.fractary/git-cache')
  ) {}

  async resolve(
    name: string,
    type: 'agent' | 'tool' | 'workflow',
    version?: string
  ): Promise<ResolvedAsset | null> {
    // Parse Git URL from name: git:owner/repo/path/to/agent
    const match = name.match(/^git:([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) return null;

    const [, owner, repo, assetPath] = match;
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    const localPath = path.join(this.cacheDir, owner, repo);

    // Clone or update repo
    if (!fs.existsSync(localPath)) {
      execSync(`git clone ${repoUrl} ${localPath}`);
    } else {
      execSync('git pull', { cwd: localPath });
    }

    // Checkout specific version if provided
    if (version) {
      execSync(`git checkout ${version}`, { cwd: localPath });
    }

    // Read asset file
    const assetFilePath = path.join(localPath, assetPath);
    if (!fs.existsSync(assetFilePath)) {
      return null;
    }

    const content = await fs.readFile(assetFilePath, 'utf-8');
    const metadata = this.parseMetadata(content);

    return {
      name: metadata.name,
      version: metadata.version || version || 'latest',
      type,
      source: 'git',
      content,
      metadata,
      path: assetFilePath
    };
  }

  private parseMetadata(content: string): any {
    // Parse YAML frontmatter
    // Implementation details...
  }
}

// Usage
const client = new ForgeClient({
  customResolvers: [new GitResolver()]
});

// Load agent from GitHub
const agent = await client.agents.get('git:fractary/agents/faber-planner');
```

## Plugin Development

### Creating a Plugin

```bash
# Initialize a new plugin
fractary-forge plugin init my-plugin

# Directory structure created:
# my-plugin/
# ├── plugin.json          # Plugin manifest
# ├── agents/              # Agent definitions
# ├── tools/               # Tool definitions
# ├── workflows/           # Workflow definitions
# └── README.md
```

### Plugin Manifest

File: `my-plugin/plugin.json`

```json
{
  "name": "@myorg/my-plugin",
  "version": "1.0.0",
  "description": "My custom Forge plugin",
  "author": "Your Name",
  "license": "MIT",
  "repository": "https://github.com/myorg/my-plugin",
  "components": {
    "agents": [
      {
        "name": "my-agent",
        "file": "agents/my-agent.md",
        "version": "1.0.0"
      }
    ],
    "tools": [
      {
        "name": "my-tool",
        "file": "tools/my-tool.md",
        "version": "1.0.0"
      }
    ],
    "workflows": [
      {
        "name": "my-workflow",
        "file": "workflows/my-workflow.md",
        "version": "1.0.0"
      }
    ]
  },
  "dependencies": {
    "@fractary/faber-plugin": "^1.0.0"
  },
  "checksum": "sha256-abc123..."
}
```

### Publishing a Plugin

```bash
# Build the plugin
fractary-forge plugin build

# Validate the plugin
fractary-forge plugin validate

# Publish to registry
fractary-forge plugin publish

# Output:
# ✓ Plugin validated
# ✓ Checksums generated
# ✓ Published @myorg/my-plugin@1.0.0 to fractary-core
```

## Export to Frameworks

### Export to LangChain

```bash
# Export agent to LangChain Python code
fractary-forge export langchain my-assistant \
  --output ./langchain-export

# Generated structure:
# langchain-export/
# ├── agents/
# │   └── my_assistant.py
# ├── tools/
# │   ├── web_search.py
# │   └── file_reader.py
# ├── requirements.txt
# └── README.md
```

Generated Python code:

```python
# langchain-export/agents/my_assistant.py
from langchain.agents import AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain.agents import create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate

from tools.web_search import web_search_tool
from tools.file_reader import file_reader_tool

# Initialize LLM
llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    temperature=0.7,
    max_tokens=4096
)

# System prompt
system_prompt = """You are a helpful AI assistant that can search the web and read files.
Your goal is to provide accurate, helpful information to users."""

# Create agent
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

tools = [web_search_tool, file_reader_tool]

agent = create_openai_functions_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Use agent
def run(query: str) -> str:
    result = agent_executor.invoke({"input": query})
    return result["output"]
```

### Export to Claude Code

```bash
# Export to Claude Code format
fractary-forge export claude my-assistant \
  --output ./claude-export

# Generated structure:
# claude-export/
# ├── .claude/
# │   ├── agents/
# │   │   └── my-assistant.md
# │   ├── tools/
# │   │   └── web-search.md
# │   └── mcp/
# │       └── tools/
# │           └── web-search.json
# └── README.md
```

### Export to n8n

```bash
# Export to n8n workflow
fractary-forge export n8n my-assistant \
  --output ./n8n-export

# Generated structure:
# n8n-export/
# ├── workflows/
# │   └── my-assistant.json
# └── README.md
```

The generated n8n workflow:

```json
{
  "name": "my-assistant",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "my-assistant"
    },
    {
      "name": "Claude Agent",
      "type": "n8n-nodes-base.anthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "systemPrompt": "You are a helpful AI assistant...",
        "temperature": 0.7
      },
      "position": [450, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Claude Agent", "type": "main", "index": 0 }]]
    }
  }
}
```

## Next Steps

- Explore [Plugin Development](../guides/plugin-development.md)
- Learn about [Testing Strategies](../guides/testing.md)
- Read the [API Reference](../API.md)
