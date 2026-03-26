---
name: command-to-prompt
description: Converts a Claude Code command markdown file to a pi.dev coding-agent prompt file — strips disallowed frontmatter fields, converts argument-hint to body variables, and renames the file using pi naming conventions
---

# Command to Prompt Converter

<CONTEXT>
You convert a single Claude Code command file (`commands/*.md`) into a pi.dev coding-agent prompt file (`prompts/*.md`).

Rules are defined in the `conversion-mapping` skill. Read that skill for the authoritative mapping reference before performing any conversion.

A Claude command has YAML frontmatter with fields like `name`, `description`, `model`, `allowed-tools`, `argument-hint`, and a markdown body. The pi prompt keeps only `description` in frontmatter and transforms the body to use `$@`/`$1` argument variables.
</CONTEXT>

<CRITICAL_RULES>
1. ALWAYS read the source file before converting
2. NEVER carry `model`, `allowed-tools`, `color`, `memory`, or `argument-hint` into the pi output frontmatter
3. ALWAYS convert `argument-hint` into `$@`/`$1` body variables before dropping it
4. ALWAYS rename the output file: replace `:` with `-` in the source `name` field to get the filename
5. ALWAYS write the output to `{output_dir}/prompts/{filename}.md`
6. Description must be ≤ 1024 characters — truncate with `...` if needed
7. Do NOT alter the markdown body beyond the argument-hint injection and prose replacements
</CRITICAL_RULES>

<INPUTS>
```json
{
  "source_path": "<absolute path to source command .md file>",
  "output_dir": "<absolute path to the pi package output directory>"
}
```
</INPUTS>

<WORKFLOW>

## Step 1: Read source file
Read the source command file at `source_path`.

## Step 2: Parse frontmatter
Extract all YAML frontmatter fields:
- `name` (required) — e.g., `fractary-file:upload`
- `description` (required)
- `model` (will be dropped)
- `allowed-tools` (will be dropped)
- `argument-hint` (will be transformed)
- `color` (will be dropped if present)
- `memory` (will be dropped if present)

## Step 3: Derive output filename
Convert `name` to filename:
1. Take the full name value: e.g., `fractary-file:upload`
2. Replace all `:` with `-`: `fractary-file-upload`
3. Append `.md`: `fractary-file-upload.md`

## Step 4: Build argument variable block (if argument-hint exists)
If `argument-hint` is present, parse it and generate an argument variable block to prepend to the body:

- If hint contains multiple positional args (e.g., `<src-path> <dest-path>`), use `$1`, `$2`, etc.
- If hint is open-ended or contains `[options]` / `...`, use `$@` for all arguments
- Mixed: use both positional vars for named args and `$@` for the full argument string

**Example:**
```
argument-hint: '<src-path> <dest-path> [--source <name>]'
```
Generates (prepended to body with a blank line after):
```
Arguments: $1=src-path, $2=dest-path, $@=all arguments including optional flags

```

## Step 5: Replace Claude-specific prose in body
Scan the body and replace Claude-specific invocation patterns:

| Find Pattern | Replace With |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Use @skill-ns:name` | `Use the /skill:ns-name skill` |
| `@agent-ns:name` | `/skill:ns-name` |

Use fuzzy matching — if the pattern is clearly a reference to another agent/skill, convert it.

## Step 6: Build pi prompt frontmatter
Only include:
```yaml
---
description: <description, max 1024 chars>
---
```

If description exceeds 1024 chars, truncate at 1021 chars and append `...`.

## Step 7: Assemble output content
```
{pi frontmatter}

{argument variable block if any}
{original body with prose replacements}
```

## Step 8: Write output file
Write to: `{output_dir}/prompts/{filename}.md`

Ensure the `prompts/` directory exists before writing.

## Step 9: Return result
```json
{
  "status": "success",
  "source": "<source_path>",
  "output": "<output_dir>/prompts/<filename>.md",
  "original_name": "<original name field>",
  "pi_filename": "<filename>.md",
  "fields_dropped": ["model", "allowed-tools", "argument-hint", ...],
  "argument_vars_injected": true|false,
  "prose_replacements": <count>
}
```

</WORKFLOW>

<COMPLETION_CRITERIA>
Conversion is complete when:
1. Output file written to `{output_dir}/prompts/{filename}.md`
2. Output frontmatter contains only `description`
3. No `model`, `allowed-tools`, `color`, `memory`, `argument-hint` in output frontmatter
4. `argument-hint` value has been converted to `$@`/`$1` body variables (if it existed)
5. Description is ≤ 1024 characters
6. Result JSON returned
</COMPLETION_CRITERIA>

<OUTPUTS>
Returns result JSON as specified in Step 9.
</OUTPUTS>

<ERROR_HANDLING>
**Source file not found:**
```json
{"status": "error", "error": "Source file not found: <path>"}
```

**Missing required frontmatter:**
```json
{"status": "error", "error": "Source file missing required field: name"}
```

**Output directory cannot be created:**
```json
{"status": "error", "error": "Cannot create output directory: <path>"}
```
</ERROR_HANDLING>
