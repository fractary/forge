/**
 * LangChain factory for creating LLM instances
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import type { LLMConfig } from '../schemas';

export class LangChainFactory {
  /**
   * Create LLM instance from configuration
   */
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
