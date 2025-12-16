/**
 * Fork manager for agent/tool forking and upstream merging
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as semver from 'semver';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import type { ManifestManager } from '../manifest/manifest-manager';
import type { ForkOptions, MergeOptions, MergeResult } from './types';
import { performMerge, resolveConflicts } from './merge';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

export class ForkManager {
  constructor(
    private resolver: DefinitionResolver,
    private manifestManager: ManifestManager
  ) {}

  /**
   * Fork an agent to local registry
   */
  async forkAgent(options: ForkOptions): Promise<void> {
    const { sourceName, targetName, customizations } = options;

    logger.info(`Forking agent: ${sourceName} → ${targetName}`);

    // 1. Resolve source agent
    const source = await this.resolver.resolveAgent(sourceName);

    // 2. Create forked definition
    const forked: any = {
      ...source.definition,
      name: targetName,
      fork_of: {
        name: sourceName,
        version: source.version,
        forked_at: new Date().toISOString(),
      },
      ...customizations,
    };

    // 3. Save to local registry
    const targetPath = path.join(process.cwd(), '.fractary/agents', `${targetName}.yaml`);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, yaml.dump(forked), 'utf-8');

    // 4. Track fork in manifest
    await this.manifestManager.trackFork(sourceName, targetName);

    logger.success(`Forked ${sourceName}@${source.version} → ${targetName}`);
    logger.info(`Edit at: ${targetPath}`);
  }

  /**
   * Fork a tool to local registry
   */
  async forkTool(options: ForkOptions): Promise<void> {
    const { sourceName, targetName, customizations } = options;

    logger.info(`Forking tool: ${sourceName} → ${targetName}`);

    // 1. Resolve source tool
    const source = await this.resolver.resolveTool(sourceName);

    // 2. Create forked definition
    const forked: any = {
      ...source.definition,
      name: targetName,
      fork_of: {
        name: sourceName,
        version: source.version,
        forked_at: new Date().toISOString(),
      },
      ...customizations,
    };

    // 3. Save to local registry
    const targetPath = path.join(process.cwd(), '.fractary/tools', `${targetName}.yaml`);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, yaml.dump(forked), 'utf-8');

    // 4. Track fork in manifest
    await this.manifestManager.trackFork(sourceName, targetName);

    logger.success(`Forked ${sourceName}@${source.version} → ${targetName}`);
    logger.info(`Edit at: ${targetPath}`);
  }

  /**
   * Check for upstream updates for an agent
   */
  async checkAgentUpstreamUpdates(forkedName: string): Promise<{
    hasUpdate: boolean;
    current: string;
    latest: string;
  }> {
    // Load forked agent
    const forkedPath = path.join(process.cwd(), '.fractary/agents', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as any;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Check upstream for updates
    const upstream = await this.resolver.resolveAgent(forked.fork_of.name);
    const hasUpdate = semver.gt(upstream.version, forked.fork_of.version);

    if (hasUpdate) {
      logger.info(
        `Upstream update available: ${forked.fork_of.version} → ${upstream.version}`
      );
    } else {
      logger.success('Fork is up to date with upstream');
    }

    return {
      hasUpdate,
      current: forked.fork_of.version,
      latest: upstream.version,
    };
  }

  /**
   * Check for upstream updates for a tool
   */
  async checkToolUpstreamUpdates(forkedName: string): Promise<{
    hasUpdate: boolean;
    current: string;
    latest: string;
  }> {
    // Load forked tool
    const forkedPath = path.join(process.cwd(), '.fractary/tools', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as any;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Check upstream for updates
    const upstream = await this.resolver.resolveTool(forked.fork_of.name);
    const hasUpdate = semver.gt(upstream.version, forked.fork_of.version);

    if (hasUpdate) {
      logger.info(
        `Upstream update available: ${forked.fork_of.version} → ${upstream.version}`
      );
    } else {
      logger.success('Fork is up to date with upstream');
    }

    return {
      hasUpdate,
      current: forked.fork_of.version,
      latest: upstream.version,
    };
  }

  /**
   * Merge upstream changes into forked agent
   */
  async mergeUpstreamAgent(forkedName: string, options: MergeOptions = {}): Promise<MergeResult> {
    logger.info(`Merging upstream changes for agent: ${forkedName}`);

    // Load forked agent
    const forkedPath = path.join(process.cwd(), '.fractary/agents', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as any;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Fetch base version (original fork point)
    const base = await this.getBaseVersion(forked.fork_of.name, forked.fork_of.version);

    // Fetch latest upstream
    const upstream = await this.resolver.resolveAgent(forked.fork_of.name);

    // Perform 3-way merge
    let mergeResult = await performMerge({
      base,
      local: forked,
      upstream: upstream.definition,
    });

    // Handle conflicts based on strategy
    if (!mergeResult.success) {
      if (options.strategy === 'local' || options.strategy === 'upstream') {
        // Auto-resolve conflicts
        mergeResult = resolveConflicts(mergeResult, options.strategy);
      } else {
        // 'auto' or 'manual' - return conflicts for user to handle
        logger.error('Merge conflicts detected. Manual resolution required.');
        return mergeResult;
      }
    }

    // Update fork metadata
    mergeResult.merged.fork_of = {
      ...forked.fork_of,
      version: upstream.version,
      merged_at: new Date().toISOString(),
    };

    // Save merged definition
    await fs.writeFile(forkedPath, yaml.dump(mergeResult.merged), 'utf-8');

    logger.success('Upstream changes merged successfully');
    return mergeResult;
  }

  /**
   * Merge upstream changes into forked tool
   */
  async mergeUpstreamTool(forkedName: string, options: MergeOptions = {}): Promise<MergeResult> {
    logger.info(`Merging upstream changes for tool: ${forkedName}`);

    // Load forked tool
    const forkedPath = path.join(process.cwd(), '.fractary/tools', `${forkedName}.yaml`);
    const content = await fs.readFile(forkedPath, 'utf-8');
    const forked = yaml.load(content) as any;

    if (!forked.fork_of) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_INVALID,
        `${forkedName} is not a fork`,
        { name: forkedName }
      );
    }

    // Fetch base version (original fork point)
    const base = await this.getBaseVersion(forked.fork_of.name, forked.fork_of.version);

    // Fetch latest upstream
    const upstream = await this.resolver.resolveTool(forked.fork_of.name);

    // Perform 3-way merge
    let mergeResult = await performMerge({
      base,
      local: forked,
      upstream: upstream.definition,
    });

    // Handle conflicts based on strategy
    if (!mergeResult.success) {
      if (options.strategy === 'local' || options.strategy === 'upstream') {
        // Auto-resolve conflicts
        mergeResult = resolveConflicts(mergeResult, options.strategy);
      } else {
        // 'auto' or 'manual' - return conflicts for user to handle
        logger.error('Merge conflicts detected. Manual resolution required.');
        return mergeResult;
      }
    }

    // Update fork metadata
    mergeResult.merged.fork_of = {
      ...forked.fork_of,
      version: upstream.version,
      merged_at: new Date().toISOString(),
    };

    // Save merged definition
    await fs.writeFile(forkedPath, yaml.dump(mergeResult.merged), 'utf-8');

    logger.success('Upstream changes merged successfully');
    return mergeResult;
  }

  /**
   * Get the base version of a definition (the version at fork point)
   */
  private async getBaseVersion(name: string, version: string): Promise<any> {
    // Try to resolve the specific version
    // This assumes the resolver can handle version-specific requests
    try {
      const resolved = await this.resolver.resolveAgent(`${name}@${version}`);
      return resolved.definition;
    } catch {
      // If specific version not found, try as tool
      try {
        const resolved = await this.resolver.resolveTool(`${name}@${version}`);
        return resolved.definition;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ForgeError(
          DefinitionErrorCode.VERSION_NOT_FOUND,
          `Cannot find base version ${name}@${version}: ${errorMessage}`,
          { name, version, error }
        );
      }
    }
  }
}
