---
name: fractary-forge-agents-convert
description: Convert agents from one agentic framework to another. Optionally target a single agent with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

Invoke the fractary-forge-harness-converter agent with `parts: ["agents"]`, passing all other arguments through.
