---
name: fractary-forge-agent-create
description: Create a new agent following Fractary plugin standards
allowed-tools: Agent(fractary-forge-agent-creator)
model: claude-haiku-4-5
argument-hint: <name> --type <manager|handler> [--plugin <plugin-name>]
---

Use **Agent** tool with `fractary-forge-agent-creator` agent to create a new agent with provided arguments.

```
Agent(
  subagent_type="fractary-forge-agent-creator",
  description="Create new agent",
  prompt="Create agent: $ARGUMENTS", 
  model="cerebras/zai-glm-4.7"
)
```
