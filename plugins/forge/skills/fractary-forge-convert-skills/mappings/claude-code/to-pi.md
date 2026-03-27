# Mapping: claude-code → pi (skills)

This file defines all rules for converting a Claude Code skill file (`skills/{name}/SKILL.md`) to a pi.dev coding-agent skill file (`skills/{name}/SKILL.md`).

Claude skills and pi skills are the most structurally similar component type. The body content is preserved verbatim — only frontmatter fields need adjustment.

---

## Source Structure

- **Location**: `skills/{name}/SKILL.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `model`, `tools`, `allowed-tools`, `color`
- **Name constraint**: must match the parent directory name
- **Body**: Markdown prose (preserved verbatim)

---

## Target Structure

- **Location**: `skills/{name}/SKILL.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `allowed-tools`
- **Name constraint**: lowercase letters and hyphens only, 1-64 chars, must exactly match directory name
- **Body**: Verbatim copy of source body (no changes)

---

## Field Mapping Table

| Source Field | Disposition | Notes |
|---|---|---|
| `name` | **Keep / Validate** | Must match `skill_dir_name`; normalize if needed (lowercase, `_` → `-`) |
| `description` | **Keep** | Trim to 1024 chars if needed; truncate at 1021 + `...` |
| `model` | **Drop** | Pi does not support per-skill model config |
| `tools` | **Rename → `allowed-tools`** | Same content, different field name; then apply tool filter |
| `allowed-tools` | **Keep as `allowed-tools`** | Apply tool filter |
| `color` | **Drop** | Not supported by pi |

**Resulting pi frontmatter:**
```yaml
---
name: <validated-name>
description: <description, max 1024 chars>
allowed-tools: <filtered tools, omit if empty>
---
```

---

## Tool Filter Rules

**Remove from list:**
- `Agent(...)` — pi skills do not use the Agent tool
- `Skill(...)` — pi skills reference other skills via body prose

**Keep:**
- Plain tool names: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`

If all entries are filtered out, omit `allowed-tools` from output frontmatter entirely.

---

## Naming Convention Transforms

The skill `name` field must exactly match the parent directory name.

If `name` does not match `skill_dir_name` (the source directory name), use `skill_dir_name` as the canonical name and note the discrepancy in the result.

If name contains invalid characters:
- Lowercase all characters
- Replace `_` with `-`

---

## Body Content Transforms

**None** — preserve ALL body content verbatim. Do NOT alter the workflow, rules, context sections, or any other body content.

---

## Output Location

```
{output_dir}/skills/{name}/SKILL.md
```

Create the `skills/{name}/` directory before writing.

---

## Conversion Approach

**Full** — automated conversion is possible for all fields. Body is a verbatim passthrough.

---

## Additional Files

If the source skill directory contains additional files (e.g., `scripts/*.sh`, workflow files), note them in the result as `additional_files_noted` but do NOT copy them. The `harness-converter` agent handles those separately.

---

## Unsupported Features

- **Custom scripts** (`skills/*/scripts/*.sh`): Shell scripts used by skills are not automatically copied. Flag in result for the orchestrating agent to handle.

---

## Validation Checklist

- [ ] `name` field matches output directory name exactly
- [ ] `description` field present, ≤ 1024 chars
- [ ] No `model` or `color` in frontmatter
- [ ] `tools` renamed to `allowed-tools` if applicable
- [ ] `Agent(x)` and `Skill(x)` entries removed from `allowed-tools`
- [ ] Body content is verbatim (no changes)
- [ ] Output at `skills/{name}/SKILL.md`
