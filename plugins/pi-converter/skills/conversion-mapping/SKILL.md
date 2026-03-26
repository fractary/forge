---
name: conversion-mapping
description: Authoritative reference for mapping Claude Code plugin components to pi.dev coding-agent package format — inspect and edit this to change converter behavior
---

# Claude Code → Pi Package Conversion Mapping

This skill is the **single source of truth** for how every Claude Code plugin component maps to a pi.dev coding-agent package component. All converter skills (`command-to-prompt`, `agent-to-skill`, `skill-to-skill`, `manifest-converter`) derive their rules from this reference.

To change conversion behavior, update this file. The converter agent and its skills will follow the updated rules.

---

## 1. Component Type Mapping

| Claude Component | Pi Equivalent | Output Location |
|---|---|---|
| `commands/*.md` | `prompts/*.md` | `{output}/prompts/{ns}-{cmd}.md` |
| `agents/*.md` | `skills/{name}/SKILL.md` | `{output}/skills/{name}/SKILL.md` |
| `skills/*/SKILL.md` | `skills/{name}/SKILL.md` | `{output}/skills/{name}/SKILL.md` |
| `hooks/*.json` + `*.sh` | `extensions/*.ts` (stub) | `{output}/extensions/{name}.ts` |
| `.claude-plugin/plugin.json` | `package.json` (pi section) | `{output}/package.json` |

---

## 2. Frontmatter Field Mapping

### Command frontmatter (`commands/*.md`)

| Claude Field | Pi Disposition | Notes |
|---|---|---|
| `name` | **Transform** → filename | `ns:cmd` → `ns-cmd.md`; description text kept |
| `description` | **Keep** as `description` | Trim to 1024 chars if needed |
| `model` | **Drop** | Pi does not support per-prompt model config |
| `allowed-tools` | **Drop** | Pi prompts do not restrict tools |
| `argument-hint` | **Transform** → body vars | Convert hint text to `$@` (all args) or `$1`/`$2` (positional) injected at top of prompt body |
| `color` | **Drop** | Pi has no color field |
| `memory` | **Drop** | Pi has no memory field |

**Resulting pi prompt frontmatter:**
```yaml
---
description: <original description, max 1024 chars>
---
```

### Agent frontmatter (`agents/*.md`)

| Claude Field | Pi Disposition | Notes |
|---|---|---|
| `name` | **Keep** as `name` (also directory name) | Must be lowercase, hyphens only, 1-64 chars |
| `description` | **Keep** as `description` | Trim to 1024 chars if needed |
| `model` | **Drop** | Pi does not support per-skill model config |
| `tools` | **Keep** as `allowed-tools` | Map field name from `tools` to `allowed-tools` |
| `allowed-tools` | **Keep** as `allowed-tools` | Already correct field name |
| `color` | **Drop** | Not supported |
| `memory` | **Drop** | Not supported |

**Resulting pi skill frontmatter:**
```yaml
---
name: <agent-name>
description: <description, max 1024 chars>
allowed-tools: <tools if present>
---
```

### Skill frontmatter (`skills/*/SKILL.md`)

| Claude Field | Pi Disposition | Notes |
|---|---|---|
| `name` | **Keep/Validate** | Must match directory name exactly; lowercase, hyphens only, 1-64 chars |
| `description` | **Keep** | Trim to 1024 chars if needed |
| `model` | **Drop** | Pi does not support per-skill model config |
| `tools` | **Rename** → `allowed-tools` | Same content, different field name |
| `allowed-tools` | **Keep** | Already correct |
| `color` | **Drop** | Not supported |

---

## 3. Naming Conventions

### Colon → Hyphen rule
Claude uses `:` to separate namespace from component name in the `name` frontmatter field. Pi uses filename-based invocation with hyphens.

```
Claude:  name: fractary-file:upload
Pi:      filename: fractary-file-upload.md
Pi:      invocation: /fractary-file-upload
```

**Rule:** Replace all `:` with `-` in the name field when deriving the pi filename.

### Directory name for skills
Pi skills live in `skills/{name}/SKILL.md` where `{name}` must exactly match the `name` field in the SKILL.md frontmatter.

```
Claude agent name:  file-upload
Pi skill dir:       skills/file-upload/SKILL.md
Pi name field:      name: file-upload
```

### Output package directory
The generated pi package is named `{plugin-name}-pi/`:
```
Source:  plugins/file/  (plugin name: fractary-file)
Output:  {output-dir}/fractary-file-pi/
```

---

## 4. Tool Reference Mapping

### `Task(agent-name)` — Claude agent invocation
In Claude, agents call other agents via the `Task` tool in `allowed-tools`.

**Pi equivalent:** Reference the skill inline in the skill body using pi skill invocation syntax.

```
Claude allowed-tools:  Task(file-upload-agent)
Pi body reference:     Use the /skill:file-upload-agent skill to upload the file.
```

Remove `Task(...)` from the `allowed-tools` list in pi output; instead add a prose reference in the skill body where the agent is invoked.

### `Bash(fractary-core ...)` — CLI calls
In Claude, `allowed-tools: Bash(fractary-core file upload:*)` restricts bash to specific CLI commands.

**Pi equivalent:** Keep as a plain CLI call instruction in the skill body. Remove the restriction syntax.

```
Claude:  allowed-tools: Bash(fractary-core file upload:*)
Pi:      Keep the instruction "Call: fractary-core file upload ..." as prose
         Remove Bash(...) from allowed-tools (or remove allowed-tools entirely if it only had this)
```

### `Skill(ns:skill-name)` — Claude skill invocation
In Claude, `allowed-tools: Skill(fractary-pi:command-to-prompt)` restricts skill use.

**Pi equivalent:** Reference in skill body as `/skill:ns-skill-name`.

```
Claude allowed-tools:  Skill(fractary-pi:command-to-prompt)
Pi body reference:     Use the /skill:fractary-pi-command-to-prompt skill.
```

---

## 5. Body Content Transformations

### argument-hint → body variables
When a Claude command has `argument-hint`, inject argument variable documentation at the top of the prompt body:

```
argument-hint: '<src-path> <dest-path> [--source <name>]'
```

Becomes (prepended to body):
```
Arguments: $1=src-path $2=dest-path [$@=all args including optional flags]

```

Use `$@` when the hint contains `...` or `[options]` (variable args).
Use `$1`, `$2`, etc. for positional args from the hint.

### Claude-specific prose → Pi prose
Replace Claude-specific tool invocation instructions with pi equivalents:

| Claude Prose Pattern | Pi Replacement |
|---|---|
| `Use the Task tool with agent X` | `Use the /skill:X skill` |
| `Invoke the X agent` | `Use the /skill:X skill` |
| `Use @skill-ns:name` | `Use the /skill:ns-name skill` |
| `@agent-ns:name` | `/skill:ns-name` |

---

## 6. Hooks → Extension Stubs

Claude hooks (`hooks/*.json` + shell scripts) have no direct pi equivalent — pi extensions require TypeScript.

**Conversion approach:** Generate a TypeScript stub file at `extensions/{hook-event}.ts` with:
- Import of the pi extension API
- The original shell script logic as a comment
- `// TODO: implement in TypeScript` marker
- Export of a handler function matching the pi extension interface

**Flag for manual review:** All hook conversions must be flagged in the conversion report as requiring manual TypeScript implementation.

---

## 7. Pi Package Structure

A converted pi package must have:

```
{plugin-name}-pi/
├── package.json          # Required: pi package manifest
├── prompts/              # From Claude commands/
│   └── {ns}-{cmd}.md
├── skills/               # From Claude agents/ and skills/
│   └── {name}/
│       └── SKILL.md
└── extensions/           # From Claude hooks/ (stubs only)
    └── {event}.ts
```

### `package.json` structure
```json
{
  "name": "{plugin-name}-pi",
  "version": "{version from plugin.json}",
  "description": "{description from plugin.json}",
  "keywords": ["pi-package"],
  "pi": {
    "prompts": ["./prompts"],
    "skills": ["./skills"],
    "extensions": ["./extensions"]
  }
}
```

The `extensions` key is only included if hooks were present in the source plugin.

---

## 8. Pi SKILL.md Required Fields

Pi skill files (`skills/{name}/SKILL.md`) must satisfy:
- `name`: required, lowercase letters and hyphens only, 1-64 characters, must exactly match the parent directory name
- `description`: required, string, maximum 1024 characters

Optional fields supported by pi:
- `allowed-tools`: list of tools the skill may use

Fields NOT supported by pi (must be dropped):
- `model`
- `color`
- `memory`
- `argument-hint` (commands only; not valid in skill/agent files)

---

## 9. Out-of-Scope Items

The following require **manual work** after automated conversion:

1. **Hooks → Extensions**: TypeScript stubs are generated but logic must be ported manually
2. **CLI dependency**: Prompts/skills that call `fractary-core` CLI still require the fractary CLI installed in the target project
3. **MCP tool references**: If a Claude agent uses MCP-specific tools, they must be set up separately in the pi project
4. **Custom scripts** (`skills/*/scripts/*.sh`): Shell scripts used by skills are copied as-is; they may work if bash is available, but are not converted to TypeScript

---

## 10. Validation Checklist

Before finalizing a converted component, verify:

**Prompts:**
- [ ] No `model`, `allowed-tools`, `color`, `argument-hint`, `memory` in frontmatter
- [ ] Only `description` in frontmatter
- [ ] Filename uses `-` not `:` from original name
- [ ] `$@`/`$1` vars present if source had `argument-hint`
- [ ] Description ≤ 1024 chars

**Skills (from agents or skills):**
- [ ] `name` field present and matches directory name exactly
- [ ] `description` field present, ≤ 1024 chars
- [ ] No `model` or `color` field
- [ ] `tools` field renamed to `allowed-tools` if present
- [ ] `Task(x)` references replaced with prose `/skill:x` references
- [ ] `Bash(cli ...)` tool restrictions removed (keep prose CLI instructions)

**package.json:**
- [ ] `keywords` includes `"pi-package"`
- [ ] `pi.prompts` points to `./prompts`
- [ ] `pi.skills` points to `./skills`
- [ ] `pi.extensions` present only if hooks existed
