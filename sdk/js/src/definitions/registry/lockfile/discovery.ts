/**
 * Discovery utilities for finding agents and tools used in a project
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import { logger } from '../../../logger';

/**
 * Discover agents used in the project
 *
 * Scans:
 * 1. .fractary/agents/ for local agents
 * 2. Configuration files for agent references
 * 3. Workflow files (if FABER integration exists)
 */
export async function discoverUsedAgents(): Promise<string[]> {
  const agents = new Set<string>();

  // 1. Scan .fractary/agents/ for local agents
  const localAgentsPath = path.join(process.cwd(), '.fractary/agents');
  if (await fs.pathExists(localAgentsPath)) {
    const files = await glob(path.join(localAgentsPath, '*.yaml'));
    for (const file of files) {
      const name = path.basename(file, '.yaml');
      agents.add(name);
      logger.debug(`Discovered local agent: ${name}`);
    }
  }

  // 2. Scan configuration files for agent references
  const configPath = path.join(process.cwd(), '.fractary/plugins/forge/config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      if (config.agents) {
        for (const agentName of Object.keys(config.agents)) {
          agents.add(agentName);
          logger.debug(`Discovered configured agent: ${agentName}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to parse config: ${errorMessage}`);
    }
  }

  // 3. Scan workflow files (if FABER integration exists)
  // TODO: Implement workflow scanning when FABER integration is added
  const workflowPath = path.join(process.cwd(), '.fractary/workflows');
  if (await fs.pathExists(workflowPath)) {
    try {
      const files = await glob(path.join(workflowPath, '**/*.{yaml,yml,json}'));
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        // Simple regex to find agent references
        // This is a placeholder - actual implementation should parse workflow DSL
        const agentRefs = content.match(/agent:\s*([a-zA-Z0-9\-_:]+)/g);
        if (agentRefs) {
          for (const ref of agentRefs) {
            const name = ref.split(':')[1]?.trim();
            if (name) {
              agents.add(name);
              logger.debug(`Discovered workflow agent: ${name}`);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to scan workflows: ${errorMessage}`);
    }
  }

  return Array.from(agents);
}

/**
 * Discover tools used in the project
 *
 * Scans:
 * 1. .fractary/tools/ for local tools
 * 2. Configuration files for tool references
 */
export async function discoverUsedTools(): Promise<string[]> {
  const tools = new Set<string>();

  // 1. Scan .fractary/tools/ for local tools
  const localToolsPath = path.join(process.cwd(), '.fractary/tools');
  if (await fs.pathExists(localToolsPath)) {
    const files = await glob(path.join(localToolsPath, '*.yaml'));
    for (const file of files) {
      const name = path.basename(file, '.yaml');
      tools.add(name);
      logger.debug(`Discovered local tool: ${name}`);
    }
  }

  // 2. Scan configuration files for tool references
  const configPath = path.join(process.cwd(), '.fractary/plugins/forge/config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      if (config.tools) {
        for (const toolName of Object.keys(config.tools)) {
          tools.add(toolName);
          logger.debug(`Discovered configured tool: ${toolName}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to parse config: ${errorMessage}`);
    }
  }

  return Array.from(tools);
}
