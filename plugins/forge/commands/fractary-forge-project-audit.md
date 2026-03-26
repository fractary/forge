---
name: fractary-forge-project-audit
description: Audit Claude Code project for architectural compliance and anti-patterns
allowed-tools: Task(fractary-forge-project-auditor)
model: claude-haiku-4-5
argument-hint: [project-path] [--output <file>] [--format <json|markdown>] [--verbose]
---

Use **Task** tool with `fractary-forge-project-auditor` agent to audit the project with provided arguments.

```
Task(
  subagent_type="fractary-forge-project-auditor",
  description="Audit project",
  prompt="Audit project: $ARGUMENTS"
)
```
