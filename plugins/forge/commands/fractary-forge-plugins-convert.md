---
name: fractary-forge-plugins-convert
description: Convert a plugin manifest from one agentic framework to another (e.g., plugin.json to package.json)
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--output <dir>] [--dry-run]'
---

Invoke the fractary-forge-harness-converter agent with `parts: ["plugins"]`, passing all other arguments through.
