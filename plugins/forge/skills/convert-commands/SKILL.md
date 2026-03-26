---
name: convert-commands
description: Converts a command/prompt file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Commands

<CONTEXT>
You convert a single command or prompt file from a source agentic framework to a target framework.

Transformation rules for built-in pairs are embedded inline in the BUILT_IN_MAPPINGS section below.
For unknown pairs, rules live in the mapping file: `mappings/{from}/to-{to}.md`

The rules tell you what the source looks like, what the target must look like, which frontmatter fields to keep/drop/transform, how to rename the output file, and what body content transforms to apply.
</CONTEXT>

<CRITICAL_RULES>
1. For built-in pairs (see BUILT_IN_MAPPINGS below), use the inline rules — do NOT attempt a file read
2. For unknown pairs, attempt to read `mappings/{from}/to-{to}.md` (requires forge root in CWD)
3. If no mapping found at all, return unsupported pair error
4. NEVER apply hardcoded framework assumptions outside of the inline rules
5. ALWAYS write output to the location specified by the mapping rules' output path rules
6. Do NOT alter body content beyond what the mapping rules explicitly instruct
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

## Step 1: Load mapping rules
If `{from}` = `claude-code` and `{to}` = `pi`: use the **BUILT_IN_MAPPINGS** section below — no file read needed.
Otherwise: Read `mappings/{from}/to-{to}.md`. If not found:
```json
{"status": "error", "error": "Unsupported conversion pair for commands: {from} → {to}", "missing_mapping": "mappings/{from}/to-{to}.md"}
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

<BUILT_IN_MAPPINGS>

## claude-code → pi

# Mapping: claude-code → pi (commands)

This defines all rules for converting a Claude Code command file (`commands/*.md`) to a pi.dev coding-agent prompt file (`prompts/*.md`).

---

## Source Structure

- **Location**: `commands/*.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `model`, `allowed-tools`, `argument-hint`, `color`, `memory`
- **Name convention**: `{namespace}:{command}` (e.g., `fractary-file:upload`)
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
| `name` | **Transform → filename** | Replace `:` with `-`, append `.md` → `{ns}-{cmd}.md` |
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

**Colon → Hyphen rule:**
Replace all `:` with `-` in the `name` field to derive the pi prompt filename.

```
Claude name:      fractary-file:upload
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

</BUILT_IN_MAPPINGS>
