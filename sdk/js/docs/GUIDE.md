# @fractary/forge User Guide

> **Step-by-step guide for using the Forge SDK**

This guide provides comprehensive walkthroughs for common workflows and use cases with the `@fractary/forge` SDK.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Concepts](#basic-concepts)
3. [Working with Agents](#working-with-agents)
4. [Working with Tools](#working-with-tools)
5. [Dependency Management](#dependency-management)
6. [Lockfile Management](#lockfile-management)
7. [Fork Workflows](#fork-workflows)
8. [Update Management](#update-management)
9. [Advanced Topics](#advanced-topics)
10. [Integration Guide](#integration-guide)

---

## Getting Started

### Installation

First, install the SDK in your project:

```bash
npm install @fractary/forge
```

### Setting Up Your First Project

Create a basic project structure:

```bash
mkdir my-forge-project
cd my-forge-project
npm init -y
npm install @fractary/forge
mkdir -p .fractary/agents .fractary/tools
```

### Creating Your First Configuration

Create a configuration file to initialize the resolver:

```typescript
// src/config.ts
import { DefinitionResolver } from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

export function createResolver() {
  return new DefinitionResolver({
    local: {
      enabled: true,
      paths: [
        path.join(process.cwd(), '.fractary/agents'),
        path.join(process.cwd(), '.fractary/tools'),
      ],
    },
    global: {
      enabled: true,
      path: path.join(os.homedir(), '.fractary/registry'),
    },
    stockyard: {
      enabled: false, // Enable when Stockyard is available
    },
  });
}
```

---

## Basic Concepts

### Understanding Registries

The Forge SDK uses a 3-tier resolution system:

1. **Local Registry** (`.fractary/` in your project)
   - Project-specific agents and tools
   - Highest priority during resolution
   - Perfect for custom implementations

2. **Global Registry** (`~/.fractary/registry`)
   - Shared across all projects on your machine
   - Reusable agents and tools
   - Second priority during resolution

3. **Stockyard** (Remote marketplace)
   - Public registry for discovering agents/tools
   - Lowest priority during resolution
   - Requires authentication (future enhancement)

### Agent vs Tool

**Agents** are AI assistants with:
- A specific model configuration
- A system prompt
- A set of tools they can use
- Configuration options (temperature, max_tokens, etc.)

**Tools** are executable functions with:
- A parameter schema
- An implementation handler
- Documentation and examples

### Version Resolution

Forge uses semantic versioning (semver) for version constraints:

```typescript
// Exact version
await resolver.resolveAgent('my-agent@1.2.3');

// Range constraints
await resolver.resolveAgent('my-agent@^1.0.0'); // >= 1.0.0, < 2.0.0
await resolver.resolveAgent('my-agent@~1.2.0'); // >= 1.2.0, < 1.3.0
await resolver.resolveAgent('my-agent@*');      // Any version

// Without version = latest
await resolver.resolveAgent('my-agent');
```

---

## Working with Agents

### Creating Your First Agent

Create a YAML file for your agent:

```yaml
# .fractary/agents/my-assistant.yaml
name: my-assistant
version: 1.0.0
description: A helpful AI assistant that can search and analyze data
type: agent

model:
  provider: anthropic
  name: claude-sonnet-4

tools:
  - web-search
  - data-analyzer

prompt: |
  You are a helpful AI assistant with expertise in data analysis.
  You can search the web for information and analyze datasets.

  When analyzing data:
  - Always verify the data source
  - Look for patterns and anomalies
  - Provide clear, actionable insights

config:
  temperature: 0.7
  max_tokens: 4096
  top_p: 0.9

metadata:
  author: Your Name
  tags:
    - data-analysis
    - web-search
  license: MIT
```

### Resolving and Using an Agent

```typescript
import { createResolver } from './config';

async function useAgent() {
  const resolver = createResolver();

  // Resolve the agent
  const resolved = await resolver.resolveAgent('my-assistant@^1.0.0');

  console.log('Agent Details:');
  console.log(`  Name: ${resolved.definition.name}`);
  console.log(`  Version: ${resolved.version}`);
  console.log(`  Source: ${resolved.source}`);
  console.log(`  Model: ${resolved.definition.model.name}`);
  console.log(`  Tools: ${resolved.definition.tools?.join(', ')}`);

  // Use the agent configuration in your application
  const config = {
    model: resolved.definition.model.name,
    systemPrompt: resolved.definition.prompt,
    temperature: resolved.definition.config?.temperature,
    maxTokens: resolved.definition.config?.max_tokens,
  };

  return config;
}

useAgent().catch(console.error);
```

### Creating Specialized Agents with Inheritance

You can create specialized versions of agents using the `extends` keyword:

```yaml
# .fractary/agents/sql-assistant.yaml
name: sql-assistant
version: 1.0.0
extends: my-assistant  # Inherits from my-assistant

description: SQL-focused data assistant

# Override the prompt
prompt: |
  You are a SQL expert assistant with data analysis capabilities.
  You can write and optimize SQL queries, explain query plans,
  and provide database optimization advice.

# Add SQL-specific tools
tools:
  - web-search        # Inherited
  - data-analyzer     # Inherited
  - sql-executor      # Additional tool
  - query-optimizer   # Additional tool

# Override configuration
config:
  temperature: 0.3    # Lower temperature for more precise SQL generation
  max_tokens: 8192    # More tokens for complex queries
```

```typescript
import { createResolver } from './config';

async function useSpecializedAgent() {
  const resolver = createResolver();

  // Resolve the specialized agent
  const sqlAssistant = await resolver.resolveAgent('sql-assistant');

  // This agent has all the base properties plus the overrides
  console.log(`Tools: ${sqlAssistant.definition.tools?.join(', ')}`);
  // Output: web-search, data-analyzer, sql-executor, query-optimizer

  console.log(`Temperature: ${sqlAssistant.definition.config?.temperature}`);
  // Output: 0.3 (overridden from base)
}
```

---

## Working with Tools

### Creating Your First Tool

Create a YAML file for your tool:

```yaml
# .fractary/tools/web-search.yaml
name: web-search
version: 1.0.0
description: Search the web for information using a search engine
type: tool

parameters:
  type: object
  properties:
    query:
      type: string
      description: The search query
    max_results:
      type: number
      description: Maximum number of results to return
      default: 10
  required:
    - query

implementation:
  type: function
  handler: ./handlers/web-search.js

metadata:
  author: Your Name
  category: search
  tags:
    - web
    - search
```

### Implementing the Tool Handler

Create the handler implementation:

```javascript
// .fractary/tools/handlers/web-search.js
const axios = require('axios');

/**
 * Web search tool handler
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Search query
 * @param {number} [params.max_results=10] - Max results
 * @returns {Promise<Array>} Search results
 */
async function webSearch(params) {
  const { query, max_results = 10 } = params;

  try {
    // Example using a search API
    const response = await axios.get('https://api.example.com/search', {
      params: {
        q: query,
        limit: max_results,
      },
    });

    return response.data.results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
    }));
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

module.exports = webSearch;
```

### Resolving and Using a Tool

```typescript
import { createResolver } from './config';

async function useTool() {
  const resolver = createResolver();

  // Resolve the tool
  const resolved = await resolver.resolveTool('web-search@^1.0.0');

  console.log('Tool Details:');
  console.log(`  Name: ${resolved.definition.name}`);
  console.log(`  Version: ${resolved.version}`);
  console.log(`  Parameters:`, JSON.stringify(resolved.definition.parameters, null, 2));

  // Load and use the tool handler
  const handlerPath = resolved.definition.implementation?.handler;
  if (handlerPath) {
    const handler = require(handlerPath);

    // Execute the tool
    const results = await handler({
      query: 'TypeScript best practices',
      max_results: 5,
    });

    console.log('Search Results:', results);
  }
}

useTool().catch(console.error);
```

### Creating Tool Variants with Inheritance

```yaml
# .fractary/tools/web-search-cached.yaml
name: web-search-cached
version: 1.0.0
extends: web-search  # Inherits from web-search

description: Web search with caching for improved performance

# Override the handler
implementation:
  type: function
  handler: ./handlers/web-search-cached.js

# Add cache configuration
config:
  cache_ttl: 3600      # Cache for 1 hour
  cache_max_size: 100  # Max 100 cached queries
```

---

## Dependency Management

### Understanding Dependencies

Agents depend on tools, and tools can depend on other tools. Forge automatically resolves these dependencies.

### Building a Dependency Tree

```typescript
import { createResolver } from './config';
import { DependencyResolver } from '@fractary/forge';

async function analyzeDependencies() {
  const resolver = createResolver();
  const depResolver = new DependencyResolver(resolver);

  // Build complete dependency tree for an agent
  const tree = await depResolver.buildDependencyTree('my-assistant', 'agent');

  console.log('Dependency Tree:');
  console.log(`Total dependencies: ${tree.nodes.size}`);

  for (const [name, node] of tree.nodes) {
    console.log(`\n${name}@${node.version} (${node.type})`);

    if (node.dependencies.tools && node.dependencies.tools.length > 0) {
      console.log(`  Requires tools:`);
      for (const tool of node.dependencies.tools) {
        console.log(`    - ${tool}`);
      }
    }
  }
}

analyzeDependencies().catch(console.error);
```

### Detecting Circular Dependencies

```typescript
import { createResolver } from './config';
import { DependencyResolver } from '@fractary/forge';

async function checkCircularDependencies() {
  const resolver = createResolver();
  const depResolver = new DependencyResolver(resolver);

  try {
    const tree = await depResolver.buildDependencyTree('my-agent', 'agent');
    console.log('No circular dependencies detected!');
  } catch (error) {
    if (error.code === 'CIRCULAR_DEPENDENCY') {
      console.error('Circular dependency detected!');
      console.error(`Cycle: ${error.metadata.cycle.join(' -> ')}`);
    }
  }
}
```

### Resolving All Dependencies

```typescript
import { createResolver } from './config';
import { DependencyResolver } from '@fractary/forge';

async function resolveAllDependencies() {
  const resolver = createResolver();
  const depResolver = new DependencyResolver(resolver);

  // Resolve agent and all its dependencies
  const resolved = await depResolver.resolveWithDependencies('my-assistant', 'agent');

  console.log(`Main Agent: ${resolved.main.definition.name}@${resolved.main.version}`);
  console.log(`\nDependencies (${resolved.dependencies.length}):`);

  for (const dep of resolved.dependencies) {
    console.log(`  - ${dep.definition.name}@${dep.version} (${dep.definition.type})`);
  }
}

resolveAllDependencies().catch(console.error);
```

---

## Lockfile Management

### What is a Lockfile?

A lockfile pins exact versions of all agents and tools with integrity hashes, ensuring reproducible builds across environments.

### Generating a Lockfile

```typescript
import { createResolver } from './config';
import { LockfileManager } from '@fractary/forge';

async function generateLockfile() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);

  // Generate lockfile for all local agents/tools
  const lockfile = await lockfileManager.generate({
    force: true, // Regenerate even if exists
  });

  console.log('Lockfile Generated:');
  console.log(`  Agents locked: ${Object.keys(lockfile.agents).length}`);
  console.log(`  Tools locked: ${Object.keys(lockfile.tools).length}`);
  console.log(`  Generated at: ${lockfile.generated}`);

  // Lockfile is automatically saved to .fractary/forge.lock
}

generateLockfile().catch(console.error);
```

### Loading and Validating a Lockfile

```typescript
import { createResolver } from './config';
import { LockfileManager } from '@fractary/forge';

async function validateLockfile() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);

  try {
    // Load lockfile
    const lockfile = await lockfileManager.load();

    console.log('Lockfile loaded successfully');
    console.log(`Version: ${lockfile.version}`);
    console.log(`Generated: ${lockfile.generated}`);

    // Validate integrity
    const validation = await lockfileManager.validate();

    if (validation.valid) {
      console.log('✓ Lockfile is valid!');
    } else {
      console.error('✗ Lockfile validation failed:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
    }
  } catch (error) {
    console.error('Failed to load lockfile:', error.message);
  }
}

validateLockfile().catch(console.error);
```

### Using Lockfile for Reproducible Installs

```typescript
import { createResolver } from './config';
import { LockfileManager } from '@fractary/forge';

async function installFromLockfile() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);

  // Load lockfile
  const lockfile = await lockfileManager.load();

  console.log('Installing from lockfile...');

  // Verify each locked package
  for (const [name, entry] of Object.entries(lockfile.agents)) {
    try {
      const resolved = await resolver.resolveAgent(`${name}@${entry.version}`);

      // Verify integrity
      const { calculateIntegrity } = await import('@fractary/forge/lockfile');
      const integrity = await calculateIntegrity(resolved.definition);

      if (integrity === entry.integrity) {
        console.log(`✓ ${name}@${entry.version} - integrity verified`);
      } else {
        console.error(`✗ ${name}@${entry.version} - integrity mismatch!`);
      }
    } catch (error) {
      console.error(`✗ ${name}@${entry.version} - failed to resolve`);
    }
  }
}

installFromLockfile().catch(console.error);
```

### Updating the Lockfile

```typescript
import { createResolver } from './config';
import { LockfileManager } from '@fractary/forge';

async function updateLockfile() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);

  // Regenerate lockfile with latest versions
  console.log('Updating lockfile...');

  const lockfile = await lockfileManager.generate({
    force: true, // Force regeneration
  });

  console.log('Lockfile updated successfully!');
  console.log(`  Agents: ${Object.keys(lockfile.agents).length}`);
  console.log(`  Tools: ${Object.keys(lockfile.tools).length}`);
}

updateLockfile().catch(console.error);
```

---

## Fork Workflows

### Why Fork?

Forking allows you to:
- Customize existing agents/tools for your needs
- Track upstream changes
- Merge upstream updates while preserving customizations

### Forking an Agent

```typescript
import { createResolver } from './config';
import { ForkManager, ManifestManager } from '@fractary/forge';

async function forkAgent() {
  const resolver = createResolver();
  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  // Fork a base agent
  await forkManager.forkAgent({
    sourceName: 'base-coding-agent',
    targetName: 'my-coding-agent',
    customizations: {
      description: 'My customized coding assistant',
      prompt: `You are a specialized TypeScript coding assistant.

You focus on:
- Clean, maintainable code
- TypeScript best practices
- Test-driven development
- Performance optimization`,
      config: {
        temperature: 0.3, // Lower temperature for code generation
      },
    },
  });

  console.log('Agent forked successfully!');
  console.log('Location: .fractary/agents/my-coding-agent.yaml');
}

forkAgent().catch(console.error);
```

### Checking for Upstream Updates

```typescript
import { createResolver } from './config';
import { ForkManager, ManifestManager } from '@fractary/forge';

async function checkUpstreamUpdates() {
  const resolver = createResolver();
  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  // Check if upstream has updates
  const check = await forkManager.checkAgentUpstreamUpdates('my-coding-agent');

  if (check.hasUpdate) {
    console.log('Upstream update available!');
    console.log(`  Current: ${check.currentUpstreamVersion}`);
    console.log(`  Latest: ${check.latestUpstreamVersion}`);

    if (check.changes) {
      console.log('\nChanges:');
      for (const [key, value] of Object.entries(check.changes)) {
        console.log(`  - ${key}: modified`);
      }
    }
  } else {
    console.log('No upstream updates available');
  }
}

checkUpstreamUpdates().catch(console.error);
```

### Merging Upstream Changes

```typescript
import { createResolver } from './config';
import { ForkManager, ManifestManager } from '@fractary/forge';

async function mergeUpstream() {
  const resolver = createResolver();
  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  // Merge upstream changes with auto-resolution
  const result = await forkManager.mergeUpstreamAgent('my-coding-agent', {
    strategy: 'auto', // Auto-resolve when possible
  });

  if (result.success) {
    console.log('✓ Merge successful!');
    console.log(`  Merged changes: ${result.merged.length}`);

    for (const path of result.merged) {
      console.log(`    - ${path}`);
    }
  } else {
    console.log('✗ Merge conflicts detected!');
    console.log(`  Conflicts: ${result.conflicts.length}`);

    for (const conflict of result.conflicts) {
      console.log(`\n  Conflict at: ${conflict.path}`);
      console.log(`    Base: ${JSON.stringify(conflict.base)}`);
      console.log(`    Local: ${JSON.stringify(conflict.local)}`);
      console.log(`    Upstream: ${JSON.stringify(conflict.upstream)}`);
    }

    console.log('\nResolve conflicts manually or use a specific strategy');
  }
}

mergeUpstream().catch(console.error);
```

### Manual Conflict Resolution

```typescript
import { createResolver } from './config';
import { ForkManager, ManifestManager } from '@fractary/forge';

async function mergeWithManualResolution() {
  const resolver = createResolver();
  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  // First, try auto-merge to see conflicts
  const autoResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
    strategy: 'auto',
  });

  if (!autoResult.success) {
    console.log('Auto-merge failed. Trying different strategies...\n');

    // Option 1: Keep all local changes
    console.log('Strategy: Keep local changes');
    const localResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
      strategy: 'local',
    });

    // Option 2: Accept all upstream changes
    console.log('Strategy: Accept upstream changes');
    const upstreamResult = await forkManager.mergeUpstreamAgent('my-coding-agent', {
      strategy: 'upstream',
    });

    // Option 3: Manual resolution (read file, resolve, write back)
    // This requires loading the YAML, manually resolving, and saving
    console.log('\nFor manual resolution:');
    console.log('1. Review conflicts listed above');
    console.log('2. Edit .fractary/agents/my-coding-agent.yaml');
    console.log('3. Resolve each conflict by choosing base/local/upstream values');
    console.log('4. Save the file');
  }
}

mergeWithManualResolution().catch(console.error);
```

### Complete Fork Workflow Example

```typescript
import { createResolver } from './config';
import { ForkManager, ManifestManager } from '@fractary/forge';

async function completeForkWorkflow() {
  const resolver = createResolver();
  const manifestManager = new ManifestManager();
  const forkManager = new ForkManager(resolver, manifestManager);

  console.log('=== Complete Fork Workflow ===\n');

  // Step 1: Fork the agent
  console.log('Step 1: Forking agent...');
  await forkManager.forkAgent({
    sourceName: 'base-agent',
    targetName: 'my-custom-agent',
    customizations: {
      description: 'My customized version',
      prompt: 'Custom prompt here...',
    },
  });
  console.log('✓ Agent forked\n');

  // Step 2: Make local changes
  console.log('Step 2: Make your customizations to the forked agent...');
  console.log('(Edit .fractary/agents/my-custom-agent.yaml)\n');

  // Step 3: Check for upstream updates (simulate time passing)
  console.log('Step 3: Checking for upstream updates...');
  const check = await forkManager.checkAgentUpstreamUpdates('my-custom-agent');

  if (check.hasUpdate) {
    console.log(`✓ Update available: ${check.latestUpstreamVersion}\n`);

    // Step 4: Merge upstream changes
    console.log('Step 4: Merging upstream changes...');
    const mergeResult = await forkManager.mergeUpstreamAgent('my-custom-agent', {
      strategy: 'auto',
    });

    if (mergeResult.success) {
      console.log('✓ Merge successful!');
    } else {
      console.log('✗ Conflicts detected - manual resolution required');

      // Resolve using local strategy
      await forkManager.mergeUpstreamAgent('my-custom-agent', {
        strategy: 'local',
      });
      console.log('✓ Conflicts resolved using local strategy');
    }
  } else {
    console.log('✓ No upstream updates available\n');
  }

  console.log('\n=== Fork workflow complete ===');
}

completeForkWorkflow().catch(console.error);
```

---

## Update Management

### Checking for Updates

```typescript
import { createResolver } from './config';
import { LockfileManager, ManifestManager, UpdateChecker } from '@fractary/forge';

async function checkForUpdates() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);

  // Check for available updates
  console.log('Checking for updates...');
  const updates = await updateChecker.checkUpdates();

  if (updates.hasUpdates) {
    console.log('\n' + updateChecker.formatUpdateSummary(updates));

    // Show breaking changes
    if (updates.breakingChanges.length > 0) {
      console.log('\n⚠️  Breaking Changes Detected:');
      for (const update of updates.breakingChanges) {
        console.log(`  ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
      }
    }
  } else {
    console.log('✓ All packages are up to date!');
  }
}

checkForUpdates().catch(console.error);
```

### Applying Non-Breaking Updates

```typescript
import { createResolver } from './config';
import {
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager
} from '@fractary/forge';

async function applyUpdates() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  console.log('Applying updates (skipping breaking changes)...');

  const result = await updateManager.update({
    skipBreaking: true, // Skip breaking changes by default
  });

  if (result.success) {
    console.log('✓ Updates applied successfully!');

    if (result.updated.length > 0) {
      console.log('\nUpdated:');
      for (const update of result.updated) {
        console.log(`  ✓ ${update.name}: ${update.from} → ${update.to}`);
      }
    }

    if (result.skipped.length > 0) {
      console.log('\nSkipped (breaking changes):');
      for (const skip of result.skipped) {
        console.log(`  - ${skip.name}: ${skip.version} (reason: ${skip.reason})`);
      }
    }
  } else {
    console.error('✗ Update failed');

    if (result.failed.length > 0) {
      console.error('\nFailed:');
      for (const fail of result.failed) {
        console.error(`  ✗ ${fail.name}: ${fail.error}`);
      }
    }
  }
}

applyUpdates().catch(console.error);
```

### Applying Breaking Updates

```typescript
import { createResolver } from './config';
import {
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager
} from '@fractary/forge';

async function applyBreakingUpdates() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  console.log('⚠️  Applying ALL updates including breaking changes...');
  console.log('This may require code changes in your application.\n');

  const result = await updateManager.update({
    skipBreaking: false, // Include breaking changes
  });

  if (result.success) {
    console.log('✓ All updates applied!');

    // Identify which updates were breaking
    const breakingUpdates = result.updated.filter(u => {
      const currentMajor = parseInt(u.from.split('.')[0]);
      const newMajor = parseInt(u.to.split('.')[0]);
      return newMajor > currentMajor;
    });

    if (breakingUpdates.length > 0) {
      console.log('\n⚠️  Breaking updates applied:');
      for (const update of breakingUpdates) {
        console.log(`  ${update.name}: ${update.from} → ${update.to}`);
      }
      console.log('\nPlease review migration guides and test your application.');
    }
  }
}

applyBreakingUpdates().catch(console.error);
```

### Dry Run Mode

```typescript
import { createResolver } from './config';
import {
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager
} from '@fractary/forge';

async function dryRunUpdate() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  console.log('Performing dry run update check...\n');

  const result = await updateManager.update({
    dryRun: true, // Don't actually apply updates
    skipBreaking: false, // Show all updates
  });

  console.log('Dry run complete. The following updates would be applied:\n');

  for (const update of result.updated) {
    const emoji = update.from.split('.')[0] !== update.to.split('.')[0] ? '⚠️ ' : '✓';
    console.log(`${emoji} ${update.name}: ${update.from} → ${update.to}`);
  }

  console.log('\nRun without --dry-run to apply these updates.');
}

dryRunUpdate().catch(console.error);
```

### Updating Specific Packages

```typescript
import { createResolver } from './config';
import {
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager
} from '@fractary/forge';

async function updateSpecificPackages() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  const packagesToUpdate = ['my-agent', 'web-search'];

  console.log(`Updating specific packages: ${packagesToUpdate.join(', ')}\n`);

  const result = await updateManager.update({
    packages: packagesToUpdate,
    skipBreaking: true,
  });

  if (result.success) {
    console.log('✓ Packages updated successfully!');

    for (const update of result.updated) {
      console.log(`  ${update.name}: ${update.from} → ${update.to}`);
    }
  }
}

updateSpecificPackages().catch(console.error);
```

### Rolling Back Updates

```typescript
import { createResolver } from './config';
import {
  LockfileManager,
  ManifestManager,
  UpdateChecker,
  UpdateManager
} from '@fractary/forge';

async function rollbackUpdate() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);
  const manifestManager = new ManifestManager();
  const updateChecker = new UpdateChecker(lockfileManager, manifestManager);
  const updateManager = new UpdateManager(
    resolver,
    lockfileManager,
    manifestManager,
    updateChecker
  );

  const packageName = 'my-agent';
  const targetVersion = '1.0.0'; // Version to rollback to

  console.log(`Rolling back ${packageName} to version ${targetVersion}...`);

  try {
    await updateManager.rollback(packageName, targetVersion);
    console.log(`✓ Successfully rolled back ${packageName} to ${targetVersion}`);
  } catch (error) {
    console.error(`✗ Rollback failed: ${error.message}`);

    if (error.code === 'VERSION_NOT_INSTALLED') {
      console.error(`Version ${targetVersion} is not installed.`);
      console.error('Install it first or choose a different version.');
    }
  }
}

rollbackUpdate().catch(console.error);
```

---

## Advanced Topics

### Custom Resolution Strategies

You can implement custom resolvers for specific use cases:

```typescript
import { DefinitionResolver } from '@fractary/forge';
import type { ResolverConfig, ResolvedAgent } from '@fractary/forge';

class CustomResolver extends DefinitionResolver {
  constructor(config: ResolverConfig) {
    super(config);
  }

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    // Try custom resolution logic first
    const customResolved = await this.tryCustomResolution(nameWithVersion);
    if (customResolved) {
      return customResolved;
    }

    // Fall back to default resolution
    return super.resolveAgent(nameWithVersion);
  }

  private async tryCustomResolution(nameWithVersion: string): Promise<ResolvedAgent | null> {
    // Your custom resolution logic here
    // For example: resolve from a database, API, etc.
    return null;
  }
}

// Usage
const resolver = new CustomResolver({
  local: { enabled: true, paths: ['.fractary'] },
  global: { enabled: true, path: '~/.fractary/registry' },
  stockyard: { enabled: false },
});
```

### Working with Multiple Inheritance

Agents can inherit from other agents, creating inheritance chains:

```yaml
# base-agent.yaml
name: base-agent
version: 1.0.0
tools:
  - tool-a
  - tool-b
```

```yaml
# specialized-agent.yaml
name: specialized-agent
version: 1.0.0
extends: base-agent
tools:
  - tool-a      # From base
  - tool-b      # From base
  - tool-c      # Added
```

```yaml
# expert-agent.yaml
name: expert-agent
version: 1.0.0
extends: specialized-agent
tools:
  - tool-a      # From base
  - tool-b      # From base
  - tool-c      # From specialized
  - tool-d      # Added
```

The SDK automatically resolves the full inheritance chain:

```typescript
import { createResolver } from './config';
import { InheritanceResolver } from '@fractary/forge';

async function resolveInheritanceChain() {
  const resolver = createResolver();
  const inheritanceResolver = new InheritanceResolver(resolver);

  // This will resolve base-agent → specialized-agent → expert-agent
  const resolved = await inheritanceResolver.resolveInheritance(
    'expert-agent',
    'agent'
  );

  console.log('Fully resolved agent with all inherited properties');
  console.log(`Tools: ${resolved.tools?.join(', ')}`);
  // Output: tool-a, tool-b, tool-c, tool-d
}
```

### Batch Operations

Perform operations on multiple packages efficiently:

```typescript
import { createResolver } from './config';
import { LockfileManager } from '@fractary/forge';

async function batchOperations() {
  const resolver = createResolver();
  const lockfileManager = new LockfileManager(resolver);

  const packages = ['agent-1', 'agent-2', 'agent-3'];

  console.log('Resolving packages in batch...');

  const results = await Promise.allSettled(
    packages.map(pkg => resolver.resolveAgent(pkg))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const pkgName = packages[i];

    if (result.status === 'fulfilled') {
      console.log(`✓ ${pkgName}@${result.value.version}`);
    } else {
      console.error(`✗ ${pkgName}: ${result.reason.message}`);
    }
  }
}

batchOperations().catch(console.error);
```

### Error Handling Best Practices

```typescript
import { createResolver } from './config';
import {
  ResolutionError,
  ValidationError,
  IntegrityError,
  DependencyError
} from '@fractary/forge';

async function handleErrors() {
  const resolver = createResolver();

  try {
    const resolved = await resolver.resolveAgent('my-agent@1.0.0');
    console.log('Agent resolved successfully');
  } catch (error) {
    // Handle specific error types
    if (error instanceof ResolutionError) {
      console.error('Resolution failed:');
      console.error(`  Code: ${error.code}`);
      console.error(`  Message: ${error.message}`);

      if (error.code === 'AGENT_NOT_FOUND') {
        console.error('  Agent does not exist in any registry');
        console.error('  Try: npm install @fractary/my-agent');
      } else if (error.code === 'VERSION_NOT_FOUND') {
        console.error('  Version does not exist');
        console.error(`  Available versions: ${error.metadata?.availableVersions?.join(', ')}`);
      }
    } else if (error instanceof ValidationError) {
      console.error('Validation failed:');
      console.error(`  ${error.message}`);
      console.error('  Check your YAML syntax and schema');
    } else if (error instanceof IntegrityError) {
      console.error('Integrity check failed:');
      console.error(`  ${error.message}`);
      console.error('  The package may have been tampered with');
    } else if (error instanceof DependencyError) {
      console.error('Dependency resolution failed:');
      console.error(`  ${error.message}`);

      if (error.code === 'CIRCULAR_DEPENDENCY') {
        console.error(`  Cycle: ${error.metadata?.cycle?.join(' → ')}`);
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

handleErrors().catch(console.error);
```

---

## Integration Guide

### Integrating with CLI Tools

Here's how to integrate Forge into a CLI tool (e.g., `fractary/cli`):

```typescript
// cli/commands/install.ts
import { Command } from 'commander';
import { DefinitionResolver, LockfileManager } from '@fractary/forge';
import ora from 'ora';
import chalk from 'chalk';

export function createInstallCommand() {
  return new Command('install')
    .argument('[packages...]', 'Packages to install')
    .option('--save', 'Update lockfile', true)
    .option('--global', 'Install globally')
    .action(async (packages, options) => {
      const spinner = ora('Installing packages...').start();

      try {
        const resolver = new DefinitionResolver({
          local: { enabled: true, paths: ['.fractary'] },
          global: { enabled: options.global, path: '~/.fractary/registry' },
          stockyard: { enabled: true },
        });

        const results = [];

        for (const pkg of packages) {
          try {
            const resolved = await resolver.resolveAgent(pkg);
            results.push({ name: pkg, version: resolved.version, success: true });
          } catch (error) {
            results.push({ name: pkg, error: error.message, success: false });
          }
        }

        // Update lockfile
        if (options.save) {
          const lockfileManager = new LockfileManager(resolver);
          await lockfileManager.generate({ force: true });
        }

        spinner.stop();

        // Display results
        for (const result of results) {
          if (result.success) {
            console.log(chalk.green(`✓ ${result.name}@${result.version}`));
          } else {
            console.log(chalk.red(`✗ ${result.name}: ${result.error}`));
          }
        }
      } catch (error) {
        spinner.stop();
        console.error(chalk.red(`Installation failed: ${error.message}`));
        process.exit(1);
      }
    });
}
```

### Integrating with Web Applications

```typescript
// server/routes/agents.ts
import express from 'express';
import { DefinitionResolver } from '@fractary/forge';

const router = express.Router();
const resolver = new DefinitionResolver({
  local: { enabled: true, paths: ['./agents'] },
  global: { enabled: true, path: '/var/lib/fractary/registry' },
  stockyard: { enabled: true },
});

// GET /agents/:name - Get agent details
router.get('/agents/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const version = req.query.version as string | undefined;

    const resolved = await resolver.resolveAgent(
      version ? `${name}@${version}` : name
    );

    res.json({
      name: resolved.definition.name,
      version: resolved.version,
      description: resolved.definition.description,
      tools: resolved.definition.tools,
      model: resolved.definition.model,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// POST /agents/:name/invoke - Invoke an agent
router.post('/agents/:name/invoke', async (req, res) => {
  try {
    const { name } = req.params;
    const { message } = req.body;

    const resolved = await resolver.resolveAgent(name);

    // Use the agent configuration to invoke your AI service
    const response = await invokeAI({
      model: resolved.definition.model.name,
      systemPrompt: resolved.definition.prompt,
      message,
      temperature: resolved.definition.config?.temperature,
    });

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Integrating with CI/CD Pipelines

```yaml
# .github/workflows/validate-agents.yml
name: Validate Agents

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - '.fractary/**'

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate lockfile
        run: |
          node -e "
            const { LockfileManager, DefinitionResolver } = require('@fractary/forge');
            const resolver = new DefinitionResolver({
              local: { enabled: true, paths: ['.fractary'] },
              global: { enabled: false },
              stockyard: { enabled: false },
            });
            const lockfileManager = new LockfileManager(resolver);

            lockfileManager.validate()
              .then(result => {
                if (!result.valid) {
                  console.error('Lockfile validation failed:');
                  result.errors.forEach(err => console.error('  -', err));
                  process.exit(1);
                }
                console.log('✓ Lockfile is valid');
              })
              .catch(err => {
                console.error('Validation error:', err.message);
                process.exit(1);
              });
          "

      - name: Check for updates
        run: |
          node -e "
            const {
              LockfileManager,
              ManifestManager,
              UpdateChecker,
              DefinitionResolver
            } = require('@fractary/forge');

            const resolver = new DefinitionResolver({
              local: { enabled: true, paths: ['.fractary'] },
              global: { enabled: true, path: '~/.fractary/registry' },
              stockyard: { enabled: false },
            });

            const lockfileManager = new LockfileManager(resolver);
            const manifestManager = new ManifestManager();
            const updateChecker = new UpdateChecker(lockfileManager, manifestManager);

            updateChecker.checkUpdates()
              .then(updates => {
                if (updates.hasUpdates) {
                  console.log('Updates available:');
                  console.log(updateChecker.formatUpdateSummary(updates));

                  if (updates.breakingChanges.length > 0) {
                    console.warn('⚠️  Breaking changes detected');
                  }
                } else {
                  console.log('✓ All packages up to date');
                }
              });
          "
```

### Integration with Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Setup Forge registry
RUN mkdir -p /root/.fractary/registry
COPY .fractary/forge.lock ./.fractary/

# Validate and install from lockfile
RUN node -e "
  const { LockfileManager, DefinitionResolver } = require('@fractary/forge');
  const resolver = new DefinitionResolver({
    local: { enabled: true, paths: ['.fractary'] },
    global: { enabled: true, path: '/root/.fractary/registry' },
    stockyard: { enabled: false },
  });
  const lockfileManager = new LockfileManager(resolver);

  lockfileManager.validate()
    .then(result => {
      if (!result.valid) {
        throw new Error('Lockfile validation failed');
      }
      console.log('✓ Lockfile validated');
    });
"

CMD ["node", "index.js"]
```

---

## Next Steps

Now that you've learned the basics of using `@fractary/forge`, you can:

1. **Explore the API Reference** - See [API.md](./API.md) for detailed API documentation
2. **Review the Architecture** - See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. **Check the Examples** - See the `examples/` directory for complete code samples
4. **Read the Specifications** - See `docs/specs/` for implementation details

For questions or issues, please visit the [GitHub repository](https://github.com/fractary/forge).
