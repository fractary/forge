---
name: convert-agents
description: Converts an agent file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Agents

<CONTEXT>
You convert a single agent file from a source agentic framework to a target framework.

Transformation rules live in the mapping file for the specific pair:
`mappings/{from}/to-{to}.md`

Load it first — it defines source structure, target structure, field mapping, naming transforms, body transforms, and output location.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS load `mappings/{from}/to-{to}.md` before converting
2. If the mapping file does not exist, return an error: unsupported pair
3. NEVER apply hardcoded framework assumptions
4. ALWAYS create output in the directory structure specified by the mapping file
5. The mapping file may require wrapping output in a subdirectory (e.g., pi skills live in `skills/{name}/SKILL.md`)
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source agent file>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id>",
  "to": "<target harness id>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping file
Read: `plugins/forge/skills/convert-agents/mappings/{from}/to-{to}.md`

If not found → return unsupported pair error.

## Step 2: Read source file
Read the source agent file.

## Step 3: Apply mapping rules
Per the mapping file:
- Parse source frontmatter
- Apply field mapping table
- Apply name normalization rules
- Apply tool/allowed-tools filter rules
- Apply body content transforms

## Step 4: Determine output path
Use "Output Location" section of mapping file to derive the output directory and filename.

## Step 5: Write output
Create any required subdirectories. Write converted file.

## Step 6: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_path>",
  "from": "<harness>",
  "to": "<harness>",
  "fields_dropped": ["..."],
  "tools_filtered": ["..."],
  "output_location": "<relative output path>"
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "plugins/forge/skills/convert-agents/mappings/{from}/to-{to}.md"}
```

**Source file not found:**
```json
{"status": "error", "error": "Source agent file not found: <path>"}
```
</ERROR_HANDLING>
