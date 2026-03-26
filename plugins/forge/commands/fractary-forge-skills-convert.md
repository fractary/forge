---
name: fractary-forge-skills-convert
description: Convert skills from one agentic framework to another. Optionally target a single skill with --item.
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--item <name>] [--output <dir>] [--dry-run]'
---

# Skills Convert Command

<CONTEXT>
Shortcut for `/fractary-forge:harness-convert --part skills`.
Converts skill files from one agentic framework to another.
</CONTEXT>

<CRITICAL_RULES>
**THIS COMMAND IS ONLY A ROUTER.**
Delegates to fractary-forge-harness-converter with `parts: ["skills"]`.
</CRITICAL_RULES>

<WORKFLOW>
1. Parse arguments
2. Invoke fractary-forge-harness-converter with `parts: ["skills"]` and optional `item` filter
3. Return response
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

```
/fractary-forge:skills-convert <source-path> --from <harness> --to <harness> [options]
```

**Required:** `<source-path>`, `--from`, `--to`

**Optional:**
- `--item <name>`: Convert only this specific skill (by directory name)
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
    "parts": ["skills"],
    "item": "<name or null>",
    "output_dir": "<dir or null>",
    "dry_run": false
  }
}
```

## Examples

```bash
# Convert all skills
/fractary-forge:skills-convert plugins/file --from claude-code --to pi

# Convert a single skill
/fractary-forge:skills-convert plugins/file --from claude-code --to pi --item file-manager

# Dry run
/fractary-forge:skills-convert plugins/file --from claude-code --to pi --dry-run
```
</ARGUMENT_PARSING>
