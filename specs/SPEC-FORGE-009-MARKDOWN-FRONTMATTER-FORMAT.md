---
spec_id: SPEC-FORGE-009
title: Markdown with YAML Frontmatter Format for Agent and Tool Definitions
type: infrastructure
status: approved
created: 2025-12-16
author: Fractary Team
validated: true
source: conversation
related_specs:
  - SPEC-FORGE-001 (Agent/Tool Definition System)
  - SPEC-FORGE-008 (Directory-Per-Definition Structure)
---

# SPEC-FORGE-009: Markdown with YAML Frontmatter Format

**Status**: Approved
**Version**: 1.0.0
**Created**: 2025-12-16
**Owner**: Fractary Team

---

## 1. Executive Summary

This specification defines the adoption of **Markdown files with YAML frontmatter** as the canonical format for Fractary agent and tool definitions, replacing pure YAML files. This format places structured configuration in YAML frontmatter while the system prompt (typically the most verbose element) is written in natural Markdown as the document body.

### 1.1 Motivation

The current pure YAML format has limitations:

1. **System prompts are hard to read**: Multi-line YAML strings require careful indentation and lack rich formatting
2. **No syntax highlighting for prompts**: Editors treat the entire file as YAML
3. **Poor version control diffs**: Changes to prompts show as YAML string modifications
4. **No preview support**: Cannot preview prompt content in editors/GitHub
5. **Documentation is separate**: Definition and documentation are different files

### 1.2 Proposed Solution

Adopt the pattern used by Claude Code for skills/agents/commands:

```markdown
---
name: agent-name
type: agent
version: "2.0.0"
llm:
  provider: anthropic
  model: claude-opus-4-5
tools:
  - bash
  - skill
---

# Agent Name

You are an agent responsible for...

## Responsibilities

- Do thing 1
- Do thing 2

## Tools Available

You have access to:
- **bash**: Execute commands
- **skill**: Invoke skills
```

**Key benefits:**
- ✅ System prompt in natural Markdown with full formatting
- ✅ Syntax highlighting for both YAML and Markdown
- ✅ Live preview in editors and GitHub
- ✅ Clean version control diffs
- ✅ Self-documenting definitions
- ✅ Industry-standard pattern (Claude Code uses this)

---

## 2. Format Specification

### 2.1 File Structure

```
┌─────────────────────────────────────┐
│  YAML Frontmatter                   │
│  (structured configuration)         │
│  ---                                │
│  name: agent-name                   │
│  type: agent                        │
│  version: "2.0.0"                   │
│  llm: { ... }                       │
│  tools: [...]                       │
│  ---                                │
├─────────────────────────────────────┤
│  Markdown Body                      │
│  (system prompt / description)      │
│                                     │
│  # Agent Title                      │
│                                     │
│  Full prompt content in Markdown... │
│                                     │
└─────────────────────────────────────┘
```

### 2.2 File Naming

Following [SPEC-FORGE-008](../docs/specs/SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md) directory-per-definition structure:

| Component | Directory | File |
|-----------|-----------|------|
| Agent | `agents/{agent-name}/` | `agent.md` |
| Tool | `tools/{tool-name}/` | `tool.md` |

**Note**: File extension changes from `.yaml` to `.md`.

### 2.3 Frontmatter Schema

#### Agent Frontmatter

```yaml
---
# Required fields
name: string                    # Agent identifier (kebab-case)
type: "agent"                   # Literal "agent"
version: string                 # Semantic version (e.g., "2.0.0")

# LLM Configuration
llm:
  provider: string              # "anthropic" | "openai" | "google" | etc.
  model: string                 # Model identifier
  temperature: number           # Optional: 0.0-1.0
  max_tokens: number            # Optional: Max output tokens

# Tool References
tools: string[]                 # Array of tool names to make available

# Optional fields
description: string             # Brief description (for registry/search)
author: string                  # Author name or organization
tags: string[]                  # Categorization tags

# Caching Configuration
caching:
  enabled: boolean              # Enable prompt caching
  sources: string[]             # ["system", "tools", etc.]

# Custom Tools (inline definitions)
custom_tools: object[]          # Optional inline tool definitions
---
```

**Note**: `system_prompt` is **NOT** in frontmatter - it's the Markdown body.

#### Tool Frontmatter

```yaml
---
# Required fields
name: string                    # Tool identifier (kebab-case)
type: "tool"                    # Literal "tool"
version: string                 # Semantic version

# Implementation
implementation:
  type: string                  # "bash" | "skill-based" | "api" | "function"
  bash:                         # For bash type
    command: string
  skill_directory: string       # For skill-based type
  # ... other implementation types

# Parameters Schema
parameters:
  param_name:
    type: string                # JSON Schema type
    description: string         # Parameter description
    required: boolean           # Is parameter required
    default: any                # Default value
    enum: any[]                 # Allowed values

# Optional fields
description: string             # Brief description
author: string                  # Author
tags: string[]                  # Tags
---
```

**Note**: For tools, the Markdown body serves as extended description/documentation.

---

## 3. Implementation Changes

### 3.1 New Files to Create

#### `src/definitions/loaders/markdown-loader.ts`

```typescript
/**
 * Markdown loader for agent and tool definitions
 * Parses YAML frontmatter and extracts Markdown body as system_prompt
 */

import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DefinitionValidator } from './validator';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class MarkdownLoader {
  private validator = new DefinitionValidator();

  /**
   * Load agent definition from Markdown file with YAML frontmatter
   */
  async loadAgent(filePath: string): Promise<AgentDefinition> {
    logger.debug(`Loading agent definition from: ${filePath}`);

    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Agent definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter and body
      const { data: frontmatter, content: markdown } = matter(content);

      // Validate non-empty body (system prompt is required)
      const systemPrompt = markdown.trim();
      if (!systemPrompt) {
        throw new ForgeError(
          DefinitionErrorCode.EMPTY_SYSTEM_PROMPT,
          'Agent definition requires a non-empty system prompt in Markdown body',
          { filePath }
        );
      }

      // Merge frontmatter with markdown body as system_prompt
      // Body content always wins over any frontmatter system_prompt
      const definition: AgentDefinition = {
        ...frontmatter,
        system_prompt: systemPrompt
      } as AgentDefinition;

      // Validate schema
      const validated = this.validator.validateAgent(definition);

      logger.debug(`Successfully loaded agent: ${validated.name}`);
      return validated;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown/YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load tool definition from Markdown file with YAML frontmatter
   */
  async loadTool(filePath: string): Promise<ToolDefinition> {
    logger.debug(`Loading tool definition from: ${filePath}`);

    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_NOT_FOUND,
        `Tool definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter and body
      const { data: frontmatter, content: markdown } = matter(content);

      // For tools, markdown body becomes extended description
      const definition: ToolDefinition = {
        ...frontmatter,
        extended_description: markdown.trim() || undefined
      } as ToolDefinition;

      // Validate schema
      const validated = this.validator.validateTool(definition);

      logger.debug(`Successfully loaded tool: ${validated.name}`);
      return validated;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown/YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load agent from Markdown string
   */
  loadAgentFromString(content: string, sourceName = 'string'): AgentDefinition {
    try {
      const { data: frontmatter, content: markdown } = matter(content);

      // Validate non-empty body (system prompt is required)
      const systemPrompt = markdown.trim();
      if (!systemPrompt) {
        throw new ForgeError(
          DefinitionErrorCode.EMPTY_SYSTEM_PROMPT,
          'Agent definition requires a non-empty system prompt in Markdown body',
          { sourceName }
        );
      }

      const definition = {
        ...frontmatter,
        system_prompt: systemPrompt
      } as AgentDefinition;

      return this.validator.validateAgent(definition);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }

  /**
   * Load tool from Markdown string
   */
  loadToolFromString(content: string, sourceName = 'string'): ToolDefinition {
    try {
      const { data: frontmatter, content: markdown } = matter(content);

      const definition = {
        ...frontmatter,
        extended_description: markdown.trim() || undefined
      } as ToolDefinition;

      return this.validator.validateTool(definition);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }
}
```

### 3.2 Files to Update

#### `src/definitions/loaders/index.ts`

Export the new MarkdownLoader:

```typescript
export { YAMLLoader } from './yaml-loader';
export { MarkdownLoader } from './markdown-loader';
export { DefinitionValidator } from './validator';
// ... other exports
```

#### `src/definitions/registry/resolver.ts`

Update `getLocalPath()` to support both formats:

```typescript
/**
 * Get local path for definition
 *
 * Supports both formats:
 * - agents/{agent-name}/agent.md (preferred)
 * - agents/{agent-name}/agent.yaml (legacy)
 */
private getLocalPath(type: 'agents' | 'tools', name: string): string {
  const fileName = type === 'agents' ? 'agent' : 'tool';
  const basePath = path.join(process.cwd(), '.fractary', type, name);

  // Prefer .md over .yaml
  const mdPath = path.join(basePath, `${fileName}.md`);
  const yamlPath = path.join(basePath, `${fileName}.yaml`);

  // Check if .md exists first
  if (fs.existsSync(mdPath)) {
    return mdPath;
  }

  // Fall back to .yaml for backward compatibility
  return yamlPath;
}
```

Update `checkLocalAgent()` and `checkLocalTool()` to use the appropriate loader:

```typescript
private async checkLocalAgent(name: string): Promise<AgentDefinition | null> {
  const localPath = this.getLocalPath('agents', name);

  try {
    // Use appropriate loader based on extension
    if (localPath.endsWith('.md')) {
      return await this.markdownLoader.loadAgent(localPath);
    } else {
      return await this.yamlLoader.loadAgent(localPath);
    }
  } catch (error) {
    if (isForgeError(error) && error.code === 'AGENT_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}
```

Update global registry resolution similarly for glob patterns:

```typescript
// Find all versions (both formats)
const mdPattern = path.join(registryPath, `${name}@*`, 'agent.md');
const yamlPattern = path.join(registryPath, `${name}@*`, 'agent.yaml');
const files = [
  ...await glob(mdPattern),
  ...await glob(yamlPattern)
];
```

#### `src/definitions/schemas/agent.ts`

Make `system_prompt` optional in the schema (derived from Markdown body):

```typescript
export const AgentDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.literal('agent'),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().optional(),

  // System prompt is optional in frontmatter (comes from Markdown body)
  system_prompt: z.string().optional(),

  llm: LLMConfigSchema,
  tools: z.array(z.string()).default([]),
  custom_tools: z.array(ToolDefinitionSchema).optional(),
  caching: CachingConfigSchema.optional(),

  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
```

### 3.3 New Dependencies

Add `gray-matter` for frontmatter parsing:

```bash
npm install gray-matter
npm install --save-dev @types/gray-matter
```

Update `package.json`:

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3"
  }
}
```

### 3.4 Loader Factory

Create a loader factory that selects the appropriate loader:

```typescript
// src/definitions/loaders/loader-factory.ts

import { YAMLLoader } from './yaml-loader';
import { MarkdownLoader } from './markdown-loader';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class LoaderFactory {
  private yamlLoader = new YAMLLoader();
  private markdownLoader = new MarkdownLoader();

  /**
   * Load agent from file, auto-detecting format
   */
  async loadAgent(filePath: string): Promise<AgentDefinition> {
    if (filePath.endsWith('.md')) {
      return this.markdownLoader.loadAgent(filePath);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return this.yamlLoader.loadAgent(filePath);
    }

    throw new Error(`Unsupported file format: ${filePath}`);
  }

  /**
   * Load tool from file, auto-detecting format
   */
  async loadTool(filePath: string): Promise<ToolDefinition> {
    if (filePath.endsWith('.md')) {
      return this.markdownLoader.loadTool(filePath);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return this.yamlLoader.loadTool(filePath);
    }

    throw new Error(`Unsupported file format: ${filePath}`);
  }
}
```

---

## 4. Examples

### 4.1 Agent Definition: Before (YAML)

**File**: `agents/faber-manager/agent.yaml`

```yaml
name: faber-manager
type: agent
version: "2.0.0"
description: Universal FABER workflow manager
llm:
  provider: anthropic
  model: claude-opus-4-5
  temperature: 0.0
  max_tokens: 16384
tools:
  - bash
  - skill
  - read
  - write
system_prompt: |
  # FABER Manager Agent

  You are the FABER Manager agent, responsible for orchestrating the complete FABER workflow across all five phases.

  ## Your Responsibilities

  ### Frame Phase
  Extract requirements from issues:
  - Classify work type (feature/bug/chore/patch)
  - Identify stakeholders and constraints
  - Define success criteria

  ### Architect Phase
  Design technical solution:
  - Create specifications
  - Plan implementation approach
  - Identify dependencies

  ... (continues for 50+ lines)
caching:
  enabled: true
  sources:
    - system
```

### 4.2 Agent Definition: After (Markdown)

**File**: `agents/faber-manager/agent.md`

```markdown
---
name: faber-manager
type: agent
version: "2.0.0"
description: Universal FABER workflow manager
llm:
  provider: anthropic
  model: claude-opus-4-5
  temperature: 0.0
  max_tokens: 16384
tools:
  - bash
  - skill
  - read
  - write
caching:
  enabled: true
  sources:
    - system
---

# FABER Manager Agent

You are the FABER Manager agent, responsible for orchestrating the complete FABER workflow across all five phases.

## Your Responsibilities

### Frame Phase

Extract requirements from issues:
- Classify work type (feature/bug/chore/patch)
- Identify stakeholders and constraints
- Define success criteria

### Architect Phase

Design technical solution:
- Create specifications
- Plan implementation approach
- Identify dependencies

### Build Phase

Implement the solution:
- Write code following specifications
- Create tests
- Handle edge cases

### Evaluate Phase

Validate the implementation:
- Run test suites
- Check code quality
- Verify requirements met

### Release Phase

Deploy and document:
- Create pull request
- Request reviews
- Update documentation

## Tools Available

You have access to the following tools:

- **bash**: Execute shell commands
- **skill**: Invoke specialized skills
- **read**: Read files from the filesystem
- **write**: Create or overwrite files

## Workflow State

Maintain state throughout execution using the FABER phase tracking system...
```

### 4.3 Tool Definition: After (Markdown)

**File**: `tools/branch-manager/tool.md`

```markdown
---
name: branch-manager
type: tool
version: "2.0.0"
description: Create and manage Git branches with safety checks
implementation:
  type: skill-based
  skill_directory: plugins/repo/skills/branch-manager
parameters:
  operation:
    type: string
    description: The operation to perform
    required: true
    enum:
      - create
      - delete
      - list
  branch_name:
    type: string
    description: Name of the branch
    required: false
  base_branch:
    type: string
    description: Base branch for creation
    default: main
tags:
  - git
  - branch
  - source-control
---

# Branch Manager Tool

Create and manage Git branches with comprehensive safety checks and validation.

## Description

This tool provides robust branch management capabilities:

- **Create branches** with semantic naming conventions
- **Delete branches** (local, remote, or both) with safety guards
- **List branches** with filtering options

## Operations

### Create Branch

Creates a new branch from a base branch with optional semantic naming.

**Parameters:**
- `operation`: "create"
- `branch_name`: Target branch name
- `base_branch`: Branch to create from (default: main)

**Example:**
```json
{
  "operation": "create",
  "branch_name": "feat/add-export-feature",
  "base_branch": "main"
}
```

### Delete Branch

Deletes a branch with safety checks.

**Parameters:**
- `operation`: "delete"
- `branch_name`: Branch to delete
- `location`: "local" | "remote" | "both"

### List Branches

Lists branches with optional filtering.

**Parameters:**
- `operation`: "list"
- `pattern`: Glob pattern to filter (optional)
- `include_remote`: Include remote branches (default: false)

## Safety Features

- Protected branch detection (main, master, develop)
- Unmerged changes warning
- Remote tracking verification
- Force flag required for destructive operations
```

---

## 5. Migration Plan

### 5.1 Phase 1: Add Support (Week 1)

**Tasks:**
- [ ] Add `gray-matter` dependency
- [ ] Create `MarkdownLoader` class
- [ ] Create `LoaderFactory` class
- [ ] Update schema to make `system_prompt` optional
- [ ] Update resolver to detect and use correct loader
- [ ] Add unit tests for new loader

**Backward Compatibility:**
- Both `.yaml` and `.md` files supported
- `.md` files preferred when both exist
- No breaking changes to existing `.yaml` files

### 5.2 Phase 2: Update Documentation (Week 1)

**Tasks:**
- [ ] Update SPEC-FORGE-001 with new format option
- [ ] Update SPEC-FORGE-008 to reference `.md` files
- [ ] Create migration guide
- [ ] Update examples in documentation

### 5.3 Phase 3: Convert Definitions (Week 2)

**Tasks:**
- [ ] Create migration script (`scripts/migrate-yaml-to-md.sh`)
- [ ] Convert all agents in fractary/plugins to `.md`
- [ ] Convert all tools in fractary/plugins to `.md`
- [ ] Test all conversions
- [ ] Update CI/CD validation

### 5.4 Phase 4: Deprecation (Future)

**Tasks:**
- [ ] Add deprecation warning when loading `.yaml` files
- [ ] Update all documentation to show only `.md` format
- [ ] Plan removal of `.yaml` support (major version bump)

---

## 6. Migration Script

### 6.1 Automated Conversion

```bash
#!/bin/bash
# scripts/migrate-yaml-to-md.sh
# Converts YAML definitions to Markdown + YAML frontmatter format

set -e

DEFINITIONS_DIR="${1:-.fractary}"

echo "Migrating YAML definitions to Markdown format..."

# Convert agents
for yaml_file in "${DEFINITIONS_DIR}"/agents/*/agent.yaml; do
  if [[ -f "$yaml_file" ]]; then
    dir=$(dirname "$yaml_file")
    md_file="${dir}/agent.md"

    echo "Converting: $yaml_file → $md_file"

    # Extract system_prompt and create markdown
    # Using yq for YAML parsing
    system_prompt=$(yq -r '.system_prompt // ""' "$yaml_file")

    # Remove system_prompt from YAML and format as frontmatter
    yq 'del(.system_prompt)' "$yaml_file" > "${dir}/frontmatter.tmp"

    # Create markdown file
    {
      echo "---"
      cat "${dir}/frontmatter.tmp"
      echo "---"
      echo ""
      echo "$system_prompt"
    } > "$md_file"

    # Clean up
    rm "${dir}/frontmatter.tmp"

    # Optionally remove original YAML
    # rm "$yaml_file"

    echo "  ✓ Created: $md_file"
  fi
done

# Convert tools
for yaml_file in "${DEFINITIONS_DIR}"/tools/*/tool.yaml; do
  if [[ -f "$yaml_file" ]]; then
    dir=$(dirname "$yaml_file")
    md_file="${dir}/tool.md"

    echo "Converting: $yaml_file → $md_file"

    # Extract description for tool body
    description=$(yq -r '.extended_description // .description // ""' "$yaml_file")

    # Remove extended_description from YAML
    yq 'del(.extended_description)' "$yaml_file" > "${dir}/frontmatter.tmp"

    # Create markdown file
    {
      echo "---"
      cat "${dir}/frontmatter.tmp"
      echo "---"
      echo ""
      echo "# $(yq -r '.name' "$yaml_file")"
      echo ""
      echo "$description"
    } > "$md_file"

    # Clean up
    rm "${dir}/frontmatter.tmp"

    echo "  ✓ Created: $md_file"
  fi
done

echo ""
echo "Migration complete!"
echo "Review changes and remove original .yaml files when satisfied."
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

**`src/definitions/__tests__/loaders/markdown-loader.test.ts`**

```typescript
describe('MarkdownLoader', () => {
  describe('loadAgent', () => {
    it('should parse YAML frontmatter', async () => {
      const agent = await loader.loadAgent(fixturePath('agent.md'));
      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('agent');
    });

    it('should extract markdown body as system_prompt', async () => {
      const agent = await loader.loadAgent(fixturePath('agent.md'));
      expect(agent.system_prompt).toContain('# Test Agent');
      expect(agent.system_prompt).toContain('## Responsibilities');
    });

    it('should validate against schema', async () => {
      await expect(
        loader.loadAgent(fixturePath('invalid-agent.md'))
      ).rejects.toThrow(/validation failed/i);
    });

    it('should throw AGENT_NOT_FOUND for missing file', async () => {
      await expect(
        loader.loadAgent(fixturePath('nonexistent.md'))
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
    });

    it('should throw EMPTY_SYSTEM_PROMPT for empty body', async () => {
      await expect(
        loader.loadAgent(fixturePath('empty-body-agent.md'))
      ).rejects.toMatchObject({ code: 'EMPTY_SYSTEM_PROMPT' });
    });

    it('should use body content over frontmatter system_prompt', async () => {
      // When frontmatter has system_prompt and body has content
      // Body should win
      const agent = await loader.loadAgent(fixturePath('duplicate-prompt-agent.md'));
      expect(agent.system_prompt).toBe('Body content wins');
      expect(agent.system_prompt).not.toContain('frontmatter content');
    });
  });

  describe('loadTool', () => {
    it('should parse tool frontmatter', async () => {
      const tool = await loader.loadTool(fixturePath('tool.md'));
      expect(tool.name).toBe('test-tool');
      expect(tool.implementation.type).toBe('bash');
    });

    it('should extract markdown body as extended_description', async () => {
      const tool = await loader.loadTool(fixturePath('tool.md'));
      expect(tool.extended_description).toContain('# Test Tool');
    });
  });
});
```

### 7.2 Integration Tests

Test that resolver correctly finds and loads both formats:

```typescript
describe('DefinitionResolver with Markdown support', () => {
  it('should prefer .md over .yaml when both exist', async () => {
    // Create both .yaml and .md files
    // Verify .md is loaded
  });

  it('should fall back to .yaml when .md not found', async () => {
    // Create only .yaml file
    // Verify it loads successfully
  });

  it('should resolve global registry .md files', async () => {
    // Create .md file in global registry
    // Verify resolution works
  });
});
```

---

## 8. Comparison with Other Frameworks

| Framework | Format | System Prompt | Rich Formatting | Readability |
|-----------|--------|---------------|-----------------|-------------|
| **Fractary (proposed)** | `.md` + YAML frontmatter | Markdown body | ✅ Full | ⭐⭐⭐⭐⭐ |
| **Claude Code** | `.md` + YAML frontmatter | Markdown body | ✅ Full | ⭐⭐⭐⭐⭐ |
| **LangChain** | `.py` Python | Python string | ❌ Limited | ⭐⭐⭐ |
| **CrewAI** | `.py` Python | Python string | ❌ Limited | ⭐⭐⭐ |
| **AutoGPT** | `.json` JSON | JSON string | ❌ None | ⭐⭐ |
| **Semantic Kernel** | `.cs/.py` | Code string | ❌ Limited | ⭐⭐⭐ |
| **Fractary (current)** | `.yaml` YAML | YAML multiline | ⚠️ Partial | ⭐⭐⭐⭐ |

**Conclusion**: The proposed Markdown + YAML frontmatter format matches Claude Code's industry-leading approach and provides the best developer experience.

---

## 9. Success Criteria

### 9.1 Functional Requirements

- [ ] `MarkdownLoader` correctly parses YAML frontmatter
- [ ] Markdown body becomes `system_prompt` for agents
- [ ] Markdown body becomes `extended_description` for tools
- [ ] Resolver detects and uses correct loader
- [ ] Both `.yaml` and `.md` files work simultaneously
- [ ] Global registry resolution supports `.md`

### 9.2 Non-Functional Requirements

- [ ] No performance regression in loading
- [ ] All existing `.yaml` definitions continue working
- [ ] Clear error messages for malformed files
- [ ] Editor preview works for `.md` files

### 9.3 Testing Requirements

- [ ] Unit tests for `MarkdownLoader` (>90% coverage)
- [ ] Integration tests for resolver
- [ ] Migration script tested on real definitions
- [ ] Backward compatibility verified

---

## 10. Design Decisions

The following design decisions have been made for this specification:

### 10.1 Empty Body Handling

**Decision**: Fail validation for empty Markdown body.

Agent definitions MUST have a non-empty Markdown body (system prompt). Validation will fail with error code `EMPTY_SYSTEM_PROMPT` if the body is empty or contains only whitespace.

```typescript
// In MarkdownLoader.loadAgent()
if (!markdown.trim()) {
  throw new ForgeError(
    DefinitionErrorCode.EMPTY_SYSTEM_PROMPT,
    'Agent definition requires a non-empty system prompt in Markdown body',
    { filePath }
  );
}
```

**Rationale**: An agent without a system prompt is not meaningful. Explicit content is required to define agent behavior.

### 10.2 Frontmatter vs Body Priority

**Decision**: Markdown body always wins.

When frontmatter contains a `system_prompt` field AND the Markdown body has content, the **body content takes priority**. The frontmatter `system_prompt` field is ignored.

```typescript
// In MarkdownLoader.loadAgent()
const definition: AgentDefinition = {
  ...frontmatter,
  system_prompt: markdown.trim()  // Body overwrites any frontmatter system_prompt
} as AgentDefinition;
```

**Rationale**: This provides a clean mental model - frontmatter is for configuration, body is for content. No ambiguity about which takes precedence.

### 10.3 Skills Format

**Decision**: Out of scope.

Claude Code Skills (`SKILL.md` files) are a separate format designed for Claude Code's native skill system. Fractary tools are our equivalent concept and use the Markdown frontmatter format defined in this spec. Skills remain unchanged and are not covered by this specification.

### 10.4 Exporter Output Format

**Decision**: Framework-native output.

Exporters will convert to each target framework's expected native format:

| Target Framework | Output Format |
|-----------------|---------------|
| LangChain | Python files with string prompts |
| Claude Code | Markdown SKILL.md files |
| n8n | JSON workflow files |

The internal Fractary `.md` format is a source format; exporters transform it to whatever the target framework expects.

### 10.5 Additional Design Notes

**Tool Body Usage**: Tool `.md` body becomes `extended_description` for richer API documentation.

**Validation Engine**: Zod is used for frontmatter schema validation (consistent with existing codebase).

**Deprecation Path**: `.yaml` files will generate a deprecation warning for one major version before being removed.

---

## 11. Related Documents

- [SPEC-FORGE-001](../docs/specs/SPEC-FORGE-001-agent-tool-definition-system.md): Agent/Tool Definition System
- [SPEC-FORGE-008](../docs/specs/SPEC-FORGE-008-DIRECTORY-PER-DEFINITION.md): Directory-Per-Definition Structure
- [SPEC-CLI-001](../docs/specs/SPEC-CLI-001-FORGE-COMMANDS.md): Forge CLI Commands

---

## 12. Appendix

### A. Gray-Matter Library

The `gray-matter` library (npmjs.com/package/gray-matter) is the de facto standard for parsing YAML frontmatter in JavaScript/TypeScript:

```typescript
import matter from 'gray-matter';

const content = `---
name: example
version: "1.0.0"
---

# Example Content

This is the body.
`;

const { data, content: body } = matter(content);
// data = { name: 'example', version: '1.0.0' }
// body = '\n# Example Content\n\nThis is the body.\n'
```

### B. Editor Support

IDEs with excellent Markdown + YAML frontmatter support:

| Editor | Frontmatter Highlight | Markdown Preview | Linting |
|--------|----------------------|------------------|---------|
| VS Code | ✅ Built-in | ✅ Built-in | ✅ Extensions |
| Cursor | ✅ Built-in | ✅ Built-in | ✅ Extensions |
| Vim/Neovim | ✅ Plugins | ✅ Plugins | ✅ Plugins |
| JetBrains | ✅ Built-in | ✅ Built-in | ✅ Built-in |

---

**Document Version**: 1.0.0
**Status**: Approved
**Created**: 2025-12-16
**Last Updated**: 2025-12-16
