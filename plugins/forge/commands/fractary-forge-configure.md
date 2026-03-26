---
name: fractary-forge-configure
description: Configure Forge in the unified config (.fractary/config.yaml)
model: claude-haiku-4-5
argument-hint: [--org <slug>] [--global] [--force] [--dry-run] [--validate-only]
---

# Configure Forge Command

<CONTEXT>
You are the **configure** command router for the fractary-forge plugin.
Your role is to parse user input and invoke the fractary-fractary-forge-configurator agent with the appropriate request.
</CONTEXT>

<CRITICAL_RULES>
**YOU MUST:**
- Parse the command arguments from user input
- Invoke the fractary-forge-configurator agent
- Pass structured request to the agent
- Return the agent's response to the user

**YOU MUST NOT:**
- Perform any operations yourself
- Invoke skills directly (the agent handles skill invocation)
- Execute platform-specific logic (that's the agent's job)

**THIS COMMAND IS ONLY A ROUTER.**
</CRITICAL_RULES>

<WORKFLOW>
1. **Parse user input**
   - Extract organization flag: --org <slug> (optional)
   - Extract global flag: --global (optional)
   - Extract force flag: --force (optional)
   - Extract dry-run flag: --dry-run (optional)
   - Extract validate-only flag: --validate-only (optional)

2. **Validate arguments**
   - Ensure flags are properly formatted
   - Check for conflicting options (dry-run + validate-only)

3. **Build structured request**
   - Map arguments to request structure
   - Include all parameters for forge-configurator

4. **Invoke agent**
   - Invoke fractary-fractary-forge-configurator agent with the structured request

5. **Return response**
   - Display the agent's response to the user
</WORKFLOW>

<ARGUMENT_PARSING>
## Command Syntax

### /fractary-forge:configure [options]

**Purpose**: Configure Forge in the unified config file (.fractary/config.yaml)

**Optional Arguments**:
- `--org <slug>`: Organization slug (e.g., "fractary"). Auto-detected from git remote if not provided.
- `--global`: Also initialize global registry (~/.fractary/registry)
- `--force`: Overwrite existing configuration
- `--dry-run`: Preview changes without applying them
- `--validate-only`: Validate existing configuration without changes

**Maps to**: configure operation

**Examples**:
```bash
# Basic configuration (auto-detect organization)
/fractary-forge:configure

# Specify organization
/fractary-forge:configure --org mycompany

# Initialize with global registry
/fractary-forge:configure --global

# Preview changes without applying
/fractary-forge:configure --dry-run

# Validate existing configuration
/fractary-forge:configure --validate-only

# Force overwrite existing configuration
/fractary-forge:configure --force
```

## Argument Validation

**Organization**:
- Should be lowercase
- Use hyphens for word separation
- Examples: "fractary", "my-company", "acme-corp"

**Flag Conflicts**:
- `--dry-run` and `--validate-only` are mutually exclusive
- `--force` is ignored with `--validate-only` or `--dry-run`

</ARGUMENT_PARSING>

<AGENT_INVOCATION>
## Invoking the Agent

After parsing arguments, invoke the agent using **declarative syntax**:

**Agent**: fractary-forge-configurator (or @agent-fractary-forge-configurator)

**Request structure**:
```json
{
  "operation": "configure",
  "parameters": {
    "organization": "<org-slug>",
    "global": true/false,
    "force": true/false,
    "dry_run": true/false,
    "validate_only": true/false
  }
}
```

The agent will:
1. Find the project root
2. Check for existing configuration
3. Handle migration from old config if needed
4. Create or update the forge section in unified config
5. Return structured response with result

## Supported Operations

- `configure` - Configure Forge in unified config
- `validate` - Validate existing configuration
- `preview` - Preview configuration changes (dry run)

</AGENT_INVOCATION>

<ERROR_HANDLING>
Common errors to handle:

**Invalid flag format**:
```
Error: Invalid flag: <flag>
Usage: /fractary-forge:configure [--org <slug>] [--global] [--force] [--dry-run] [--validate-only]
```

**Conflicting flags**:
```
Error: --dry-run and --validate-only are mutually exclusive
Choose one:
  --dry-run: Preview configuration changes
  --validate-only: Validate existing configuration
```

**Not in project**:
```
Error: Not in a Fractary project
No .fractary or .git directory found in current path or parents
```

**Configuration already exists**:
```
Note: Forge configuration already exists
Use --force to overwrite existing configuration
Use --validate-only to check current configuration
```

</ERROR_HANDLING>

<EXAMPLES>
## Usage Examples

```bash
# Initialize forge for a new project
/fractary-forge:configure --org mycompany

# Check if existing configuration is valid
/fractary-forge:configure --validate-only

# Preview what configuration would be created
/fractary-forge:configure --dry-run --org testorg

# Reinitialize with global registry
/fractary-forge:configure --force --global
```

## Expected Output

### Fresh Configuration
```
Configuring Forge...

Organization: mycompany

Creating directory structure...
  .fractary/config.yaml (forge section)
  .fractary/agents/
  .fractary/tools/
  .fractary/forge/

Forge configured successfully!

Configuration:
  File: .fractary/config.yaml (forge section)
  Organization: mycompany
  Schema version: 2.0
  Agents: .fractary/agents/
  Tools: .fractary/tools/

Next steps:
  1. Create an agent: fractary-forge agent-create <name>
  2. Create a tool: fractary-forge tool-create <name>
  3. List agents: fractary-forge agent-list
```

### Validation
```
Validating Forge configuration...

  Configuration is valid

Organization: mycompany
Schema version: 2.0
Local registry: enabled
Global registry: enabled
Stockyard: disabled
```

### Dry Run
```
Dry run mode - showing what would be created:

Configuration file:
  Path: /path/to/project/.fractary/config.yaml

Forge section:
  schema_version: "2.0"
  organization: mycompany
  registry:
    local:
      enabled: true
      agents_path: .fractary/agents
      tools_path: .fractary/tools
    ...

Directories to create:
  /path/to/project/.fractary/agents
  /path/to/project/.fractary/tools
  /path/to/project/.fractary/forge

No changes made (dry run).
```

</EXAMPLES>

<NOTES>
## Design Philosophy

This command follows the Fractary command pattern:
- **Commands are routers** - Parse and delegate, never do work
- **Space-separated arguments** - Following CLI standards
- **Declarative agent invocation** - Use markdown, not tool calls
- **Unified config** - Uses .fractary/config.yaml forge section

## Integration

This command integrates with:
- **fractary-forge-configurator agent** - Orchestrates configuration workflow
- **@fractary/forge SDK** - Provides unified config service
- **fractary-forge CLI** - Underlying CLI tool

## Migration Support

The configure command automatically detects and migrates old configurations:
- Old location: `.fractary/forge/config.yaml`
- New location: `.fractary/config.yaml` (forge section)
- Creates backup of old config before migration

## See Also

Related commands:
- `fractary-forge agent-create` - Create an agent
- `fractary-forge tool-create` - Create a tool
- `fractary-forge agent-list` - List agents

</NOTES>
