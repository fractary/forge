---
name: fractary-forge-skill-create
description: Create a new skill following Fractary plugin standards
allowed-tools: Task(fractary-forge-skill-creator)
model: claude-haiku-4-5
argument-hint: <name> [--plugin <plugin-name>] [--handler-type <type>]
---

Use **Task** tool with `fractary-forge-skill-creator` agent to create a new skill with provided arguments.

```
Task(
  subagent_type="fractary-forge-skill-creator",
  description="Create new skill",
  prompt="Create skill: $ARGUMENTS"
)
```
