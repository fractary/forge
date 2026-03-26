---
name: fractary-forge-configure
description: Configure Forge in the unified config (.fractary/config.yaml)
allowed-tools: Task(fractary-forge-configurator)
model: claude-haiku-4-5
argument-hint: [--org <slug>] [--global] [--force] [--dry-run] [--validate-only]
---

Use **Task** tool with `fractary-forge-configurator` agent to configure Forge with provided arguments.

```
Task(
  subagent_type="fractary-forge-configurator",
  description="Configure Forge",
  prompt="Configure Forge: $ARGUMENTS"
)
```
