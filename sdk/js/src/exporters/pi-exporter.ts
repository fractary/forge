/**
 * Pi coding-agent exporter - converts Fractary YAML to pi.dev package format
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
  PiExportOptions,
} from './types.js';

/**
 * Pi coding-agent exporter implementation.
 *
 * Converts Fractary agent and tool definitions to pi.dev coding-agent package format:
 * - Agents → skills/{name}/SKILL.md
 * - Tools → prompts/{name}.md
 * - Generates package.json with pi section
 *
 * Pi package format reference:
 * https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent#pi-packages
 */
export class PiExporter implements IExporter {
  readonly format = 'pi' as const;

  async exportAgent(agent: AgentDefinition, options: ExportOptions): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate pi SKILL.md for the agent
    const skillMarkdown = this.generateSkillMarkdown(agent);
    const skillName = this.toPiName(agent.name);
    const skillFilePath = path.join(options.outputDir, 'skills', skillName, 'SKILL.md');

    await fs.ensureDir(path.dirname(skillFilePath));
    await fs.writeFile(skillFilePath, skillMarkdown);

    files.push({
      path: path.relative(options.outputDir, skillFilePath),
      type: 'agent',
      size: Buffer.byteLength(skillMarkdown),
      sourceName: agent.name,
    });

    return files;
  }

  async exportTool(tool: ToolDefinition, options: ExportOptions): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    // Generate pi prompt markdown for the tool
    const promptMarkdown = this.generatePromptMarkdown(tool);
    const promptName = this.toPiName(tool.name);
    const promptFilePath = path.join(options.outputDir, 'prompts', `${promptName}.md`);

    await fs.ensureDir(path.dirname(promptFilePath));
    await fs.writeFile(promptFilePath, promptMarkdown);

    files.push({
      path: path.relative(options.outputDir, promptFilePath),
      type: 'tool',
      size: Buffer.byteLength(promptMarkdown),
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
    const formatOptions = (options.formatOptions || {}) as PiExportOptions;

    await fs.ensureDir(options.outputDir);

    // Export agents as pi skills
    if (components.agents) {
      for (const agent of components.agents) {
        const agentFiles = await this.exportAgent(agent, options);
        files.push(...agentFiles);
      }
    }

    // Export tools as pi prompts
    if (components.tools) {
      for (const tool of components.tools) {
        const toolFiles = await this.exportTool(tool, options);
        files.push(...toolFiles);
      }
    }

    // Generate package.json with pi section
    const packageFiles = await this.generatePackageJson(options.outputDir, components, formatOptions);
    files.push(...packageFiles);

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
   * Convert a name to pi-compatible format: lowercase, hyphens only, no colons.
   * Pi invocation is filename-based; colons become hyphens.
   */
  private toPiName(name: string): string {
    return name
      .toLowerCase()
      .replace(/:/g, '-')
      .replace(/_/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  /**
   * Trim a string to pi's 1024-character description limit.
   */
  private trimDescription(description: string): string {
    if (description.length <= 1024) return description;
    return description.slice(0, 1021) + '...';
  }

  /**
   * Generate pi SKILL.md content for an agent definition.
   *
   * Pi skill format:
   * - YAML frontmatter with name, description, and optional allowed-tools
   * - Markdown body describing the skill workflow
   */
  private generateSkillMarkdown(agent: AgentDefinition): string {
    const piName = this.toPiName(agent.name);
    const description = this.trimDescription(agent.description);

    let frontmatter = `---\nname: ${piName}\ndescription: ${description}\n`;

    // Include tools if defined (pi uses allowed-tools field)
    if (agent.tools && agent.tools.length > 0) {
      frontmatter += `allowed-tools: ${agent.tools.join(', ')}\n`;
    }

    frontmatter += '---\n\n';

    let body = `# ${agent.name}\n\n`;
    body += `${agent.description}\n\n`;

    // System prompt as the skill body
    if (agent.system_prompt) {
      body += '## Instructions\n\n';
      body += agent.system_prompt;
      body += '\n\n';
    }

    // Custom tools as skill references
    if (agent.custom_tools && agent.custom_tools.length > 0) {
      body += '## Available Skills\n\n';
      for (const tool of agent.custom_tools) {
        const skillRef = this.toPiName(tool.name);
        body += `- Use the /skill:${skillRef} skill: ${tool.description}\n`;
      }
      body += '\n';
    }

    // Usage
    body += '## Usage\n\n';
    body += `Invoke this skill in a pi project:\n\n`;
    body += `\`\`\`\n/skill:${piName}\n\`\`\`\n\n`;

    body += '---\n\n';
    body += '*Generated from Fractary YAML by @fractary/forge pi-exporter*\n';

    return frontmatter + body;
  }

  /**
   * Generate pi prompt markdown content for a tool definition.
   *
   * Pi prompt format:
   * - YAML frontmatter with only description (no model, no allowed-tools)
   * - Markdown body with $@ / $1 argument variables
   */
  private generatePromptMarkdown(tool: ToolDefinition): string {
    const description = this.trimDescription(tool.description);

    const frontmatter = `---\ndescription: ${description}\n---\n\n`;

    let body = '';

    // Argument variables block
    const params = Object.entries(tool.parameters);
    if (params.length > 0) {
      const positionalArgs = params
        .map(([name, _def], index) => `$${index + 1}=${name}`)
        .join(', ');
      body += `Arguments: ${positionalArgs}, $@=all arguments\n\n`;
    }

    body += `# ${tool.name}\n\n`;
    body += `${tool.description}\n\n`;

    // Parameters section
    if (params.length > 0) {
      body += '## Parameters\n\n';
      for (const [paramName, paramDef] of params) {
        body += `- \`${paramName}\` (${paramDef.type})${paramDef.required ? ' *required*' : ''}: ${paramDef.description}\n`;
      }
      body += '\n';
    }

    // Implementation instructions
    body += '## Instructions\n\n';
    if (tool.implementation.type === 'bash') {
      body += `Run the following command:\n\n`;
      body += `\`\`\`bash\n${tool.implementation.bash.command}\n\`\`\`\n\n`;
    } else if (tool.implementation.type === 'python') {
      body += `Call \`${tool.implementation.python.module}.${tool.implementation.python.function}\` with the provided parameters.\n\n`;
    } else if (tool.implementation.type === 'http') {
      body += `Make a ${tool.implementation.http.method} request to \`${tool.implementation.http.url}\`.\n\n`;
    }

    body += '---\n\n';
    body += '*Generated from Fractary YAML by @fractary/forge pi-exporter*\n';

    return frontmatter + body;
  }

  /**
   * Generate package.json with pi section.
   */
  private async generatePackageJson(
    outputDir: string,
    components: { agents?: AgentDefinition[]; tools?: ToolDefinition[] },
    formatOptions: PiExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];

    const hasPrompts = (components.tools?.length || 0) > 0;
    const hasSkills = (components.agents?.length || 0) > 0;
    const hasExtensions = formatOptions.includeExtensionStubs === true;

    const packageName = formatOptions.packageName || path.basename(outputDir) + '-pi';

    const piSection: Record<string, string[]> = {};
    if (hasPrompts) piSection['prompts'] = ['./prompts'];
    if (hasSkills) piSection['skills'] = ['./skills'];
    if (hasExtensions) piSection['extensions'] = ['./extensions'];

    const packageJson = {
      name: packageName,
      version: '0.1.0',
      description: 'Pi coding-agent package generated from Fractary YAML',
      keywords: ['pi-package'],
      pi: piSection,
    };

    const content = JSON.stringify(packageJson, null, 2) + '\n';
    const packagePath = path.join(outputDir, 'package.json');

    await fs.writeFile(packagePath, content);

    files.push({
      path: 'package.json',
      type: 'config',
      size: Buffer.byteLength(content),
      sourceName: 'package',
    });

    return files;
  }
}
