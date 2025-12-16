/**
 * Exporters module - convert Fractary YAML to various formats
 */

export * from './types.js';
export { LangChainExporter } from './langchain-exporter.js';
export { ClaudeExporter } from './claude-exporter.js';
export { N8nExporter } from './n8n-exporter.js';

import { LangChainExporter } from './langchain-exporter.js';
import { ClaudeExporter } from './claude-exporter.js';
import { N8nExporter } from './n8n-exporter.js';
import type { IExporter, ExportFormat, ExportOptions, ExportResult } from './types.js';
import type { AgentDefinition } from '../definitions/schemas/agent.js';
import type { ToolDefinition } from '../definitions/schemas/tool.js';

/**
 * Main exporter class - factory for format-specific exporters
 */
export class Exporter {
  private exporters: Map<ExportFormat, IExporter>;

  constructor() {
    this.exporters = new Map<ExportFormat, IExporter>([
      ['langchain', new LangChainExporter()],
      ['claude', new ClaudeExporter()],
      ['n8n', new N8nExporter()],
    ]);
  }

  /**
   * Get exporter for a specific format
   */
  getExporter(format: ExportFormat): IExporter {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    return exporter;
  }

  /**
   * Export components to a specific format
   */
  async export(
    components: {
      agents?: AgentDefinition[];
      tools?: ToolDefinition[];
    },
    options: ExportOptions
  ): Promise<ExportResult> {
    const exporter = this.getExporter(options.format);
    return exporter.exportAll(components, options);
  }

  /**
   * Export a single agent
   */
  async exportAgent(
    agent: AgentDefinition,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exporter = this.getExporter(options.format);
    const files = await exporter.exportAgent(agent, options);

    return {
      format: options.format,
      outputDir: options.outputDir,
      files,
      summary: {
        agents: 1,
        tools: 0,
        workflows: 0,
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        duration: 0,
      },
    };
  }

  /**
   * Export a single tool
   */
  async exportTool(
    tool: ToolDefinition,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exporter = this.getExporter(options.format);
    const files = await exporter.exportTool(tool, options);

    return {
      format: options.format,
      outputDir: options.outputDir,
      files,
      summary: {
        agents: 0,
        tools: 1,
        workflows: 0,
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        duration: 0,
      },
    };
  }

  /**
   * Get list of supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }
}

// Singleton instance for convenience
export const exporter = new Exporter();

/**
 * Convenience function to export components
 */
export async function exportComponents(
  components: {
    agents?: AgentDefinition[];
    tools?: ToolDefinition[];
  },
  options: ExportOptions
): Promise<ExportResult> {
  return exporter.export(components, options);
}
