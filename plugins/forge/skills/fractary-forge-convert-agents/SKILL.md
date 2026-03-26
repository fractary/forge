---
name: fractary-forge-convert-agents
description: Converts an agent file from one agentic framework to another by loading the appropriate directional mapping file and applying its transformation rules
---

# Convert Agents

<CONTEXT>
You convert a single agent file from a source agentic framework to a target framework.

Transformation rules for built-in pairs are embedded inline in the BUILT_IN_MAPPINGS section below.
For unknown pairs, rules live in the mapping file: `mappings/{from}/to-{to}.md`

The rules define source structure, target structure, field mapping, naming transforms, body transforms, and output location.
</CONTEXT>

<CRITICAL_RULES>
1. For built-in pairs (see BUILT_IN_MAPPINGS below), use the inline rules — do NOT attempt a file read
2. For unknown pairs, attempt to read `mappings/{from}/to-{to}.md` (requires forge root in CWD)
3. If no mapping found at all, return unsupported pair error
4. NEVER apply hardcoded framework assumptions outside of the inline rules
5. ALWAYS create output in the directory structure specified by the mapping rules
6. The mapping rules may require wrapping output in a subdirectory (e.g., pi skills live in `skills/{name}/SKILL.md`)
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

## Step 1: Load mapping rules
If `{from}` = `claude-code` and `{to}` = `pi`: use the **BUILT_IN_MAPPINGS** section below — no file read needed.
Otherwise: Read `mappings/{from}/to-{to}.md`. If not found → return unsupported pair error.

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
{"status": "error", "error": "Unsupported pair: {from} → {to}", "missing_mapping": "plugins/forge/skills/fractary-forge-convert-agents/mappings/{from}/to-{to}.md"}
```

**Source file not found:**
```json
{"status": "error", "error": "Source agent file not found: <path>"}
```
</ERROR_HANDLING>

<BUILT_IN_MAPPINGS>

## claude-code → pi

# Mapping: claude-code → pi (agents)

This file defines all rules for converting a Claude Code agent file (`agents/*.md`) to a pi.dev coding-agent skill file (`skills/{name}/SKILL.md`).

---

## Source Structure

- **Location**: `agents/*.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `model`, `tools`, `allowed-tools`, `color`, `memory`
- **Name convention**: lowercase, hyphens allowed (e.g., `file-upload`)
- **Body**: Markdown prose describing the agent's behavior

---

## Target Structure

- **Location**: `skills/{name}/SKILL.md`
- **Required frontmatter fields**: `name`, `description`
- **Optional frontmatter fields**: `allowed-tools`
- **Name constraint**: lowercase letters and hyphens only, 1-64 chars, must exactly match directory name
- **Body**: Original body with Claude-specific invocation prose replaced

---

## Field Mapping Table

| Source Field | Disposition | Notes |
|---|---|---|
| `name` | **Keep / Normalize** | Lowercase, replace `_` with `-`, strip namespace prefix if > 64 chars; must match output dir name |
| `description` | **Keep** | Trim to 1024 chars if needed; truncate at 1021 + `...` |
| `model` | **Drop** | Pi does not support per-skill model config |
| `tools` | **Rename → `allowed-tools`** | Same content, different field name; then apply tool filter (see below) |
| `allowed-tools` | **Keep as `allowed-tools`** | Already correct field name; apply tool filter |
| `color` | **Drop** | Not supported by pi |
| `memory` | **Drop** | Not supported by pi |

**Resulting pi frontmatter:**
```yaml
---
name: <normalized-name>
description: <description, max 1024 chars>
allowed-tools: <filtered tools list, omit if empty>
---
```

---

## Tool Filter Rules

Start from `tools` or `allowed-tools` in source frontmatter.

**Remove from list:**
- `Task(...)` entries — become prose `/skill:x` references in body instead
- `Bash(fractary-core ...)` or other `Bash(cli ...)` restriction entries — keep CLI call instructions as prose
- `Skill(...)` entries — become prose `/skill:ns-name` references in body instead

**Keep:**
- Plain tool names: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`

If all entries are filtered out, omit `allowed-tools` from output frontmatter entirely.

---

## Naming Convention Transforms

```
Claude agent name:   file-upload
Pi skill dir:        skills/file-upload/
Pi name field:       name: file-upload
```

Name normalization rules:
- Lowercase all characters
- Replace `_` with `-`
- Strip namespace prefix (`ns:name` → `name`) if result is ≤ 64 chars
- Strip namespace prefix if full name would exceed 64 chars

---

## Body Content Transforms

### Agent/skill invocation prose replacements

| Find Pattern | Replace With |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `@skill-ns:name` | `/skill:ns-name` |
| `@agent-ns:name` | `/skill:ns-name` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Task(X)` in prose | `/skill:X` |

Note: Replace `:` with `-` in skill/agent names when constructing pi references.

---

## Output Location

```
{output_dir}/skills/{name}/SKILL.md
```

Create the `skills/{name}/` directory before writing.

---

## Conversion Approach

**Full** — automated conversion is possible for all fields.

---

## Unsupported Features

- **`Task(x)` in `allowed-tools`**: Automatically removed; prose reference injected. However, if the body does not already describe when to invoke the sub-agent, a TODO comment may be needed — flag for review.
- **MCP-specific tools**: If an agent uses MCP-specific tools, they must be set up separately in the pi project.

---

## Validation Checklist

- [ ] `name` field present and matches directory name exactly
- [ ] `description` field present, ≤ 1024 chars
- [ ] No `model`, `color`, or `memory` fields
- [ ] `tools` field renamed to `allowed-tools` if present
- [ ] `Task(x)` and `Skill(x)` entries removed from `allowed-tools`
- [ ] `Bash(cli ...)` restriction entries removed from `allowed-tools`
- [ ] Agent/skill invocation prose updated to `/skill:x` format
- [ ] Output at `skills/{name}/SKILL.md`

</BUILT_IN_MAPPINGS>
