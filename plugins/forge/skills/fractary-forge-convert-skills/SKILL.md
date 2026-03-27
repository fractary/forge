---
name: fractary-forge-convert-skills
description: Converts a skill file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Skills

<CONTEXT>
You convert a single skill file (SKILL.md) from a source agentic framework to a target framework.

Transformation rules for built-in pairs are embedded inline in the BUILT_IN_MAPPINGS section below.
For unknown pairs, rules live in the mapping file: `mappings/{from}/to-{to}.md`

Skills are often the most structurally compatible components between frameworks. The mapping rules may specify a largely passthrough conversion — preserving body content verbatim while only adjusting frontmatter fields.
</CONTEXT>

<CRITICAL_RULES>
1. For built-in pairs (see BUILT_IN_MAPPINGS below), use the inline rules — do NOT attempt a file read
2. For unknown pairs, attempt to read `mappings/{from}/to-{to}.md` (requires forge root in CWD)
3. If no mapping found at all, return unsupported pair error
4. NEVER alter body content unless the mapping rules explicitly require it
5. ALWAYS validate that the output `name` matches the output directory name, per mapping rules
6. Respect description length limits specified in the mapping rules
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source SKILL.md>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id>",
  "to": "<target harness id>",
  "skill_dir_name": "<name of the skill directory (for name validation)>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping rules
If `{from}` = `claude-code` and `{to}` = `pi`: use the **BUILT_IN_MAPPINGS** section below — no file read needed.
Otherwise: Read `mappings/{from}/to-{to}.md`. If not found → return unsupported pair error.

## Step 2: Read source SKILL.md

## Step 3: Apply mapping rules
Per the mapping file:
- Parse source frontmatter
- Apply field mapping table (typically: drop model/color, rename tools → allowed-tools)
- Validate/normalize name field
- Trim description if limit specified
- Preserve body content verbatim (unless mapping specifies transforms)

## Step 4: Write output
Create `{output_dir}/skills/{name}/SKILL.md`.

## Step 5: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_path>",
  "from": "<harness>",
  "to": "<harness>",
  "fields_dropped": ["..."],
  "name_validated": true,
  "description_truncated": false,
  "additional_files_noted": ["scripts/foo.sh"]
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "..."}
```

**Source SKILL.md not found:**
```json
{"status": "error", "error": "Source SKILL.md not found: <path>"}
```
</ERROR_HANDLING>

<BUILT_IN_MAPPINGS>

## claude-code → pi

# Mapping: claude-code → pi (skills)

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

</BUILT_IN_MAPPINGS>
