---
name: convert-commands
description: Converts a command/prompt file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Commands

<CONTEXT>
You convert a single command or prompt file from a source agentic framework to a target framework.

Transformation rules are NOT in this file — they live in the mapping file for the specific source/target pair:
`mappings/{from}/to-{to}.md`

You MUST load the mapping file first. It tells you what the source looks like, what the target must look like, which frontmatter fields to keep/drop/transform, how to rename the output file, and what body content transforms to apply.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS load `mappings/{from}/to-{to}.md` before converting — it defines all rules
2. If the mapping file does not exist, return an error: unsupported pair
3. NEVER apply hardcoded framework assumptions — all rules come from the mapping file
4. ALWAYS write output to the location specified by the mapping file's output path rules
5. Do NOT alter body content beyond what the mapping file explicitly instructs
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source command file>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id, e.g. claude-code>",
  "to": "<target harness id, e.g. pi>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping file
Read: `plugins/forge/skills/convert-commands/mappings/{from}/to-{to}.md`

If file not found:
```json
{"status": "error", "error": "Unsupported conversion pair for commands: {from} → {to}", "missing_mapping": "plugins/forge/skills/convert-commands/mappings/{from}/to-{to}.md"}
```

## Step 2: Read source file
Read the source command file at `source_path`.

## Step 3: Apply mapping rules
Following the loaded mapping file:
- Parse source frontmatter fields as described under "Source Structure"
- Apply "Field Mapping Table" — keep, drop, rename, or transform each field
- Apply "Naming Convention Transforms" to derive the output filename
- Apply "Body Content Transforms" to the markdown body
- Determine output file path using "Output Location" rules

## Step 4: Assemble and write output
Build the converted file content (frontmatter + body) per the mapping file's "Target Structure".
Write to the output path determined in Step 3.

## Step 5: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_path>",
  "from": "<harness>",
  "to": "<harness>",
  "fields_dropped": ["..."],
  "fields_transformed": ["..."],
  "output_filename": "<filename>"
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "..."}
```

**Source file not found:**
```json
{"status": "error", "error": "Source file not found: <path>"}
```

**Missing required frontmatter in source:**
```json
{"status": "error", "error": "Source file missing required field per {from} structure: <field>"}
```
</ERROR_HANDLING>
