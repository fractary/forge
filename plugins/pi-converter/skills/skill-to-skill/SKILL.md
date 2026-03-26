---
name: skill-to-skill
description: Converts a Claude Code SKILL.md file to a pi.dev coding-agent SKILL.md file — mostly passthrough, drops model field, renames tools to allowed-tools, validates name matches directory, trims description to 1024 chars
---

# Skill to Skill Converter

<CONTEXT>
You convert a single Claude Code skill file (`skills/{name}/SKILL.md`) into a pi.dev coding-agent skill file (`skills/{name}/SKILL.md`).

Rules are defined in the `conversion-mapping` skill. Read that skill for the authoritative mapping reference before performing any conversion.

Claude skills and pi skills are the most structurally similar components — the body content (`<CONTEXT>`, `<CRITICAL_RULES>`, `<WORKFLOW>`, etc.) is preserved verbatim. Only frontmatter fields need adjustment: drop `model`, rename `tools` to `allowed-tools`, validate the `name` field, and ensure description length compliance.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS read the source SKILL.md before converting
2. NEVER carry `model` or `color` into pi output frontmatter
3. ALWAYS rename `tools:` to `allowed-tools:` if present
4. ALWAYS ensure output `name` matches the skill's directory name exactly
5. Preserve ALL body content verbatim — do NOT alter the workflow, rules, or context sections
6. Description must be ≤ 1024 characters — truncate with `...` if needed
7. Name must be lowercase letters and hyphens only, 1-64 chars
8. If the source skill directory contains additional files (scripts, workflow files), note them in the report but do NOT copy them (they are out of scope for this skill — the converter agent handles them)
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source SKILL.md file>",
  "output_dir": "<absolute path to the pi package output directory>",
  "skill_dir_name": "<name of the skill directory in source (used to validate name field)>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Read source file
Read the SKILL.md at `source_path`.

## Step 2: Parse frontmatter
Extract all YAML frontmatter fields:
- `name` (required)
- `description` (required)
- `model` (will be dropped)
- `tools` or `allowed-tools` (will be kept, renamed to `allowed-tools`)
- `color` (will be dropped if present)

## Step 3: Validate name
Verify the `name` field:
- Matches `skill_dir_name` (the source directory name)
- Is lowercase letters and hyphens only
- Is 1-64 characters

If name does not match `skill_dir_name`, use `skill_dir_name` as the canonical name and note the discrepancy in the result.

If name contains invalid characters, normalize (lowercase, `_` → `-`) and note in result.

## Step 4: Filter allowed-tools
The `tools` or `allowed-tools` list may contain Claude-specific entries. Filter the same way as `agent-to-skill`:

**Remove:**
- `Task(...)` — pi skills do not use Task tool
- `Skill(...)` — pi skills reference other skills via body prose

**Keep:**
- Plain tool names: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`

If all entries filtered, omit `allowed-tools` from output entirely.

## Step 5: Trim description if needed
If description exceeds 1024 characters, truncate at 1021 chars and append `...`.

## Step 6: Build pi skill frontmatter
```yaml
---
name: <validated-name>
description: <description, max 1024 chars>
allowed-tools: <filtered tools, omit if empty>
---
```

## Step 7: Assemble output content
Frontmatter followed by the **complete body verbatim** (no changes to body content).

## Step 8: Write output file
Create directory: `{output_dir}/skills/{name}/`
Write to: `{output_dir}/skills/{name}/SKILL.md`

## Step 9: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_dir>/skills/<name>/SKILL.md",
  "original_name": "<name from frontmatter>",
  "pi_name": "<validated name>",
  "name_matched_dir": true|false,
  "fields_dropped": ["model", ...],
  "description_truncated": true|false,
  "additional_files": ["scripts/foo.sh", "workflow/bar.md"]
}
```

</WORKFLOW>

<COMPLETION_CRITERIA>
Conversion is complete when:
1. Output directory `{output_dir}/skills/{name}/` created
2. `SKILL.md` written with converted frontmatter + verbatim body
3. No `model` or `color` in output frontmatter
4. `tools` renamed to `allowed-tools` if applicable
5. `name` field matches output directory name
6. Description ≤ 1024 chars
7. Result JSON returned with any discrepancies noted
</COMPLETION_CRITERIA>

<OUTPUTS>
Returns result JSON as specified in Step 9.

If `additional_files` is non-empty, the converter agent should note these in the conversion report as files that were not automatically copied.
</OUTPUTS>

<ERROR_HANDLING>
**Source file not found:**
```json
{"status": "error", "error": "Source SKILL.md not found: <path>"}
```

**Missing required frontmatter:**
```json
{"status": "error", "error": "SKILL.md missing required field: name"}
```
</ERROR_HANDLING>
