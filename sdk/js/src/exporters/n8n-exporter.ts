/**
 * n8n exporter - converts Fractary workflows to n8n workflow JSON
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
  N8nExportOptions,
} from './types.js';

/**
 * n8n workflow node
 */
interface N8nNode {
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  typeVersion?: number;
}

/**
 * n8n workflow connection
 */
interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

/**
 * n8n workflow definition
 */
interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: N8nConnection[][] }>;
  active: boolean;
  settings: Record<string, any>;
  tags: string[];
}

/**
 * n8n exporter implementation
 */
export class N8nExporter implements IExporter {
  readonly format = 'n8n' as const;

  async exportAgent(
    agent: AgentDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Convert agent to n8n workflow
    const workflow = this.agentToWorkflow(agent, options);
    const workflowJson = JSON.stringify(workflow, null, 2);

    const workflowFilePath = path.join(
      options.outputDir,
      'workflows',
      `${agent.name}.json`
    );

    await fs.ensureDir(path.dirname(workflowFilePath));
    await fs.writeFile(workflowFilePath, workflowJson);

    files.push({
      path: path.relative(options.outputDir, workflowFilePath),
      type: 'agent',
      size: Buffer.byteLength(workflowJson),
      sourceName: agent.name,
    });

    return files;
  }

  async exportTool(
    tool: ToolDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Convert tool to n8n node template
    const nodeTemplate = this.toolToNodeTemplate(tool);
    const nodeJson = JSON.stringify(nodeTemplate, null, 2);

    const nodeFilePath = path.join(
      options.outputDir,
      'nodes',
      `${tool.name}.json`
    );

    await fs.ensureDir(path.dirname(nodeFilePath));
    await fs.writeFile(nodeFilePath, nodeJson);

    files.push({
      path: path.relative(options.outputDir, nodeFilePath),
      type: 'tool',
      size: Buffer.byteLength(nodeJson),
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

    // Export agents as workflows
    if (components.agents) {
      for (const agent of components.agents) {
        const agentFiles = await this.exportAgent(agent, options);
        files.push(...agentFiles);
      }
    }

    // Export tools as node templates
    if (components.tools) {
      for (const tool of components.tools) {
        const toolFiles = await this.exportTool(tool, options);
        files.push(...toolFiles);
      }
    }

    // Generate README
    const readmeFile = await this.generateReadme(
      options.outputDir,
      components,
      options.formatOptions as N8nExportOptions
    );
    files.push(readmeFile);

    const duration = Date.now() - startTime;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      format: this.format,
      outputDir: options.outputDir,
      files,
      summary: {
        agents: components.agents?.length || 0,
        tools: components.tools?.length || 0,
        workflows: components.agents?.length || 0,
        totalFiles: files.length,
        totalSize,
        duration,
      },
    };
  }

  /**
   * Convert Fractary agent to n8n workflow
   */
  private agentToWorkflow(
    agent: AgentDefinition,
    options: ExportOptions
  ): N8nWorkflow {
    const formatOptions = (options.formatOptions || {}) as N8nExportOptions;
    const nodes: N8nNode[] = [];
    const connections: Record<string, { main: N8nConnection[][] }> = {};

    let yPosition = 0;
    const VERTICAL_SPACING = 150;

    // 1. Webhook trigger node (entry point)
    const triggerNode: N8nNode = {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, yPosition],
      parameters: {
        path: agent.name,
        responseMode: 'responseNode',
        options: {},
      },
      typeVersion: 1,
    };
    nodes.push(triggerNode);
    yPosition += VERTICAL_SPACING;

    // 2. AI Agent node (using OpenAI or Anthropic)
    const aiNode: N8nNode = {
      name: `AI Agent - ${agent.name}`,
      type: 'n8n-nodes-base.openAi',
      position: [250, yPosition],
      parameters: {
        operation: 'chat',
        model: this.mapModelToN8n(agent.llm.model),
        prompt: agent.system_prompt,
        temperature: agent.llm.temperature || 0.7,
        maxTokens: agent.llm.max_tokens || 4096,
        options: {},
      },
      typeVersion: 1,
    };
    nodes.push(aiNode);

    // Connect trigger to AI node
    connections['Webhook'] = {
      main: [[{ node: aiNode.name, type: 'main', index: 0 }]],
    };

    yPosition += VERTICAL_SPACING;

    // 3. Tool nodes (if agent has tools)
    if (agent.tools && agent.tools.length > 0) {
      let toolYPosition = yPosition;

      for (const toolName of agent.tools) {
        const toolNode = this.createToolNode(toolName, toolYPosition);
        nodes.push(toolNode);

        // Connect AI node to tool node
        if (!connections[aiNode.name]) {
          connections[aiNode.name] = { main: [[]] };
        }
        connections[aiNode.name].main[0].push({
          node: toolNode.name,
          type: 'main',
          index: 0,
        });

        toolYPosition += VERTICAL_SPACING;
      }

      yPosition = toolYPosition;
    }

    // 4. Response node
    const responseNode: N8nNode = {
      name: 'Response',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [250, yPosition],
      parameters: {
        respondWith: 'json',
        options: {},
      },
      typeVersion: 1,
    };
    nodes.push(responseNode);

    // Connect last node to response
    const lastNodeName = nodes[nodes.length - 2].name;
    if (!connections[lastNodeName]) {
      connections[lastNodeName] = { main: [[]] };
    }
    connections[lastNodeName].main[0].push({
      node: responseNode.name,
      type: 'main',
      index: 0,
    });

    return {
      name: formatOptions.workflowName || agent.name,
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
      },
      tags: agent.tags || [],
    };
  }

  /**
   * Create tool node for n8n workflow
   */
  private createToolNode(toolName: string, yPosition: number): N8nNode {
    return {
      name: `Tool: ${toolName}`,
      type: 'n8n-nodes-base.function',
      position: [450, yPosition],
      parameters: {
        functionCode: `// Tool: ${toolName}\n// Implement tool logic here\nreturn items;`,
      },
      typeVersion: 1,
    };
  }

  /**
   * Convert Fractary tool to n8n node template
   */
  private toolToNodeTemplate(tool: ToolDefinition): any {
    const template: any = {
      name: tool.name,
      description: tool.description,
      version: tool.version,
      parameters: {},
    };

    // Add parameters
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      template.parameters[paramName] = {
        displayName: this.toDisplayName(paramName),
        name: paramName,
        type: this.mapParameterType(paramDef.type),
        default: paramDef.default || '',
        required: paramDef.required,
        description: paramDef.description,
      };
    }

    // Add implementation based on type
    if (tool.implementation.type === 'bash') {
      template.execute = {
        type: 'bash',
        command: tool.implementation.bash.command,
      };
    } else if (tool.implementation.type === 'python') {
      template.execute = {
        type: 'python',
        module: tool.implementation.python.module,
        function: tool.implementation.python.function,
      };
    } else if (tool.implementation.type === 'http') {
      template.execute = {
        type: 'http',
        method: tool.implementation.http.method,
        url: tool.implementation.http.url,
        headers: tool.implementation.http.headers,
      };
    }

    return template;
  }

  /**
   * Generate README.md
   */
  private async generateReadme(
    outputDir: string,
    components: { agents?: AgentDefinition[]; tools?: ToolDefinition[] },
    options?: N8nExportOptions
  ): Promise<ExportedFile> {
    let content = '# Exported n8n Workflows\n\n';
    content += 'This directory contains workflows and nodes exported from Fractary YAML format to n8n JSON.\n\n';

    content += '## Installation\n\n';
    content += '1. Open n8n\n';
    content += '2. Go to **Workflows** → **Import from File**\n';
    content += '3. Select the workflow JSON file from the `workflows/` directory\n\n';

    if (components.agents && components.agents.length > 0) {
      content += '## Workflows\n\n';
      for (const agent of components.agents) {
        content += `### ${agent.name}\n\n`;
        content += `${agent.description}\n\n`;
        content += `**File:** \`workflows/${agent.name}.json\`\n\n`;

        if (agent.tools && agent.tools.length > 0) {
          content += '**Tools used:**\n';
          for (const toolName of agent.tools) {
            content += `- ${toolName}\n`;
          }
          content += '\n';
        }
      }
    }

    if (components.tools && components.tools.length > 0) {
      content += '## Custom Nodes\n\n';
      content += 'Node templates are available in the `nodes/` directory. ';
      content += 'These can be used to create custom n8n nodes.\n\n';

      for (const tool of components.tools) {
        content += `- **${tool.name}**: ${tool.description}\n`;
      }
      content += '\n';
    }

    content += '## Configuration\n\n';
    content += '### API Credentials\n\n';
    content += 'Before running the workflows, configure your API credentials:\n\n';
    content += '1. Go to **Credentials** in n8n\n';
    content += '2. Add your Anthropic API key (for Claude models)\n';
    content += '3. Add any other required API keys for tools\n\n';

    content += '### Webhook URLs\n\n';
    content += 'Each workflow is triggered via webhook. After importing:\n\n';
    content += '1. Activate the workflow\n';
    content += '2. Copy the webhook URL from the Webhook node\n';
    content += '3. Use the URL to trigger the workflow\n\n';

    content += '---\n\n';
    content += '*Generated from Fractary YAML by @fractary/forge*\n';

    const filePath = path.join(outputDir, 'README.md');
    await fs.writeFile(filePath, content);

    return {
      path: 'README.md',
      type: 'documentation',
      size: Buffer.byteLength(content),
      sourceName: 'readme',
    };
  }

  /**
   * Map Claude model to closest n8n model
   */
  private mapModelToN8n(model: string): string {
    // n8n primarily uses OpenAI models, but can be configured for Anthropic
    if (model.includes('claude')) {
      return model; // Return as-is, assuming Anthropic integration
    }

    // Fallback to GPT
    return 'gpt-4';
  }

  /**
   * Map parameter type to n8n type
   */
  private mapParameterType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      integer: 'number',
      number: 'number',
      boolean: 'boolean',
      object: 'json',
      array: 'json',
    };

    return typeMap[type] || 'string';
  }

  /**
   * Convert parameter name to display name
   */
  private toDisplayName(name: string): string {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
