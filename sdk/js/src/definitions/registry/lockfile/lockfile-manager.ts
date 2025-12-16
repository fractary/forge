/**
 * Lockfile manager for version pinning and integrity checking
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import type { DefinitionResolver } from '../resolver';
import type {
  Lockfile,
  LockfileGenerateOptions,
  LockfileValidationResult,
  LockfileEntry,
  LockfileDependencies,
} from './types';
import { calculateIntegrity, verifyIntegrity } from './integrity';
import { discoverUsedAgents, discoverUsedTools } from './discovery';

export class LockfileManager {
  private lockfilePath: string;

  constructor(
    private resolver: DefinitionResolver,
    projectRoot: string = process.cwd()
  ) {
    this.lockfilePath = path.join(
      projectRoot,
      '.fractary/plugins/forge/lockfile.json'
    );
  }

  /**
   * Generate lockfile from project usage
   */
  async generate(options: LockfileGenerateOptions = {}): Promise<Lockfile> {
    logger.info('Generating lockfile...');

    // Check if lockfile exists
    if (!options.force && (await fs.pathExists(this.lockfilePath))) {
      logger.warn('Lockfile already exists. Use --force to regenerate.');
      return await this.load();
    }

    const lockfile: Lockfile = {
      version: 1,
      generated: new Date().toISOString(),
      agents: {},
      tools: {},
    };

    // Discover used agents
    const usedAgents = await discoverUsedAgents();
    logger.debug(`Discovered ${usedAgents.length} agent(s)`);

    // Resolve each agent
    for (const agentName of usedAgents) {
      try {
        const resolved = await this.resolver.resolveAgent(agentName);

        lockfile.agents[agentName] = {
          version: resolved.version,
          resolved: resolved.source,
          integrity: await calculateIntegrity(resolved.definition),
          dependencies: await this.resolveDependencies(resolved.definition),
        };

        logger.debug(`Locked agent: ${agentName}@${resolved.version}`);

        // Add agent's tools to lockfile
        for (const toolRef of resolved.definition.tools || []) {
          if (!lockfile.tools[toolRef]) {
            await this.addToolToLockfile(lockfile, toolRef);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to resolve agent ${agentName}: ${errorMessage}`);
        throw error;
      }
    }

    // Discover used tools (not already added via agents)
    const usedTools = await discoverUsedTools();
    for (const toolName of usedTools) {
      if (!lockfile.tools[toolName]) {
        await this.addToolToLockfile(lockfile, toolName);
      }
    }

    // Save lockfile
    await this.save(lockfile);

    // Validate if requested
    if (options.validate) {
      const validation = await this.validate(lockfile);
      if (!validation.valid) {
        logger.warn(`Lockfile validation warnings: ${JSON.stringify(validation.warnings)}`);
      }
    }

    logger.success(`Lockfile generated: ${this.lockfilePath}`);
    logger.info(`Locked ${Object.keys(lockfile.agents).length} agent(s) and ${Object.keys(lockfile.tools).length} tool(s)`);

    return lockfile;
  }

  /**
   * Load existing lockfile
   */
  async load(): Promise<Lockfile> {
    if (!(await fs.pathExists(this.lockfilePath))) {
      throw new ForgeError(
        DefinitionErrorCode.LOCKFILE_NOT_FOUND,
        `Lockfile not found. Run 'forge lock' to generate.\nExpected at: ${this.lockfilePath}`,
        { path: this.lockfilePath }
      );
    }

    try {
      const content = await fs.readFile(this.lockfilePath, 'utf-8');
      const lockfile = JSON.parse(content) as Lockfile;

      // Validate format
      if (lockfile.version !== 1) {
        throw new Error(`Unsupported lockfile version: ${lockfile.version}`);
      }

      logger.debug(`Loaded lockfile: ${Object.keys(lockfile.agents).length} agent(s), ${Object.keys(lockfile.tools).length} tool(s)`);

      return lockfile;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ForgeError(
        DefinitionErrorCode.LOCKFILE_PARSE_ERROR,
        `Failed to parse lockfile: ${errorMessage}`,
        { path: this.lockfilePath, error }
      );
    }
  }

  /**
   * Save lockfile
   */
  async save(lockfile: Lockfile): Promise<void> {
    await fs.ensureDir(path.dirname(this.lockfilePath));
    await fs.writeFile(
      this.lockfilePath,
      JSON.stringify(lockfile, null, 2),
      'utf-8'
    );
    logger.debug(`Saved lockfile to: ${this.lockfilePath}`);
  }

  /**
   * Validate lockfile against current definitions
   */
  async validate(lockfile?: Lockfile): Promise<LockfileValidationResult> {
    const lf = lockfile || (await this.load());
    const result: LockfileValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate agents
    for (const [name, entry] of Object.entries(lf.agents)) {
      try {
        const resolved = await this.resolver.resolveAgent(`${name}@${entry.version}`);

        // Check integrity
        const currentIntegrity = await calculateIntegrity(resolved.definition);
        if (currentIntegrity !== entry.integrity) {
          result.valid = false;
          result.errors.push({
            type: 'integrity_mismatch',
            name,
            expected: entry.integrity,
            actual: currentIntegrity,
          });
        }
      } catch (error) {
        result.valid = false;
        result.errors.push({
          type: 'missing',
          name,
        });
      }
    }

    // Validate tools
    for (const [name, entry] of Object.entries(lf.tools)) {
      try {
        const resolved = await this.resolver.resolveTool(`${name}@${entry.version}`);

        // Check integrity
        const currentIntegrity = await calculateIntegrity(resolved.definition);
        if (currentIntegrity !== entry.integrity) {
          result.valid = false;
          result.errors.push({
            type: 'integrity_mismatch',
            name,
            expected: entry.integrity,
            actual: currentIntegrity,
          });
        }
      } catch (error) {
        result.valid = false;
        result.errors.push({
          type: 'missing',
          name,
        });
      }
    }

    return result;
  }

  /**
   * Check if lockfile exists
   */
  async exists(): Promise<boolean> {
    return await fs.pathExists(this.lockfilePath);
  }

  /**
   * Get lockfile path
   */
  getPath(): string {
    return this.lockfilePath;
  }

  /**
   * Add tool to lockfile
   */
  private async addToolToLockfile(lockfile: Lockfile, toolName: string): Promise<void> {
    try {
      const resolved = await this.resolver.resolveTool(toolName);

      lockfile.tools[toolName] = {
        version: resolved.version,
        resolved: resolved.source,
        integrity: await calculateIntegrity(resolved.definition),
      };

      logger.debug(`Locked tool: ${toolName}@${resolved.version}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to resolve tool ${toolName}: ${errorMessage}`);
    }
  }

  /**
   * Resolve dependencies for an agent
   */
  private async resolveDependencies(definition: any): Promise<LockfileDependencies> {
    const deps: LockfileDependencies = {};

    if (definition.tools && definition.tools.length > 0) {
      deps.tools = {};
      for (const toolRef of definition.tools) {
        try {
          const resolved = await this.resolver.resolveTool(toolRef);
          deps.tools[toolRef] = resolved.version;
        } catch {
          // Tool not found, skip
          logger.debug(`Could not resolve tool dependency: ${toolRef}`);
        }
      }
    }

    // Future: Add agent dependencies when agents can depend on other agents
    // if (definition.agents && definition.agents.length > 0) {
    //   deps.agents = {};
    //   for (const agentRef of definition.agents) {
    //     const resolved = await this.resolver.resolveAgent(agentRef);
    //     deps.agents[agentRef] = resolved.version;
    //   }
    // }

    return deps;
  }
}
