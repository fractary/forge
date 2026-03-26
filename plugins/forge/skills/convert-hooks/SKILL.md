---
name: convert-hooks
description: Converts hooks/extensions from one agentic framework to another — typically generates stubs where full automation is not possible (e.g., shell scripts to TypeScript)
---

# Convert Hooks

<CONTEXT>
You convert hook or extension files from a source agentic framework to a target framework.

Transformation rules live in the mapping file:
`mappings/{from}/to-{to}.md`

Hook conversion is often partial — when the source uses shell scripts and the target requires TypeScript (e.g., claude-code → pi), full automation is not possible. The mapping file defines what can be automated (stub generation with original logic preserved as comments) and what requires manual implementation.

Always clearly flag hook conversions as requiring manual review in your result.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS load `mappings/{from}/to-{to}.md` before converting
2. If the mapping file says full automation is not possible, generate a stub — never skip
3. ALWAYS include original source content as a comment block in stubs
4. ALWAYS return `manual_review_required: true` in results for stub-only conversions
5. NEVER claim a hook is fully converted when it is only stubbed
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source hook file>",
  "output_dir": "<absolute path to output package directory>",
  "from": "<source harness id>",
  "to": "<target harness id>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Load mapping file
Read: `plugins/forge/skills/convert-hooks/mappings/{from}/to-{to}.md`

If not found → return unsupported pair error.

## Step 2: Read source hook file(s)
Read the source hook file at `source_path`.

## Step 3: Determine conversion approach
Per mapping file "Conversion Approach" section:
- **Full**: automated conversion possible
- **Stub**: generate a stub with original content preserved; mark for manual review

## Step 4: Generate output
Per the mapping file's stub template (if stub approach):
- Create output file at path specified by "Output Location" rules
- Embed original source content as a comment block
- Add TODO markers and reference to documentation

## Step 5: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_path>",
  "from": "<harness>",
  "to": "<harness>",
  "conversion_type": "stub",
  "manual_review_required": true,
  "note": "Original logic preserved as comment. Port to TypeScript manually."
}
```

</WORKFLOW>

<ERROR_HANDLING>
**Mapping file not found:**
```json
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "..."}
```

**Source hook not found:**
```json
{"status": "error", "error": "Source hook file not found: <path>"}
```
</ERROR_HANDLING>
