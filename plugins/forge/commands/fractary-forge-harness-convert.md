---
name: fractary-forge-harness-convert
description: Convert an entire agentic harness plugin from one framework to another (commands, agents, skills, plugins, hooks)
allowed-tools: Agent(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--part <parts>] [--output <dir>] [--dry-run]'
---

Use **Agent** tool with `fractary-forge-harness-converter` agent to convert an entire harness with provided arguments.

```
Agent(
  subagent_type="fractary-forge-harness-converter",
  description="Convert harness",
  prompt="Convert harness: $ARGUMENTS"
)
```
