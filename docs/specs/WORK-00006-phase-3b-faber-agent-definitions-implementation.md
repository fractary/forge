# Implementation Spec: Phase 3B - FABER Agent Definitions

| Field | Value |
|-------|-------|
| **ID** | WORK-00006 |
| **Status** | Ready for Implementation |
| **Created** | 2025-12-15 |
| **Author** | Claude (Spec Generator) |
| **Project** | `@fractary/forge` |
| **Issue** | [#6 - Implement FABER-Forge Phase 3 Integration](https://github.com/fractary/forge/issues/6) |
| **Branch** | `feat/6-implement-faber-forge-phase-3-integration` |
| **Related Specs** | FORGE-PHASE-3B-faber-agent-definitions.md, SPEC-FORGE-001, SPEC-FORGE-002 |
| **Depends On** | Phase 3A (Completed in @fractary/faber v1.1.1) |
| **Refined** | 2025-12-15 (Round 1) |

---

## Changelog

| Date | Round | Changes |
|------|-------|---------|
| 2025-12-15 | 1 | Added tool status section, clarified distribution via CLI/Stockyard, updated agent path to `.fractary/agents/`, verified LLMConfigSchema compatibility |

---

## 1. Executive Summary

This specification provides the implementation plan for creating 5 FABER agent YAML definitions in the Forge repository. Phase 3A has been completed in the `@fractary/faber` SDK (v1.1.1), which includes:
- AgentExecutor class for bridging FABER workflow with Forge
- Updated WorkflowConfig types with Forge integration
- Dual-mode support (legacy + Forge) in FaberWorkflow

**Now that FABER is ready to consume Forge agents, we need to create the agent definitions.**

### 1.1 Objective

Create 5 first-party agent YAML files that FABER's AgentExecutor can resolve and execute via Forge's AgentAPI.

### 1.2 Deliverables

**Agent Definitions (5 files):**

| Agent | File | Purpose |
|-------|------|---------|
| Frame Agent | `agents/frame-agent.yaml` | Requirements extraction and work type classification |
| Architect Agent | `agents/architect-agent.yaml` | Technical design and specification creation |
| Build Agent | `agents/build-agent.yaml` | Implementation and code generation |
| Evaluate Agent | `agents/evaluate-agent.yaml` | Validation and quality assurance |
| Release Agent | `agents/release-agent.yaml` | PR creation and deployment |

**Tool Definitions (~12 files):**

| Tool | File | Purpose |
|------|------|---------|
| fetch_issue | `tools/fetch-issue.yaml` | Retrieve issue/ticket details from work tracker |
| classify_work_type | `tools/classify-work-type.yaml` | Classify work as feature/bug/chore/patch |
| create_specification | `tools/create-specification.yaml` | Generate specification documents |
| validate_specification | `tools/validate-specification.yaml` | Validate spec format and completeness |
| run_tests | `tools/run-tests.yaml` | Execute test suites and report results |
| git_commit | `tools/git-commit.yaml` | Create git commits with messages |
| git_push | `tools/git-push.yaml` | Push branches to remote |
| create_pull_request | `tools/create-pull-request.yaml` | Create PRs on GitHub/GitLab/Bitbucket |
| request_review | `tools/request-review.yaml` | Request PR reviews from team members |
| create_comment | `tools/create-comment.yaml` | Add comments to issues/PRs |
| log_phase_start | `tools/log-phase-start.yaml` | Log FABER phase initiation |
| log_phase_end | `tools/log-phase-end.yaml` | Log FABER phase completion |

**Note:** Native Claude Code tools (`read_file`, `write_file`, `edit_file`, `search_code`, `execute_bash`) are provided by the runtime and don't need Forge definitions.

---

## 2. Prerequisites

### 2.1 Verified Dependencies

- [x] `@fractary/faber` v1.1.1+ installed with Phase 3A implementation
- [x] `@fractary/forge` v1.1.1+ with AgentAPI and schema validation
- [x] Forge AgentDefinitionSchema supports required fields

### 2.2 Tool Status

The agent definitions reference tools that have been implemented multiple times across the Fractary ecosystem:

| Tool | Previous Implementations | Status for Phase 3B |
|------|-------------------------|---------------------|
| `fetch_issue` | claude-plugins, faber SDK | **Re-create as Forge tool** |
| `classify_work_type` | claude-plugins, faber SDK | **Re-create as Forge tool** |
| `create_specification` | fractary-spec plugin | **Re-create as Forge tool** |
| `validate_specification` | fractary-spec plugin | **Re-create as Forge tool** |
| `read_file` | Claude Code native | **Use runtime-provided** |
| `write_file` | Claude Code native | **Use runtime-provided** |
| `edit_file` | Claude Code native | **Use runtime-provided** |
| `search_code` | Claude Code native | **Use runtime-provided** |
| `execute_bash` | Claude Code native | **Use runtime-provided** |
| `run_tests` | faber SDK | **Re-create as Forge tool** |
| `git_commit` | fractary-repo plugin | **Re-create as Forge tool** |
| `git_push` | fractary-repo plugin | **Re-create as Forge tool** |
| `create_pull_request` | fractary-repo plugin | **Re-create as Forge tool** |
| `request_review` | fractary-repo plugin | **Re-create as Forge tool** |
| `create_comment` | fractary-work plugin | **Re-create as Forge tool** |
| `log_phase_start` | faber SDK | **Re-create as Forge tool** |
| `log_phase_end` | faber SDK | **Re-create as Forge tool** |

**Decision:** Tools will be re-created as Forge-powered tool definitions. Claude Code native tools (read_file, write_file, etc.) can be referenced directly as the runtime provides them. Custom FABER tools need new Forge tool YAML definitions.

**Scope Impact:** This adds ~12 tool definitions to the Phase 3B deliverables. Tool definitions should be created in `tools/` directory alongside agents.

### 2.3 Forge Schema Requirements (from `src/definitions/schemas/agent.ts`)

```typescript
AgentDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\-_:]+$/),  // Required
  type: z.literal('agent'),                       // Required, must be 'agent'
  description: z.string(),                        // Required
  extends: z.string().optional(),                 // Optional inheritance
  llm: LLMConfigSchema,                          // Required
  system_prompt: z.string(),                     // Required
  tools: z.array(z.string()),                    // Required
  custom_tools: z.array(ToolDefinitionSchema).optional(),
  caching: CachingConfigSchema.optional(),
  config: z.record(z.any()).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),  // Required (semver)
  author: z.string().optional(),
  tags: z.array(z.string()),                     // Required
});
```

### 2.4 LLMConfigSchema (Verified from `src/definitions/schemas/common.ts`)

```typescript
LLMConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']),  // Required
  model: z.string(),                                     // Required
  temperature: z.number().min(0).max(1).optional(),     // Optional (0.0-1.0)
  max_tokens: z.number().min(1).max(200000).optional(), // Optional (1-200000)
});
```

**Verification:** ✅ All agent definitions use valid LLM config fields within schema constraints.

### 2.5 Distribution Strategy

**Decision:** FABER agents will be distributed via **Stockyard CLI command**.

| Aspect | Implementation |
|--------|---------------|
| **Installation** | `forge install faber-agents` |
| **Storage Location** | User's `~/.fractary/agents/` (global) or `.fractary/agents/` (project-local) |
| **Package Registry** | Stockyard (Phase 3C dependency) |
| **Fallback** | Manual copy from GitHub until Stockyard is available |

**Pre-Stockyard Workaround:** Until Phase 3C (Stockyard) is complete, agents can be manually copied to `.fractary/agents/` or referenced via `FORGE_AGENTS_PATH` environment variable.

---

## 3. Implementation Tasks

### 3.1 Directory Setup

**Task:** Create agents and tools directories

```bash
mkdir -p agents tools
```

**Locations:**
- Development: `/mnt/c/GitHub/fractary/forge/agents/` and `/mnt/c/GitHub/fractary/forge/tools/`
- User Installation: `~/.fractary/agents/` (global) or `.fractary/agents/` (project-local)

---

### 3.2 Frame Agent Implementation

**File:** `agents/frame-agent.yaml`

```yaml
# frame-agent.yaml - FABER Frame Phase Agent
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

  Your responsibilities:
  1. Analyze the work item (issue/ticket) provided
  2. Extract key requirements and acceptance criteria
  3. Identify any ambiguities or missing information
  4. Classify the work type (feature, bug, chore, patch)

  Guidelines:
  - Be thorough in extracting requirements
  - Note any assumptions you're making
  - Flag anything that needs clarification before proceeding
  - Consider edge cases and potential complications

  Output Format:
  Return a JSON object with:
  {
    "workType": "feature" | "bug" | "chore" | "patch",
    "summary": "Brief summary of the work",
    "requirements": ["List of extracted requirements"],
    "acceptanceCriteria": ["List of acceptance criteria"],
    "assumptions": ["Any assumptions made"],
    "questions": ["Questions needing clarification"],
    "complexity": "low" | "medium" | "high",
    "tags": ["relevant tags"]
  }

tools:
  - fetch_issue
  - classify_work_type
  - log_phase_start
  - log_phase_end

config:
  max_requirements: 20
  require_acceptance_criteria: true

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - frame
  - classification
  - requirements
```

**Acceptance Criteria:**
- [ ] Passes `AgentDefinitionSchema.parse()` validation
- [ ] Resolvable via `AgentAPI.resolveAgent('frame-agent')`
- [ ] Structured output matches documented TypeScript interface
- [ ] Integration test in FABER passes

---

### 3.3 Architect Agent Implementation

**File:** `agents/architect-agent.yaml`

```yaml
# architect-agent.yaml - FABER Architect Phase Agent
name: architect-agent
type: agent
description: |
  FABER Architect phase agent - creates and refines specifications
  based on framed requirements.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.1
  max_tokens: 8192

system_prompt: |
  You are the Architect phase agent in the FABER methodology.

  Your responsibilities:
  1. Review the framed requirements from the Frame phase
  2. Design a technical approach to implement the solution
  3. Create or refine a specification document
  4. Identify dependencies, risks, and alternatives

  Guidelines:
  - Design for simplicity and maintainability
  - Consider existing patterns in the codebase
  - Identify potential breaking changes
  - Document key architectural decisions

  Output Format:
  Return a JSON object with:
  {
    "approach": "Description of technical approach",
    "components": ["List of components to create/modify"],
    "dependencies": ["External dependencies"],
    "risks": ["Potential risks"],
    "alternatives": ["Alternative approaches considered"],
    "specSections": {
      "overview": "...",
      "requirements": "...",
      "design": "...",
      "implementation": "...",
      "testing": "..."
    },
    "estimatedComplexity": "low" | "medium" | "high"
  }

tools:
  - create_specification
  - validate_specification
  - read_file
  - search_code
  - log_phase_start
  - log_phase_end

config:
  refine_existing: true
  max_iterations: 3

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - architect
  - specification
  - design
```

**Acceptance Criteria:**
- [ ] Passes `AgentDefinitionSchema.parse()` validation
- [ ] Resolvable via `AgentAPI.resolveAgent('architect-agent')`
- [ ] Structured output matches documented TypeScript interface
- [ ] Integration test in FABER passes

---

### 3.4 Build Agent Implementation

**File:** `agents/build-agent.yaml`

```yaml
# build-agent.yaml - FABER Build Phase Agent
name: build-agent
type: agent
description: |
  FABER Build phase agent - implements the solution according to
  the specification created in the Architect phase.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.0
  max_tokens: 16384

system_prompt: |
  You are the Build phase agent in the FABER methodology.

  Your responsibilities:
  1. Implement the solution according to the specification
  2. Create/modify code following project conventions
  3. Write tests for new functionality
  4. Document your changes

  Guidelines:
  - Follow existing code patterns in the codebase
  - Keep changes focused and minimal
  - Write clean, maintainable code
  - Add appropriate tests and documentation
  - Commit frequently with meaningful messages

  Output Format:
  Return a JSON object with:
  {
    "filesCreated": ["List of new files"],
    "filesModified": ["List of modified files"],
    "testsAdded": ["List of test files"],
    "commits": ["List of commit messages"],
    "notes": ["Implementation notes"],
    "status": "complete" | "in_progress" | "blocked"
  }

tools:
  - read_file
  - write_file
  - edit_file
  - search_code
  - execute_bash
  - run_tests
  - git_commit
  - log_phase_start
  - log_phase_end

config:
  auto_commit: false
  run_tests: true
  max_file_size: 10000

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - build
  - implementation
  - coding
```

**Acceptance Criteria:**
- [ ] Passes `AgentDefinitionSchema.parse()` validation
- [ ] Resolvable via `AgentAPI.resolveAgent('build-agent')`
- [ ] Structured output matches documented TypeScript interface
- [ ] Integration test in FABER passes

---

### 3.5 Evaluate Agent Implementation

**File:** `agents/evaluate-agent.yaml`

```yaml
# evaluate-agent.yaml - FABER Evaluate Phase Agent
name: evaluate-agent
type: agent
description: |
  FABER Evaluate phase agent - validates implementation against
  requirements and specification.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.0
  max_tokens: 8192

system_prompt: |
  You are the Evaluate phase agent in the FABER methodology.

  Your responsibilities:
  1. Validate implementation against the specification
  2. Run tests and analyze results
  3. Check for edge cases and potential issues
  4. Verify all requirements are met

  Guidelines:
  - Be thorough in validation
  - Test edge cases and error scenarios
  - Verify documentation is complete
  - Check for security considerations

  Output Format:
  Return a JSON object with:
  {
    "validationStatus": "pass" | "fail" | "partial",
    "requirementsMet": ["Requirements that pass"],
    "requirementsFailed": ["Requirements that fail"],
    "testResults": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0
    },
    "issues": ["List of issues found"],
    "suggestions": ["Improvement suggestions"],
    "readyForRelease": true | false
  }

tools:
  - validate_specification
  - run_tests
  - read_file
  - search_code
  - execute_bash
  - log_phase_start
  - log_phase_end

config:
  max_retries: 3
  require_tests_pass: true
  coverage_threshold: 80

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - evaluate
  - validation
  - testing
```

**Acceptance Criteria:**
- [ ] Passes `AgentDefinitionSchema.parse()` validation
- [ ] Resolvable via `AgentAPI.resolveAgent('evaluate-agent')`
- [ ] Structured output matches documented TypeScript interface
- [ ] Integration test in FABER passes

---

### 3.6 Release Agent Implementation

**File:** `agents/release-agent.yaml`

```yaml
# release-agent.yaml - FABER Release Phase Agent
name: release-agent
type: agent
description: |
  FABER Release phase agent - prepares and creates release artifacts
  including pull requests and documentation.

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.0
  max_tokens: 8192

system_prompt: |
  You are the Release phase agent in the FABER methodology.

  Your responsibilities:
  1. Push changes to remote repository
  2. Create a pull request with comprehensive description
  3. Link PR to the original work item
  4. Request reviews from appropriate team members

  Guidelines:
  - Write clear, comprehensive PR descriptions
  - Include testing instructions
  - Link all relevant issues and specs
  - Follow repository conventions for PRs

  Output Format:
  Return a JSON object with:
  {
    "branch": "Branch name pushed",
    "pullRequest": {
      "number": 0,
      "url": "PR URL",
      "title": "PR title",
      "draft": false
    },
    "reviewsRequested": ["List of reviewers"],
    "linkedIssues": ["Linked issue numbers"],
    "releaseNotes": "Summary for release notes",
    "status": "created" | "updated" | "failed"
  }

tools:
  - git_push
  - create_pull_request
  - request_review
  - create_comment
  - log_phase_start
  - log_phase_end

config:
  request_reviews: true
  default_reviewers: []
  draft_by_default: false

version: "2.0.0"
author: "Fractary FABER Team"
tags:
  - faber
  - workflow
  - release
  - pull-request
  - deployment
```

**Acceptance Criteria:**
- [ ] Passes `AgentDefinitionSchema.parse()` validation
- [ ] Resolvable via `AgentAPI.resolveAgent('release-agent')`
- [ ] Structured output matches documented TypeScript interface
- [ ] Integration test in FABER passes

---

## 4. Validation & Testing

### 4.1 Schema Validation Test

Create/update test file: `src/definitions/__tests__/faber-agents.test.ts`

```typescript
import { AgentDefinitionSchema } from '../schemas/agent';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const AGENTS_DIR = path.join(__dirname, '../../../agents');
const FABER_AGENTS = [
  'frame-agent',
  'architect-agent',
  'build-agent',
  'evaluate-agent',
  'release-agent'
];

describe('FABER Agent Definitions', () => {
  FABER_AGENTS.forEach(agentName => {
    describe(agentName, () => {
      const yamlPath = path.join(AGENTS_DIR, `${agentName}.yaml`);

      it('should exist', () => {
        expect(fs.existsSync(yamlPath)).toBe(true);
      });

      it('should be valid YAML', () => {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        expect(() => yaml.load(content)).not.toThrow();
      });

      it('should pass AgentDefinitionSchema validation', () => {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const definition = yaml.load(content);
        const result = AgentDefinitionSchema.safeParse(definition);
        if (!result.success) {
          console.error(`Validation errors for ${agentName}:`, result.error.issues);
        }
        expect(result.success).toBe(true);
      });

      it('should have version 2.0.0', () => {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const definition = yaml.load(content) as any;
        expect(definition.version).toBe('2.0.0');
      });

      it('should have required FABER tags', () => {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const definition = yaml.load(content) as any;
        expect(definition.tags).toContain('faber');
        expect(definition.tags).toContain('workflow');
      });
    });
  });
});
```

### 4.2 AgentAPI Resolution Test

```typescript
import { AgentAPI } from '../api';

describe('FABER Agent Resolution', () => {
  let api: AgentAPI;

  beforeEach(() => {
    api = new AgentAPI({ prefer_local: true });
  });

  const agents = [
    'frame-agent',
    'architect-agent',
    'build-agent',
    'evaluate-agent',
    'release-agent'
  ];

  agents.forEach(agentName => {
    it(`should resolve ${agentName}`, async () => {
      const agent = await api.resolveAgent(agentName);
      expect(agent).toBeDefined();
      expect(agent.definition.name).toBe(agentName);
      expect(agent.definition.version).toBe('2.0.0');
    });
  });
});
```

### 4.3 FABER Integration Test (in @fractary/faber)

```typescript
// In @fractary/faber/src/__tests__/integration/forge-integration.test.ts
import { FaberWorkflow } from '../../workflow/faber';
import { AgentExecutor } from '../../workflow/agent-executor';

describe('FABER + Forge Integration', () => {
  describe('AgentExecutor', () => {
    let executor: AgentExecutor;

    beforeEach(() => {
      executor = new AgentExecutor({ forge: { enabled: true, prefer_local: true } });
    });

    it('should resolve all phase agents', async () => {
      const phases = ['frame', 'architect', 'build', 'evaluate', 'release'];

      for (const phase of phases) {
        const agentName = executor.getAgentNameForPhase(phase);
        const health = await executor.healthCheck();
        expect(health.phases[phase].healthy).toBe(true);
      }
    });
  });
});
```

---

## 5. Implementation Order

### Step 1: Create Directory Structure
```bash
mkdir -p /mnt/c/GitHub/fractary/forge/agents
```

### Step 2: Create Agent Files (in order)
1. `frame-agent.yaml` - Foundation agent
2. `architect-agent.yaml` - Depends on frame output
3. `build-agent.yaml` - Depends on architect output
4. `evaluate-agent.yaml` - Validates build output
5. `release-agent.yaml` - Final workflow step

### Step 3: Run Schema Validation
```bash
cd /mnt/c/GitHub/fractary/forge
npm test -- --grep "FABER Agent"
```

### Step 4: Test AgentAPI Resolution
```bash
npm test -- --grep "FABER Agent Resolution"
```

### Step 5: Run FABER Integration Tests
```bash
cd /mnt/c/GitHub/fractary/faber
npm test -- --grep "Forge Integration"
```

---

## 6. Success Criteria

| Metric | Target | Verification |
|--------|--------|--------------|
| Agent schema validation | 5/5 agents pass | `npm test` |
| Tool schema validation | 12/12 tools pass | `npm test` |
| AgentAPI resolution | 5/5 agents resolve | Integration test |
| ToolAPI resolution | 12/12 tools resolve | Integration test |
| Cold resolution time | < 200ms | Performance test |
| Cached resolution time | < 10ms | Performance test |
| FABER integration | All phases work | FABER test suite |
| Version consistency | All v2.0.0 | YAML inspection |
| Distribution ready | Stockyard publishable | Manual verification |

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tool references don't exist | Medium | High | Document tool requirements, defer tool creation |
| Schema changes break agents | Low | High | Pin schema version, add migration tests |
| LLM model unavailable | Low | Medium | Make model configurable via extends |
| Performance regression | Low | Medium | Add resolution benchmarks |

---

## 8. Next Steps After Completion

1. **Update Forge exports** - Ensure agents directory is included in package
2. **Update FABER docs** - Reference Forge agents in migration guide
3. **Phase 3C** - Implement Stockyard integration for remote agent distribution
4. **Phase 3D** - Complete testing and documentation

---

## 9. Related Resources

- **Issue:** [#6 - Implement FABER-Forge Phase 3 Integration](https://github.com/fractary/forge/issues/6)
- **Branch:** `feat/6-implement-faber-forge-phase-3-integration`
- **Design Spec:** `FORGE-PHASE-3B-faber-agent-definitions.md`
- **Schema Source:** `src/definitions/schemas/agent.ts`
- **FABER SDK:** `@fractary/faber` v1.1.1+
