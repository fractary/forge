---
name: fractary-forge-skills-convert
description: Convert skills from one agentic framework to another. Optionally target a single skill with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

Invoke the fractary-forge-harness-converter agent with `parts: ["skills"]`, passing all other arguments through.
