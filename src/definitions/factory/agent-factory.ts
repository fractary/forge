/**
 * Agent factory for creating executable agents
 */

import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { LangChainFactory } from './langchain';
import {
  AnthropicToolAdapter,
  OpenAIToolAdapter,
  GoogleToolAdapter,
  type IToolAdapter,
} from './tool-adapters';
import type { AgentDefinition } from '../schemas';

export interface ExecutableAgent {
  name: string;
  version: string;
  llm: any; // LangChain LLM instance
  tools: any[]; // Adapted tools
  systemPrompt: string;
  config: Record<string, any>;
}

export class AgentFactory {
  private langchainFactory = new LangChainFactory();
  private toolAdapters: Map<string, IToolAdapter>;

  constructor() {
    this.toolAdapters = new Map<string, IToolAdapter>([
      ['anthropic', new AnthropicToolAdapter()],
      ['openai', new OpenAIToolAdapter()],
      ['google', new GoogleToolAdapter()],
    ]);
  }

  /**
   * Create executable agent from definition
   */
  async createAgent(definition: AgentDefinition): Promise<ExecutableAgent> {
    logger.debug(`Creating agent: ${definition.name}`);

    try {
      // Create LLM instance
      const llm = this.langchainFactory.createLLM(definition.llm);

      // Get tool adapter for this provider
      const adapter = this.toolAdapters.get(definition.llm.provider);
      if (!adapter) {
        throw new ForgeError(
          DefinitionErrorCode.AGENT_INVALID,
          `No tool adapter found for provider: ${definition.llm.provider}`,
          { provider: definition.llm.provider }
        );
      }

      // Convert custom tools to provider format
      const tools = (definition.custom_tools || []).map((tool) =>
        adapter.adaptTool(tool)
      );

      return {
        name: definition.name,
        version: definition.version,
        llm,
        tools,
        systemPrompt: definition.system_prompt || '',
        config: definition.config || {},
      };
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.AGENT_LOAD_FAILED,
        `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
        { agent: definition.name, error }
      );
    }
  }
}
