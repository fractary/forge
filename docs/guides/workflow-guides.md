# Workflow Guides

Common workflows and patterns for using Fractary Forge effectively.

## Table of Contents

- [Agent Development Workflows](#agent-development-workflows)
- [Plugin Management Workflows](#plugin-management-workflows)
- [Team Collaboration Workflows](#team-collaboration-workflows)
- [Fork and Merge Workflows](#fork-and-merge-workflows)
- [Export Workflows](#export-workflows)
- [Cache Management Workflows](#cache-management-workflows)
- [Registry Management Workflows](#registry-management-workflows)

## Agent Development Workflows

### Create a New Agent from Scratch

**Scenario**: You want to create a brand new agent for a specific purpose.

```bash
# 1. Initialize project (if not already done)
fractary-forge init --org myorg

# 2. Create the agent
fractary-forge agent-create code-reviewer \
  --description "Expert code review assistant" \
  --model anthropic \
  --model-name claude-sonnet-4 \
  --tools "file-reader,web-search,code-analyzer" \
  --prompt "You are an expert code reviewer. Focus on best practices, security, and maintainability."

# 3. Validate the agent
fractary-forge agent-validate code-reviewer --check-tools

# 4. Test locally
# (Use the agent in your application)

# 5. Lock the version
fractary-forge lock
```

### Create Agent with Interactive Mode

**Scenario**: You prefer a guided experience for creating agents.

```bash
# Interactive creation
fractary-forge agent-create my-agent --interactive
```

The CLI will prompt you for:
- Description
- Model provider
- Model name
- Tools
- System prompt
- Tags

### Create Agent by Extending Another

**Scenario**: You want to create a specialized version of an existing agent.

```bash
# 1. Install base plugin (if needed)
fractary-forge install @fractary/base-agents

# 2. Create extending agent
fractary-forge agent-create specialized-reviewer \
  --extends code-reviewer \
  --description "Code reviewer specialized for TypeScript"

# 3. Edit the agent to add customizations
vim .fractary/agents/specialized-reviewer.yaml

# Add TypeScript-specific tools and prompt
```

### Agent with Custom Tools

**Scenario**: Create an agent that uses custom tools you've built.

```bash
# 1. Create custom tools first
cat > .fractary/tools/database-query.yaml <<EOF
name: database-query
type: tool
version: 1.0.0
description: Query database for information

parameters:
  type: object
  properties:
    query:
      type: string
      description: SQL query to execute
  required:
    - query

implementation:
  type: function
  handler: ./handlers/database-query.js
EOF

# 2. Create agent using custom tool
fractary-forge agent-create data-analyst \
  --description "Data analysis assistant" \
  --tools "database-query,web-search" \
  --prompt "You are a data analyst. Use database queries to answer questions."

# 3. Validate
fractary-forge agent-validate data-analyst --check-tools --strict
```

## Plugin Management Workflows

### Install and Configure Plugin

**Scenario**: Install a plugin and configure it for your project.

```bash
# 1. Search for plugins
fractary-forge search "faber workflow"

# 2. View plugin information
fractary-forge info @fractary/faber-plugin

# 3. Install plugin
fractary-forge install @fractary/faber-plugin

# 4. List what was installed
fractary-forge list

# 5. View specific agent from plugin
fractary-forge agent-info @fractary/faber-plugin/faber-agent

# 6. Lock versions
fractary-forge lock
```

### Install Specific Version

**Scenario**: You need a specific version of a plugin.

```bash
# 1. Check available versions
fractary-forge search "@fractary/faber-plugin"

# 2. Install specific version
fractary-forge install @fractary/faber-plugin --version 1.2.0

# 3. Verify installation
fractary-forge info @fractary/faber-plugin
```

### Global vs Local Installation

**Scenario**: Decide where to install plugins.

```bash
# Install globally (available to all projects)
fractary-forge install @fractary/base-agents --global

# Install locally (only this project)
fractary-forge install @fractary/project-specific --local

# List both
fractary-forge list --scope all
```

### Update Plugins

**Scenario**: Keep plugins up to date.

```bash
# 1. Check for available updates
fractary-forge update --dry-run

# 2. Review what will change
# Output shows: plugin@1.0.0 → 1.1.0

# 3. Update all plugins
fractary-forge update

# 4. Or update specific plugin
fractary-forge update @fractary/faber-plugin

# 5. Allow major version updates
fractary-forge update --major

# 6. Update lockfile
fractary-forge lock --update
```

### Uninstall Plugin

**Scenario**: Remove a plugin you no longer need.

```bash
# 1. List installed plugins
fractary-forge list

# 2. Uninstall plugin
fractary-forge uninstall @fractary/old-plugin

# 3. Update lockfile
fractary-forge lock --update
```

## Team Collaboration Workflows

### Set Up Shared Project

**Scenario**: Multiple developers working on the same agent project.

```bash
# Team Lead:
# 1. Initialize project
fractary-forge init --org company-name

# 2. Install required plugins
fractary-forge install @fractary/base-agents
fractary-forge install @fractary/tools-common

# 3. Create shared agents
fractary-forge agent-create company-assistant \
  --description "Company-specific AI assistant"

# 4. Lock versions
fractary-forge lock

# 5. Commit to git
git add .fractary/
git commit -m "Initialize Forge project"
git push
```

```bash
# Team Members:
# 1. Clone repository
git clone <repository-url>
cd <project>

# 2. Install from lockfile
fractary-forge install

# 3. Verify setup
fractary-forge list
fractary-forge agent-list
```

### Share Custom Agents

**Scenario**: Share agents created by team members.

```bash
# Developer A creates agent
fractary-forge agent-create feature-analyzer \
  --description "Analyze feature requests"

git add .fractary/agents/feature-analyzer.yaml
git commit -m "Add feature analyzer agent"
git push

# Developer B pulls changes
git pull
fractary-forge agent-list  # Now sees feature-analyzer
```

### Manage Different Environments

**Scenario**: Different agent configurations for dev/staging/prod.

```yaml
# .fractary/forge/config.yaml
organization: mycompany

environments:
  development:
    registry:
      stockyard:
        enabled: false
    defaults:
      agent:
        model:
          provider: anthropic
          name: claude-haiku-4  # Faster, cheaper for dev

  production:
    registry:
      stockyard:
        enabled: true
    defaults:
      agent:
        model:
          provider: anthropic
          name: claude-sonnet-4  # Better quality for prod
```

## Fork and Merge Workflows

### Fork and Customize Plugin Agent

**Scenario**: Use a plugin agent as a starting point but customize it.

```bash
# 1. Install plugin
fractary-forge install @fractary/base-agents

# 2. Fork the agent you want to customize
fractary-forge fork @fractary/base-agents/general-assistant \
  --name company-assistant

# 3. Customize the fork
vim .fractary/agents/company-assistant.yaml

# Add company-specific tools, prompts, etc.

# 4. Validate
fractary-forge agent-validate company-assistant --check-tools

# 5. Lock version
fractary-forge lock
```

### Track Upstream Changes

**Scenario**: Keep your fork updated with upstream improvements.

```bash
# 1. Check for upstream updates
fractary-forge update --dry-run

# Output shows:
# company-assistant (fork of @fractary/base-agents/general-assistant):
#   Upstream: 1.0.0 → 1.1.0
#   Changes: improved prompt, added error handling

# 2. Review what changed
fractary-forge fork diff company-assistant

# 3. Merge upstream changes
fractary-forge merge

# 4. Resolve conflicts if any
# Edit .fractary/agents/company-assistant.yaml

# 5. Validate merged result
fractary-forge agent-validate company-assistant
```

### Auto vs Manual Merge Strategy

**Scenario**: Control how upstream changes are merged.

```bash
# Auto merge (no conflicts expected)
fractary-forge merge --strategy auto

# Manual merge (review all changes)
fractary-forge merge --strategy manual

# Keep local changes (override upstream)
fractary-forge merge --strategy local

# Use upstream (discard local changes)
fractary-forge merge --strategy upstream

# Dry run to preview
fractary-forge merge --dry-run
```

## Export Workflows

### Export to LangChain

**Scenario**: Deploy your agents in a Python LangChain application.

```typescript
// export-to-langchain.ts
import { Registry, Exporters } from '@fractary/forge';

// 1. Resolve agent
const agent = await Registry.resolver.resolve('my-agent', 'agent');

// 2. Resolve tools
const tools = await Promise.all(
  agent.tools.map(name => Registry.resolver.resolve(name, 'tool'))
);

// 3. Export to LangChain
await Exporters.exporter.export(
  {
    agents: [agent],
    tools: tools,
  },
  {
    format: 'langchain',
    outputDir: './langchain-export',
    formatOptions: {
      pythonVersion: '3.11',
      includeTypeHints: true,
      useAsync: true,
    },
  }
);
```

Run:
```bash
npx tsx export-to-langchain.ts
```

Output:
```
langchain-export/
├── agents/
│   └── my-agent.py
├── tools/
│   ├── web-search.py
│   └── file-reader.py
├── requirements.txt
└── README.md
```

### Export to Claude Code

**Scenario**: Use agents in Claude Code projects.

```typescript
// export-to-claude.ts
import { Exporters } from '@fractary/forge';

await Exporters.exporter.export(
  { agents: [agent], tools: tools },
  {
    format: 'claude',
    outputDir: './claude-export',
    formatOptions: {
      includeDirectoryStructure: true,
      asMCPTools: true,
    },
  }
);
```

Output:
```
claude-export/
├── .claude/
│   ├── agents/
│   │   └── my-agent.md
│   ├── tools/
│   │   └── web-search.md
│   └── mcp/
│       └── tools/
│           └── web-search.json
└── README.md
```

### Export to n8n

**Scenario**: Create n8n workflows from agents.

```typescript
// export-to-n8n.ts
import { Exporters } from '@fractary/forge';

await Exporters.exporter.export(
  { agents: [agent] },
  {
    format: 'n8n',
    outputDir: './n8n-export',
    formatOptions: {
      workflowName: 'My Agent Workflow',
    },
  }
);
```

Output:
```
n8n-export/
├── workflows/
│   └── my-agent.json
├── nodes/
│   └── web-search.json
└── README.md
```

### Batch Export All Agents

**Scenario**: Export all agents in your project to a specific format.

```typescript
// export-all.ts
import { LocalResolver, Exporters } from '@fractary/forge';

// 1. Get all local agents
const resolver = new LocalResolver({
  paths: ['.fractary/agents'],
});

const allAgents = await resolver.listAgents();

// 2. Export to all formats
for (const format of ['langchain', 'claude', 'n8n'] as const) {
  await Exporters.exporter.export(
    { agents: allAgents },
    { format, outputDir: `./export/${format}` }
  );
}
```

## Cache Management Workflows

### Monitor Cache Performance

**Scenario**: Optimize cache settings based on usage.

```bash
# 1. Check cache stats
fractary-forge cache stats

# Output:
# Total entries: 25
# Fresh entries: 20
# Expired entries: 5
# Total size: 4.7 MB

# 2. Monitor over time
watch -n 300 "fractary-forge cache stats"  # Every 5 minutes
```

### Clear Cache Strategically

**Scenario**: Manage cache size and freshness.

```bash
# Clear only expired entries
fractary-forge cache clear --expired

# Clear specific plugin's cache
fractary-forge cache clear --pattern "@fractary/faber-plugin"

# Clear all cache
fractary-forge cache clear --all

# Verify
fractary-forge cache stats
```

### Force Refresh from Registry

**Scenario**: Ensure you have latest data from registry.

```bash
# 1. Clear cache for specific plugin
fractary-forge cache clear --pattern "@fractary/base-agents"

# 2. Reinstall to fetch fresh
fractary-forge install @fractary/base-agents --force

# 3. Update lockfile
fractary-forge lock --update
```

## Registry Management Workflows

### Add Custom Registry

**Scenario**: Use a private or company registry.

```bash
# 1. Add registry
fractary-forge registry add https://registry.company.com \
  --name company-registry \
  --priority 1  # Higher priority than public registry

# 2. Authenticate
fractary-forge login --registry https://registry.company.com \
  --token <your-token>

# 3. Verify
fractary-forge whoami --registry https://registry.company.com

# 4. List registries
fractary-forge registry list

# 5. Search in custom registry
fractary-forge search "internal-tools"
```

### Multi-Registry Setup

**Scenario**: Use multiple registries with priority.

```bash
# Add registries in priority order
fractary-forge registry add https://internal.company.com/registry \
  --name company-internal \
  --priority 1  # Checked first

fractary-forge registry add https://registry.fractary.dev \
  --name fractary-public \
  --priority 2  # Checked second

# Install will check registries in priority order
fractary-forge install @company/internal-tool  # From company-internal
fractary-forge install @fractary/public-tool    # From fractary-public
```

### Switch Between Registries

**Scenario**: Temporarily use a different registry.

```bash
# Disable a registry
fractary-forge registry remove fractary-public

# Add it back later
fractary-forge registry add https://registry.fractary.dev \
  --name fractary-public
```

## Advanced Workflows

### CI/CD Pipeline Integration

**Scenario**: Automate agent validation in CI/CD.

```yaml
# .github/workflows/validate-agents.yml
name: Validate Agents

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Forge CLI
        run: npm install -g @fractary/forge-cli

      - name: Install dependencies
        run: fractary-forge install

      - name: Validate agents
        run: |
          for agent in .fractary/agents/*.yaml; do
            fractary-forge agent-validate $(basename $agent .yaml) --strict --check-tools
          done

      - name: Verify lockfile is up to date
        run: |
          fractary-forge lock
          git diff --exit-code .fractary/forge/lockfile.json
```

### Automated Export Pipeline

**Scenario**: Automatically export agents when they change.

```yaml
# .github/workflows/export-agents.yml
name: Export Agents

on:
  push:
    paths:
      - '.fractary/agents/**'

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3

      - name: Install dependencies
        run: |
          npm install -g @fractary/forge-cli
          npm install @fractary/forge

      - name: Export to all formats
        run: node export-all.js

      - name: Upload exports
        uses: actions/upload-artifact@v3
        with:
          name: agent-exports
          path: export/
```

## See Also

- [Command Reference](./command-reference.md) - Complete CLI command documentation
- [Getting Started](./getting-started.md) - Installation and basics
- [API Reference](./api-reference.md) - SDK API documentation
- [Configuration Guide](./configuration.md) - Configuration options
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
