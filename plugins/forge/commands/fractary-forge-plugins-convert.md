---
name: fractary-forge-plugins-convert
description: Convert a plugin manifest from one agentic framework to another (e.g., plugin.json to package.json)
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--output <dir>] [--dry-run]'
---

Use **Task** tool with `fractary-forge-harness-converter` agent to convert plugins with provided arguments.

```
Task(
  subagent_type="fractary-forge-harness-converter",
  description="Convert plugins",
  prompt="Convert plugins: --parts plugins $ARGUMENTS"
)
```
