---
name: agent-to-skill
description: Converts a Claude Code agent markdown file to a pi.dev coding-agent SKILL.md file — strips disallowed frontmatter, renames tool fields, replaces Task/Skill invocation patterns with pi skill references
---

# Agent to Skill Converter

<CONTEXT>
You convert a single Claude Code agent file (`agents/*.md`) into a pi.dev coding-agent skill file (`skills/{name}/SKILL.md`).

Rules are defined in the `conversion-mapping` skill. Read that skill for the authoritative mapping reference before performing any conversion.

A Claude agent has YAML frontmatter with `name`, `description`, `model`, `tools`/`allowed-tools`, and optionally `color`. The pi skill keeps `name`, `description`, and `allowed-tools` (renaming from `tools` if needed), and wraps the content in a directory named after the skill.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS read the source file before converting
2. NEVER carry `model` or `color` into the pi output frontmatter
3. ALWAYS rename `tools:` field to `allowed-tools:` in output
4. ALWAYS wrap output in a directory: `{output_dir}/skills/{name}/SKILL.md`
5. ALWAYS ensure `name` field in output frontmatter exactly matches the directory name
6. Replace `Task(x)` / `@agent-ns:x` references with prose `/skill:x` notation in the body
7. Remove `Bash(cli ...)` tool restrictions from `allowed-tools` — keep CLI instructions as prose
8. Description must be ≤ 1024 characters — truncate with `...` if needed
9. Name must be lowercase letters and hyphens only, 1-64 chars
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source agent .md file>",
  "output_dir": "<absolute path to the pi package output directory>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Read source file
Read the source agent file at `source_path`.

## Step 2: Parse frontmatter
Extract all YAML frontmatter fields:
- `name` (required) — e.g., `file-upload`
- `description` (required)
- `model` (will be dropped)
- `tools` or `allowed-tools` (will be kept, renamed to `allowed-tools`)
- `color` (will be dropped if present)
- `memory` (will be dropped if present)

## Step 3: Validate and normalize name
The pi skill `name` must:
- Be lowercase letters and hyphens only
- Be 1-64 characters
- Exactly match the directory it will be placed in

If the source `name` contains uppercase, underscores, or other characters, normalize it:
- Lowercase all characters
- Replace `_` with `-`
- Strip any namespace prefix if it would make the name > 64 chars

## Step 4: Build pi `allowed-tools` list
Start from `tools` or `allowed-tools` in source frontmatter (whichever is present).

**Filter out** (remove from list):
- `Task(...)` entries — these become prose references in the body
- `Bash(fractary-core ...)` or other `Bash(cli ...)` restriction entries — keep CLI instructions as prose instead
- `Skill(...)` entries — these become prose references in the body

**Keep:**
- Plain tool names: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`
- These map directly to pi tool names

If all entries were filtered out, omit `allowed-tools` from the output frontmatter entirely.

## Step 5: Replace agent/skill invocation prose in body
Scan the body for Claude-specific invocation patterns and replace:

| Find Pattern | Replace With |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `@skill-ns:name` syntax | `/skill:ns-name` |
| `@agent-ns:name` syntax | `/skill:ns-name` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Task(X)` in prose | `/skill:X` |

Note: Replace `:` with `-` in skill/agent names when constructing pi references.

## Step 6: Build pi skill frontmatter
```yaml
---
name: <normalized-name>
description: <description, max 1024 chars>
allowed-tools: <filtered tools list, omit if empty>
---
```

## Step 7: Assemble output content
```
{pi frontmatter}

{body with prose replacements from Step 5}
```

## Step 8: Write output file
Create directory: `{output_dir}/skills/{name}/`
Write to: `{output_dir}/skills/{name}/SKILL.md`

## Step 9: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_dir>/skills/<name>/SKILL.md",
  "original_name": "<original name>",
  "pi_name": "<normalized name>",
  "fields_dropped": ["model", "color", ...],
  "tools_filtered": ["Task(...)", "Bash(cli...)", ...],
  "tools_kept": ["Read", "Write", ...],
  "prose_replacements": <count>
}
```

</WORKFLOW>

<COMPLETION_CRITERIA>
Conversion is complete when:
1. Output directory `{output_dir}/skills/{name}/` created
2. `SKILL.md` written inside it
3. Output frontmatter contains only `name`, `description`, and optionally `allowed-tools`
4. No `model` or `color` in output frontmatter
5. `tools` field renamed to `allowed-tools`
6. All `Task(x)` and `Skill(x)` entries removed from `allowed-tools`
7. Agent/skill invocation prose updated to pi format
8. Name matches directory name exactly
9. Result JSON returned
</COMPLETION_CRITERIA>

<OUTPUTS>
Returns result JSON as specified in Step 9.
</OUTPUTS>

<ERROR_HANDLING>
**Source file not found:**
```json
{"status": "error", "error": "Source file not found: <path>"}
```

**Missing required frontmatter field:**
```json
{"status": "error", "error": "Source file missing required field: name"}
```

**Name cannot be normalized to valid pi name:**
```json
{"status": "error", "error": "Cannot derive valid pi name from: <original>", "suggestion": "<suggested-name>"}
```
</ERROR_HANDLING>
