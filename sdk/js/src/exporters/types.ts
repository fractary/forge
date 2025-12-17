/**
 * Exporter types and interfaces
 */

import type { AgentDefinition } from '../definitions/schemas/agent.js';
import type { ToolDefinition } from '../definitions/schemas/tool.js';

/**
 * Supported export formats
 */
export type ExportFormat = 'langchain' | 'claude' | 'n8n';

/**
 * Export options
 */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;

  /** Output directory */
  outputDir: string;

  /** Include source comments/documentation */
  includeComments?: boolean;

  /** Overwrite existing files */
  overwrite?: boolean;

  /** Format-specific options */
  formatOptions?: LangChainExportOptions | ClaudeExportOptions | N8nExportOptions;
}

/**
 * LangChain export options
 */
export interface LangChainExportOptions {
  /** Python version to target */
  pythonVersion?: '3.9' | '3.10' | '3.11' | '3.12';

  /** Include type hints */
  includeTypeHints?: boolean;

  /** Use async/await */
  useAsync?: boolean;

  /** Generate requirements.txt */
  generateRequirements?: boolean;

  /** LangChain version */
  langchainVersion?: string;
}

/**
 * Claude Code export options
 */
export interface ClaudeExportOptions {
  /** Export as slash commands */
  asSlashCommands?: boolean;

  /** Export as MCP tools */
  asMCPTools?: boolean;

  /** Include .claude directory structure */
  includeDirectoryStructure?: boolean;
}

/**
 * n8n export options
 */
export interface N8nExportOptions {
  /** n8n version */
  n8nVersion?: string;

  /** Include credentials placeholders */
  includeCredentials?: boolean;

  /** Workflow name */
  workflowName?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Export format */
  format: ExportFormat;

  /** Output directory */
  outputDir: string;

  /** Exported files */
  files: ExportedFile[];

  /** Summary of export */
  summary: ExportSummary;
}

/**
 * Exported file information
 */
export interface ExportedFile {
  /** File path relative to outputDir */
  path: string;

  /** File type */
  type: 'agent' | 'tool' | 'workflow' | 'config' | 'documentation';

  /** File size in bytes */
  size: number;

  /** Source component name */
  sourceName: string;
}

/**
 * Export summary
 */
export interface ExportSummary {
  /** Number of agents exported */
  agents: number;

  /** Number of tools exported */
  tools: number;

  /** Number of workflows exported */
  workflows: number;

  /** Total files generated */
  totalFiles: number;

  /** Total size in bytes */
  totalSize: number;

  /** Export duration in milliseconds */
  duration: number;
}

/**
 * Base exporter interface
 */
export interface IExporter {
  /**
   * Export format name
   */
  readonly format: ExportFormat;

  /**
   * Export an agent
   */
  exportAgent(agent: AgentDefinition, options: ExportOptions): Promise<ExportedFile[]>;

  /**
   * Export a tool
   */
  exportTool(tool: ToolDefinition, options: ExportOptions): Promise<ExportedFile[]>;

  /**
   * Export multiple components
   */
  exportAll(
    components: {
      agents?: AgentDefinition[];
      tools?: ToolDefinition[];
    },
    options: ExportOptions
  ): Promise<ExportResult>;
}
