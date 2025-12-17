/**
 * Definition resolver with three-tier resolution and full semver support
 */

import * as path from 'path';
import * as os from 'os';
import * as semver from 'semver';
import { glob } from 'glob';
import * as fs from 'fs-extra';
import { logger } from '../../logger';
import { ForgeError, isForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { YAMLLoader } from '../loaders/yaml-loader';
import { MarkdownLoader } from '../loaders/markdown-loader';
import { LoaderFactory } from '../loaders/loader-factory';
import { InheritanceResolver } from '../loaders/inheritance';
import { DefinitionCache } from './cache';
import type { ResolvedAgent, ResolvedTool, ParsedName, RegistryConfig } from './types';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class DefinitionResolver {
  private loader = new LoaderFactory();
  private cache = new DefinitionCache();
  private inheritanceResolver: InheritanceResolver;
  private config: RegistryConfig;

  constructor(config?: Partial<RegistryConfig>) {
    this.config = {
      local: {
        enabled: true,
        paths: ['.fractary/agents', '.fractary/tools'],
      },
      global: {
        enabled: true,
        path: path.join(os.homedir(), '.fractary/registry'),
      },
      stockyard: {
        enabled: false,
      },
      ...config,
    };

    this.inheritanceResolver = new InheritanceResolver(this);
  }

  /**
   * Resolve agent with three-tier lookup and version constraints
   */
  async agentResolve(name: string): Promise<ResolvedAgent> {
    logger.info(`Resolving agent: ${name}`);

    // Parse name with version constraint
    const parsed = this.parseName(name);

    // Check cache first
    const cached = this.cache.getAgent(name);
    if (cached) {
      logger.debug(`Cache hit for agent: ${name}`);
      return cached;
    }

    // 1. Check project-local
    if (this.config.local.enabled) {
      const local = await this.checkLocalAgent(parsed.name);
      if (local && this.satisfiesConstraint(local.version, parsed.versionRange)) {
        const resolved: ResolvedAgent = {
          definition: local,
          source: 'local',
          version: local.version,
          path: this.getLocalPath('agents', parsed.name),
        };

        // Resolve inheritance
        resolved.definition = await this.inheritanceResolver.agentResolve(resolved.definition);

        this.cache.setAgent(name, resolved);
        return resolved;
      }
    }

    // 2. Check global registry
    if (this.config.global.enabled) {
      const global = await this.checkGlobalAgent(parsed.name, parsed.versionRange);
      if (global) {
        const resolved: ResolvedAgent = {
          definition: global.definition,
          source: 'global',
          version: global.definition.version,
          path: global.path,
        };

        // Resolve inheritance
        resolved.definition = await this.inheritanceResolver.agentResolve(resolved.definition);

        this.cache.setAgent(name, resolved);
        return resolved;
      }
    }

    // 3. Check Stockyard (stub for now)
    if (this.config.stockyard.enabled) {
      // TODO: Implement Stockyard integration
      logger.debug('Stockyard resolver not yet implemented');
    }

    throw new ForgeError(
      DefinitionErrorCode.AGENT_NOT_FOUND,
      `Agent '${name}' not found in any registry`,
      { name, versionRange: parsed.versionRange }
    );
  }

  /**
   * Resolve tool with three-tier lookup and version constraints
   */
  async toolResolve(name: string): Promise<ResolvedTool> {
    logger.info(`Resolving tool: ${name}`);

    // Parse name with version constraint
    const parsed = this.parseName(name);

    // Check cache first
    const cached = this.cache.getTool(name);
    if (cached) {
      logger.debug(`Cache hit for tool: ${name}`);
      return cached;
    }

    // 1. Check project-local
    if (this.config.local.enabled) {
      const local = await this.checkLocalTool(parsed.name);
      if (local && this.satisfiesConstraint(local.version, parsed.versionRange)) {
        const resolved: ResolvedTool = {
          definition: local,
          source: 'local',
          version: local.version,
          path: this.getLocalPath('tools', parsed.name),
        };

        // Resolve inheritance
        resolved.definition = await this.inheritanceResolver.toolResolve(resolved.definition);

        this.cache.setTool(name, resolved);
        return resolved;
      }
    }

    // 2. Check global registry
    if (this.config.global.enabled) {
      const global = await this.checkGlobalTool(parsed.name, parsed.versionRange);
      if (global) {
        const resolved: ResolvedTool = {
          definition: global.definition,
          source: 'global',
          version: global.definition.version,
          path: global.path,
        };

        // Resolve inheritance
        resolved.definition = await this.inheritanceResolver.toolResolve(resolved.definition);

        this.cache.setTool(name, resolved);
        return resolved;
      }
    }

    // 3. Check Stockyard (stub for now)
    if (this.config.stockyard.enabled) {
      // TODO: Implement Stockyard integration
      logger.debug('Stockyard resolver not yet implemented');
    }

    throw new ForgeError(
      DefinitionErrorCode.TOOL_NOT_FOUND,
      `Tool '${name}' not found in any registry`,
      { name, versionRange: parsed.versionRange }
    );
  }

  /**
   * Check local directory for agent definition
   */
  private async checkLocalAgent(name: string): Promise<AgentDefinition | null> {
    const localPath = this.getLocalPath('agents', name);
    try {
      return await this.loader.loadAgent(localPath);
    } catch (error) {
      if (isForgeError(error) && error.code === 'AGENT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check local directory for tool definition
   */
  private async checkLocalTool(name: string): Promise<ToolDefinition | null> {
    const localPath = this.getLocalPath('tools', name);
    try {
      return await this.loader.loadTool(localPath);
    } catch (error) {
      if (isForgeError(error) && error.code === 'TOOL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check global registry for agent definition with version constraint
   *
   * Supports both formats in directory-per-definition structure:
   * - agents/{agent-name}@{version}/agent.md (preferred)
   * - agents/{agent-name}@{version}/agent.yaml (legacy)
   */
  private async checkGlobalAgent(
    name: string,
    versionRange: string
  ): Promise<{ definition: AgentDefinition; path: string } | null> {
    const registryPath = path.join(this.config.global.path, 'agents');

    // Find all versions (both formats)
    const mdPattern = path.join(registryPath, `${name}@*`, 'agent.md');
    const yamlPattern = path.join(registryPath, `${name}@*`, 'agent.yaml');
    const files = [...(await glob(mdPattern)), ...(await glob(yamlPattern))];

    if (files.length === 0) {
      return null;
    }

    // Extract versions from directory names
    const versions = files
      .map((f) => {
        const match = f.match(/([^/\\]+)@([\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?)[/\\]agent\.(md|yaml)$/);
        return match ? { version: match[2], path: f } : null;
      })
      .filter((v): v is { version: string; path: string } => v !== null);

    // Find best match using full semver
    const bestVersion = this.findBestVersion(
      versions.map((v) => v.version),
      versionRange
    );

    if (!bestVersion) {
      return null;
    }

    // Prefer .md over .yaml if both exist for the same version
    const matchedFiles = versions.filter((v) => v.version === bestVersion);
    const matchedFile = matchedFiles.find((f) => f.path.endsWith('.md')) || matchedFiles[0];
    if (!matchedFile) return null;

    const definition = await this.loader.loadAgent(matchedFile.path);
    return { definition, path: matchedFile.path };
  }

  /**
   * Check global registry for tool definition with version constraint
   *
   * Supports both formats in directory-per-definition structure:
   * - tools/{tool-name}@{version}/tool.md (preferred)
   * - tools/{tool-name}@{version}/tool.yaml (legacy)
   */
  private async checkGlobalTool(
    name: string,
    versionRange: string
  ): Promise<{ definition: ToolDefinition; path: string } | null> {
    const registryPath = path.join(this.config.global.path, 'tools');

    // Find all versions (both formats)
    const mdPattern = path.join(registryPath, `${name}@*`, 'tool.md');
    const yamlPattern = path.join(registryPath, `${name}@*`, 'tool.yaml');
    const files = [...(await glob(mdPattern)), ...(await glob(yamlPattern))];

    if (files.length === 0) {
      return null;
    }

    // Extract versions from directory names
    const versions = files
      .map((f) => {
        const match = f.match(/([^/\\]+)@([\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?)[/\\]tool\.(md|yaml)$/);
        return match ? { version: match[2], path: f } : null;
      })
      .filter((v): v is { version: string; path: string } => v !== null);

    // Find best match using full semver
    const bestVersion = this.findBestVersion(
      versions.map((v) => v.version),
      versionRange
    );

    if (!bestVersion) {
      return null;
    }

    // Prefer .md over .yaml if both exist for the same version
    const matchedFiles = versions.filter((v) => v.version === bestVersion);
    const matchedFile = matchedFiles.find((f) => f.path.endsWith('.md')) || matchedFiles[0];
    if (!matchedFile) return null;

    const definition = await this.loader.loadTool(matchedFile.path);
    return { definition, path: matchedFile.path };
  }

  /**
   * Find the best matching version using full npm semver range syntax.
   *
   * Supports: ^, ~, >=, <=, >, <, =, ||, -, x, X, *
   *
   * Examples:
   * - "^1.0.0"      -> >=1.0.0 <2.0.0
   * - "~1.2.3"      -> >=1.2.3 <1.3.0
   * - ">=1.0.0"     -> Any version >= 1.0.0
   * - "1.x"         -> Any 1.x.x version
   * - ">=1.0.0 <2.0.0 || >=3.0.0" -> Complex range
   */
  private findBestVersion(available: string[], range: string): string | null {
    // Handle 'latest' as '*'
    const normalizedRange = range === 'latest' ? '*' : range;

    // Validate range
    if (!semver.validRange(normalizedRange)) {
      logger.warn(`Invalid semver range: ${range}, treating as exact match`);
      return available.includes(range) ? range : null;
    }

    // Filter to satisfying versions
    const satisfying = available.filter((v) => semver.satisfies(v, normalizedRange));

    if (satisfying.length === 0) {
      return null;
    }

    // Return highest satisfying version
    return semver.maxSatisfying(satisfying, normalizedRange);
  }

  /**
   * Check if version satisfies constraint
   */
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
  private parseName(name: string): ParsedName {
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

  /**
   * Get local path for definition
   *
   * Supports both formats:
   * - agents/{agent-name}/agent.md (preferred)
   * - agents/{agent-name}/agent.yaml (legacy)
   * - tools/{tool-name}/tool.md (preferred)
   * - tools/{tool-name}/tool.yaml (legacy)
   */
  private getLocalPath(type: 'agents' | 'tools', name: string): string {
    const fileName = type === 'agents' ? 'agent' : 'tool';
    const basePath = path.join(process.cwd(), '.fractary', type, name);

    // Prefer .md over .yaml
    const mdPath = path.join(basePath, `${fileName}.md`);
    const yamlPath = path.join(basePath, `${fileName}.yaml`);

    // Check if .md exists first
    if (fs.existsSync(mdPath)) {
      return mdPath;
    }

    // Fall back to .yaml for backward compatibility
    return yamlPath;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
