/**
 * Public Agent API
 */

import { logger } from '../../logger';
import { ForgeError, isForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DefinitionResolver } from '../registry/resolver';
import { AgentFactory } from '../factory/agent-factory';
import { PromptCacheManager } from '../caching/cache-manager';
import type {
  ExecutableAgentInterface,
  AgentResult,
  AgentInfo,
  HealthCheckResult,
} from './types';

export class AgentAPI {
  private resolver: DefinitionResolver;
  private factory = new AgentFactory();
  private cacheManager = new PromptCacheManager();

  constructor(config?: any) {
    this.resolver = new DefinitionResolver(config?.definitions?.registry);
  }

  /**
   * Resolve and load an executable agent
   */
  async resolveAgent(name: string): Promise<ExecutableAgentInterface> {
    logger.info(`AgentAPI: Resolving agent ${name}`);

    // Resolve definition
    const resolved = await this.resolver.resolveAgent(name);

    // Create executable agent
    const executableAgent = await this.factory.createAgent(resolved.definition);

    return {
      name: resolved.definition.name,
      version: resolved.version,
      invoke: async (task: string, context?: Record<string, any>) => {
        // Placeholder for actual LangChain invocation
        // In a real implementation, this would call the LangChain agent
        const result: AgentResult = {
          output: `Placeholder result for task: ${task}`,
          messages: [],
        };

        // Attempt to parse structured output
        let structured_output: any = undefined;
        try {
          if (result.output && typeof result.output === 'string') {
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

  /**
   * Check if an agent exists
   */
  async hasAgent(name: string): Promise<boolean> {
    try {
      await this.resolver.resolveAgent(name);
      return true;
    } catch (error) {
      if (isForgeError(error) && error.code === 'AGENT_NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get agent information
   */
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
   * Health check for CI/CD validation
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
      result.checks.tools =
        missingTools.length === 0
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
      result.checks.cache_sources =
        inaccessible.length === 0
          ? { passed: true }
          : { passed: false, inaccessible };

      // Overall health
      result.healthy = Object.values(result.checks).every((c) => c.passed);
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
   * Refresh prompt cache for an agent
   */
  async refreshCache(name: string): Promise<void> {
    logger.info(`Refreshing cache for agent: ${name}`);
    const resolved = await this.resolver.resolveAgent(name);

    if (resolved.definition.caching?.enabled) {
      await this.cacheManager.invalidate(name);
      await this.cacheManager.preload(resolved.definition);
    }
  }

  /**
   * List available agents
   */
  async listAgents(filters?: { tags?: string[] }): Promise<AgentInfo[]> {
    // TODO: Implement listing logic
    logger.warn('listAgents not yet fully implemented');
    return [];
  }
}
