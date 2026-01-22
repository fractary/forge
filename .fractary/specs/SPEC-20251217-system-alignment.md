---
title: Fractary Forge System Alignment Specification
type: infrastructure
status: draft
created: 2025-12-17
version: 1.1.0
summary: Complete alignment specification for all Fractary Forge systems with {noun}-{action} naming convention
tags:
  - alignment
  - naming-conventions
  - feature-parity
  - python-sdk
  - cross-system
---

# Fractary Forge System Alignment Specification

## Executive Summary

This specification defines the complete alignment strategy for all Fractary Forge systems to ensure:
- **Feature Parity**: All systems expose equivalent operations
- **Naming Consistency**: **{noun}-{action}** format where NOUN comes FIRST, then ACTION
- **Proper Prefixing**: `fractary-` prefix where needed to avoid conflicts
- **Python SDK Creation**: New Python SDK matching JavaScript SDK capabilities

## Naming Convention Rule

**CRITICAL**: All operations follow **{noun}-{action}** pattern where the **NOUN comes FIRST**.

Examples:
- ❌ WRONG: `resolveAgent()`, `getAgentInfo()`, `executeTool()`
- ✅ CORRECT: `agentResolve()`, `agentInfoGet()`, `toolExecute()`

## Systems Overview

| System | Current State | Target State |
|--------|---------------|--------------|
| JavaScript SDK | ⚠️ Wrong naming (action-noun) | Rename all to {noun}-{action} |
| Python SDK | ❌ Does not exist | Create with {noun}-{action} |
| CLI | ⚠️ Missing tool-* + some wrong naming | Fix naming + add commands |
| MCP Server | ⚠️ Some {action}_{noun} | Fix to {noun}_{action} |
| Claude Plugin | ❌ Wrong prefix + some wrong naming | Fix prefix + naming |

---

## Complete Operations Alignment Matrix

This table shows every operation with CORRECTED {noun}-{action} naming.

### Legend
- **NONE**: Operation does not exist
- **MISSING**: Should exist but doesn't
- **N/A**: Not applicable
- `→` indicates rename from current to planned

---

### Agent Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Resolve Agent | `agentAPI.resolveAgent()` → `agentAPI.agentResolve()` | NONE → `agent_api.agent_resolve()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Get Agent Info | `agentAPI.getAgentInfo()` → `agentAPI.agentInfoGet()` | NONE → `agent_api.agent_info_get()` | `agent-info` → *no change* ✓ | `fractary_forge_agent_info` → *no change* ✓ | NONE → N/A | NONE → N/A |
| List Agents | `agentAPI.listAgents()` → `agentAPI.agentList()` | NONE → `agent_api.agent_list()` | `agent-list` → *no change* ✓ | `fractary_forge_agent_list` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Check Has Agent | `agentAPI.hasAgent()` → `agentAPI.agentHas()` | NONE → `agent_api.agent_has()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Create Agent | NONE → N/A | NONE → N/A | `agent-create` → *no change* ✓ | NONE → N/A | `fractary-faber-agent:create-agent` → `fractary-forge-agent:agent-create` | NONE → N/A |
| Validate Agent | NONE → N/A | NONE → N/A | `agent-validate` → *no change* ✓ | `fractary_forge_agent_validate` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Health Check | `agentAPI.healthCheck()` → `agentAPI.agentHealthCheck()` | NONE → `agent_api.agent_health_check()` | NONE → MISSING `agent-health-check` | NONE → N/A | NONE → N/A | NONE → N/A |
| Refresh Cache | `agentAPI.refreshCache()` → `agentAPI.agentCacheRefresh()` | NONE → `agent_api.agent_cache_refresh()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Tool Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Resolve Tool | `definitionResolver.resolveTool()` → `definitionResolver.toolResolve()` | NONE → `definition_resolver.tool_resolve()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Execute Tool | `toolAPI.executeTool()` → `toolAPI.toolExecute()` | NONE → `tool_api.tool_execute()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Get Tool Info | `toolAPI.getToolInfo()` → `toolAPI.toolInfoGet()` | NONE → `tool_api.tool_info_get()` | MISSING → `tool-info` ✓ | `fractary_forge_tool_info` → *no change* ✓ | NONE → N/A | NONE → N/A |
| List Tools | `toolAPI.listTools()` → `toolAPI.toolList()` | NONE → `tool_api.tool_list()` | MISSING → `tool-list` ✓ | `fractary_forge_tool_list` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Check Has Tool | `toolAPI.hasTool()` → `toolAPI.toolHas()` | NONE → `tool_api.tool_has()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Create Tool | NONE → N/A | NONE → N/A | MISSING → `tool-create` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Validate Tool | NONE → N/A | NONE → N/A | MISSING → `tool-validate` ✓ | `fractary_forge_tool_validate` → *no change* ✓ | NONE → N/A | NONE → N/A |

---

### Plugin/Registry Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Install Plugin | `installer.installPlugin()` → `installer.pluginInstall()` | NONE → `installer.plugin_install()` | `install` → `plugin-install` (keep `install` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| Uninstall Plugin | `installer.uninstallPlugin()` → `installer.pluginUninstall()` | NONE → `installer.plugin_uninstall()` | `uninstall` → `plugin-uninstall` (keep `uninstall` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| List Plugins | `resolver.listInstalled()` → `resolver.pluginList()` | NONE → `resolver.plugin_list()` | `list` → `plugin-list` (keep `list` as alias) | `fractary_forge_plugin_list` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Get Plugin Info | `resolver.resolvePlugin()` → `resolver.pluginResolve()` or `pluginInfoGet()` | NONE → `resolver.plugin_resolve()` | `info` → `plugin-info` (keep `info` as alias) | `fractary_forge_plugin_info` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Search Plugins | `resolver.search()` → `resolver.pluginSearch()` | NONE → `resolver.plugin_search()` | `search` → `plugin-search` (keep `search` as alias) | `fractary_forge_plugin_search` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Update Plugins | `installer.updatePlugin()` → `installer.pluginUpdate()` | NONE → `installer.plugin_update()` | `update` → `plugin-update` (keep `update` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| Create Plugin | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:create-plugin` → `fractary-forge-agent:plugin-create` | NONE → N/A |

---

### Registry Configuration Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Add Registry | `configManager.addRegistry()` → `configManager.registryAdd()` | NONE → `config_manager.registry_add()` | `registry add` → *no change* ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Remove Registry | `configManager.removeRegistry()` → `configManager.registryRemove()` | NONE → `config_manager.registry_remove()` | `registry remove` → *no change* ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| List Registries | `configManager.listRegistries()` → `configManager.registryList()` | NONE → `config_manager.registry_list()` | `registry list` → *no change* ✓ | `fractary_forge_config_registry_list` → `fractary_forge_registry_list` | NONE → N/A | NONE → N/A |

---

### Configuration Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Get Config | `configManager.getConfig()` → `configManager.configGet()` | NONE → `config_manager.config_get()` | NONE → MISSING `config-get` ✓ | `fractary_forge_config_get` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Show Config | `configManager.showConfig()` → `configManager.configShow()` | NONE → `config_manager.config_show()` | NONE → MISSING `config-show` ✓ | `fractary_forge_config_show` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Load Project Config | `configManager.loadProjectConfig()` → `configManager.configProjectLoad()` | NONE → `config_manager.config_project_load()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Load Global Config | `configManager.loadGlobalConfig()` → `configManager.configGlobalLoad()` | NONE → `config_manager.config_global_load()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Save Project Config | `configManager.saveProjectConfig()` → `configManager.configProjectSave()` | NONE → `config_manager.config_project_save()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Save Global Config | `configManager.saveGlobalConfig()` → `configManager.configGlobalSave()` | NONE → `config_manager.config_global_save()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Init Config | `configManager.initializeDefaults()` → `configManager.configInitialize()` | NONE → `config_manager.config_initialize()` | `init` → `config-init` (keep `init` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Cache Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Clear Cache | `cacheManager.clear()` → `cacheManager.cacheClear()` | NONE → `cache_manager.cache_clear()` | `cache clear` → *no change* ✓ | `fractary_forge_cache_clear` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Get Cache Stats | `cacheManager.getStats()` → `cacheManager.cacheStatsGet()` | NONE → `cache_manager.cache_stats_get()` | `cache stats` → *no change* ✓ | `fractary_forge_cache_stats` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Get Cache Entry | `cacheManager.get()` → `cacheManager.cacheGet()` | NONE → `cache_manager.cache_get()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Set Cache Entry | `cacheManager.set()` → `cacheManager.cacheSet()` | NONE → `cache_manager.cache_set()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Delete Cache Entry | `cacheManager.delete()` → `cacheManager.cacheDelete()` | NONE → `cache_manager.cache_delete()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Enable Cache | `cacheManager.enable()` → `cacheManager.cacheEnable()` | NONE → `cache_manager.cache_enable()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |
| Disable Cache | `cacheManager.disable()` → `cacheManager.cacheDisable()` | NONE → `cache_manager.cache_disable()` | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Fork Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Fork Agent | `forkManager.forkAgent()` → `forkManager.agentFork()` | NONE → `fork_manager.agent_fork()` | `fork` → `agent-fork` or `asset-fork` | NONE → N/A | NONE → N/A | NONE → N/A |
| Fork Tool | `forkManager.forkTool()` → `forkManager.toolFork()` | NONE → `fork_manager.tool_fork()` | `fork` → `tool-fork` or `asset-fork` | NONE → N/A | NONE → N/A | NONE → N/A |
| List Forks | `forkManager.listForks()` → `forkManager.forkList()` | NONE → `fork_manager.fork_list()` | NONE → MISSING `fork-list` ✓ | `fractary_forge_fork_list` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Get Fork Info | `forkManager.getForkInfo()` → `forkManager.forkInfoGet()` | NONE → `fork_manager.fork_info_get()` | NONE → MISSING `fork-info` ✓ | `fractary_forge_fork_info` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Fork Diff | `forkManager.diff()` → `forkManager.forkDiff()` | NONE → `fork_manager.fork_diff()` | NONE → MISSING `fork-diff` ✓ | `fractary_forge_fork_diff` → *no change* ✓ | NONE → N/A | NONE → N/A |
| Check Upstream | `forkManager.checkUpstream()` → `forkManager.upstreamCheck()` | NONE → `fork_manager.upstream_check()` | NONE → MISSING `upstream-check` or `fork-check` ✓ | `fractary_forge_fork_check` → `fractary_forge_upstream_check` | NONE → N/A | NONE → N/A |
| Merge Upstream | `forkManager.mergeUpstream()` → `forkManager.upstreamMerge()` | NONE → `fork_manager.upstream_merge()` | `merge` → `upstream-merge` or `asset-merge` | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Lockfile Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Generate Lockfile | `lockfileManager.generate()` → `lockfileManager.lockfileGenerate()` | NONE → `lockfile_manager.lockfile_generate()` | `lock` → `lockfile-generate` (keep `lock` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| Verify Lockfile | `lockfileManager.verify()` → `lockfileManager.lockfileVerify()` | NONE → `lockfile_manager.lockfile_verify()` | NONE → MISSING `lockfile-verify` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Check Updates | `updateChecker.checkUpdates()` → `updateChecker.updatesCheck()` | NONE → `update_checker.updates_check()` | `update` → `updates-check` or `plugin-updates-check` | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Export Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Export Agent | `exporter.exportAgent()` → `exporter.agentExport()` | NONE → `exporter.agent_export()` | NONE → MISSING `agent-export` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Export Tool | `exporter.exportTool()` → `exporter.toolExport()` | NONE → `exporter.tool_export()` | NONE → MISSING `tool-export` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Export to LangChain | `langchainExporter.export()` → `langchainExporter.langchainExport()` | NONE → `langchain_exporter.langchain_export()` | NONE → MISSING `export-langchain` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Export to Claude | `claudeExporter.export()` → `claudeExporter.claudeExport()` | NONE → `claude_exporter.claude_export()` | NONE → MISSING `export-claude` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |
| Export to n8n | `n8nExporter.export()` → `n8nExporter.n8nExport()` | NONE → `n8n_exporter.n8n_export()` | NONE → MISSING `export-n8n` ✓ | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Authentication Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Login | NONE → N/A | NONE → N/A | `login` → `auth-login` (keep `login` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| Logout | NONE → N/A | NONE → N/A | `logout` → `auth-logout` (keep `logout` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |
| Who Am I | NONE → N/A | NONE → N/A | `whoami` → `auth-whoami` (keep `whoami` as alias) | NONE → N/A | NONE → N/A | NONE → N/A |

---

### Claude Plugin Command Operations

| Operation | JS SDK (Current → Planned) | Python SDK (Current → Planned) | CLI (Current → Planned) | MCP (Current → Planned) | Plugin Command (Current → Planned) | Plugin Skill (Current → Planned) |
|-----------|---------------------------|-------------------------------|------------------------|------------------------|-----------------------------------|--------------------------------|
| Audit Project | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:audit-project` → `fractary-forge-agent:project-audit` | NONE → N/A |
| Create Agent | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:create-agent` → `fractary-forge-agent:agent-create` | NONE → N/A |
| Create Command | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:create-command` → `fractary-forge-agent:command-create` | NONE → N/A |
| Create Plugin | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:create-plugin` → `fractary-forge-agent:plugin-create` | NONE → N/A |
| Create Skill | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `fractary-faber-agent:create-skill` → `fractary-forge-agent:skill-create` | NONE → N/A |
| Create Workflow | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `create-workflow` → `fractary-forge-agent:workflow-create` | NONE → N/A |
| Generate Conversion Spec | NONE → N/A | NONE → N/A | NONE → N/A | NONE → N/A | `generate-conversion-spec` → `fractary-forge-agent:conversion-spec-generate` | NONE → N/A |

---

### Claude Plugin Skill Operations

| Operation | JS SDK | Python SDK | CLI | MCP | Plugin Command | Plugin Skill (Current → Planned) |
|-----------|--------|------------|-----|-----|----------------|--------------------------------|
| Analyze Agent Chain | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:agent-chain-analyzer` → `@skill-fractary-forge-agent:agent-chain-analyzer` ✓ |
| Validate Architecture | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:architecture-validator` → `@skill-fractary-forge-agent:architecture-validator` ✓ |
| Optimize Context | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:context-optimizer` → `@skill-fractary-forge-agent:context-optimizer` ✓ |
| Generate Conversion Spec | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:conversion-spec-generator` → `@skill-fractary-forge-agent:spec-conversion-generate` |
| Analyze Gaps | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:gap-analyzer` → `@skill-fractary-forge-agent:gap-analyzer` ✓ |
| Gather Requirements | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:gather-requirements` → `@skill-fractary-forge-agent:requirements-gather` |
| Generate from Template | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:generate-from-template` → `@skill-fractary-forge-agent:template-generate` |
| Detect Hybrid Agent | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:hybrid-agent-detector` → `@skill-fractary-forge-agent:agent-hybrid-detect` |
| Analyze Project | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:project-analyzer` → `@skill-fractary-forge-agent:project-analyzer` ✓ |
| Extract Script | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:script-extractor` → `@skill-fractary-forge-agent:script-extractor` ✓ |
| Generate Spec | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:spec-generator` → `@skill-fractary-forge-agent:spec-generator` ✓ |
| Validate Artifact | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:validate-artifact` → `@skill-fractary-forge-agent:artifact-validate` |
| Design Workflow | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:workflow-designer` → `@skill-fractary-forge-agent:workflow-designer` ✓ |
| Validate Workflow | N/A | N/A | N/A | N/A | N/A | `@skill-fractary-faber-agent:workflow-validator` → `@skill-fractary-forge-agent:workflow-validator` ✓ |

---

### Claude Plugin Agent Operations

| Operation | JS SDK | Python SDK | CLI | MCP | Plugin Command | Plugin Agent (Current → Planned) |
|-----------|--------|------------|-----|-----|----------------|--------------------------------|
| Agent Creator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:agent-creator` → `@agent-fractary-forge-agent:agent-creator` ✓ |
| Command Creator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:command-creator` → `@agent-fractary-forge-agent:command-creator` ✓ |
| Conversion Spec Generator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:conversion-spec-generator` → `@agent-fractary-forge-agent:spec-conversion-generator` |
| Plugin Creator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:plugin-creator` → `@agent-fractary-forge-agent:plugin-creator` ✓ |
| Project Auditor | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:project-auditor` → `@agent-fractary-forge-agent:project-auditor` ✓ |
| Skill Creator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:skill-creator` → `@agent-fractary-forge-agent:skill-creator` ✓ |
| Workflow Creator | N/A | N/A | N/A | N/A | N/A | `@agent-fractary-faber-agent:workflow-creator` → `@agent-fractary-forge-agent:workflow-creator` ✓ |

---

## Naming Convention Matrix (CORRECTED)

| System | Pattern | Format | Prefix | Example |
|--------|---------|--------|--------|---------|
| **JS SDK Methods** | {noun}{Action} | camelCase | No prefix | `agentResolve()`, `toolExecute()`, `cacheRefresh()` |
| **Python SDK Methods** | {noun}_{action} | snake_case | No prefix | `agent_resolve()`, `tool_execute()`, `cache_refresh()` |
| **CLI Commands** | {noun}-{action} | kebab-case | Binary: `fractary-forge` | `agent-create`, `tool-list`, `cache-clear` |
| **MCP Tools** | fractary_forge_{noun}_{action} | snake_case | `fractary_forge_` | `fractary_forge_agent_list`, `fractary_forge_tool_info` |
| **Plugin Commands** | fractary-forge-agent:{noun}-{action} | kebab-case | `fractary-forge-agent:` | `fractary-forge-agent:agent-create` |
| **Plugin Skills** | @skill-fractary-forge-agent:{noun}-{action} | kebab-case | `@skill-fractary-forge-agent:` | `@skill-fractary-forge-agent:project-analyzer` |
| **Plugin Agents** | @agent-fractary-forge-agent:{noun}-{action} | kebab-case | `@agent-fractary-forge-agent:` | `@agent-fractary-forge-agent:agent-creator` |

---

## Implementation Impact

### JavaScript SDK: MAJOR BREAKING CHANGES
All ~100+ methods need renaming:
- `agentAPI.resolveAgent()` → `agentAPI.agentResolve()`
- `toolAPI.executeTool()` → `toolAPI.toolExecute()`
- `cacheManager.clear()` → `cacheManager.cacheClear()`
- `forkManager.forkAgent()` → `forkManager.agentFork()`
- etc.

### Python SDK: Create with correct naming from start
- `agent_api.agent_resolve()`
- `tool_api.tool_execute()`
- `cache_manager.cache_clear()`
- etc.

### CLI: Add missing commands, rename some
- ADD: `tool-create`, `tool-info`, `tool-list`, `tool-validate` ✓
- RENAME: `install` → `plugin-install` (keep alias)
- RENAME: `lock` → `lockfile-generate` (keep alias)
- etc.

### MCP Server: Minor renames
- `fractary_forge_config_registry_list` → `fractary_forge_registry_list`
- `fractary_forge_fork_check` → `fractary_forge_upstream_check`
- Most already follow {noun}_{action} ✓

### Claude Plugin: Prefix fix + name reordering
- CRITICAL: `fractary-faber-agent` → `fractary-forge-agent` (80+ files)
- RENAME: `create-agent` → `agent-create`
- RENAME: `audit-project` → `project-audit`
- etc.

---

## Critical Files for Renaming

### JavaScript SDK (~106 files affected)
```
/mnt/c/GitHub/fractary/forge/sdk/js/src/definitions/api/agent-api.ts
/mnt/c/GitHub/fractary/forge/sdk/js/src/definitions/api/tool-api.ts
/mnt/c/GitHub/fractary/forge/sdk/js/src/registry/installer.ts
/mnt/c/GitHub/fractary/forge/sdk/js/src/registry/resolver.ts
/mnt/c/GitHub/fractary/forge/sdk/js/src/cache/manager.ts
/mnt/c/GitHub/fractary/forge/sdk/js/src/definitions/registry/fork/fork-manager.ts
... and all other manager/API classes
```

### CLI Commands
```
/mnt/c/GitHub/fractary/forge/cli/src/commands/agent/*.ts
/mnt/c/GitHub/fractary/forge/cli/src/commands/tool/*.ts (new)
/mnt/c/GitHub/fractary/forge/cli/src/commands/registry/*.ts
/mnt/c/GitHub/fractary/forge/cli/src/index.ts
```

### MCP Server
```
/mnt/c/GitHub/fractary/forge/mcp/server/src/tools/config.ts
/mnt/c/GitHub/fractary/forge/mcp/server/src/tools/fork.ts
```

### Claude Plugin (80+ files)
```
/mnt/c/GitHub/fractary/forge/plugins/forge-agent/.claude-plugin/plugin.json
/mnt/c/GitHub/fractary/forge/plugins/forge-agent/commands/*.md (7 files)
/mnt/c/GitHub/fractary/forge/plugins/forge-agent/agents/*.md (7 files)
/mnt/c/GitHub/fractary/forge/plugins/forge-agent/skills/*/SKILL.md (13 files)
/mnt/c/GitHub/fractary/forge/plugins/forge-agent/docs/**/*.md (~50 files)
```

---

## Version Strategy (UPDATED)

| System | Current | Target | Change Type |
|--------|---------|--------|-------------|
| JavaScript SDK | v1.1.3 | **v2.0.0** | **MAJOR (BREAKING)** |
| Python SDK | N/A | v1.0.0 | Initial release |
| CLI | v1.1.x | **v2.0.0** | **MAJOR (BREAKING)** |
| MCP Server | v1.0.0 | **v2.0.0** | **MAJOR (BREAKING)** |
| Claude Plugin | v1.x | **v2.0.0** | **MAJOR (BREAKING)** |

**All systems require v2.0.0 due to breaking naming changes.**

---

## Migration Guide

### JavaScript SDK Migration
```javascript
// OLD (v1.x)
const agent = await agentAPI.resolveAgent('my-agent');
const info = await agentAPI.getAgentInfo('my-agent');
await toolAPI.executeTool('my-tool', params);
await cacheManager.clear();

// NEW (v2.0)
const agent = await agentAPI.agentResolve('my-agent');
const info = await agentAPI.agentInfoGet('my-agent');
await toolAPI.toolExecute('my-tool', params);
await cacheManager.cacheClear();
```

### CLI Migration
```bash
# OLD (v1.x)
fractary-forge agent-create myagent
fractary-forge install myplugin
fractary-forge lock

# NEW (v2.0) - preferred
fractary-forge agent-create myagent  # Already correct!
fractary-forge plugin-install myplugin
fractary-forge lockfile-generate

# Aliases still work
fractary-forge install myplugin      # Still works
fractary-forge lock                  # Still works
```

### Claude Plugin Migration
```bash
# Find and replace in your projects
find . -name "*.md" -exec sed -i 's/fractary-faber-agent/fractary-forge-agent/g' {} \;
find . -name "*.md" -exec sed -i 's/:create-agent/:agent-create/g' {} \;
find . -name "*.md" -exec sed -i 's/:audit-project/:project-audit/g' {} \;
```

---

## Success Metrics

1. ✅ ALL operations follow **{noun}-{action}** pattern
2. ✅ All Claude plugin references use `fractary-forge-agent`
3. ✅ CLI has complete tool-* commands
4. ✅ Python SDK has 100% feature parity with JS SDK
5. ✅ All systems use consistent naming conventions
6. ✅ Comprehensive migration guides provided
7. ✅ Breaking changes clearly documented

---

## Timeline

- **Week 1**: Fix Claude plugin prefix + command name reordering
- **Weeks 2-3**: Rename ALL JavaScript SDK methods (~100+ methods)
- **Weeks 4-9**: Create Python SDK with correct naming
- **Week 10**: Update CLI commands and add missing ones
- **Week 11**: Update MCP server tool names
- **Week 12**: Testing, documentation, migration guides
- **Total**: 12 weeks for complete alignment
