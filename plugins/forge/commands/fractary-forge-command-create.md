---
name: fractary-forge-command-create
description: Create a new command following Fractary plugin standards
allowed-tools: Task(fractary-forge-command-creator)
model: claude-haiku-4-5
argument-hint: <name> --invokes <agent> [--plugin <plugin-name>]
---

Use **Task** tool with `fractary-forge-command-creator` agent to create a new command with provided arguments.

```
Task(
  subagent_type="fractary-forge-command-creator",
  description="Create new command",
  prompt="Create command: $ARGUMENTS"
)
```
