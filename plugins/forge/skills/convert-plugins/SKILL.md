---
name: convert-plugins
description: Converts a plugin/package manifest from one agentic framework to another by loading the appropriate directional mapping file
---

# Convert Plugins

<CONTEXT>
You convert a plugin or package manifest from a source agentic framework to a target framework.

Transformation rules live in the mapping file:
`mappings/{from}/to-{to}.md`

Examples: `.claude-plugin/plugin.json` (claude-code) → `package.json` with pi section (pi).
The mapping file defines source manifest location, target manifest format, field mapping, and any metadata additions required by the target framework.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS load `mappings/{from}/to-{to}.md` before converting
2. If the mapping file does not exist, return unsupported pair error
3. Source manifest path is determined by the mapping file's "Source Structure" — do not hardcode it
4. Output manifest path and format are determined by the mapping file's "Target Structure"
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source plugin/package root directory>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id>",
  "to": "<target harness id>",
  "has_hooks": true
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping file
Read: `plugins/forge/skills/convert-plugins/mappings/{from}/to-{to}.md`

If not found → return unsupported pair error.

## Step 2: Read source manifest
Location is specified by mapping file "Source Structure" (e.g., `.claude-plugin/plugin.json` for claude-code).

## Step 3: Apply mapping rules
Per mapping file:
- Extract fields from source manifest
- Map fields to target manifest format
- Add required target metadata (e.g., keywords, sections)
- Handle conditional sections (e.g., extensions key only if hooks present)

## Step 4: Write target manifest
Path and filename specified by mapping file "Target Structure".

## Step 5: Return result
```json
{
  "status": "success",
  "source_manifest": "<path>",
  "output_manifest": "<path>",
  "from": "<harness>",
  "to": "<harness>",
  "package_name": "<output name>",
  "version": "<version>"
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "..."}
```

**Source manifest not found:**
```json
{"status": "error", "error": "Source manifest not found at expected path (per {from} structure)"}
```
</ERROR_HANDLING>
