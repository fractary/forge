---
name: fractary-forge-agent-create
description: Create a new agent following Fractary plugin standards
allowed-tools: Task(fractary-forge-agent-creator)
model: claude-haiku-4-5
argument-hint: <name> --type <manager|handler> [--plugin <plugin-name>]
---

Use **Task** tool with `fractary-forge-agent-creator` agent to create a new agent with provided arguments.

```
Task(
  subagent_type="fractary-forge-agent-creator",
  description="Create new agent",
  prompt="Create agent: $ARGUMENTS"
)
```
