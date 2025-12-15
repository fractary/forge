# SPEC-FORGE-001-IMPLEMENTATION: Agent & Tool Definition System - Forge SDK Implementation

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-14 |
| **Updated** | 2025-12-14 |
| **Author** | Implementation Team |
| **Project** | `@fractary/forge` |
| **Parent Spec** | SPEC-FORGE-001 |
| **Related** | SPEC-FORGE-002, SPEC-000001 |
| **Phase** | Phase 1: Foundation |

---

## Changelog

### 2025-12-14 - Refinement Round 1

**Questions Resolved:**

1. **Agent Invocation Return Type**: Added `structured_output` field to `AgentResult` interface for JSON/object returns while keeping `output: string` for backward compatibility.

2. **Tool Execution Timeout**: Return partial result with `timeout: true` flag in `ToolResult` when execution exceeds time limit.

3. **Prompt Caching Invalidation**: Implement TTL per source with manual refresh via `forge.refreshCache()` method.

4. **Version Constraint Syntax**: Full npm semver range syntax support (^, ~, >=, ||, etc.) using the `semver` package.

5. **Multi-Provider Tool Compatibility**: Unified tool format with provider-specific adapters (tools defined once, adapted per LLM provider).

**Suggestions Applied:**

1. **Health Check API**: Added `AgentAPI.healthCheck(name)` method for CI/CD validation of agent availability and configuration.

2. **Tool Chaining**: Added `depends_on` field in tool definitions for pipeline orchestration and dependency resolution.

3. **Definition Inheritance**: Added `extends` field for agent/tool definitions to enable inheritance and reduce duplication.

---

## 1. Executive Summary

This specification provides **concrete implementation guidance** for building the Agent & Tool Definition System within the `@fractary/forge` SDK. It references [SPEC-FORGE-001](./SPEC-FORGE-001-agent-tool-definition-system.md) as the architectural blueprint and adapts it to the existing Forge SDK codebase structure, patterns, and infrastructure.

### 1.1 Relationship to SPEC-FORGE-001

```
┌─────────────────────────────────────────────────────────┐
│  SPEC-FORGE-001: Architecture & Vision                  │
│  - YAML schema definitions                              │
│  - Conceptual registry architecture                     │
│  - LangChain integration approach                       │
│  - Generic TypeScript interfaces                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Implements
                  ▼
┌─────────────────────────────────────────────────────────┐
│  SPEC-FORGE-001-IMPLEMENTATION (this document)          │
│  - Concrete file structure within Forge SDK             │
│  - Integration with existing Forge infrastructure       │
│  - Specific implementation patterns                     │
│  - Detailed task breakdown                              │
│  - Testing strategy for this codebase                   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Integration with Existing Forge SDK

The Forge SDK currently provides:

```
src/
├── resolvers/        # Asset resolution (GitHub, Catalog, Local)
├── cache/            # CacheManager for asset caching
├── config/           # ConfigManager for configuration
├── errors/           # ForgeError with error codes
├── logger/           # Centralized logger
├── fs/               # File system utilities
└── types/            # Type definitions
```

**Key Integration Points:**
1. **Reuse existing infrastructure** (logger, errors, fs utils)
2. **Extend resolver pattern** (agents/tools as new asset types)
3. **Leverage existing cache** (or extend CacheManager)
4. **Follow established patterns** (error codes, exports, interfaces)

## 2. Directory Structure

### 2.1 New Module: `src/definitions/`

```
src/definitions/
├── schemas/                      # Type definitions & Zod validation
│   ├── common.ts                # LLMConfig, CachingConfig, shared types
│   ├── tool.ts                  # ToolDefinition, ToolParameter
│   ├── agent.ts                 # AgentDefinition
│   ├── validation.ts            # Validation error types
│   └── index.ts                 # Barrel exports
│
├── loaders/                      # YAML loading & parsing
│   ├── yaml-loader.ts           # Load YAML from file system
│   ├── validator.ts             # Zod-based schema validation
│   ├── parser.ts                # Parse and normalize definitions
│   ├── inheritance.ts           # Definition inheritance resolver
│   └── index.ts
│
├── registry/                     # Agent/tool discovery & resolution
│   ├── resolver.ts              # DefinitionResolver (3-tier)
│   ├── cache.ts                 # DefinitionCache (in-memory)
│   ├── lockfile.ts              # LockfileManager
│   ├── manifest.ts              # ManifestManager
│   ├── types.ts                 # Registry-specific types
│   └── index.ts
│
├── factory/                      # Agent instantiation
│   ├── agent-factory.ts         # AgentFactory class
│   ├── langchain.ts             # LangChain integration
│   ├── executable-agent.ts      # ExecutableAgent implementation
│   ├── tool-adapters/           # Provider-specific tool adapters
│   │   ├── anthropic.ts         # Anthropic tool format adapter
│   │   ├── openai.ts            # OpenAI tool format adapter
│   │   └── google.ts            # Google tool format adapter
│   └── index.ts
│
├── executor/                     # Tool execution
│   ├── tool-executor.ts         # Base ToolExecutor class
│   ├── dependency-resolver.ts   # Tool dependency resolution (depends_on)
│   ├── implementations/
│   │   ├── bash.ts              # BashExecutor
│   │   ├── python.ts            # PythonExecutor
│   │   └── http.ts              # HTTPExecutor
│   ├── sandbox.ts               # Sandboxing utilities
│   └── index.ts
│
├── caching/                      # Prompt caching support
│   ├── cache-resolver.ts        # Resolve cache sources
│   ├── cache-manager.ts         # TTL-based cache invalidation
│   ├── source-handlers/
│   │   ├── file.ts              # File source handler
│   │   ├── glob.ts              # Glob source handler
│   │   ├── inline.ts            # Inline source handler
│   │   └── codex.ts             # Codex source handler (optional)
│   └── index.ts
│
├── errors/                       # Definition-specific errors
│   ├── codes.ts                 # Error codes (extends ErrorCode)
│   └── index.ts
│
├── api.ts                        # Public API (AgentAPI, ToolAPI)
├── types.ts                      # Public type exports
└── index.ts                      # Module exports
```

### 2.2 File System Locations (Runtime)

Following SPEC-FORGE-001:

```
# Project-local definitions
<project-root>/.fractary/
├── agents/
│   └── *.yaml
├── tools/
│   └── *.yaml
└── plugins/
    └── forge/
        ├── config.json
        └── lockfile.json

# Global registry
~/.fractary/
├── registry/
│   ├── agents/
│   │   └── *@*.yaml
│   ├── tools/
│   │   └── *@*.yaml
│   └── manifests/
│       └── *.json
└── cache/
    └── definitions/
```

## 3. Implementation Patterns

### 3.1 Error Handling Pattern

**Extend existing `ErrorCode` enum:**

```typescript
// src/definitions/errors/codes.ts
import { ErrorCode as BaseErrorCode } from '../../errors';

export const DefinitionErrorCode = {
  ...BaseErrorCode,

  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND' as const,
  AGENT_INVALID: 'AGENT_INVALID' as const,
  AGENT_LOAD_FAILED: 'AGENT_LOAD_FAILED' as const,
  AGENT_HEALTH_CHECK_FAILED: 'AGENT_HEALTH_CHECK_FAILED' as const,

  // Tool errors
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND' as const,
  TOOL_INVALID: 'TOOL_INVALID' as const,
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED' as const,
  TOOL_EXECUTION_TIMEOUT: 'TOOL_EXECUTION_TIMEOUT' as const,
  TOOL_DEPENDENCY_CYCLE: 'TOOL_DEPENDENCY_CYCLE' as const,
  TOOL_DEPENDENCY_NOT_FOUND: 'TOOL_DEPENDENCY_NOT_FOUND' as const,

  // Registry errors
  DEFINITION_NOT_FOUND: 'DEFINITION_NOT_FOUND' as const,
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND' as const,
  LOCKFILE_INVALID: 'LOCKFILE_INVALID' as const,

  // Validation errors
  YAML_PARSE_ERROR: 'YAML_PARSE_ERROR' as const,
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR' as const,

  // Inheritance errors
  INHERITANCE_CYCLE: 'INHERITANCE_CYCLE' as const,
  INHERITANCE_BASE_NOT_FOUND: 'INHERITANCE_BASE_NOT_FOUND' as const,
};

export type DefinitionErrorCode = typeof DefinitionErrorCode[keyof typeof DefinitionErrorCode];
```

**Usage:**

```typescript
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from './codes';

throw new ForgeError(
  DefinitionErrorCode.AGENT_NOT_FOUND,
  `Agent '${name}' not found in any registry`,
  { name, searchPaths: [localPath, globalPath] }
);
```

### 3.2 Logging Pattern

**Use existing logger:**

```typescript
// src/definitions/registry/resolver.ts
import { logger } from '../../logger';

export class DefinitionResolver {
  async resolve(name: string): Promise<ResolvedAgent> {
    logger.info(`Resolving agent: ${name}`);

    // Check local
    const local = await this.checkLocal(name);
    if (local) {
      logger.debug(`Resolved ${name} from project-local registry`);
      return local;
    }

    // Check global
    logger.debug(`Agent ${name} not found locally, checking global registry`);
    const global = await this.checkGlobal(name);

    // ...
  }
}
```

### 3.3 Configuration Pattern

**Extend existing `ForgeConfig`:**

```typescript
// src/types/config.ts (extend existing)
export interface ForgeConfig {
  // ... existing config fields ...

  // New: Definition system config
  definitions?: {
    registry?: {
      local?: {
        enabled: boolean;
        paths: string[];
      };
      global?: {
        enabled: boolean;
        path: string;
      };
      stockyard?: {
        enabled: boolean;
        url: string;
        apiKey?: string;
      };
    };
    caching?: {
      enabled: boolean;
      defaultTtl: number;  // Default TTL in seconds
      sourceTtls?: {       // Per-source TTL overrides
        file?: number;
        glob?: number;
        codex?: number;
        inline?: number;
      };
    };
    validation?: {
      strict: boolean;
      warnOnMissingTools: boolean;
    };
    execution?: {
      defaultTimeout: number;  // Default tool execution timeout in ms
    };
  };
}
```

**Load using existing ConfigManager:**

```typescript
// src/definitions/registry/resolver.ts
import { configManager } from '../../config';

export class DefinitionResolver {
  constructor() {
    const config = configManager.getConfig();
    this.registryConfig = config.definitions?.registry || getDefaultRegistryConfig();
  }
}
```

### 3.4 Resolver Pattern

**Follow existing `IResolver` pattern:**

```typescript
// src/definitions/registry/types.ts
export interface IDefinitionResolver {
  name: string;
  canResolve(identifier: string): boolean;
  resolveAgent(identifier: string): Promise<ResolvedAgent | null>;
  resolveTool(identifier: string): Promise<ResolvedTool | null>;
}

// Implementations
export class LocalDefinitionResolver implements IDefinitionResolver {
  name = 'local';
  // ...
}

export class GlobalDefinitionResolver implements IDefinitionResolver {
  name = 'global';
  // ...
}

export class StockyardDefinitionResolver implements IDefinitionResolver {
  name = 'stockyard';
  // ...
}
```

### 3.5 Export Pattern

**Barrel exports following existing pattern:**

```typescript
// src/definitions/index.ts
export { AgentAPI, ToolAPI } from './api';

export type {
  AgentDefinition,
  ToolDefinition,
  LLMConfig,
  CachingConfig,
  ExecutableAgent,
  ExecutableTool,
  AgentResult,
  ToolResult,
  HealthCheckResult,
} from './types';

export { DefinitionResolver } from './registry';
export { AgentFactory } from './factory';
export { ToolExecutor } from './executor';

// Error codes
export { DefinitionErrorCode } from './errors';
```

**Update main `src/index.ts`:**

```typescript
// src/index.ts (add to existing exports)

// Definition system exports
export {
  AgentAPI,
  ToolAPI,
  DefinitionResolver,
  AgentFactory,
  ToolExecutor,
} from './definitions';

export type {
  AgentDefinition,
  ToolDefinition,
  LLMConfig,
  CachingConfig,
  ExecutableAgent,
  ExecutableTool,
  AgentResult,
  ToolResult,
  HealthCheckResult,
} from './definitions';

export { DefinitionErrorCode } from './definitions/errors';
```

**Update `package.json` exports:**

```json
{
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./definitions": {
      "require": "./dist/definitions/index.js",
      "types": "./dist/definitions/index.d.ts"
    }
  }
}
```

## 4. Core Implementation Details

### 4.1 Schema Validation with Zod

**Why Zod?**
- Runtime type validation
- TypeScript type inference
- Detailed error messages
- Composable schemas

**Example: Tool Parameter Schema with depends_on support**

```typescript
// src/definitions/schemas/tool.ts
import { z } from 'zod';

export const ToolParameterSchema = z.object({
  type: z.enum(['string', 'integer', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean(),
  default: z.any().optional(),
  enum: z.array(z.any()).optional(),
  properties: z.lazy(() => z.record(ToolParameterSchema)).optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\-_]+$/),
  type: z.literal('tool'),
  description: z.string(),
  
  // NEW: Definition inheritance support
  extends: z.string().optional(),  // Base tool to inherit from
  
  parameters: z.record(ToolParameterSchema),
  
  // NEW: Tool chaining/dependency support
  depends_on: z.array(z.string()).optional(),  // Tools that must run before this one
  
  implementation: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('bash'),
      bash: z.object({
        command: z.string(),
        sandbox: z.object({
          enabled: z.boolean(),
          allowlisted_commands: z.array(z.string()).optional(),
          network_access: z.boolean().optional(),
          max_execution_time: z.number().optional(),
          env_vars: z.array(z.string()).optional(),
        }).optional(),
      }),
    }),
    z.object({
      type: z.literal('python'),
      python: z.object({
        module: z.string(),
        function: z.string(),
      }),
    }),
    z.object({
      type: z.literal('http'),
      http: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        url: z.string().url(),
        headers: z.record(z.string()).optional(),
        body_template: z.string().optional(),
      }),
    }),
  ]),
  output: z.record(z.any()).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
```

**Agent Definition Schema with extends support:**

```typescript
// src/definitions/schemas/agent.ts
import { z } from 'zod';
import { LLMConfigSchema, CachingConfigSchema } from './common';
import { ToolDefinitionSchema } from './tool';

export const AgentDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\-_:]+$/),
  type: z.literal('agent'),
  description: z.string(),
  
  // NEW: Definition inheritance support
  extends: z.string().optional(),  // Base agent to inherit from
  
  // LLM configuration
  llm: LLMConfigSchema,
  
  // System prompt
  system_prompt: z.string(),
  
  // Tools
  tools: z.array(z.string()),
  custom_tools: z.array(ToolDefinitionSchema).optional(),
  
  // Prompt caching
  caching: CachingConfigSchema.optional(),
  
  // Additional configuration
  config: z.record(z.any()).optional(),
  
  // Metadata
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
```

**Validation Usage:**

```typescript
// src/definitions/loaders/validator.ts
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import { ToolDefinitionSchema } from '../schemas/tool';

export class DefinitionValidator {
  validateTool(data: unknown): ToolDefinition {
    try {
      return ToolDefinitionSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ForgeError(
          DefinitionErrorCode.SCHEMA_VALIDATION_ERROR,
          'Tool definition validation failed',
          { errors: error.errors }
        );
      }
      throw error;
    }
  }
}
```

### 4.2 Definition Inheritance System

**Resolve extends field for agents/tools:**

```typescript
// src/definitions/loaders/inheritance.ts
import { logger } from '../../logger';
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import { AgentDefinition, ToolDefinition } from '../schemas';
import { DefinitionResolver } from '../registry';

export class InheritanceResolver {
  private resolver: DefinitionResolver;
  private resolutionStack: Set<string> = new Set();

  constructor(resolver: DefinitionResolver) {
    this.resolver = resolver;
  }

  async resolveAgent(definition: AgentDefinition): Promise<AgentDefinition> {
    if (!definition.extends) {
      return definition;
    }

    // Detect cycles
    if (this.resolutionStack.has(definition.name)) {
      throw new ForgeError(
        DefinitionErrorCode.INHERITANCE_CYCLE,
        `Circular inheritance detected: ${Array.from(this.resolutionStack).join(' -> ')} -> ${definition.name}`,
        { cycle: Array.from(this.resolutionStack), current: definition.name }
      );
    }

    this.resolutionStack.add(definition.name);

    try {
      // Resolve base agent
      const baseAgent = await this.resolver.resolveAgent(definition.extends);
      if (!baseAgent) {
        throw new ForgeError(
          DefinitionErrorCode.INHERITANCE_BASE_NOT_FOUND,
          `Base agent '${definition.extends}' not found for '${definition.name}'`,
          { base: definition.extends, child: definition.name }
        );
      }

      // Recursively resolve base's extends
      const resolvedBase = await this.resolveAgent(baseAgent.definition);

      // Merge: child overrides base
      return this.mergeAgentDefinitions(resolvedBase, definition);
    } finally {
      this.resolutionStack.delete(definition.name);
    }
  }

  private mergeAgentDefinitions(
    base: AgentDefinition,
    child: AgentDefinition
  ): AgentDefinition {
    return {
      ...base,
      ...child,
      // Merge tools arrays (child additions + base tools)
      tools: [...new Set([...(base.tools || []), ...(child.tools || [])])],
      // Merge custom_tools (child can override by name)
      custom_tools: this.mergeCustomTools(base.custom_tools, child.custom_tools),
      // Merge config objects deeply
      config: { ...(base.config || {}), ...(child.config || {}) },
      // Merge tags
      tags: [...new Set([...(base.tags || []), ...(child.tags || [])])],
      // Child's extends is removed after resolution
      extends: undefined,
    };
  }

  private mergeCustomTools(
    baseTools?: ToolDefinition[],
    childTools?: ToolDefinition[]
  ): ToolDefinition[] {
    const toolMap = new Map<string, ToolDefinition>();
    
    for (const tool of baseTools || []) {
      toolMap.set(tool.name, tool);
    }
    for (const tool of childTools || []) {
      toolMap.set(tool.name, tool);  // Child overrides base
    }
    
    return Array.from(toolMap.values());
  }

  // Similar implementation for tools
  async resolveTool(definition: ToolDefinition): Promise<ToolDefinition> {
    // ... similar pattern ...
  }
}
```

### 4.3 YAML Loading

**Leverage existing fs utilities:**

```typescript
// src/definitions/loaders/yaml-loader.ts
import * as yaml from 'js-yaml';
import * as fs from '../../fs';
import { logger } from '../../logger';
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import { DefinitionValidator } from './validator';

export class YAMLLoader {
  private validator = new DefinitionValidator();

  async loadAgent(filePath: string): Promise<AgentDefinition> {
    logger.debug(`Loading agent definition from: ${filePath}`);

    // Use existing fs utilities
    const exists = await fs.exists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Agent definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);

      // Validate schema
      const definition = this.validator.validateAgent(data);

      logger.debug(`Successfully loaded agent: ${definition.name}`);
      return definition;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse YAML: ${error.message}`,
        { filePath, error }
      );
    }
  }

  async loadTool(filePath: string): Promise<ToolDefinition> {
    // Similar implementation
  }
}
```

### 4.4 Resolution Algorithm with Full Semver Support

**Three-tier resolution with full npm semver range syntax:**

```typescript
// src/definitions/registry/resolver.ts
import * as path from 'path';
import * as os from 'os';
import * as semver from 'semver';
import { glob } from 'glob';
import { logger } from '../../logger';
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import { YAMLLoader } from '../loaders';
import { DefinitionCache } from './cache';

export interface ResolvedAgent {
  definition: AgentDefinition;
  source: 'local' | 'global' | 'stockyard';
  version: string;
  path: string;
}

export class DefinitionResolver {
  private loader = new YAMLLoader();
  private cache = new DefinitionCache();

  async resolveAgent(name: string): Promise<ResolvedAgent> {
    logger.info(`Resolving agent: ${name}`);

    // Parse name with full semver range support
    const parsed = this.parseName(name);

    // Check cache first
    const cached = this.cache.get(name);
    if (cached) {
      logger.debug(`Cache hit for agent: ${name}`);
      return cached;
    }

    // 1. Check project-local
    const local = await this.checkLocal(parsed.name);
    if (local && this.satisfiesConstraint(local.version, parsed.versionRange)) {
      const resolved = {
        definition: local,
        source: 'local' as const,
        version: local.version,
        path: this.getLocalPath(parsed.name),
      };
      this.cache.set(name, resolved);
      return resolved;
    }

    // 2. Check global registry
    const global = await this.checkGlobal(parsed.name, parsed.versionRange);
    if (global) {
      const resolved = {
        definition: global.definition,
        source: 'global' as const,
        version: global.definition.version,
        path: global.path,
      };
      this.cache.set(name, resolved);
      return resolved;
    }

    // 3. Check Stockyard (stub for now)
    // TODO: Implement Stockyard integration

    throw new ForgeError(
      DefinitionErrorCode.AGENT_NOT_FOUND,
      `Agent '${name}' not found in any registry`,
      { name, versionRange: parsed.versionRange }
    );
  }

  private async checkLocal(name: string): Promise<AgentDefinition | null> {
    const localPath = path.join(
      process.cwd(),
      '.fractary/agents',
      `${name}.yaml`
    );

    try {
      return await this.loader.loadAgent(localPath);
    } catch (error) {
      if (isForgeError(error) && error.code === DefinitionErrorCode.AGENT_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  private async checkGlobal(
    name: string,
    versionRange: string
  ): Promise<{ definition: AgentDefinition; path: string } | null> {
    const registryPath = path.join(
      os.homedir(),
      '.fractary/registry/agents'
    );

    // Find all versions
    const pattern = path.join(registryPath, `${name}@*.yaml`);
    const files = await glob(pattern);

    if (files.length === 0) {
      return null;
    }

    // Extract versions
    const versions = files.map(f => {
      const match = f.match(/@([\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?)\.yaml$/);
      return match ? { version: match[1], path: f } : null;
    }).filter(Boolean) as { version: string; path: string }[];

    // Find best match using full semver
    const bestMatch = this.findBestVersion(
      versions.map(v => v.version),
      versionRange
    );

    if (!bestMatch) {
      return null;
    }

    const matchedFile = versions.find(v => v.version === bestMatch);
    if (!matchedFile) return null;
    
    const definition = await this.loader.loadAgent(matchedFile.path);

    return { definition, path: matchedFile.path };
  }

  /**
   * Find the best matching version using full npm semver range syntax.
   * Supports: ^, ~, >=, <=, >, <, =, ||, -, x, X, *
   * 
   * Examples:
   * - "^1.0.0"      -> >=1.0.0 <2.0.0
   * - "~1.2.3"      -> >=1.2.3 <1.3.0
   * - ">=1.0.0"     -> Any version >= 1.0.0
   * - "1.x"         -> Any 1.x.x version
   * - ">=1.0.0 <2.0.0 || >=3.0.0" -> Complex range
   */
  private findBestVersion(
    available: string[],
    range: string
  ): string | null {
    // Handle 'latest' as '*'
    const normalizedRange = range === 'latest' ? '*' : range;
    
    // Validate range
    if (!semver.validRange(normalizedRange)) {
      logger.warn(`Invalid semver range: ${range}, treating as exact match`);
      return available.includes(range) ? range : null;
    }
    
    // Filter to satisfying versions
    const satisfying = available.filter(v => 
      semver.satisfies(v, normalizedRange)
    );
    
    if (satisfying.length === 0) {
      return null;
    }
    
    // Return highest satisfying version
    return semver.maxSatisfying(satisfying, normalizedRange);
  }

  private satisfiesConstraint(version: string, range: string): boolean {
    if (range === 'latest' || range === '*') return true;
    return semver.satisfies(version, range);
  }

  /**
   * Parse name with version constraint.
   * 
   * Supports:
   * - "agent-name"           -> name: agent-name, versionRange: latest
   * - "agent-name@1.0.0"     -> name: agent-name, versionRange: 1.0.0
   * - "agent-name@^1.0.0"    -> name: agent-name, versionRange: ^1.0.0
   * - "agent-name@>=1.0.0"   -> name: agent-name, versionRange: >=1.0.0
   * - "agent-name@1.x"       -> name: agent-name, versionRange: 1.x
   */
  private parseName(name: string): { name: string; versionRange: string } {
    const atIndex = name.indexOf('@');
    
    // No @ means latest
    if (atIndex === -1) {
      return { name, versionRange: 'latest' };
    }
    
    // @ at position 0 is part of scoped package name (not supported yet)
    if (atIndex === 0) {
      // Handle @scope/package@version
      const secondAt = name.indexOf('@', 1);
      if (secondAt === -1) {
        return { name, versionRange: 'latest' };
      }
      return {
        name: name.substring(0, secondAt),
        versionRange: name.substring(secondAt + 1) || 'latest',
      };
    }
    
    return {
      name: name.substring(0, atIndex),
      versionRange: name.substring(atIndex + 1) || 'latest',
    };
  }

  private getLocalPath(name: string): string {
    return path.join(process.cwd(), '.fractary/agents', `${name}.yaml`);
  }
}
```

### 4.5 LangChain Integration with Provider-Specific Tool Adapters

```typescript
// src/definitions/factory/langchain.ts
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { logger } from '../../logger';
import type { LLMConfig } from '../schemas/common';

export class LangChainFactory {
  createLLM(config: LLMConfig): BaseChatModel {
    logger.debug(`Creating LLM: ${config.provider}/${config.model}`);

    switch (config.provider) {
      case 'anthropic':
        return new ChatAnthropic({
          modelName: config.model,
          temperature: config.temperature ?? 0,
          maxTokens: config.max_tokens ?? 4096,
        });

      case 'openai':
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature ?? 0,
          maxTokens: config.max_tokens ?? 4096,
        });

      case 'google':
        return new ChatGoogleGenerativeAI({
          modelName: config.model,
          temperature: config.temperature ?? 0,
          maxOutputTokens: config.max_tokens ?? 4096,
        });

      default:
        throw new ForgeError(
          DefinitionErrorCode.AGENT_INVALID,
          `Unsupported LLM provider: ${config.provider}`,
          { provider: config.provider }
        );
    }
  }
}
```

**Provider-Specific Tool Adapters (Unified Tool Format):**

```typescript
// src/definitions/factory/tool-adapters/index.ts
import type { ToolDefinition } from '../../schemas';

/**
 * Unified tool format adapter interface.
 * Tools are defined once in YAML and adapted to each provider's format.
 */
export interface IToolAdapter {
  provider: string;
  adaptTool(tool: ToolDefinition): any;
}

// src/definitions/factory/tool-adapters/anthropic.ts
import type { ToolDefinition } from '../../schemas';
import type { IToolAdapter } from './index';

export class AnthropicToolAdapter implements IToolAdapter {
  provider = 'anthropic';

  adaptTool(tool: ToolDefinition): any {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: this.convertParameters(tool.parameters),
        required: Object.entries(tool.parameters)
          .filter(([_, p]) => p.required)
          .map(([name]) => name),
      },
    };
  }

  private convertParameters(params: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, param] of Object.entries(params)) {
      result[name] = {
        type: param.type,
        description: param.description,
        ...(param.enum && { enum: param.enum }),
        ...(param.default !== undefined && { default: param.default }),
      };
    }
    return result;
  }
}

// src/definitions/factory/tool-adapters/openai.ts
export class OpenAIToolAdapter implements IToolAdapter {
  provider = 'openai';

  adaptTool(tool: ToolDefinition): any {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(tool.parameters),
          required: Object.entries(tool.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      },
    };
  }

  private convertParameters(params: Record<string, any>): Record<string, any> {
    // OpenAI format conversion
    // ...
  }
}

// src/definitions/factory/tool-adapters/google.ts
export class GoogleToolAdapter implements IToolAdapter {
  provider = 'google';

  adaptTool(tool: ToolDefinition): any {
    return {
      functionDeclarations: [{
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(tool.parameters),
          required: Object.entries(tool.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      }],
    };
  }

  private convertParameters(params: Record<string, any>): Record<string, any> {
    // Google format conversion
    // ...
  }
}
```

### 4.6 Public API with Structured Output and Health Check

**Match SPEC-FABER-002 interface requirements with refinements:**

```typescript
// src/definitions/api.ts
import { logger } from '../logger';
import { DefinitionResolver } from './registry';
import { AgentFactory } from './factory';
import { ToolExecutor } from './executor';
import { PromptCacheManager } from './caching';

export interface ExecutableAgent {
  name: string;
  version: string;
  invoke(task: string, context?: Record<string, any>): Promise<AgentResult>;
}

/**
 * AgentResult with structured_output support.
 * 
 * - output: string - Always available, string representation
 * - structured_output: any - Optional parsed JSON/object for structured responses
 */
export interface AgentResult {
  /** String output for backward compatibility */
  output: string;
  
  /** Structured output for JSON/object returns (when applicable) */
  structured_output?: any;
  
  /** Conversation messages */
  messages: any[];
  
  /** Token usage statistics */
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_hits?: number;
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * ToolResult with timeout support.
 * 
 * When execution times out:
 * - timeout: true
 * - output: partial output collected before timeout
 * - error: timeout error message
 */
export interface ToolResult {
  /** Whether execution completed successfully */
  success: boolean;
  
  /** Tool output (may be partial if timeout) */
  output: any;
  
  /** Whether execution timed out */
  timeout?: boolean;
  
  /** Error message if failed */
  error?: string;
  
  /** Execution duration in milliseconds */
  duration_ms: number;
  
  /** Exit code for bash/python tools */
  exit_code?: number;
}

export interface AgentInfo {
  name: string;
  version: string;
  description: string;
  tags: string[];
  author?: string;
  source: 'local' | 'global' | 'stockyard';
}

/**
 * Health check result for CI/CD validation.
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  
  /** Agent name */
  agent: string;
  
  /** Checks performed */
  checks: {
    /** Agent definition exists and is valid */
    definition: { passed: boolean; error?: string };
    
    /** All referenced tools are available */
    tools: { passed: boolean; missing?: string[]; error?: string };
    
    /** LLM provider is configured */
    llm: { passed: boolean; provider?: string; error?: string };
    
    /** Prompt cache sources are accessible */
    cache_sources: { passed: boolean; inaccessible?: string[]; error?: string };
  };
  
  /** Check duration in milliseconds */
  duration_ms: number;
}

export class AgentAPI {
  private resolver = new DefinitionResolver();
  private factory = new AgentFactory();
  private cacheManager = new PromptCacheManager();

  async resolveAgent(name: string): Promise<ExecutableAgent> {
    logger.info(`AgentAPI: Resolving agent ${name}`);

    // Resolve definition
    const resolved = await this.resolver.resolveAgent(name);

    // Create executable agent
    const agent = await this.factory.createAgent(resolved.definition);

    return {
      name: resolved.definition.name,
      version: resolved.version,
      invoke: async (task: string, context?: Record<string, any>) => {
        const result = await agent.invoke(task, context);
        
        // Attempt to parse structured output
        let structured_output: any = undefined;
        try {
          if (result.output && typeof result.output === 'string') {
            // Try to parse as JSON
            const trimmed = result.output.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              structured_output = JSON.parse(trimmed);
            }
          }
        } catch {
          // Not JSON, leave structured_output undefined
        }
        
        return {
          ...result,
          structured_output,
        };
      },
    };
  }

  async hasAgent(name: string): Promise<boolean> {
    try {
      await this.resolver.resolveAgent(name);
      return true;
    } catch (error) {
      if (isForgeError(error) && error.code === DefinitionErrorCode.AGENT_NOT_FOUND) {
        return false;
      }
      throw error;
    }
  }

  async getAgentInfo(name: string): Promise<AgentInfo> {
    const resolved = await this.resolver.resolveAgent(name);
    return {
      name: resolved.definition.name,
      version: resolved.version,
      description: resolved.definition.description,
      tags: resolved.definition.tags,
      author: resolved.definition.author,
      source: resolved.source,
    };
  }

  /**
   * Health check for CI/CD validation.
   * Validates agent availability and configuration without invoking.
   * 
   * @param name - Agent name (with optional version constraint)
   * @returns Health check result
   */
  async healthCheck(name: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      healthy: true,
      agent: name,
      checks: {
        definition: { passed: false },
        tools: { passed: false },
        llm: { passed: false },
        cache_sources: { passed: false },
      },
      duration_ms: 0,
    };

    try {
      // Check 1: Definition exists and is valid
      const resolved = await this.resolver.resolveAgent(name);
      result.checks.definition = { passed: true };

      // Check 2: All referenced tools are available
      const missingTools: string[] = [];
      for (const toolName of resolved.definition.tools || []) {
        try {
          await this.resolver.resolveTool(toolName);
        } catch {
          missingTools.push(toolName);
        }
      }
      result.checks.tools = missingTools.length === 0
        ? { passed: true }
        : { passed: false, missing: missingTools };

      // Check 3: LLM provider is configured
      const provider = resolved.definition.llm.provider;
      const envVarMap: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_API_KEY',
      };
      const envVar = envVarMap[provider];
      if (envVar && process.env[envVar]) {
        result.checks.llm = { passed: true, provider };
      } else {
        result.checks.llm = {
          passed: false,
          provider,
          error: `Missing ${envVar} environment variable`,
        };
      }

      // Check 4: Prompt cache sources are accessible
      const inaccessible: string[] = [];
      if (resolved.definition.caching?.enabled) {
        for (const source of resolved.definition.caching.cache_sources || []) {
          const accessible = await this.cacheManager.checkSourceAccessible(source);
          if (!accessible) {
            inaccessible.push(source.label || source.path || source.uri || 'unknown');
          }
        }
      }
      result.checks.cache_sources = inaccessible.length === 0
        ? { passed: true }
        : { passed: false, inaccessible };

      // Overall health
      result.healthy = Object.values(result.checks).every(c => c.passed);

    } catch (error) {
      result.checks.definition = {
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      };
      result.healthy = false;
    }

    result.duration_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Refresh prompt cache for an agent.
   * Invalidates cached sources and reloads them.
   * 
   * @param name - Agent name
   */
  async refreshCache(name: string): Promise<void> {
    logger.info(`Refreshing cache for agent: ${name}`);
    const resolved = await this.resolver.resolveAgent(name);
    
    if (resolved.definition.caching?.enabled) {
      await this.cacheManager.invalidate(name);
      await this.cacheManager.preload(resolved.definition);
    }
  }
}

export class ToolAPI {
  private resolver = new DefinitionResolver();
  private executor = new ToolExecutor();

  async resolveTool(name: string): Promise<ExecutableTool> {
    // Similar to AgentAPI
  }

  /**
   * Execute a tool with timeout support.
   * 
   * @param name - Tool name
   * @param params - Tool parameters
   * @param options - Execution options including timeout
   * @returns Tool result (may be partial if timeout)
   */
  async executeTool(
    name: string,
    params: Record<string, any>,
    options?: { timeout?: number }
  ): Promise<ToolResult> {
    const tool = await this.resolver.resolveTool(name);
    return await this.executor.execute(tool, params, options);
  }
}
```

### 4.7 Tool Execution with Timeout and Dependencies

```typescript
// src/definitions/executor/tool-executor.ts
import { spawn } from 'child_process';
import { logger } from '../../logger';
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import type { ToolDefinition, ToolResult } from '../types';
import { DependencyResolver } from './dependency-resolver';

export class ToolExecutor {
  private dependencyResolver = new DependencyResolver();
  private defaultTimeout = 120000; // 2 minutes

  async execute(
    tool: ToolDefinition,
    params: Record<string, any>,
    options?: { timeout?: number }
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? 
      tool.implementation.bash?.sandbox?.max_execution_time ?? 
      this.defaultTimeout;

    // Resolve dependencies first
    if (tool.depends_on && tool.depends_on.length > 0) {
      logger.debug(`Resolving dependencies for tool: ${tool.name}`);
      await this.dependencyResolver.executeDependencies(tool.depends_on, params);
    }

    // Execute based on implementation type
    switch (tool.implementation.type) {
      case 'bash':
        return this.executeBash(tool, params, timeout, startTime);
      case 'python':
        return this.executePython(tool, params, timeout, startTime);
      case 'http':
        return this.executeHttp(tool, params, timeout, startTime);
      default:
        throw new ForgeError(
          DefinitionErrorCode.TOOL_INVALID,
          `Unsupported tool implementation type`,
          { tool: tool.name }
        );
    }
  }

  private async executeBash(
    tool: ToolDefinition,
    params: Record<string, any>,
    timeout: number,
    startTime: number
  ): Promise<ToolResult> {
    return new Promise((resolve) => {
      const command = this.substituteParams(
        tool.implementation.bash!.command,
        params
      );

      let output = '';
      let timedOut = false;

      const proc = spawn('bash', ['-c', command], {
        env: this.buildEnv(tool.implementation.bash!.sandbox?.env_vars),
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => proc.kill('SIGKILL'), 5000);
      }, timeout);

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration_ms = Date.now() - startTime;

        if (timedOut) {
          resolve({
            success: false,
            output,  // Partial output collected before timeout
            timeout: true,
            error: `Tool execution timed out after ${timeout}ms`,
            duration_ms,
            exit_code: code ?? -1,
          });
        } else {
          resolve({
            success: code === 0,
            output,
            timeout: false,
            error: code !== 0 ? `Exit code: ${code}` : undefined,
            duration_ms,
            exit_code: code ?? 0,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          output,
          timeout: false,
          error: err.message,
          duration_ms: Date.now() - startTime,
          exit_code: -1,
        });
      });
    });
  }

  private substituteParams(template: string, params: Record<string, any>): string {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : '';
    });
  }

  private buildEnv(allowedVars?: string[]): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    
    if (allowedVars) {
      // Only pass through allowed env vars
      const filtered: NodeJS.ProcessEnv = {};
      for (const varName of allowedVars) {
        if (env[varName]) {
          filtered[varName] = env[varName];
        }
      }
      return filtered;
    }
    
    return env;
  }

  // Similar implementations for executePython and executeHttp...
}
```

**Tool Dependency Resolver:**

```typescript
// src/definitions/executor/dependency-resolver.ts
import { logger } from '../../logger';
import { ForgeError } from '../../errors';
import { DefinitionErrorCode } from '../errors';
import { DefinitionResolver } from '../registry';

export class DependencyResolver {
  private resolver = new DefinitionResolver();
  private executionStack: Set<string> = new Set();

  async executeDependencies(
    dependencies: string[],
    params: Record<string, any>
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();

    for (const depName of dependencies) {
      // Detect cycles
      if (this.executionStack.has(depName)) {
        throw new ForgeError(
          DefinitionErrorCode.TOOL_DEPENDENCY_CYCLE,
          `Circular tool dependency detected: ${Array.from(this.executionStack).join(' -> ')} -> ${depName}`,
          { cycle: Array.from(this.executionStack), current: depName }
        );
      }

      this.executionStack.add(depName);

      try {
        // Resolve and load dependency tool
        const depTool = await this.resolver.resolveTool(depName);
        if (!depTool) {
          throw new ForgeError(
            DefinitionErrorCode.TOOL_DEPENDENCY_NOT_FOUND,
            `Dependency tool '${depName}' not found`,
            { dependency: depName }
          );
        }

        // Recursively execute dependency's dependencies
        if (depTool.definition.depends_on?.length) {
          await this.executeDependencies(depTool.definition.depends_on, params);
        }

        // Execute the dependency
        logger.debug(`Executing dependency tool: ${depName}`);
        const executor = new (await import('./tool-executor')).ToolExecutor();
        const result = await executor.execute(depTool.definition, params);
        
        results.set(depName, result);

        if (!result.success) {
          throw new ForgeError(
            DefinitionErrorCode.TOOL_EXECUTION_FAILED,
            `Dependency tool '${depName}' failed`,
            { dependency: depName, error: result.error }
          );
        }
      } finally {
        this.executionStack.delete(depName);
      }
    }

    return results;
  }
}
```

### 4.8 Prompt Cache with TTL Per Source

```typescript
// src/definitions/caching/cache-manager.ts
import { logger } from '../../logger';
import { configManager } from '../../config';
import type { CachingSource, CachingConfig, AgentDefinition } from '../schemas';

interface CacheEntry {
  content: string;
  loadedAt: number;
  ttl: number;
  source: CachingSource;
}

export class PromptCacheManager {
  private cache = new Map<string, CacheEntry>();
  private defaultTtls: Record<string, number> = {
    file: 3600,     // 1 hour
    glob: 1800,     // 30 minutes
    codex: 7200,    // 2 hours
    inline: Infinity,  // Never expires (static content)
  };

  constructor() {
    const config = configManager.getConfig();
    const cachingConfig = config.definitions?.caching;
    
    if (cachingConfig?.sourceTtls) {
      this.defaultTtls = { ...this.defaultTtls, ...cachingConfig.sourceTtls };
    }
  }

  /**
   * Get cached content for a source, loading if needed.
   */
  async get(source: CachingSource): Promise<string> {
    const cacheKey = this.getCacheKey(source);
    const entry = this.cache.get(cacheKey);

    if (entry && !this.isExpired(entry)) {
      logger.debug(`Cache hit for source: ${source.label || cacheKey}`);
      return entry.content;
    }

    logger.debug(`Cache miss for source: ${source.label || cacheKey}`);
    return this.load(source);
  }

  /**
   * Load content from source and cache it.
   */
  async load(source: CachingSource): Promise<string> {
    const content = await this.loadFromSource(source);
    const ttl = this.getTtl(source);
    
    const entry: CacheEntry = {
      content,
      loadedAt: Date.now(),
      ttl,
      source,
    };
    
    this.cache.set(this.getCacheKey(source), entry);
    return content;
  }

  /**
   * Invalidate cache for an agent.
   */
  async invalidate(agentName: string): Promise<void> {
    // Invalidate all entries associated with this agent
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${agentName}:`)) {
        this.cache.delete(key);
      }
    }
    logger.info(`Invalidated cache for agent: ${agentName}`);
  }

  /**
   * Preload all cache sources for an agent.
   */
  async preload(definition: AgentDefinition): Promise<void> {
    if (!definition.caching?.enabled) return;

    logger.info(`Preloading cache for agent: ${definition.name}`);
    
    for (const source of definition.caching.cache_sources || []) {
      try {
        await this.load(source);
      } catch (error) {
        logger.warn(`Failed to preload cache source: ${source.label}`, error);
      }
    }
  }

  /**
   * Check if a source is accessible.
   */
  async checkSourceAccessible(source: CachingSource): Promise<boolean> {
    try {
      await this.loadFromSource(source);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Manual refresh method - call forge.refreshCache().
   */
  async refresh(agentName: string, definition: AgentDefinition): Promise<void> {
    await this.invalidate(agentName);
    await this.preload(definition);
  }

  private getCacheKey(source: CachingSource): string {
    switch (source.type) {
      case 'file':
        return `file:${source.path}`;
      case 'glob':
        return `glob:${source.pattern}`;
      case 'codex':
        return `codex:${source.uri}`;
      case 'inline':
        return `inline:${hashCode(source.content || '')}`;
    }
  }

  private getTtl(source: CachingSource): number {
    // Source-specific TTL override
    if (source.ttl !== undefined) {
      return source.ttl * 1000; // Convert to milliseconds
    }
    
    // Default TTL by source type
    return (this.defaultTtls[source.type] || 3600) * 1000;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === Infinity) return false;
    return Date.now() - entry.loadedAt > entry.ttl;
  }

  private async loadFromSource(source: CachingSource): Promise<string> {
    const handlers = await import('./source-handlers');
    
    switch (source.type) {
      case 'file':
        return handlers.FileSourceHandler.load(source.path!);
      case 'glob':
        return handlers.GlobSourceHandler.load(source.pattern!);
      case 'codex':
        return handlers.CodexSourceHandler.load(source.uri!);
      case 'inline':
        return source.content || '';
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }
}

// Helper function
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
```

## 5. Testing Strategy

### 5.1 Test Structure

```
src/definitions/
├── __tests__/
│   ├── schemas/
│   │   ├── agent.test.ts
│   │   ├── tool.test.ts
│   │   └── common.test.ts
│   │
│   ├── loaders/
│   │   ├── yaml-loader.test.ts
│   │   ├── validator.test.ts
│   │   └── inheritance.test.ts
│   │
│   ├── registry/
│   │   ├── resolver.test.ts
│   │   ├── cache.test.ts
│   │   └── lockfile.test.ts
│   │
│   ├── factory/
│   │   ├── agent-factory.test.ts
│   │   ├── langchain.test.ts
│   │   └── tool-adapters.test.ts
│   │
│   ├── executor/
│   │   ├── bash.test.ts
│   │   ├── python.test.ts
│   │   ├── http.test.ts
│   │   ├── timeout.test.ts
│   │   └── dependency-resolver.test.ts
│   │
│   ├── caching/
│   │   ├── cache-manager.test.ts
│   │   └── ttl.test.ts
│   │
│   ├── api/
│   │   ├── agent-api.test.ts
│   │   ├── tool-api.test.ts
│   │   └── health-check.test.ts
│   │
│   ├── integration/
│   │   ├── end-to-end.test.ts
│   │   └── performance.test.ts
│   │
│   └── fixtures/
│       ├── agents/
│       │   ├── valid-agent.yaml
│       │   ├── invalid-agent.yaml
│       │   ├── base-agent.yaml
│       │   └── derived-agent.yaml
│       └── tools/
│           ├── valid-tool.yaml
│           ├── base-tool.yaml
│           └── derived-tool.yaml
```

### 5.2 Unit Test Examples

**Health Check Test:**

```typescript
// src/definitions/__tests__/api/health-check.test.ts
import { AgentAPI, HealthCheckResult } from '../../api';
import { setupTestFixtures, cleanupTestFixtures } from '../helpers/fixtures';

describe('AgentAPI.healthCheck', () => {
  let api: AgentAPI;

  beforeAll(async () => {
    await setupTestFixtures();
    api = new AgentAPI();
  });

  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it('should return healthy for valid agent', async () => {
    const result = await api.healthCheck('test-agent');

    expect(result.healthy).toBe(true);
    expect(result.checks.definition.passed).toBe(true);
    expect(result.checks.tools.passed).toBe(true);
    expect(result.duration_ms).toBeGreaterThan(0);
  });

  it('should report missing tools', async () => {
    const result = await api.healthCheck('agent-with-missing-tools');

    expect(result.healthy).toBe(false);
    expect(result.checks.tools.passed).toBe(false);
    expect(result.checks.tools.missing).toContain('nonexistent-tool');
  });

  it('should report missing LLM API key', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const result = await api.healthCheck('anthropic-agent');
      expect(result.checks.llm.passed).toBe(false);
      expect(result.checks.llm.error).toContain('ANTHROPIC_API_KEY');
    } finally {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});
```

**Timeout Test:**

```typescript
// src/definitions/__tests__/executor/timeout.test.ts
import { ToolExecutor } from '../../executor/tool-executor';
import type { ToolDefinition } from '../../schemas';

describe('ToolExecutor timeout handling', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
  });

  it('should return partial output on timeout', async () => {
    const tool: ToolDefinition = {
      name: 'slow-tool',
      type: 'tool',
      description: 'A slow tool',
      parameters: {},
      implementation: {
        type: 'bash',
        bash: {
          command: 'for i in 1 2 3 4 5; do echo "line $i"; sleep 1; done',
        },
      },
      version: '1.0.0',
      tags: [],
    };

    const result = await executor.execute(tool, {}, { timeout: 2500 });

    expect(result.timeout).toBe(true);
    expect(result.success).toBe(false);
    expect(result.output).toContain('line 1');
    expect(result.output).toContain('line 2');
    expect(result.error).toContain('timed out');
  });
});
```

**Inheritance Test:**

```typescript
// src/definitions/__tests__/loaders/inheritance.test.ts
import { InheritanceResolver } from '../../loaders/inheritance';
import { DefinitionResolver } from '../../registry';

describe('InheritanceResolver', () => {
  let resolver: InheritanceResolver;

  beforeEach(() => {
    resolver = new InheritanceResolver(new DefinitionResolver());
  });

  it('should merge base and derived agent definitions', async () => {
    const derived = await resolver.resolveAgent({
      name: 'derived-agent',
      type: 'agent',
      extends: 'base-agent',
      description: 'Derived agent',
      llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      system_prompt: 'Derived prompt',
      tools: ['additional-tool'],
      version: '1.0.0',
      tags: ['derived'],
    });

    // Should have merged tools
    expect(derived.tools).toContain('additional-tool');
    expect(derived.tools).toContain('base-tool'); // From base
    
    // Should have merged tags
    expect(derived.tags).toContain('derived');
    expect(derived.tags).toContain('base'); // From base
    
    // extends should be removed
    expect(derived.extends).toBeUndefined();
  });

  it('should detect circular inheritance', async () => {
    await expect(
      resolver.resolveAgent({
        name: 'agent-a',
        extends: 'agent-b', // agent-b extends agent-a
        // ... other fields
      })
    ).rejects.toThrow('Circular inheritance');
  });
});
```

### 5.3 Integration Test Example

```typescript
// src/definitions/__tests__/integration/end-to-end.test.ts
import { AgentAPI } from '../../api';
import { setupTestFixtures, cleanupTestFixtures } from '../helpers/fixtures';

describe('End-to-End Agent Resolution and Invocation', () => {
  let api: AgentAPI;

  beforeAll(async () => {
    await setupTestFixtures();
    api = new AgentAPI();
  });

  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it('should resolve, load, and invoke an agent with structured output', async () => {
    const agent = await api.resolveAgent('json-output-agent');

    const result = await agent.invoke('Return a JSON object with name and value');

    expect(result.output).toBeDefined();
    expect(result.structured_output).toBeDefined();
    expect(typeof result.structured_output).toBe('object');
  });

  it('should resolve agent with semver range', async () => {
    // Using npm semver range syntax
    const agent1 = await api.resolveAgent('test-agent@^1.0.0');
    expect(agent1.version).toMatch(/^1\./);

    const agent2 = await api.resolveAgent('test-agent@~1.2.0');
    expect(agent2.version).toMatch(/^1\.2\./);

    const agent3 = await api.resolveAgent('test-agent@>=1.0.0 <2.0.0');
    expect(agent3.version).toMatch(/^1\./);
  });

  it('should use local agent over global agent', async () => {
    // Test priority: local > global
  });
});
```

## 6. Implementation Phases

### Phase 1: Core Foundation (Week 1)

**Days 1-2: Type System & Schemas**
- [ ] Create `src/definitions/schemas/common.ts`
  - LLMConfig, CachingConfig, CachingSource
  - Add TTL per source support
  - Zod schemas + TypeScript types
- [ ] Create `src/definitions/schemas/tool.ts`
  - ToolDefinition, ToolParameter, ToolImplementation
  - Add `extends` field for inheritance
  - Add `depends_on` field for tool chaining
  - All implementation types (bash, python, http)
- [ ] Create `src/definitions/schemas/agent.ts`
  - AgentDefinition with all fields
  - Add `extends` field for inheritance
  - Custom tool support
- [ ] Create `src/definitions/schemas/validation.ts`
  - ValidationError, ValidationResult types
- [ ] Unit tests for all schemas

**Days 3-4: YAML Loading & Validation**
- [ ] Create `src/definitions/loaders/yaml-loader.ts`
- [ ] Create `src/definitions/loaders/validator.ts`
- [ ] Create `src/definitions/loaders/parser.ts`
- [ ] Create `src/definitions/loaders/inheritance.ts`
  - Inheritance resolution with cycle detection
- [ ] Unit tests for loaders

**Day 5: Registry Foundation**
- [ ] Create `src/definitions/registry/types.ts`
- [ ] Create `src/definitions/registry/resolver.ts`
  - Full semver range support (^, ~, >=, ||, etc.)
- [ ] Create `src/definitions/registry/cache.ts`
- [ ] Unit tests

### Phase 2: Resolution & Execution (Week 2)

**Days 1-2: Complete Resolution**
- [ ] Complete `src/definitions/registry/resolver.ts`
  - Global registry resolution
  - Full npm semver range syntax
  - Stockyard stub
- [ ] Create `src/definitions/registry/lockfile.ts`
- [ ] Create `src/definitions/registry/manifest.ts`
- [ ] Unit tests for resolution logic

**Days 3-4: Agent Factory & Tool Execution**
- [ ] Create `src/definitions/factory/langchain.ts`
- [ ] Create `src/definitions/factory/tool-adapters/`
  - Anthropic, OpenAI, Google adapters
  - Unified tool format
- [ ] Create `src/definitions/factory/agent-factory.ts`
- [ ] Create `src/definitions/executor/tool-executor.ts`
  - Timeout support with partial results
- [ ] Create `src/definitions/executor/dependency-resolver.ts`
  - depends_on resolution with cycle detection
- [ ] Create `src/definitions/executor/implementations/`
- [ ] Unit tests

**Day 5: Public API**
- [ ] Create `src/definitions/api.ts`
  - AgentAPI with healthCheck()
  - AgentResult with structured_output
  - ToolResult with timeout flag
  - refreshCache() method
- [ ] Create `src/definitions/caching/cache-manager.ts`
  - TTL per source type
- [ ] Integration tests
- [ ] Performance tests

### Phase 3: Polish & Documentation (Week 2-3)

**Documentation**
- [ ] API documentation (JSDoc)
- [ ] Usage examples
- [ ] YAML schema reference
- [ ] Migration guide from FABER
- [ ] Update README

**Testing**
- [ ] Achieve >90% code coverage
- [ ] Health check tests
- [ ] Timeout tests
- [ ] Inheritance tests
- [ ] Semver range tests

## 7. Dependencies to Add

```json
{
  "dependencies": {
    "@langchain/anthropic": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/google-genai": "^0.1.0",
    "@langchain/core": "^0.3.0",
    "zod": "^3.22.0",
    "semver": "^7.5.0"
  }
}
```

## 8. Success Criteria

### Functional Requirements
- [ ] Load agent definitions from YAML files
- [ ] Validate definitions against Zod schemas
- [ ] Resolve agents from local/global registries
- [ ] Support full npm semver range syntax (^, ~, >=, ||, etc.)
- [ ] Create executable LangChain agents
- [ ] Execute tools (bash, python, http)
- [ ] Return partial results on timeout with timeout flag
- [ ] Support definition inheritance (extends field)
- [ ] Support tool dependencies (depends_on field)
- [ ] Support TTL per cache source type
- [ ] Provide healthCheck() for CI/CD validation
- [ ] Return structured_output for JSON responses
- [ ] Support manual cache refresh via refreshCache()
- [ ] Generate and use lockfiles
- [ ] Cache definitions in memory
- [ ] Support prompt caching for Claude

### Non-Functional Requirements
- [ ] Agent resolution < 100ms (cached)
- [ ] Agent resolution < 200ms (cold, local/global)
- [ ] Unit test coverage > 90%
- [ ] Zero breaking changes to existing Forge SDK
- [ ] TypeScript strict mode compliance
- [ ] Comprehensive error messages
- [ ] Detailed logging

### Integration Requirements
- [ ] AgentAPI matches SPEC-FABER-002 interface
- [ ] ToolAPI matches SPEC-FABER-002 interface
- [ ] Works with existing ConfigManager
- [ ] Uses existing Logger
- [ ] Uses existing ForgeError pattern
- [ ] Exports follow existing patterns
- [ ] Unified tool format works with all providers

## 9. Open Questions & Decisions

### Resolved (from Refinement Round 1)

1. **Agent Invocation Return Type**: Add `structured_output` field to `AgentResult` interface for JSON/object returns while keeping `output: string` for backward compatibility.

2. **Tool Execution Timeout**: Return partial result with `timeout: true` flag in `ToolResult` when execution exceeds time limit.

3. **Prompt Caching Invalidation**: TTL per source with manual refresh via `forge.refreshCache()` method.

4. **Version Constraint Syntax**: Full npm semver range syntax support using the `semver` package.

5. **Multi-Provider Tool Compatibility**: Unified tool format with provider-specific adapters.

### Applied Suggestions

1. **Health Check API**: `AgentAPI.healthCheck(name)` for CI/CD validation.

2. **Tool Chaining**: `depends_on` field in tool definitions for pipeline orchestration.

3. **Definition Inheritance**: `extends` field for agent/tool definitions.

### Previously Resolved

4. **Cache Strategy**: Extend existing CacheManager? -> **No, create separate DefinitionCache for simplicity, plus PromptCacheManager for source TTLs**

5. **Error Codes**: Extend ErrorCode enum? -> **Yes, extend in definitions module**

6. **Validation Library**: Zod vs other? -> **Zod for type inference**

### Pending

1. **Python Execution**: How to safely execute Python functions?
   - Subprocess? Import? Security implications?
2. **Codex Integration**: Optional peer dependency?
   - How to handle when not installed?
3. **Stockyard API**: What's the interface?
   - Need API design before implementing

## 10. Risk Mitigation

### Risk: LangChain API Changes
- **Mitigation**: Pin exact versions, abstract LangChain behind factory and tool adapters
- **Fallback**: Direct API calls if LangChain insufficient

### Risk: YAML Complexity
- **Mitigation**: Comprehensive validation, detailed error messages
- **Fallback**: Provide YAML linting tools

### Risk: Performance
- **Mitigation**: Aggressive caching, lazy loading
- **Monitoring**: Performance tests in CI

### Risk: Security (Tool Execution)
- **Mitigation**: Sandboxing, allowlists, validation, timeout enforcement
- **Review**: Security audit before release

### Risk: Circular Dependencies
- **Mitigation**: Cycle detection in inheritance resolver and dependency resolver
- **Monitoring**: Clear error messages on cycle detection

## 11. Related Specifications

- **SPEC-FORGE-001**: Parent specification (architecture)
- **SPEC-FORGE-002**: Agent Registry & Resolution
- **SPEC-FABER-002**: Interface requirements from FABER
- **SPEC-MIGRATION-001**: Cross-project migration plan

## 12. Appendix: Code Patterns Reference

### A. Existing Resolver Pattern
See `src/resolvers/manager.ts` for reference implementation of multi-source resolution.

### B. Existing Error Handling
See `src/errors/forge-error.ts` for ForgeError pattern.

### C. Existing Configuration
See `src/config/manager.ts` for ConfigManager pattern.

### D. Existing Caching
See `src/cache/manager.ts` for CacheManager pattern.

---

**Ready for implementation. Start with Phase 1, Day 1 tasks.**
