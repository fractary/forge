---
name: fractary-forge-plugins-convert
description: Convert a plugin manifest from one agentic framework to another (e.g., plugin.json to package.json)
allowed-tools: Task(fractary-forge-harness-converter)
model: claude-haiku-4-5
argument-hint: '<source-path> --from <harness> --to <harness> [--output <dir>] [--dry-run]'
---

# Plugins Convert Command

<CONTEXT>
Shortcut for `/fractary-forge:harness-convert --part plugins`.
Converts the plugin manifest from one agentic framework to another.
</CONTEXT>

<CRITICAL_RULES>
**THIS COMMAND IS ONLY A ROUTER.**
Delegates to fractary-forge-harness-converter with `parts: ["plugins"]`.
</CRITICAL_RULES>

<WORKFLOW>
1. Parse arguments
2. Invoke fractary-forge-harness-converter with `parts: ["plugins"]`
3. Return response
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

```
/fractary-forge:plugins-convert <source-path> --from <harness> --to <harness> [options]
```

**Required:** `<source-path>`, `--from`, `--to`

**Optional:**
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
    "parts": ["plugins"],
    "output_dir": "<dir or null>",
    "dry_run": false
  }
}
```

## Examples

```bash
# Convert plugin manifest
/fractary-forge:plugins-convert plugins/file --from claude-code --to pi

# Dry run
/fractary-forge:plugins-convert plugins/file --from claude-code --to pi --dry-run
```
</ARGUMENT_PARSING>
