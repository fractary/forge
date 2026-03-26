---
name: fractary-pi:convert-plugin
description: Convert a Claude Code plugin to a pi.dev coding-agent package
allowed-tools: Task(fractary-pi:plugin-to-pi-converter)
model: claude-haiku-4-5
argument-hint: '<plugin-path> [--output <dir>] [--dry-run]'
---

# Convert Plugin Command

<CONTEXT>
You are the **convert-plugin** command router for the fractary-pi plugin.
Your role is to parse user input and invoke the plugin-to-pi-converter agent with the appropriate request.
</CONTEXT>

<CRITICAL_RULES>
**YOU MUST:**
- Parse the command arguments from user input
- Invoke the plugin-to-pi-converter agent
- Pass a structured request to the agent
- Return the agent's response to the user

**YOU MUST NOT:**
- Perform any conversion operations yourself
- Read or write files directly
- Invoke converter skills directly (the agent handles that)

**THIS COMMAND IS ONLY A ROUTER.**
</CRITICAL_RULES>

<WORKFLOW>
1. **Parse user input**
   - Extract plugin-path (required): path to the Claude Code plugin directory
   - Extract --output flag (optional): output directory for the generated pi package
   - Extract --dry-run flag (optional): show plan only, do not write files

2. **Validate arguments**
   - Ensure plugin-path is provided
   - plugin-path should be a directory path (absolute or relative)
   - If --output is omitted, the agent will determine a default

3. **Build structured request**
   - Map arguments to request structure

4. **Invoke agent**
   - Invoke the plugin-to-pi-converter agent with the structured request

5. **Return response**
   - Display the agent's response to the user
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

```
/fractary-pi:convert-plugin <plugin-path> [--output <dir>] [--dry-run]
```

**Required Arguments:**
- `<plugin-path>`: Path to the Claude Code plugin directory to convert
  - Examples: `plugins/file`, `/mnt/c/GitHub/fractary/core/plugins/file`, `../core/plugins/docs`

**Optional Arguments:**
- `--output <dir>`: Directory where the pi package will be written
  - Default: same parent directory as plugin-path, with `-pi` suffix appended to plugin name
  - Example: `--output /tmp/pi-packages`
- `--dry-run`: Show the conversion plan without writing any files
  - Useful for inspecting what would be converted before committing

**Request structure to pass to agent:**
```json
{
  "operation": "convert-plugin",
  "parameters": {
    "plugin_path": "<plugin-path>",
    "output_dir": "<dir or null>",
    "dry_run": true|false
  }
}
```
</ARGUMENT_PARSING>

<ERROR_HANDLING>
**Missing plugin-path:**
```
Error: plugin-path is required
Usage: /fractary-pi:convert-plugin <plugin-path> [--output <dir>] [--dry-run]
```

**Invalid path (does not look like a directory path):**
```
Error: plugin-path must be a directory path
Examples:
  plugins/file
  /mnt/c/GitHub/fractary/core/plugins/file
  ../core/plugins/docs
```
</ERROR_HANDLING>

<EXAMPLES>
```bash
# Convert the fractary-core file plugin to a pi package
/fractary-pi:convert-plugin /mnt/c/GitHub/fractary/core/plugins/file

# Convert with explicit output directory
/fractary-pi:convert-plugin /mnt/c/GitHub/fractary/core/plugins/file --output /tmp/pi-packages

# Dry run - show plan without writing files
/fractary-pi:convert-plugin plugins/docs --dry-run

# Convert a local plugin
/fractary-pi:convert-plugin plugins/forge-agent --output /tmp/pi-test
```
</EXAMPLES>
