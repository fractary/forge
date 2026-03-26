---
name: fractary-forge:commands-convert
description: Convert commands/prompts from one agentic framework to another. Optionally target a single command with --item.
allowed-tools: Task(fractary-forge:harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

# Commands Convert Command

<CONTEXT>
Shortcut for `/fractary-forge:harness-convert --part commands`.
Converts command/prompt files from one agentic framework to another.
</CONTEXT>

<CRITICAL_RULES>
**THIS COMMAND IS ONLY A ROUTER.**
Delegates to harness-converter with `parts: ["commands"]`.
</CRITICAL_RULES>

<WORKFLOW>
1. Parse arguments
2. Invoke harness-converter with `parts: ["commands"]` and optional `item` filter
3. Return response
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

```
/fractary-forge:commands-convert <source-path> --from <harness> --to <harness> [options]
```

**Required:** `<source-path>`, `--from`, `--to`

**Optional:**
- `--item <name>`: Convert only this specific command (by filename without extension)
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
    "parts": ["commands"],
    "item": "<name or null>",
    "output_dir": "<dir or null>",
    "dry_run": false
  }
}
```

## Examples

```bash
# Convert all commands
/fractary-forge:commands-convert plugins/file --from claude-code --to pi

# Convert a single command
/fractary-forge:commands-convert plugins/file --from claude-code --to pi --item upload

# Dry run
/fractary-forge:commands-convert plugins/file --from claude-code --to pi --dry-run
```
</ARGUMENT_PARSING>
