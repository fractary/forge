/**
 * Registry-related types
 */

import type { AgentDefinition, ToolDefinition } from '../schemas';

/**
 * Resolved agent with metadata
 */
export interface ResolvedAgent {
  definition: AgentDefinition;
  source: 'local' | 'global' | 'stockyard';
  version: string;
  path: string;
}

/**
 * Resolved tool with metadata
 */
export interface ResolvedTool {
  definition: ToolDefinition;
  source: 'local' | 'global' | 'stockyard';
  version: string;
  path: string;
}

/**
 * Registry resolver interface
 */
export interface IRegistryResolver {
  name: string;
  canResolve(identifier: string): boolean;
  resolveAgent(identifier: string): Promise<ResolvedAgent | null>;
  resolveTool(identifier: string): Promise<ResolvedTool | null>;
}

/**
 * Parsed name with version constraint
 */
export interface ParsedName {
  name: string;
  versionRange: string; // npm semver range syntax
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  local: {
    enabled: boolean;
    paths: string[];
  };
  global: {
    enabled: boolean;
    path: string;
  };
  stockyard: {
    enabled: boolean;
    url?: string;
    apiKey?: string;
  };
}
