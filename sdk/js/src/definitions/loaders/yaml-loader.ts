/**
 * YAML loader for agent and tool definitions
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DefinitionValidator } from './validator';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class YAMLLoader {
  private validator = new DefinitionValidator();

  /**
   * Load agent definition from YAML file
   */
  async loadAgent(filePath: string): Promise<AgentDefinition> {
    logger.debug(`Loading agent definition from: ${filePath}`);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.AGENT_NOT_FOUND,
        `Agent definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse YAML
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
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load tool definition from YAML file
   */
  async loadTool(filePath: string): Promise<ToolDefinition> {
    logger.debug(`Loading tool definition from: ${filePath}`);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new ForgeError(
        DefinitionErrorCode.TOOL_NOT_FOUND,
        `Tool definition file not found: ${filePath}`,
        { filePath }
      );
    }

    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse YAML
      const data = yaml.load(content);

      // Validate schema
      const definition = this.validator.validateTool(data);

      logger.debug(`Successfully loaded tool: ${definition.name}`);
      return definition;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
        { filePath, error }
      );
    }
  }

  /**
   * Load agent definition from YAML string
   */
  loadAgentFromString(yamlContent: string, sourceName = 'string'): AgentDefinition {
    try {
      const data = yaml.load(yamlContent);
      return this.validator.validateAgent(data);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse YAML from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }

  /**
   * Load tool definition from YAML string
   */
  loadToolFromString(yamlContent: string, sourceName = 'string'): ToolDefinition {
    try {
      const data = yaml.load(yamlContent);
      return this.validator.validateTool(data);
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      throw new ForgeError(
        DefinitionErrorCode.YAML_PARSE_ERROR,
        `Failed to parse YAML from ${sourceName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { sourceName, error }
      );
    }
  }
}
