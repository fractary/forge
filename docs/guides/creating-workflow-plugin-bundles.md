# Creating Workflow Plugin Bundles

This guide describes how to create a workflow-specific plugin bundle repository (like `fractary/faber-software`) that packages agents, commands, skills, and workflow configurations for a specific type of work.

## Overview

Workflow plugin bundles follow the `fractary/faber-{asset}` naming pattern where `{asset}` describes the workflow domain:

| Repository | Domain |
|------------|--------|
| `fractary/faber-software` | Software development |
| `fractary/faber-content` | Article/content creation |
| `fractary/faber-video` | Video production |
| `fractary/faber-data` | Data pipelines/ETL |

## When to Create a Workflow Plugin Bundle

Create a new bundle when:
- You have a distinct workflow domain (engineering, content, video, etc.)
- You need specialized agents for that domain's FABER phases
- You want reusable workflows that can be consumed by multiple projects
- The domain has its own best practices and specialty knowledge

## Repository Structure

```
fractary/faber-{asset}/
├── .fractary/
│   ├── config.yaml                      # Fractary configuration
│   ├── faber/
│   │   └── workflows/                   # Proven workflow configs
│   │       ├── standard.json            # Standard workflow
│   │       ├── quick.json               # Streamlined workflow
│   │       └── comprehensive.json       # Thorough workflow
│   └── specs/                           # Specifications
│
├── plugins/
│   └── faber-{asset}/                   # Claude Code plugin
│       ├── .claude-plugin/
│       │   └── plugin.json              # Plugin manifest
│       │
│       ├── agents/                      # Agent definitions
│       │   ├── {asset}-researcher.md    # Frame phase
│       │   ├── {asset}-inspector.md     # Frame phase
│       │   ├── {asset}-architect.md     # Architect phase
│       │   ├── {asset}-builder.md       # Build phase
│       │   ├── researcher-validator.md  # Validators
│       │   ├── architect-validator.md
│       │   ├── builder-validator.md
│       │   ├── evaluator-validator.md
│       │   └── releaser-validator.md
│       │
│       ├── commands/                    # Commands (verb form)
│       │   ├── research.md
│       │   ├── inspect.md
│       │   ├── architect.md
│       │   ├── build.md
│       │   ├── validate-research.md
│       │   ├── validate-architecture.md
│       │   ├── validate-build.md
│       │   ├── validate-evaluation.md
│       │   └── validate-release.md
│       │
│       ├── skills/                      # Reusable skills
│       │   ├── {domain}-specialties/    # Domain knowledge loader
│       │   │   ├── SKILL.md
│       │   │   └── specialties/
│       │   │       ├── specialty-a.md
│       │   │       └── specialty-b.md
│       │   ├── research-strategy/       # Research patterns
│       │   ├── validation-checklist/    # Validation patterns
│       │   └── output-parser/           # Output parsing
│       │
│       └── config/
│           └── best-practices-rules.yaml
│
├── docs/
│   ├── README.md
│   ├── AGENTS.md
│   ├── COMMANDS.md
│   ├── SKILLS.md
│   └── WORKFLOWS.md
│
└── README.md
```

## Step-by-Step Guide

### 1. Create the Repository

```bash
gh repo create fractary/faber-{asset} --public --description "{Asset} agents for FABER workflows"
```

### 2. Initialize Directory Structure

```bash
mkdir -p .fractary/faber/workflows
mkdir -p .fractary/specs
mkdir -p plugins/faber-{asset}/.claude-plugin
mkdir -p plugins/faber-{asset}/agents
mkdir -p plugins/faber-{asset}/commands
mkdir -p plugins/faber-{asset}/skills/{domain}-specialties/specialties
mkdir -p plugins/faber-{asset}/skills/research-strategy
mkdir -p plugins/faber-{asset}/skills/validation-checklist
mkdir -p plugins/faber-{asset}/config
mkdir -p docs
```

### 3. Create Plugin Manifest

```json
// plugins/faber-{asset}/.claude-plugin/plugin.json
{
  "name": "faber-{asset}",
  "version": "0.1.0",
  "description": "{Asset} agents for FABER workflows",
  "commands": "./commands/",
  "agents": "./agents/",
  "skills": "./skills/"
}
```

### 4. Design Your Agents

For each FABER phase, determine what agents you need:

| Phase | Standard Agents | Purpose |
|-------|-----------------|---------|
| Frame | researcher, inspector | Understand context and identify issues |
| Architect | architect | Design the approach |
| Build | builder | Execute the work |
| Evaluate | (uses validators) | Validate quality |
| Release | (uses validators) | Validate deployment |

Plus validators for each phase output.

### 5. Create Agent Definitions

Use this template for agents:

```markdown
---
name: {asset}-{role}
description: {Description of what this agent does}
tools: {Tools needed - Bash, Read, Write, Edit, Glob, Grep, Skill}
model: claude-sonnet-4
---

# {Asset} {Role} Agent

<CONTEXT>
You are the **{Asset} {Role}**, responsible for {responsibility}.

{{#if context.VARIABLE}}
Custom context: {{context.VARIABLE}}
{{/if}}
</CONTEXT>

<CRITICAL_RULES>
- Rule 1
- Rule 2
</CRITICAL_RULES>

<INPUTS>
What the agent receives
</INPUTS>

<WORKFLOW>
## Phase 1: {Phase Name}
1. Step 1
2. Step 2

## Phase 2: {Phase Name}
...
</WORKFLOW>

<COMPLETION_CRITERIA>
- [ ] Criterion 1
- [ ] Criterion 2
</COMPLETION_CRITERIA>

<OUTPUTS>
What the agent returns
</OUTPUTS>

<ERROR_HANDLING>
How to handle errors
</ERROR_HANDLING>
```

### 6. Create Commands

Each agent needs a corresponding command (verb form):

```markdown
---
name: {verb}
description: {What this command does}
allowed_tools: {Tools the agent needs}
args:
  - name: context
    description: Additional context to customize behavior
    required: false
    multiple: true
---

## Your Task

Spawn the {asset}-{role} agent with the provided context.

{{#if args.context}}
### Additional Context
{{#each args.context}}
- {{this}}
{{/each}}
{{/if}}
```

### 7. Create Master Loader Skills

For domain-specific knowledge, create a master loader skill:

```markdown
---
name: {domain}-specialties
description: Loads {domain}-specific knowledge based on detection or hints
---

# {Domain} Specialties Skill

## Auto-Detection Logic
| Indicator | Specialty | File |
|-----------|-----------|------|
| {indicator} | {specialty} | {file}.md |

## Manual Override
`--context 'SPECIALTIES={list}'`

## Workflow
1. Check for hints
2. Auto-detect if no hints
3. Load specialty files
4. Return to agent
```

### 8. Create Specialty Files

Each specialty file should contain:
- Best practices for that specialty
- Common patterns and idioms
- Quality standards
- Common pitfalls
- Tools and techniques

### 9. Create Workflow Configurations

Create at least these workflows:

**standard.json** - Balanced workflow with validation
**quick.json** - Streamlined for small changes
**comprehensive.json** - Thorough for important work

```json
{
  "name": "{workflow-name}",
  "description": "{What this workflow is for}",
  "version": "1.0.0",
  "phases": {
    "frame": {
      "description": "{Phase description}",
      "steps": [
        {
          "name": "{step-name}",
          "description": "{Step description}",
          "prompt": "/faber-{asset}:{command} --context '{CONTEXT}'"
        }
      ]
    }
  }
}
```

### 10. Document Everything

Create comprehensive documentation:

- **README.md** - Overview, installation, quick start
- **AGENTS.md** - Detailed agent documentation
- **COMMANDS.md** - Command usage with examples
- **SKILLS.md** - Skills and specialties documentation
- **WORKFLOWS.md** - Workflow configuration guide

## Best Practices

### Agent Design
- One clear responsibility per agent
- Use skills for reusable operations
- Accept context for customization
- Provide structured outputs

### Command Design
- Use verb form (research, architect, build)
- Always support --context argument
- Document expected context variables

### Skill Design
- Use master loader pattern for specialties
- Auto-detect when possible
- Support manual overrides
- Keep specialty files focused

### Workflow Design
- Provide multiple workflow variants
- Include validation steps
- Document customization points
- Use context for flexibility

## Testing Your Bundle

1. Clone into a test project
2. Run each command manually
3. Execute full workflow
4. Verify outputs meet expectations
5. Test with different context values

## Publishing

Once ready:
1. Tag a release version
2. Register with Stockyard (when available)
3. Document in Fractary ecosystem docs

## Examples

- [fractary/faber-software](https://github.com/fractary/faber-software) - Software development workflows

## Related Documentation

- [FABER Workflow Methodology](../faber-workflow.md)
- [Creating Agents](./creating-agents.md)
- [Creating Skills](./creating-skills.md)
