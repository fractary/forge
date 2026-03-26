# Mapping: claude-code → pi (agents)

This file defines all rules for converting a Claude Code agent file (`agents/*.md`) to a pi.dev coding-agent skill file (`skills/{name}/SKILL.md`).

---

## Source Structure

- **Location**: `agents/*.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `model`, `tools`, `allowed-tools`, `color`, `memory`
- **Name convention**: lowercase, hyphens allowed (e.g., `file-upload`)
- **Body**: Markdown prose describing the agent's behavior

---

## Target Structure

- **Location**: `skills/{name}/SKILL.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `allowed-tools`
- **Name constraint**: lowercase letters and hyphens only, 1-64 chars, must exactly match directory name
- **Body**: Original body with Claude-specific invocation prose replaced

---

## Field Mapping Table

| Source Field | Disposition | Notes |
|---|---|---|
| `name` | **Keep / Normalize** | Lowercase, replace `_` with `-`, strip namespace prefix if > 64 chars; must match output dir name |
| `description` | **Keep** | Trim to 1024 chars if needed; truncate at 1021 + `...` |
| `model` | **Drop** | Pi does not support per-skill model config |
| `tools` | **Rename → `allowed-tools`** | Same content, different field name; then apply tool filter (see below) |
| `allowed-tools` | **Keep as `allowed-tools`** | Already correct field name; apply tool filter |
| `color` | **Drop** | Not supported by pi |
| `memory` | **Drop** | Not supported by pi |

**Resulting pi frontmatter:**
```yaml
---
name: <normalized-name>
description: <description, max 1024 chars>
allowed-tools: <filtered tools list, omit if empty>
---
```

---

## Tool Filter Rules

Start from `tools` or `allowed-tools` in source frontmatter.

**Remove from list:**
- `Task(...)` entries — become prose `/skill:x` references in body instead
- `Bash(fractary-core ...)` or other `Bash(cli ...)` restriction entries — keep CLI call instructions as prose
- `Skill(...)` entries — become prose `/skill:ns-name` references in body instead

**Keep:**
- Plain tool names: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`

If all entries are filtered out, omit `allowed-tools` from output frontmatter entirely.

---

## Naming Convention Transforms

```
Claude agent name:   file-upload
Pi skill dir:        skills/file-upload/
Pi name field:       name: file-upload
```

Name normalization rules:
- Lowercase all characters
- Replace `_` with `-`
- Strip namespace prefix (`ns:name` → `name`) if result is ≤ 64 chars
- Strip namespace prefix if full name would exceed 64 chars

---

## Body Content Transforms

### Agent/skill invocation prose replacements

| Find Pattern | Replace With |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `@skill-ns:name` | `/skill:ns-name` |
| `@agent-ns:name` | `/skill:ns-name` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Task(X)` in prose | `/skill:X` |

Note: Replace `:` with `-` in skill/agent names when constructing pi references.

---

## Output Location

```
{output_dir}/skills/{name}/SKILL.md
```

Create the `skills/{name}/` directory before writing.

---

## Conversion Approach

**Full** — automated conversion is possible for all fields.

---

## Unsupported Features

- **`Task(x)` in `allowed-tools`**: Automatically removed; prose reference injected. However, if the body does not already describe when to invoke the sub-agent, a TODO comment may be needed — flag for review.
- **MCP-specific tools**: If an agent uses MCP-specific tools, they must be set up separately in the pi project.

---

## Validation Checklist

- [ ] `name` field present and matches directory name exactly
- [ ] `description` field present, ≤ 1024 chars
- [ ] No `model`, `color`, or `memory` fields
- [ ] `tools` field renamed to `allowed-tools` if present
- [ ] `Task(x)` and `Skill(x)` entries removed from `allowed-tools`
- [ ] `Bash(cli ...)` restriction entries removed from `allowed-tools`
- [ ] Agent/skill invocation prose updated to `/skill:x` format
- [ ] Output at `skills/{name}/SKILL.md`
