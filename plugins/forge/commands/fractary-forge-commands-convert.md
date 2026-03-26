---
name: fractary-forge-commands-convert
description: Convert commands/prompts from one agentic framework to another. Optionally target a single command with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

Use **Task** tool with `fractary-forge-harness-converter` agent to convert commands with provided arguments.

```
Task(
  subagent_type="fractary-forge-harness-converter",
  description="Convert commands",
  prompt="Convert commands: --parts commands $ARGUMENTS"
)
```
