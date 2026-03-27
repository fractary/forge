---
name: fractary-forge-configure
description: Configure Forge in the unified config (.fractary/config.yaml)
allowed-tools: Agent(fractary-forge-configurator)
model: claude-haiku-4-5
argument-hint: [--org <slug>] [--global] [--force] [--dry-run] [--validate-only]
---

Use **Agent** tool with `fractary-forge-configurator` agent to configure Forge with provided arguments.

```
Agent(
  subagent_type="fractary-forge-configurator",
  description="Configure Forge",
  prompt="Configure Forge: $ARGUMENTS"
)
```
