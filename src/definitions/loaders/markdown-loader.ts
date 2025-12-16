/**
 * Markdown loader for agent and tool definitions
 * Parses YAML frontmatter and extracts Markdown body as system_prompt
 */

import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DefinitionValidator } from './validator';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class MarkdownLoader {
  private validator = new DefinitionValidator();

  /**
   * Load agent definition from Markdown file with YAML frontmatter
   */
  async loadAgent(filePath: string): Promise<AgentDefinition> {
    logger.debug(`Loading agent definition from: ${filePath}`);

    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Agent definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter and body
      const { data: frontmatter, content: markdown } = matter(content);

      // Validate non-empty body (system prompt is required)
      const systemPrompt = markdown.trim();
      if (!systemPrompt) {
        throw new ForgeError(
          DefinitionErrorCode.EMPTY_SYSTEM_PROMPT,
          'Agent definition requires a non-empty system prompt in Markdown body',
          { filePath }
        );
      }

      // Merge frontmatter with markdown body as system_prompt
      // Body content always wins over any frontmatter system_prompt
      const definition: AgentDefinition = {
        ...frontmatter,
        system_prompt: systemPrompt
      } as AgentDefinition;

      // Validate schema
      const validated = this.validator.validateAgent(definition);

      logger.debug(`Successfully loaded agent: ${validated.name}`);
      return validated;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown/YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load tool definition from Markdown file with YAML frontmatter
   */
  async loadTool(filePath: string): Promise<ToolDefinition> {
    logger.debug(`Loading tool definition from: ${filePath}`);

    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_NOT_FOUND,
        `Tool definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter and body
      const { data: frontmatter, content: markdown } = matter(content);

      // For tools, markdown body becomes extended_description
      const definition = {
        ...frontmatter,
        extended_description: markdown.trim() || undefined
      } as unknown as ToolDefinition;

      // Validate schema
      const validated = this.validator.validateTool(definition);

      logger.debug(`Successfully loaded tool: ${validated.name}`);
      return validated;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown/YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load agent from Markdown string
   */
  loadAgentFromString(content: string, sourceName = 'string'): AgentDefinition {
    try {
      const { data: frontmatter, content: markdown } = matter(content);

      // Validate non-empty body (system prompt is required)
      const systemPrompt = markdown.trim();
      if (!systemPrompt) {
        throw new ForgeError(
          DefinitionErrorCode.EMPTY_SYSTEM_PROMPT,
          'Agent definition requires a non-empty system prompt in Markdown body',
          { sourceName }
        );
      }

      const definition = {
        ...frontmatter,
        system_prompt: systemPrompt
      } as AgentDefinition;

      return this.validator.validateAgent(definition);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }

  /**
   * Load tool from Markdown string
   */
  loadToolFromString(content: string, sourceName = 'string'): ToolDefinition {
    try {
      const { data: frontmatter, content: markdown } = matter(content);

      const definition = {
        ...frontmatter,
        extended_description: markdown.trim() || undefined
      } as unknown as ToolDefinition;

      return this.validator.validateTool(definition);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse Markdown from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }
}
