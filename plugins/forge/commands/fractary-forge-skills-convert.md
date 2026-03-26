---
name: fractary-forge-skills-convert
description: Convert skills from one agentic framework to another. Optionally target a single skill with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

Use **Task** tool with `fractary-forge-harness-converter` agent to convert skills with provided arguments.

```
Task(
  subagent_type="fractary-forge-harness-converter",
  description="Convert skills",
  prompt="Convert skills: --parts skills $ARGUMENTS"
)
```
