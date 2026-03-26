---
name: convert-plugins
description: Converts a plugin/package manifest from one agentic framework to another by loading the appropriate directional mapping file
---

# Convert Plugins

<CONTEXT>
You convert a plugin or package manifest from a source agentic framework to a target framework.

Transformation rules for built-in pairs are embedded inline in the BUILT_IN_MAPPINGS section below.
For unknown pairs, rules live in the mapping file: `mappings/{from}/to-{to}.md`

Examples: `.claude-plugin/plugin.json` (claude-code) → `package.json` with pi section (pi).
The mapping rules define source manifest location, target manifest format, field mapping, and any metadata additions required by the target framework.
</CONTEXT>

<CRITICAL_RULES>
1. For built-in pairs (see BUILT_IN_MAPPINGS below), use the inline rules — do NOT attempt a file read
2. For unknown pairs, attempt to read `mappings/{from}/to-{to}.md` (requires forge root in CWD)
3. If no mapping found at all, return unsupported pair error
4. Source manifest path is determined by the mapping rules' "Source Structure" — do not hardcode it
5. Output manifest path and format are determined by the mapping rules' "Target Structure"
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source plugin/package root directory>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id>",
  "to": "<target harness id>",
  "has_hooks": true
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping rules
If `{from}` = `claude-code` and `{to}` = `pi`: use the **BUILT_IN_MAPPINGS** section below — no file read needed.
Otherwise: Read `mappings/{from}/to-{to}.md`. If not found → return unsupported pair error.

## Step 2: Read source manifest
Location is specified by mapping file "Source Structure" (e.g., `.claude-plugin/plugin.json` for claude-code).

## Step 3: Apply mapping rules
Per mapping file:
- Extract fields from source manifest
- Map fields to target manifest format
- Add required target metadata (e.g., keywords, sections)
- Handle conditional sections (e.g., extensions key only if hooks present)

## Step 4: Write target manifest
Path and filename specified by mapping file "Target Structure".

## Step 5: Return result
```json
{
  "status": "success",
  "source_manifest": "<path>",
  "output_manifest": "<path>",
  "from": "<harness>",
  "to": "<harness>",
  "package_name": "<output name>",
  "version": "<version>"
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "..."}
```

**Source manifest not found:**
```json
{"status": "error", "error": "Source manifest not found at expected path (per {from} structure)"}
```
</ERROR_HANDLING>

<BUILT_IN_MAPPINGS>

## claude-code → pi

# Mapping: claude-code → pi (plugin manifest)

This file defines all rules for converting a Claude Code plugin manifest (`.claude-plugin/plugin.json`) to a pi.dev package manifest (`package.json` with `pi` section).

---

## Source Structure

- **Location**: `.claude-plugin/plugin.json`
- **Format**: JSON
- **Required fields**: `name`, `version`, `description`
- **Optional fields**: `commands`, `agents`, `skills`, `hooks`, `requires`

**Example source:**
```json
{
  "name": "fractary-file",
  "version": "3.0.7",
  "description": "File upload and download plugin for fractary",
  "commands": "./commands/",
  "agents": ["./agents/file-upload.md", "./agents/file-download.md"],
  "skills": "./skills/",
  "requires": ["fractary-core"]
}
```

---

## Target Structure

- **Location**: `{output_dir}/package.json`
- **Format**: JSON (standard npm package.json with `pi` section)
- **Required fields**: `name`, `version`, `description`, `keywords`, `pi`

**Example target:**
```json
{
  "name": "fractary-file-pi",
  "version": "3.0.7",
  "description": "File upload and download plugin for fractary",
  "keywords": ["pi-package"],
  "pi": {
    "prompts": ["./prompts"],
    "skills": ["./skills"]
  }
}
```

---

## Field Mapping Table

| Source Field | Target Field | Disposition | Notes |
|---|---|---|---|
| `name` | `name` | **Transform** | Append `-pi` suffix: `fractary-file` → `fractary-file-pi` |
| `version` | `version` | **Keep** | Unchanged |
| `description` | `description` | **Keep** | Unchanged |
| `commands` | `pi.prompts` | **Transform** | Map to `["./prompts"]` in pi section |
| `agents` + `skills` | `pi.skills` | **Transform** | Map to `["./skills"]` in pi section |
| `hooks` | `pi.extensions` | **Conditional** | Only include `pi.extensions: ["./extensions"]` if hooks were present |
| `requires` | `_claudeRequires` | **Informational** | Copy as `_claudeRequires` string; documents CLI deps (pi has no equivalent mechanism) |
| (none) | `keywords` | **Add** | Always add `["pi-package"]` |

---

## Naming Convention Transforms

**Plugin name → pi package name:**
```
Source name:    fractary-file
Pi package:     fractary-file-pi
```

**Output directory name:**
The generated pi package directory is named `{plugin-name}-pi`:
```
Source plugin:  fractary-file
Output dir:     {output_dir}/fractary-file-pi/
```

---

## Pi Section Rules

Always include:
```json
"pi": {
  "prompts": ["./prompts"],
  "skills": ["./skills"]
}
```

Only include `extensions` if the source plugin had hooks (`has_hooks: true`):
```json
"pi": {
  "prompts": ["./prompts"],
  "skills": ["./skills"],
  "extensions": ["./extensions"]
}
```

---

## Output Location

```
{output_dir}/package.json
```

---

## Conversion Approach

**Full** — automated conversion is possible for all fields.

---

## Unsupported Features

- **`requires` field**: Pi has no equivalent dependency mechanism for CLI tools. The `requires` list is preserved as `_claudeRequires` (informational comment field) to document which fractary CLI plugins must be installed for CLI-dependent prompts/skills to function.

---

## Validation Checklist

- [ ] `name` has `-pi` suffix
- [ ] `version` and `description` match source
- [ ] `keywords` includes `"pi-package"`
- [ ] `pi.prompts` is `["./prompts"]`
- [ ] `pi.skills` is `["./skills"]`
- [ ] `pi.extensions` present ONLY if hooks existed in source
- [ ] Output at `{output_dir}/package.json`

</BUILT_IN_MAPPINGS>
