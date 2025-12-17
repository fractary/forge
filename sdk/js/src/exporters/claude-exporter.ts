/**
 * Claude Code exporter - converts Fractary YAML to Claude Code format
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { AgentDefinition } from '../definitions/schemas/agent.js';
import type { ToolDefinition } from '../definitions/schemas/tool.js';
import type {
  IExporter,
  ExportOptions,
  ExportedFile,
  ExportResult,
  ClaudeExportOptions,
} from './types.js';

/**
 * Claude Code exporter implementation
 */
export class ClaudeExporter implements IExporter {
  readonly format = 'claude' as const;

  async exportAgent(agent: AgentDefinition, options: ExportOptions): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    const formatOptions = (options.formatOptions || {}) as ClaudeExportOptions;

    // Generate agent markdown file
    const agentMarkdown = this.generateAgentMarkdown(agent);
    const agentFilePath = path.join(options.outputDir, '.claude', 'agents', `${agent.name}.md`);

    await fs.ensureDir(path.dirname(agentFilePath));
    await fs.writeFile(agentFilePath, agentMarkdown);

    files.push({
      path: path.relative(options.outputDir, agentFilePath),
      type: 'agent',
      size: Buffer.byteLength(agentMarkdown),
      sourceName: agent.name,
    });

    // Export custom tools as slash commands or MCP tools
    if (agent.custom_tools && agent.custom_tools.length > 0) {
      for (const tool of agent.custom_tools) {
        if (formatOptions.asSlashCommands) {
          const commandFiles = await this.exportToolAsCommand(tool, options);
          files.push(...commandFiles);
        } else if (formatOptions.asMCPTools) {
          const mcpFiles = await this.exportToolAsMCP(tool, options);
          files.push(...mcpFiles);
        } else {
          // Default: export as tool definition
          const toolFiles = await this.exportTool(tool, options);
          files.push(...toolFiles);
        }
      }
    }

    return files;
  }

  async exportTool(tool: ToolDefinition, options: ExportOptions): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate tool definition file
    const toolMarkdown = this.generateToolMarkdown(tool);
    const toolFilePath = path.join(options.outputDir, '.claude', 'tools', `${tool.name}.md`);

    await fs.ensureDir(path.dirname(toolFilePath));
    await fs.writeFile(toolFilePath, toolMarkdown);

    files.push({
      path: path.relative(options.outputDir, toolFilePath),
      type: 'tool',
      size: Buffer.byteLength(toolMarkdown),
      sourceName: tool.name,
    });

    return files;
  }

  async exportAll(
    components: {
      agents?: AgentDefinition[];
      tools?: ToolDefinition[];
    },
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const files: ExportedFile[] = [];

    // Ensure output directory exists
    await fs.ensureDir(options.outputDir);

    // Export agents
    if (components.agents) {
      for (const agent of components.agents) {
        const agentFiles = await this.exportAgent(agent, options);
        files.push(...agentFiles);
      }
    }

    // Export tools
    if (components.tools) {
      for (const tool of components.tools) {
        const toolFiles = await this.exportTool(tool, options);
        files.push(...toolFiles);
      }
    }

    // Generate .claude directory structure files if requested
    const formatOptions = (options.formatOptions || {}) as ClaudeExportOptions;
    if (formatOptions.includeDirectoryStructure !== false) {
      const structureFiles = await this.generateClaudeStructure(options.outputDir, components);
      files.push(...structureFiles);
    }

    const duration = Date.now() - startTime;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      format: this.format,
      outputDir: options.outputDir,
      files,
      summary: {
        agents: components.agents?.length || 0,
        tools: components.tools?.length || 0,
        workflows: 0,
        totalFiles: files.length,
        totalSize,
        duration,
      },
    };
  }

  /**
   * Generate agent markdown for Claude Code
   */
  private generateAgentMarkdown(agent: AgentDefinition): string {
    let md = `# ${agent.name}\n\n`;
    md += `${agent.description}\n\n`;

    // Metadata
    md += `**Version:** ${agent.version}\n`;
    if (agent.author) {
      md += `**Author:** ${agent.author}\n`;
    }
    if (agent.tags && agent.tags.length > 0) {
      md += `**Tags:** ${agent.tags.join(', ')}\n`;
    }
    md += '\n';

    // Model configuration
    md += '## Model Configuration\n\n';
    md += `- **Provider:** ${agent.llm.provider}\n`;
    md += `- **Model:** ${agent.llm.model}\n`;
    md += `- **Temperature:** ${agent.llm.temperature || 0.7}\n`;
    md += `- **Max Tokens:** ${agent.llm.max_tokens || 4096}\n`;
    md += '\n';

    // System prompt
    md += '## System Prompt\n\n';
    md += '```\n';
    md += agent.system_prompt;
    md += '\n```\n\n';

    // Tools
    if (agent.tools && agent.tools.length > 0) {
      md += '## Available Tools\n\n';
      for (const toolName of agent.tools) {
        md += `- \`${toolName}\`\n`;
      }
      md += '\n';
    }

    // Custom tools
    if (agent.custom_tools && agent.custom_tools.length > 0) {
      md += '## Custom Tools\n\n';
      for (const tool of agent.custom_tools) {
        md += `### ${tool.name}\n\n`;
        md += `${tool.description}\n\n`;
        md += '**Parameters:**\n';
        for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
          md += `- \`${paramName}\` (${paramDef.type})${paramDef.required ? ' *required*' : ''}: ${paramDef.description}\n`;
        }
        md += '\n';
      }
    }

    // Caching configuration
    if (agent.caching?.enabled) {
      md += '## Prompt Caching\n\n';
      md += 'Prompt caching is enabled for this agent.\n\n';
      if (agent.caching.cache_sources && agent.caching.cache_sources.length > 0) {
        md += '**Cached Content:**\n';
        for (const source of agent.caching.cache_sources) {
          md += `- ${source.label} (${source.type})\n`;
        }
        md += '\n';
      }
    }

    // Usage example
    md += '## Usage\n\n';
    md += 'To use this agent in Claude Code:\n\n';
    md += '```bash\n';
    md += `claude chat --agent ${agent.name}\n`;
    md += '```\n\n';
    md += 'Or reference in a conversation:\n\n';
    md += '```\n';
    md += `Use @${agent.name} to help with this task\n`;
    md += '```\n\n';

    // Footer
    md += '---\n\n';
    md += '*Generated from Fractary YAML by @fractary/forge*\n';

    return md;
  }

  /**
   * Generate tool markdown for Claude Code
   */
  private generateToolMarkdown(tool: ToolDefinition): string {
    let md = `# ${tool.name}\n\n`;
    md += `${tool.description}\n\n`;

    // Metadata
    md += `**Version:** ${tool.version}\n`;
    if (tool.author) {
      md += `**Author:** ${tool.author}\n`;
    }
    if (tool.tags && tool.tags.length > 0) {
      md += `**Tags:** ${tool.tags.join(', ')}\n`;
    }
    md += '\n';

    // Parameters
    md += '## Parameters\n\n';
    const params = Object.entries(tool.parameters);
    if (params.length > 0) {
      md += '| Parameter | Type | Required | Description |\n';
      md += '|-----------|------|----------|-------------|\n';
      for (const [paramName, paramDef] of params) {
        md += `| \`${paramName}\` | ${paramDef.type} | ${paramDef.required ? 'Yes' : 'No'} | ${paramDef.description} |\n`;
      }
      md += '\n';
    } else {
      md += 'No parameters required.\n\n';
    }

    // Implementation
    md += '## Implementation\n\n';
    md += `**Type:** ${tool.implementation.type}\n\n`;

    if (tool.implementation.type === 'bash') {
      md += '**Command:**\n\n';
      md += '```bash\n';
      md += tool.implementation.bash.command;
      md += '\n```\n\n';

      if (tool.implementation.bash.sandbox) {
        md += '**Sandbox:** Enabled\n\n';
        if (tool.implementation.bash.sandbox.allowlisted_commands) {
          md += '**Allowed Commands:**\n';
          for (const cmd of tool.implementation.bash.sandbox.allowlisted_commands) {
            md += `- \`${cmd}\`\n`;
          }
          md += '\n';
        }
      }
    } else if (tool.implementation.type === 'python') {
      md += '**Module:** `' + tool.implementation.python.module + '`\n';
      md += '**Function:** `' + tool.implementation.python.function + '`\n\n';
    } else if (tool.implementation.type === 'http') {
      md += `**Method:** ${tool.implementation.http.method}\n`;
      md += `**URL:** ${tool.implementation.http.url}\n\n`;

      if (tool.implementation.http.headers) {
        md += '**Headers:**\n';
        for (const [key, value] of Object.entries(tool.implementation.http.headers)) {
          md += `- \`${key}\`: ${value}\n`;
        }
        md += '\n';
      }
    }

    // Dependencies
    if (tool.depends_on && tool.depends_on.length > 0) {
      md += '## Dependencies\n\n';
      md += 'This tool depends on:\n\n';
      for (const dep of tool.depends_on) {
        md += `- \`${dep}\`\n`;
      }
      md += '\n';
    }

    // Usage example
    md += '## Usage\n\n';
    md += 'To use this tool in Claude Code:\n\n';
    md += '```\n';
    md += `Use the ${tool.name} tool to [describe task]\n`;
    md += '```\n\n';

    // Footer
    md += '---\n\n';
    md += '*Generated from Fractary YAML by @fractary/forge*\n';

    return md;
  }

  /**
   * Export tool as slash command
   */
  private async exportToolAsCommand(
    tool: ToolDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate command markdown
    let md = `Use the ${tool.name} functionality:\n\n`;
    md += `${tool.description}\n\n`;

    const params = Object.entries(tool.parameters);
    if (params.length > 0) {
      md += 'Parameters needed:\n';
      for (const [paramName, paramDef] of params) {
        md += `- ${paramName}: ${paramDef.description}\n`;
      }
    }

    const commandFilePath = path.join(options.outputDir, '.claude', 'commands', `${tool.name}.md`);

    await fs.ensureDir(path.dirname(commandFilePath));
    await fs.writeFile(commandFilePath, md);

    files.push({
      path: path.relative(options.outputDir, commandFilePath),
      type: 'tool',
      size: Buffer.byteLength(md),
      sourceName: tool.name,
    });

    return files;
  }

  /**
   * Export tool as MCP tool definition
   */
  private async exportToolAsMCP(
    tool: ToolDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate MCP tool JSON
    const mcpTool = {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: this.generateMCPProperties(tool.parameters),
        required: Object.entries(tool.parameters)
          .filter(([, param]) => param.required)
          .map(([name]) => name),
      },
    };

    const toolJson = JSON.stringify(mcpTool, null, 2);
    const toolFilePath = path.join(
      options.outputDir,
      '.claude',
      'mcp',
      'tools',
      `${tool.name}.json`
    );

    await fs.ensureDir(path.dirname(toolFilePath));
    await fs.writeFile(toolFilePath, toolJson);

    files.push({
      path: path.relative(options.outputDir, toolFilePath),
      type: 'tool',
      size: Buffer.byteLength(toolJson),
      sourceName: tool.name,
    });

    return files;
  }

  /**
   * Generate MCP properties from tool parameters
   */
  private generateMCPProperties(parameters: Record<string, any>): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const [name, param] of Object.entries(parameters)) {
      properties[name] = {
        type: param.type,
        description: param.description,
      };

      if (param.enum) {
        properties[name].enum = param.enum;
      }
    }

    return properties;
  }

  /**
   * Generate Claude directory structure files
   */
  private async generateClaudeStructure(
    outputDir: string,
    components: { agents?: AgentDefinition[]; tools?: ToolDefinition[] }
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate README.md
    let readme = '# Claude Code Export\n\n';
    readme +=
      'This directory contains agents and tools exported from Fractary YAML format for use with Claude Code.\n\n';

    readme += '## Directory Structure\n\n';
    readme += '```\n';
    readme += '.claude/\n';
    readme += '├── agents/          # Agent definitions\n';
    readme += '├── tools/           # Tool definitions\n';
    readme += '├── commands/        # Slash commands (if exported)\n';
    readme += '└── mcp/             # MCP tools (if exported)\n';
    readme += '```\n\n';

    if (components.agents && components.agents.length > 0) {
      readme += '## Agents\n\n';
      for (const agent of components.agents) {
        readme += `- **${agent.name}**: ${agent.description}\n`;
      }
      readme += '\n';
    }

    if (components.tools && components.tools.length > 0) {
      readme += '## Tools\n\n';
      for (const tool of components.tools) {
        readme += `- **${tool.name}**: ${tool.description}\n`;
      }
      readme += '\n';
    }

    readme += '## Usage\n\n';
    readme +=
      'Copy the `.claude` directory to your project root to use these agents and tools with Claude Code.\n\n';
    readme += '```bash\n';
    readme += 'cp -r .claude /path/to/your/project/\n';
    readme += '```\n\n';

    const readmePath = path.join(outputDir, 'README.md');
    await fs.writeFile(readmePath, readme);

    files.push({
      path: 'README.md',
      type: 'documentation',
      size: Buffer.byteLength(readme),
      sourceName: 'readme',
    });

    return files;
  }
}
