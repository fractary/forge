# Mapping: claude-code → pi (commands)

This file defines all rules for converting a Claude Code command file (`commands/*.md`) to a pi.dev coding-agent prompt file (`prompts/*.md`).

---

## Source Structure

- **Location**: `commands/*.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `model`, `allowed-tools`, `argument-hint`, `color`, `memory`
- **Name convention**: `{namespace}-{command}` (e.g., `fractary-file-upload`)
- **Body**: Markdown prose describing what the command does

---

## Target Structure

- **Location**: `prompts/{ns}-{cmd}.md`
- **Required frontmatter fields**: `description`
- **No other frontmatter fields allowed**
- **Body**: Original body with argument variables injected (if applicable) and Claude-specific prose replaced

---

## Field Mapping Table

| Source Field | Disposition | Notes |
|---|---|---|
| `name` | **Transform → filename** | Append `.md` → `{ns}-{cmd}.md` (name is already hyphen-formatted) |
| `description` | **Keep** | Trim to 1024 chars if needed; truncate at 1021 + `...` |
| `model` | **Drop** | Pi does not support per-prompt model config |
| `allowed-tools` | **Drop** | Pi prompts do not restrict tools |
| `argument-hint` | **Transform → body vars** | Convert hint to `$@`/`$1`/`$2` vars, inject at top of body, then drop |
| `color` | **Drop** | Pi has no color field |
| `memory` | **Drop** | Pi has no memory field |

**Resulting pi frontmatter:**
```yaml
---
description: <original description, max 1024 chars>
---
```

---

## Naming Convention Transforms

**Name → filename rule:**
Use the `name` field as-is to derive the pi prompt filename (names use hyphens throughout, no colon namespace separator).

```
Claude name:      fractary-file-upload
Pi filename:      fractary-file-upload.md
Pi invocation:    /fractary-file-upload
```

**Output path:**
```
{output_dir}/prompts/{ns}-{cmd}.md
```

---

## Body Content Transforms

### argument-hint → body variables

If `argument-hint` is present, parse it and prepend an argument variable block to the body (followed by a blank line):

- Positional args (e.g., `<src-path> <dest-path>`) → `$1`, `$2`, etc.
- Open-ended or `[options]`/`...` → `$@`
- Mixed: use positional vars for named args and `$@` for the full string

**Example:**
```
argument-hint: '<src-path> <dest-path> [--source <name>]'
```
Prepend to body:
```
Arguments: $1=src-path, $2=dest-path, $@=all arguments including optional flags

```

### Claude-specific prose replacements

Scan body and replace Claude-specific invocation patterns:

| Find Pattern | Replace With |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Use @skill-ns:name` | `Use the /skill:ns-name skill` |
| `@agent-ns:name` | `/skill:ns-name` |

Use fuzzy matching — if the pattern is clearly a reference to another agent/skill, convert it.

---

## Output Location

```
{output_dir}/prompts/{ns}-{cmd}.md
```

Ensure the `prompts/` directory exists before writing.

---

## Conversion Approach

**Full** — automated conversion is possible for all fields.

---

## Unsupported Features

None — all command features can be fully automated for this conversion direction.

---

## Validation Checklist

- [ ] No `model`, `allowed-tools`, `color`, `argument-hint`, `memory` in frontmatter
- [ ] Only `description` in frontmatter
- [ ] Filename uses `-` not `:` from original `name`
- [ ] `$@`/`$1` vars present if source had `argument-hint`
- [ ] Description ≤ 1024 chars
