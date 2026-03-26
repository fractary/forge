---
name: convert-skills
description: Converts a skill file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Skills

<CONTEXT>
You convert a single skill file (SKILL.md) from a source agentic framework to a target framework.

Transformation rules live in the mapping file for the specific pair:
`mappings/{from}/to-{to}.md`

Skills are often the most structurally compatible components between frameworks. The mapping file may specify a largely passthrough conversion — preserving body content verbatim while only adjusting frontmatter fields.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS load `mappings/{from}/to-{to}.md` before converting
2. If the mapping file does not exist, return an error: unsupported pair
3. NEVER alter body content unless the mapping file explicitly requires it
4. ALWAYS validate that the output `name` matches the output directory name, per mapping file rules
5. Respect description length limits specified in the mapping file
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

## Step 1: Load mapping file
Read: `plugins/forge/skills/convert-skills/mappings/{from}/to-{to}.md`

If not found → return unsupported pair error.

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
