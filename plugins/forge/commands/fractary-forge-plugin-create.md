---
name: fractary-forge-plugin-create
description: Create a new plugin with complete directory structure following Fractary plugin standards
allowed-tools: Task(fractary-forge-plugin-creator)
model: claude-haiku-4-5
argument-hint: <name> --type <workflow|primitive|utility> [--requires <plugins>]
---

Use **Task** tool with `fractary-forge-plugin-creator` agent to create a new plugin with provided arguments.

```
Task(
  subagent_type="fractary-forge-plugin-creator",
  description="Create new plugin",
  prompt="Create plugin: $ARGUMENTS"
)
```
