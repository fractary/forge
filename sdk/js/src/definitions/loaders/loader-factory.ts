/**
 * Loader factory for auto-detecting file format
 * Selects appropriate loader based on file extension
 */

import { YAMLLoader } from './yaml-loader';
import { MarkdownLoader } from './markdown-loader';
import { ForgeError } from '../../errors/forge-error';
import { ErrorCode } from '../../errors/codes';
import type { AgentDefinition, ToolDefinition } from '../schemas';

export class LoaderFactory {
  private yamlLoader = new YAMLLoader();
  private markdownLoader = new MarkdownLoader();

  /**
   * Load agent from file, auto-detecting format
   */
  async loadAgent(filePath: string): Promise<AgentDefinition> {
    if (filePath.endsWith('.md')) {
      return this.markdownLoader.loadAgent(filePath);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return this.yamlLoader.loadAgent(filePath);
    }

    throw new ForgeError(
      ErrorCode.INVALID_ARGUMENT,
      `Unsupported file format: ${filePath}. Expected .md, .yaml, or .yml`,
      { filePath }
    );
  }

  /**
   * Load tool from file, auto-detecting format
   */
  async loadTool(filePath: string): Promise<ToolDefinition> {
    if (filePath.endsWith('.md')) {
      return this.markdownLoader.loadTool(filePath);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return this.yamlLoader.loadTool(filePath);
    }

    throw new ForgeError(
      ErrorCode.INVALID_ARGUMENT,
      `Unsupported file format: ${filePath}. Expected .md, .yaml, or .yml`,
      { filePath }
    );
  }
}
