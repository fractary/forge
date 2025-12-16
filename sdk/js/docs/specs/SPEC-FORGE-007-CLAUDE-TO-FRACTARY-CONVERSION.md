# SPEC-FORGE-007: Claude Code to Fractary Plugin Conversion Guide

**Status:** Draft
**Created:** 2025-12-15
**Author:** Fractary Team
**Related Work:** SPEC-FORGE-005 (Registry Manifest System), WORK-00006 (Phase 3B)

## 1. Overview

This specification provides a comprehensive guide for converting Claude Code plugins to Fractary plugin format. It serves as both a reference manual and a validation checklist for plugin conversion.

### 1.1 Purpose

- Document the conversion process from Claude Code plugin format to Fractary format
- Provide field-by-field mapping between formats
- Establish patterns for converting agents, skills, commands, and hooks
- Serve as the foundation for automated conversion (future Stockyard translation service)

### 1.2 Source and Target

**Source Format:** Claude Code Plugin (Marketplace/MCP format)
- Directory: `.claude/` or plugin repository
- Agents: Markdown prompts or JSON definitions
- Commands: Markdown files in `.claude/commands/`
- Skills: TypeScript/JavaScript files with MCP tool definitions
- Hooks: JavaScript/TypeScript callback functions

**Target Format:** Fractary Plugin
- Directory: `plugins/{plugin-name}/`
- Agents: YAML files in `agents/`
- Tools: YAML files in `tools/` (converted from skills)
- Commands: Markdown files in `commands/`
- Hooks: JavaScript files in `hooks/`
- Plugin Manifest: `plugin.json`

### 1.3 Architecture Context

**Important**: This conversion produces **Fractary YAML** as the canonical distribution format. Understanding the architecture helps clarify conversion goals:

**Fractary YAML = Canonical Format for Distribution**
- Conversions produce Fractary YAML stored in Forge registries
- FABER reads Fractary YAML directly for workflow orchestration
- Fractary YAML is framework-independent

**Export is Optional (Not Part of Conversion)**
- This spec converts Claude → Fractary YAML (required for distribution)
- Users can optionally export Fractary YAML → other frameworks (LangChain, n8n, etc.)
- Export is handled by `forge export` command (see SPEC-FORGE-005 section 5.3)
- LangChain is internal to FABER execution (not exposed to users)

**Conversion Flow:**
```
Claude Code Plugin (TypeScript/Markdown)
  ↓
  [This Conversion Spec]
  ↓
Fractary YAML (Canonical format for Forge registry)
  ↓
  [FABER reads directly OR user runs forge export]
  ↓
  ├─→ FABER Execution (LangGraph internal)
  ├─→ LangChain Python (via forge export langchain)
  ├─→ Claude Code (via forge export claude)
  └─→ n8n Workflow (via forge export n8n)
```

## 2. Directory Structure Conversion

### 2.1 Claude Code Plugin Structure

```
fractary-faber/ (or .claude/plugins/fractary-faber/)
├── package.json
├── src/
│   ├── agents/
│   │   ├── frame-agent.ts
│   │   └── architect-agent.ts
│   ├── skills/
│   │   ├── fetch-issue.ts
│   │   └── classify-work.ts
│   ├── commands/
│   │   └── faber-run.md
│   └── hooks/
│       └── session-start.ts
└── README.md
```

### 2.2 Fractary Plugin Structure

```
plugins/faber-plugin/
├── plugin.json              # Plugin manifest (NEW)
├── agents/
│   ├── frame-agent.yaml     # Converted from .ts or prompt
│   └── architect-agent.yaml
├── tools/
│   ├── fetch_issue.yaml     # Converted from skills
│   └── classify_work_type.yaml
├── commands/
│   └── faber-run.md         # Direct copy/adapt
├── hooks/
│   └── faber-commit.js      # Converted from .ts
└── README.md                # Adapted from source
```

### 2.3 Naming Conventions

| Claude Code | Fractary | Notes |
|------------|----------|-------|
| `fractary-faber` | `faber-plugin` | Drop "fractary-" prefix, add "-plugin" suffix |
| `fetch-issue.ts` | `fetch_issue.yaml` | Use snake_case for tools |
| `frameAgent` | `frame-agent` | Use kebab-case for agents |
| `FaberRun` | `faber-run` | Use kebab-case for commands |

## 3. Plugin Manifest Conversion

### 3.1 Source: package.json (Claude Plugin)

```json
{
  "name": "@fractary/faber",
  "version": "1.1.0",
  "description": "FABER workflow methodology for Claude Code",
  "author": "Fractary Team",
  "license": "MIT",
  "repository": "https://github.com/fractary/claude-plugins",
  "claudePlugin": {
    "type": "mcp-server",
    "agents": ["frame", "architect", "build", "evaluate", "release"],
    "skills": ["fetch_issue", "classify_work"],
    "commands": ["faber-run"],
    "hooks": ["session-start"]
  }
}
```

### 3.2 Target: plugin.json (Fractary Plugin)

```json
{
  "$schema": "https://fractary.com/schemas/plugin-manifest-v1.json",
  "name": "@fractary/faber-plugin",
  "version": "2.0.0",
  "description": "FABER workflow methodology - Frame, Architect, Build, Evaluate, Release",
  "author": "Fractary Team",
  "homepage": "https://github.com/fractary/fractary-plugins",
  "repository": "https://github.com/fractary/fractary-plugins",
  "license": "MIT",
  "tags": ["faber", "workflow", "official"],

  "agents": [
    {
      "name": "frame-agent",
      "version": "2.0.0",
      "description": "FABER Frame phase - requirements gathering",
      "source": "https://raw.githubusercontent.com/fractary/fractary-plugins/main/plugins/faber-plugin/agents/frame-agent.yaml",
      "checksum": "sha256:abc123...",
      "size": 4096,
      "dependencies": ["fetch_issue", "classify_work_type"]
    }
  ],

  "tools": [
    {
      "name": "fetch_issue",
      "version": "2.0.0",
      "description": "Fetch work item details from tracking systems",
      "source": "https://raw.githubusercontent.com/fractary/fractary-plugins/main/plugins/faber-plugin/tools/fetch_issue.yaml",
      "checksum": "sha256:def456...",
      "size": 2048
    }
  ],

  "hooks": [
    {
      "name": "faber-commit",
      "version": "2.0.0",
      "description": "Auto-format commits with FABER metadata",
      "type": "pre-commit",
      "source": "https://raw.githubusercontent.com/fractary/fractary-plugins/main/plugins/faber-plugin/hooks/faber-commit.js",
      "checksum": "sha256:ghi789...",
      "size": 3072
    }
  ],

  "commands": [
    {
      "name": "faber-run",
      "version": "2.0.0",
      "description": "Execute FABER workflow on work item",
      "source": "https://raw.githubusercontent.com/fractary/fractary-plugins/main/plugins/faber-plugin/commands/faber-run.md",
      "checksum": "sha256:jkl012...",
      "size": 2560
    }
  ],

  "config": {
    "default_llm": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514"
    },
    "permissions": {
      "read": ["**/*.md", "**/*.yaml", "**/*.json"],
      "write": [".fractary/**", "docs/**"],
      "execute": ["bash"]
    }
  }
}
```

### 3.3 Field Mapping

| package.json Field | plugin.json Field | Conversion Notes |
|-------------------|-------------------|------------------|
| `name` | `name` | Change to `@org/plugin-name` format |
| `version` | `version` | Increment major version (breaking format change) |
| `description` | `description` | Expand with full methodology description |
| `author` | `author` | Direct copy |
| `license` | `license` | Direct copy |
| `repository` | `repository` + `homepage` | Use new plugin repo URL |
| `claudePlugin.agents` | `agents` array | Convert to full item objects with metadata |
| `claudePlugin.skills` | `tools` array | Rename "skills" → "tools", add metadata |
| `claudePlugin.commands` | `commands` array | Add metadata objects |
| `claudePlugin.hooks` | `hooks` array | Add type and metadata |
| N/A | `tags` | Add searchable tags |
| N/A | `config` | Add default LLM and permissions |

## 4. Agent Conversion

### 4.1 Source: Claude Code Agent

**Format 1: Markdown Prompt**

File: `.claude/agents/frame-agent.md`

```markdown
# Frame Agent

You are the Frame phase agent in the FABER methodology.

## Your Role

Gather requirements from work items and classify work type.

## Tools Available

- fetch_issue: Retrieve issue details
- classify_work_type: Classify as feature/bug/chore/patch

## Output Format

Return a JSON object with:
- workId: The work item ID
- workType: Classification (feature/bug/chore/patch)
- requirements: List of extracted requirements
- acceptanceCriteria: Success conditions
```

**Format 2: TypeScript Definition**

File: `src/agents/frame-agent.ts`

```typescript
export const frameAgent = {
  name: 'frame-agent',
  systemPrompt: `You are the Frame phase agent...`,
  tools: ['fetch_issue', 'classify_work_type'],
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    temperature: 0.0,
  },
};
```

### 4.2 Target: Fractary Agent YAML

File: `agents/frame-agent.yaml`

```yaml
name: frame-agent
type: agent
description: |
  FABER Frame phase agent - gathers requirements from work items,
  extracts key information, and classifies work type.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.0
  max_tokens: 4096

system_prompt: |
  You are the Frame phase agent in the FABER methodology.

  ## Your Role

  Gather requirements from work items and classify work type.

  ## Tools Available

  - fetch_issue: Retrieve issue details
  - classify_work_type: Classify as feature/bug/chore/patch

  ## Output Format

  Return a JSON object with:
  - workId: The work item ID
  - workType: Classification (feature/bug/chore/patch)
  - requirements: List of extracted requirements
  - acceptanceCriteria: Success conditions

tools:
  - fetch_issue
  - classify_work_type
  - log_phase_start
  - log_phase_end

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - frame
  - classification
  - requirements
```

### 4.3 Agent Field Mapping

| Claude Field | Fractary YAML Field | Required | Notes |
|-------------|-------------------|----------|-------|
| `name` | `name` | Yes | Keep same, use kebab-case |
| N/A | `type` | Yes | Always "agent" |
| `description` (if exists) | `description` | Yes | Multi-line YAML string |
| `systemPrompt` | `system_prompt` | Yes | Direct copy with formatting |
| `llm.provider` | `llm.provider` | Yes | Validate: anthropic/openai/google |
| `llm.model` | `llm.model` | Yes | Update to current model names |
| `llm.temperature` | `llm.temperature` | No | Default: 0.0 for deterministic |
| `llm.max_tokens` | `llm.max_tokens` | No | Default: 4096 |
| `tools` | `tools` | Yes | Array of tool names |
| N/A | `version` | Yes | Use semver (2.0.0 for new format) |
| N/A | `author` | No | Add plugin author |
| N/A | `tags` | Yes | Add searchable keywords |

### 4.4 Conversion Steps for Agents

1. **Extract content**:
   - If markdown: Copy system prompt section
   - If TypeScript: Extract `systemPrompt` field

2. **Create YAML structure**:
   - Add required YAML header (name, type, description)
   - Convert system prompt to multi-line YAML string
   - Map LLM configuration

3. **Map tools**:
   - List all tool names from Claude agent
   - Convert skill names to snake_case if needed
   - Add standard tools (log_phase_start, log_phase_end)

4. **Add metadata**:
   - version: "2.0.0"
   - author: Plugin team name
   - tags: Relevant keywords

5. **Validate**:
   - Check against AgentDefinitionSchema
   - Verify all tool references exist
   - Test LLM config fields

## 5. Skill to Tool Conversion

### 5.1 Source: Claude Code Skill (MCP Tool)

File: `src/skills/fetch-issue.ts`

```typescript
import { z } from 'zod';

export const fetchIssue = {
  name: 'fetch_issue',
  description: 'Fetch work item details from tracking systems',

  inputSchema: z.object({
    issue_number: z.number().describe('Issue number to fetch'),
    platform: z.enum(['github', 'jira', 'linear']).optional(),
  }),

  execute: async ({ issue_number, platform }) => {
    // Implementation details...
    return {
      id: issue_number,
      title: 'Issue title',
      description: 'Issue description',
      status: 'open',
    };
  },
};
```

### 5.2 Target: Fractary Tool YAML

File: `tools/fetch_issue.yaml`

```yaml
name: fetch_issue
type: tool
description: Fetch work item details from tracking systems (GitHub, Jira, Linear)

input_schema:
  type: object
  properties:
    issue_number:
      type: number
      description: Issue number to fetch
    platform:
      type: string
      enum:
        - github
        - jira
        - linear
      description: Work tracking platform (default: github)
  required:
    - issue_number

output_schema:
  type: object
  properties:
    id:
      type: number
      description: Issue ID
    title:
      type: string
      description: Issue title
    description:
      type: string
      description: Issue description
    status:
      type: string
      description: Issue status
    assignee:
      type: string
      description: Assigned user

implementation:
  type: external
  handler: fractary-work-plugin
  function: fetch_issue

version: "2.0.0"
author: "Fractary Team"
tags:
  - work-tracking
  - github
  - jira
  - linear
```

### 5.3 Skill/Tool Field Mapping

| Claude Skill Field | Fractary Tool YAML | Required | Notes |
|-------------------|-------------------|----------|-------|
| `name` | `name` | Yes | Use snake_case |
| N/A | `type` | Yes | Always "tool" |
| `description` | `description` | Yes | Direct copy or expand |
| `inputSchema` (Zod) | `input_schema` (JSON Schema) | Yes | Convert Zod → JSON Schema |
| N/A | `output_schema` | No | Document return structure |
| `execute` | `implementation` | Yes | Reference handler or inline |
| N/A | `version` | Yes | Use semver |
| N/A | `author` | No | Add plugin author |
| N/A | `tags` | Yes | Add searchable keywords |

### 5.4 Zod to JSON Schema Conversion

| Zod Type | JSON Schema | Example |
|----------|------------|---------|
| `z.string()` | `{"type": "string"}` | Simple string |
| `z.number()` | `{"type": "number"}` | Number |
| `z.boolean()` | `{"type": "boolean"}` | Boolean |
| `z.enum(['a', 'b'])` | `{"type": "string", "enum": ["a", "b"]}` | Enumeration |
| `z.array(z.string())` | `{"type": "array", "items": {"type": "string"}}` | Array |
| `z.object({...})` | `{"type": "object", "properties": {...}}` | Object |
| `.optional()` | Not in `required` array | Optional field |
| `.describe('text')` | `"description": "text"` | Field description |

### 5.5 Conversion Steps for Tools

1. **Extract metadata**:
   - name: Direct copy (ensure snake_case)
   - description: Direct copy or enhance

2. **Convert input schema**:
   - Transform Zod schema to JSON Schema format
   - Map each Zod type to JSON Schema type
   - Extract descriptions from `.describe()`
   - Build `required` array from non-optional fields

3. **Document output schema**:
   - Analyze return type from `execute` function
   - Create JSON Schema for output structure
   - Document all possible fields

4. **Define implementation**:
   - type: "external" (calls existing plugin)
   - handler: Plugin that provides the function
   - function: Function name in handler
   - OR type: "inline" with code reference

5. **Add metadata**:
   - version: "2.0.0"
   - author: Plugin team
   - tags: Relevant keywords

6. **Validate**:
   - Check against ToolDefinitionSchema
   - Verify input_schema is valid JSON Schema
   - Verify output_schema (if provided)

## 6. Command Conversion

### 6.1 Source: Claude Code Command

File: `.claude/commands/faber-run.md`

```markdown
Execute FABER workflow on a work item.

Usage: /faber-run <work-id>

This command runs the full FABER workflow (Frame, Architect, Build, Evaluate, Release)
on the specified work item.

Arguments:
- work-id: The work item ID to process (e.g., 123, PROJ-456)

Options:
- --phase: Run only specific phase (frame|architect|build|evaluate|release)
- --dry-run: Simulate without making changes

Example:
/faber-run 123
/faber-run PROJ-456 --phase frame
```

### 6.2 Target: Fractary Command

File: `commands/faber-run.md`

**Same format, minimal changes:**

```markdown
Execute FABER workflow on a work item.

Usage: /faber-run <work-id> [--phase <phase>] [--dry-run]

This command runs the full FABER workflow (Frame, Architect, Build, Evaluate, Release)
on the specified work item.

## Arguments

- `work-id` (required): The work item ID to process (e.g., 123, PROJ-456)

## Options

- `--phase <phase>`: Run only specific phase (frame|architect|build|evaluate|release)
- `--dry-run`: Simulate without making changes
- `--verbose`: Show detailed execution logs

## Examples

```bash
# Run full workflow
/faber-run 123

# Run specific phase
/faber-run PROJ-456 --phase frame

# Dry run
/faber-run 123 --dry-run --verbose
```

## Notes

This command requires:
- Active work tracking connection (GitHub/Jira/Linear)
- Repository access for code changes
- Configured FABER workflow settings
```

### 6.3 Command Conversion Steps

1. **Copy file**: Direct copy from Claude commands directory
2. **Enhance documentation**:
   - Add argument type information
   - Add structured options section
   - Add examples section
   - Add notes/requirements section
3. **Update references**: Change any Claude-specific references to Fractary
4. **No YAML needed**: Commands remain as Markdown files

## 7. Hook Conversion

### 7.1 Source: Claude Code Hook

File: `src/hooks/session-start.ts`

```typescript
export const sessionStartHook = {
  name: 'session-start',
  type: 'session-start',

  execute: async (context) => {
    console.log('FABER session starting...');

    // Check for active work item
    const activeWork = await context.storage.get('activeWorkItem');
    if (activeWork) {
      console.log(`Resuming work on: ${activeWork.id}`);
    }

    return {
      message: 'FABER workflow ready',
      activeWork,
    };
  },
};
```

### 7.2 Target: Fractary Hook

File: `hooks/session-start.js`

```javascript
/**
 * FABER Session Start Hook
 * Executes when a new Forge session begins
 */

module.exports = async function sessionStart(context) {
  const { storage, logger } = context;

  logger.info('FABER session starting...');

  // Check for active work item
  const activeWork = await storage.get('activeWorkItem');
  if (activeWork) {
    logger.info(`Resuming work on: ${activeWork.id}`);
  }

  return {
    message: 'FABER workflow ready',
    activeWork,
  };
};

module.exports.config = {
  name: 'faber-session-start',
  type: 'session-start',
  version: '2.0.0',
  description: 'Initialize FABER workflow on session start',
};
```

### 7.3 Hook Types Mapping

| Claude Hook Type | Fractary Hook Type | When Executed |
|-----------------|-------------------|---------------|
| `session-start` | `session-start` | New Forge session begins |
| `session-end` | `session-end` | Forge session ends |
| `before-commit` | `pre-commit` | Before git commit |
| `after-commit` | `post-commit` | After git commit |
| `before-push` | `pre-push` | Before git push |
| `after-push` | `post-push` | After git push |

### 7.4 Hook Conversion Steps

1. **Convert TypeScript to JavaScript**:
   - Remove TypeScript type annotations
   - Convert to CommonJS module format
   - Export function as default

2. **Add config object**:
   - Export `module.exports.config` with metadata
   - Include name, type, version, description

3. **Update context API**:
   - Claude context → Fractary context
   - Map context properties to Forge equivalents

4. **Handle async patterns**:
   - Ensure proper Promise handling
   - Add error handling

## 8. Configuration Conversion

### 8.1 Source: Claude Plugin Config

File: `.claude/config.json` or in `package.json`

```json
{
  "defaultLLM": {
    "provider": "anthropic",
    "model": "claude-sonnet-4"
  },
  "permissions": {
    "read": ["**/*.md"],
    "write": [".claude/**"],
    "execute": ["bash"]
  }
}
```

### 8.2 Target: Fractary Plugin Config

In `plugin.json`:

```json
{
  "config": {
    "default_llm": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514"
    },
    "permissions": {
      "read": ["**/*.md", "**/*.yaml", "**/*.json"],
      "write": [".fractary/**", "docs/**"],
      "execute": ["bash"]
    }
  }
}
```

### 8.3 Configuration Field Mapping

| Claude Config | Fractary Config | Notes |
|--------------|----------------|-------|
| `defaultLLM` | `default_llm` | Use snake_case |
| `defaultLLM.provider` | `default_llm.provider` | Keep values same |
| `defaultLLM.model` | `default_llm.model` | Update to current model names |
| `permissions.read` | `permissions.read` | Glob patterns |
| `permissions.write` | `permissions.write` | Glob patterns |
| `permissions.execute` | `permissions.execute` | Command whitelist |

## 9. Conversion Checklist

### 9.1 Pre-Conversion

- [ ] Clone source Claude plugin repository
- [ ] Review all agents, skills, commands, hooks
- [ ] Identify dependencies between components
- [ ] Document any custom behaviors or edge cases

### 9.2 During Conversion

**Plugin Structure:**
- [ ] Create plugin directory: `plugins/{plugin-name}/`
- [ ] Create subdirectories: `agents/`, `tools/`, `commands/`, `hooks/`
- [ ] Create `plugin.json` manifest

**Agents:**
- [ ] Convert each agent to YAML format
- [ ] Map system prompts
- [ ] Map LLM configurations
- [ ] Map tool dependencies
- [ ] Add metadata (version, author, tags)
- [ ] Validate against AgentDefinitionSchema

**Tools (from Skills):**
- [ ] Convert each skill to tool YAML format
- [ ] Convert Zod schemas to JSON Schema
- [ ] Document input schemas
- [ ] Document output schemas
- [ ] Define implementation references
- [ ] Add metadata
- [ ] Validate against ToolDefinitionSchema

**Commands:**
- [ ] Copy command markdown files
- [ ] Enhance documentation
- [ ] Update examples
- [ ] Add requirements section

**Hooks:**
- [ ] Convert TypeScript to JavaScript
- [ ] Add config exports
- [ ] Update context API usage
- [ ] Test hook execution

**Configuration:**
- [ ] Map default LLM settings
- [ ] Map permissions
- [ ] Add to plugin.json

### 9.3 Post-Conversion

- [ ] Generate SHA-256 checksums for all files
- [ ] Calculate file sizes
- [ ] Update plugin.json with checksums and sizes
- [ ] Create README.md for plugin
- [ ] Test agent execution
- [ ] Test tool invocation
- [ ] Test command parsing
- [ ] Test hook callbacks
- [ ] Update registry manifest to include plugin
- [ ] Commit converted plugin to repository

### 9.4 Validation

- [ ] All YAML files valid (yamllint)
- [ ] All schemas validate (Zod validation)
- [ ] All file references correct
- [ ] All checksums accurate
- [ ] All dependencies resolvable
- [ ] Plugin loads without errors
- [ ] Agents execute successfully
- [ ] Tools invoke successfully
- [ ] Commands parse successfully
- [ ] Hooks trigger successfully

## 10. Common Patterns

### 10.1 Multi-Agent Workflows

**Claude Pattern:**
```typescript
const workflow = {
  agents: ['frame', 'architect', 'build'],
  sequence: true,
};
```

**Fractary Pattern:**
In plugin.json, list agents in execution order with dependency metadata:
```json
{
  "agents": [
    {
      "name": "frame-agent",
      "dependencies": ["fetch_issue"]
    },
    {
      "name": "architect-agent",
      "dependencies": ["create_specification"],
      "requires_agents": ["frame-agent"]
    }
  ]
}
```

### 10.2 Shared Tool Dependencies

If multiple agents use the same tools, list them once in tools array:

```yaml
# frame-agent.yaml
tools:
  - fetch_issue
  - classify_work_type
  - log_phase_start

# architect-agent.yaml
tools:
  - fetch_issue        # Shared tool
  - create_specification
  - log_phase_start    # Shared tool
```

### 10.3 Conditional Tool Execution

**Claude Pattern:**
```typescript
if (platform === 'github') {
  await tools.github_fetch_issue(id);
} else if (platform === 'jira') {
  await tools.jira_fetch_issue(id);
}
```

**Fractary Pattern:**
Single tool with platform parameter:
```yaml
# fetch_issue.yaml
input_schema:
  properties:
    platform:
      type: string
      enum: [github, jira, linear]
      default: github
```

## 11. Testing Converted Plugins

### 11.1 Unit Tests

Create test file: `tests/{plugin-name}.test.ts`

```typescript
import { validatePluginManifest } from '@fractary/forge';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

describe('FABER Plugin', () => {
  test('plugin manifest is valid', () => {
    const manifest = JSON.parse(
      readFileSync('plugins/faber-plugin/plugin.json', 'utf-8')
    );
    expect(() => validatePluginManifest(manifest)).not.toThrow();
  });

  test('all agent YAMLs are valid', () => {
    const agents = [
      'frame-agent',
      'architect-agent',
      'build-agent',
      'evaluate-agent',
      'release-agent',
    ];

    agents.forEach(agent => {
      const yaml = readFileSync(
        `plugins/faber-plugin/agents/${agent}.yaml`,
        'utf-8'
      );
      const parsed = parse(yaml);
      expect(parsed.name).toBe(agent);
      expect(parsed.type).toBe('agent');
    });
  });
});
```

### 11.2 Integration Tests

Test actual plugin loading and execution:

```typescript
import { ForgePluginLoader } from '@fractary/forge';

describe('FABER Plugin Integration', () => {
  let plugin;

  beforeAll(async () => {
    plugin = await ForgePluginLoader.load('plugins/faber-plugin');
  });

  test('plugin loads successfully', () => {
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('@fractary/faber-plugin');
  });

  test('frame agent executes', async () => {
    const result = await plugin.agents.frameAgent.execute({
      workId: 123,
    });
    expect(result.workType).toBeDefined();
  });

  test('fetch_issue tool invokes', async () => {
    const result = await plugin.tools.fetch_issue({
      issue_number: 123,
      platform: 'github',
    });
    expect(result.id).toBe(123);
  });
});
```

## 12. Conversion Examples

### 12.1 Complete Example: fetch_issue

**Source (Claude Skill):**

```typescript
// src/skills/fetch-issue.ts
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

export const fetchIssue = {
  name: 'fetch_issue',
  description: 'Fetch GitHub issue details',

  inputSchema: z.object({
    issue_number: z.number(),
    owner: z.string().optional(),
    repo: z.string().optional(),
  }),

  execute: async ({ issue_number, owner, repo }) => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const response = await octokit.issues.get({
      owner: owner || 'fractary',
      repo: repo || 'forge',
      issue_number,
    });
    return {
      id: response.data.number,
      title: response.data.title,
      body: response.data.body,
      state: response.data.state,
    };
  },
};
```

**Target (Fractary Tool):**

```yaml
# tools/fetch_issue.yaml
name: fetch_issue
type: tool
description: |
  Fetch GitHub issue details including title, description, state, and metadata.
  Requires GITHUB_TOKEN environment variable.

input_schema:
  type: object
  properties:
    issue_number:
      type: number
      description: Issue number to fetch
    owner:
      type: string
      description: Repository owner (default from config)
    repo:
      type: string
      description: Repository name (default from config)
  required:
    - issue_number

output_schema:
  type: object
  properties:
    id:
      type: number
      description: Issue number
    title:
      type: string
      description: Issue title
    body:
      type: string
      description: Issue description/body
    state:
      type: string
      enum: [open, closed]
      description: Issue state

implementation:
  type: external
  handler: fractary-work-plugin
  function: fetchGitHubIssue

  # Alternative: inline implementation reference
  # type: inline
  # file: ../../src/tools/fetch_issue.ts
  # function: execute

version: "2.0.0"
author: "Fractary Team"
tags:
  - work-tracking
  - github
  - issues
```

### 12.2 Complete Example: frame-agent

**Source (Claude Agent):**

```typescript
// src/agents/frame-agent.ts
export const frameAgent = {
  name: 'frame-agent',
  systemPrompt: `
You are the Frame phase agent in the FABER methodology.

Your responsibilities:
1. Fetch the work item using fetch_issue tool
2. Classify the work type using classify_work_type tool
3. Extract key requirements
4. Identify acceptance criteria

Output a JSON object with:
- workId: The work item ID
- workType: Classification
- requirements: Array of requirements
- acceptanceCriteria: Array of success conditions
  `,
  tools: ['fetch_issue', 'classify_work_type'],
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    temperature: 0.0,
  },
};
```

**Target (Fractary Agent):**

```yaml
# agents/frame-agent.yaml
name: frame-agent
type: agent
description: |
  FABER Frame phase agent responsible for requirements gathering
  and work classification. First step in the FABER workflow.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.0
  max_tokens: 4096

system_prompt: |
  You are the Frame phase agent in the FABER methodology.

  ## Your Responsibilities

  1. Fetch the work item using fetch_issue tool
  2. Classify the work type using classify_work_type tool
  3. Extract key requirements from the description
  4. Identify acceptance criteria and success conditions

  ## Output Format

  Return a JSON object with:
  - workId: The work item ID (number)
  - workType: Classification (feature|bug|chore|patch)
  - requirements: Array of requirement strings
  - acceptanceCriteria: Array of success condition strings
  - metadata: Additional context (optional)

  ## Example Output

  ```json
  {
    "workId": 123,
    "workType": "feature",
    "requirements": [
      "Add user authentication",
      "Support OAuth providers"
    ],
    "acceptanceCriteria": [
      "Users can log in via GitHub",
      "Sessions persist for 7 days"
    ]
  }
  ```

tools:
  - fetch_issue
  - classify_work_type
  - log_phase_start
  - log_phase_end

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - frame
  - requirements
  - classification
```

## 13. Troubleshooting

### 13.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| YAML parse error | Invalid YAML syntax | Use yamllint, check indentation |
| Schema validation fails | Missing required fields | Check against schema definition |
| Tool not found | Tool name mismatch | Verify snake_case naming |
| Agent won't execute | Invalid LLM config | Verify provider/model values |
| Checksum mismatch | File modified after checksum | Regenerate checksums |

### 13.2 Validation Commands

```bash
# Validate YAML syntax
yamllint plugins/faber-plugin/agents/*.yaml

# Validate against schema
forge validate plugin plugins/faber-plugin/plugin.json

# Generate checksums
forge checksum generate plugins/faber-plugin/

# Test plugin loading
forge plugin test faber-plugin
```

## 14. Appendix

### 14.1 Schema References

- **AgentDefinitionSchema**: `src/definitions/schemas/agent.ts`
- **ToolDefinitionSchema**: `src/definitions/schemas/tool.ts`
- **PluginManifestSchema**: `src/registry/schemas/manifest.ts`

### 14.2 Conversion Tools

Future automation tools:
- `forge convert claude-plugin <path>` - Auto-convert Claude plugin
- `forge validate converted <path>` - Validate converted plugin
- `forge test converted <path>` - Test converted plugin

### 14.3 Related Documentation

- SPEC-FORGE-005: Registry Manifest System
- WORK-00006: Phase 3B FABER Agent Definitions
- FORGE-PHASE-3B: Detailed FABER Agent Specifications

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-15 | 1.0.0 | Initial conversion specification created |
