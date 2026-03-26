---
name: manifest-converter
description: Converts a Claude Code plugin.json manifest to a pi.dev package.json with the pi section — maps commands to prompts, agents and skills to skills, adds pi-package keyword
---

# Manifest Converter

<CONTEXT>
You convert a Claude Code plugin manifest (`.claude-plugin/plugin.json`) into a pi.dev package manifest (`package.json`) with the `pi` section.

Rules are defined in the `conversion-mapping` skill. Read that skill for the authoritative mapping reference before performing any conversion.

The pi `package.json` follows the standard npm package.json format with an added `pi` key that lists where the package's prompts, skills, and extensions live.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS read the source plugin.json before converting
2. ALWAYS include `"pi-package"` in the `keywords` array
3. ALWAYS add `pi.prompts: ["./prompts"]` and `pi.skills: ["./skills"]`
4. ONLY add `pi.extensions: ["./extensions"]` if the source plugin had hooks
5. The output `name` should be the plugin name with `-pi` appended (e.g., `fractary-file-pi`)
6. Preserve `version` and `description` from source plugin.json
7. Write output to `{output_dir}/package.json`
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source plugin.json>",
  "output_dir": "<absolute path to pi package output directory>",
  "has_hooks": true|false
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Read source plugin.json
Read and parse the JSON at `source_path`.

Expected fields:
- `name` (required) — e.g., `fractary-file`
- `version` (required) — e.g., `3.0.7`
- `description` (required)
- `commands` (optional) — path to commands directory
- `agents` (optional) — array of agent paths or directory path
- `skills` (optional) — path to skills directory
- `requires` (optional) — array of dependency plugin names

## Step 2: Derive pi package name
Append `-pi` to the plugin name:
- `fractary-file` → `fractary-file-pi`
- `fractary-docs` → `fractary-docs-pi`

## Step 3: Build pi section
```json
{
  "prompts": ["./prompts"],
  "skills": ["./skills"]
}
```

If `has_hooks` is `true`, add:
```json
"extensions": ["./extensions"]
```

## Step 4: Build full package.json
```json
{
  "name": "<plugin-name>-pi",
  "version": "<version from plugin.json>",
  "description": "<description from plugin.json>",
  "keywords": ["pi-package"],
  "pi": {
    "prompts": ["./prompts"],
    "skills": ["./skills"],
    "extensions": ["./extensions"]  // only if has_hooks
  }
}
```

If the source plugin.json has a `requires` field, include it as a note in a `_claudeRequires` comment block — it documents which fractary CLI plugins must be installed for CLI-dependent prompts/skills to work:
```json
"_claudeRequires": "<comma-separated list>"
```

Note: `_claudeRequires` is informational only. Pi has no equivalent dependency mechanism for CLI tools.

## Step 5: Write output file
Write to: `{output_dir}/package.json`

## Step 6: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_dir>/package.json",
  "pi_package_name": "<name>-pi",
  "version": "<version>",
  "has_extensions": true|false,
  "claude_requires": ["plugin1", "plugin2"]
}
```

</WORKFLOW>

<COMPLETION_CRITERIA>
Conversion is complete when:
1. `package.json` written to `{output_dir}/`
2. Contains `name` with `-pi` suffix
3. Contains `keywords: ["pi-package"]`
4. Contains `pi.prompts` and `pi.skills`
5. Contains `pi.extensions` only if `has_hooks` was true
6. Result JSON returned
</COMPLETION_CRITERIA>

<OUTPUTS>
Returns result JSON as specified in Step 6.
</OUTPUTS>

<ERROR_HANDLING>
**Source plugin.json not found:**
```json
{"status": "error", "error": "plugin.json not found: <path>"}
```

**Invalid JSON in source:**
```json
{"status": "error", "error": "plugin.json is not valid JSON: <parse error>"}
```

**Missing required fields:**
```json
{"status": "error", "error": "plugin.json missing required field: name"}
```
</ERROR_HANDLING>
