---
name: fractary-forge-agents-convert
description: Convert agents from one agentic framework to another. Optionally target a single agent with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

# Agents Convert Command

<CONTEXT>
Shortcut for `/fractary-forge:harness-convert --part agents`.
Converts agent files from one agentic framework to another.
</CONTEXT>

<CRITICAL_RULES>
**THIS COMMAND IS ONLY A ROUTER.**
Delegates to fractary-forge-harness-converter with `parts: ["agents"]`.
</CRITICAL_RULES>

<WORKFLOW>
1. Parse arguments
2. Invoke fractary-forge-harness-converter with `parts: ["agents"]` and optional `item` filter
3. Return response
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

```
/fractary-forge:agents-convert <source-path> --from <harness> --to <harness> [options]
```

**Required:** `<source-path>`, `--from`, `--to`

**Optional:**
- `--item <name>`: Convert only this specific agent (by filename without extension)
- `--output <dir>`: Output directory
- `--dry-run`: Plan only

**Request structure:**
```json
{
  "operation": "harness-convert",
  "parameters": {
    "source_path": "<path>",
    "from": "<harness>",
    "to": "<harness>",
    "parts": ["agents"],
    "item": "<name or null>",
    "output_dir": "<dir or null>",
    "dry_run": false
  }
}
```

## Examples

```bash
# Convert all agents
/fractary-forge:agents-convert plugins/file --from claude-code --to pi

# Convert a single agent
/fractary-forge:agents-convert plugins/file --from claude-code --to pi --item file-upload

# Dry run
/fractary-forge:agents-convert plugins/file --from claude-code --to pi --dry-run
```
</ARGUMENT_PARSING>
