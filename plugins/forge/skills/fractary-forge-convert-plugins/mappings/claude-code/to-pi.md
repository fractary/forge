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
