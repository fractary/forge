/**
 * LangChain exporter - converts Fractary YAML to Python/LangChain code
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
  LangChainExportOptions,
} from './types.js';

/**
 * LangChain exporter implementation
 */
export class LangChainExporter implements IExporter {
  readonly format = 'langchain' as const;

  async exportAgent(
    agent: AgentDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    const formatOptions = (options.formatOptions || {}) as LangChainExportOptions;

    // Generate agent Python file
    const agentCode = this.generateAgentCode(agent, formatOptions);
    const agentFilePath = path.join(options.outputDir, 'agents', `${agent.name}.py`);

    await fs.ensureDir(path.dirname(agentFilePath));
    await fs.writeFile(agentFilePath, agentCode);

    files.push({
      path: path.relative(options.outputDir, agentFilePath),
      type: 'agent',
      size: Buffer.byteLength(agentCode),
      sourceName: agent.name,
    });

    // Generate custom tools if any
    if (agent.custom_tools && agent.custom_tools.length > 0) {
      for (const tool of agent.custom_tools) {
        const toolFiles = await this.exportTool(tool, options);
        files.push(...toolFiles);
      }
    }

    return files;
  }

  async exportTool(
    tool: ToolDefinition,
    options: ExportOptions
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    const formatOptions = (options.formatOptions || {}) as LangChainExportOptions;

    // Generate tool Python file
    const toolCode = this.generateToolCode(tool, formatOptions);
    const toolFilePath = path.join(options.outputDir, 'tools', `${tool.name}.py`);

    await fs.ensureDir(path.dirname(toolFilePath));
    await fs.writeFile(toolFilePath, toolCode);

    files.push({
      path: path.relative(options.outputDir, toolFilePath),
      type: 'tool',
      size: Buffer.byteLength(toolCode),
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

    // Generate requirements.txt
    const formatOptions = (options.formatOptions || {}) as LangChainExportOptions;
    if (formatOptions.generateRequirements !== false) {
      const requirementsFile = await this.generateRequirements(
        options.outputDir,
        formatOptions
      );
      files.push(requirementsFile);
    }

    // Generate README
    const readmeFile = await this.generateReadme(
      options.outputDir,
      components,
      formatOptions
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
        workflows: 0,
        totalFiles: files.length,
        totalSize,
        duration,
      },
    };
  }

  /**
   * Generate Python code for an agent
   */
  private generateAgentCode(
    agent: AgentDefinition,
    options: LangChainExportOptions
  ): string {
    const useAsync = options.useAsync !== false;
    const includeTypeHints = options.includeTypeHints !== false;

    let code = '';

    // File header
    code += this.generateFileHeader(agent.name, agent.description);

    // Imports
    code += 'from langchain_anthropic import ChatAnthropic\n';
    code += 'from langchain.agents import AgentExecutor, create_tool_calling_agent\n';
    code += 'from langchain_core.prompts import ChatPromptTemplate\n';
    code += 'from langchain_core.tools import Tool\n';
    if (useAsync) {
      code += 'import asyncio\n';
    }
    if (includeTypeHints) {
      code += 'from typing import List, Dict, Any\n';
    }
    code += '\n';

    // Tool imports
    if (agent.tools && agent.tools.length > 0) {
      code += '# Tool imports\n';
      for (const toolName of agent.tools) {
        const toolFileName = toolName.replace(/-/g, '_');
        code += `from tools.${toolFileName} import ${this.toPascalCase(toolName)}\n`;
      }
      code += '\n';
    }

    // Agent class
    const className = this.toPascalCase(agent.name);
    code += `class ${className}:\n`;
    code += `    """${agent.description}"""\n\n`;

    // Constructor
    code += '    def __init__(self';
    if (includeTypeHints) {
      code += '):\n';
    } else {
      code += '):\n';
    }

    code += '        # Initialize LLM\n';
    code += `        self.llm = ChatAnthropic(\n`;
    code += `            model="${agent.llm.model}",\n`;
    code += `            temperature=${agent.llm.temperature || 0.7},\n`;
    code += `            max_tokens=${agent.llm.max_tokens || 4096},\n`;
    code += '        )\n\n';

    // Tools initialization
    code += '        # Initialize tools\n';
    code += '        self.tools = [\n';
    if (agent.tools && agent.tools.length > 0) {
      for (const toolName of agent.tools) {
        code += `            ${this.toPascalCase(toolName)}(),\n`;
      }
    }
    code += '        ]\n\n';

    // System prompt
    code += '        # System prompt\n';
    const systemPrompt = agent.system_prompt.replace(/"/g, '\\"');
    code += `        self.system_prompt = """${systemPrompt}"""\n\n`;

    // Create agent
    code += '        # Create agent\n';
    code += '        prompt = ChatPromptTemplate.from_messages([\n';
    code += '            ("system", self.system_prompt),\n';
    code += '            ("human", "{input}"),\n';
    code += '            ("placeholder", "{agent_scratchpad}"),\n';
    code += '        ])\n\n';

    code += '        self.agent = create_tool_calling_agent(\n';
    code += '            llm=self.llm,\n';
    code += '            tools=self.tools,\n';
    code += '            prompt=prompt,\n';
    code += '        )\n\n';

    code += '        self.executor = AgentExecutor(\n';
    code += '            agent=self.agent,\n';
    code += '            tools=self.tools,\n';
    code += '            verbose=True,\n';
    code += '        )\n\n';

    // Run method
    if (useAsync) {
      code += '    async def run(self, input: str';
      if (includeTypeHints) {
        code += ') -> Dict[str, Any]:\n';
      } else {
        code += '):\n';
      }
      code += '        """Execute the agent with the given input"""\n';
      code += '        result = await self.executor.ainvoke({"input": input})\n';
      code += '        return result\n\n';
    } else {
      code += '    def run(self, input: str';
      if (includeTypeHints) {
        code += ') -> Dict[str, Any]:\n';
      } else {
        code += '):\n';
      }
      code += '        """Execute the agent with the given input"""\n';
      code += '        result = self.executor.invoke({"input": input})\n';
      code += '        return result\n\n';
    }

    // Main block for testing
    code += '\n# Example usage\n';
    code += 'if __name__ == "__main__":\n';
    if (useAsync) {
      code += `    agent = ${className}()\n`;
      code += '    \n';
      code += '    async def main():\n';
      code += '        result = await agent.run("Hello, can you help me?")\n';
      code += '        print(result)\n';
      code += '    \n';
      code += '    asyncio.run(main())\n';
    } else {
      code += `    agent = ${className}()\n`;
      code += '    result = agent.run("Hello, can you help me?")\n';
      code += '    print(result)\n';
    }

    return code;
  }

  /**
   * Generate Python code for a tool
   */
  private generateToolCode(
    tool: ToolDefinition,
    options: LangChainExportOptions
  ): string {
    const includeTypeHints = options.includeTypeHints !== false;

    let code = '';

    // File header
    code += this.generateFileHeader(tool.name, tool.description);

    // Imports
    code += 'from langchain_core.tools import BaseTool\n';
    code += 'from pydantic import BaseModel, Field\n';
    if (includeTypeHints) {
      code += 'from typing import Optional, Type\n';
    }
    code += '\n';

    // Input schema class
    const inputClassName = `${this.toPascalCase(tool.name)}Input`;
    code += `class ${inputClassName}(BaseModel):\n`;
    code += `    """Input schema for ${tool.name}"""\n`;

    const params = Object.entries(tool.parameters);
    if (params.length > 0) {
      for (const [paramName, paramDef] of params) {
        const pythonType = this.toPythonType(paramDef.type);
        const isRequired = paramDef.required;
        const fieldDefault = isRequired ? '' : ' = None';

        code += `    ${paramName}: ${pythonType}${fieldDefault} = Field(\n`;
        code += `        description="${paramDef.description}"\n`;
        code += '    )\n';
      }
    } else {
      code += '    pass\n';
    }
    code += '\n';

    // Tool class
    const toolClassName = this.toPascalCase(tool.name);
    code += `class ${toolClassName}(BaseTool):\n`;
    code += `    """${tool.description}"""\n\n`;
    code += `    name = "${tool.name}"\n`;
    code += `    description = "${tool.description}"\n`;
    code += `    args_schema: Type[BaseModel] = ${inputClassName}\n\n`;

    // Run method
    code += '    def _run(\n';
    code += '        self,\n';

    if (params.length > 0) {
      for (const [paramName, paramDef] of params) {
        const pythonType = this.toPythonType(paramDef.type);
        const isRequired = paramDef.required;
        const fieldDefault = isRequired ? '' : ' = None';
        code += `        ${paramName}: ${pythonType}${fieldDefault},\n`;
      }
    }

    if (includeTypeHints) {
      code += '    ) -> str:\n';
    } else {
      code += '    ):\n';
    }

    code += `        """Execute ${tool.name}"""\n`;

    // Generate implementation based on type
    if (tool.implementation.type === 'bash') {
      code += '        import subprocess\n';
      code += '        \n';
      code += '        # Execute bash command\n';
      const command = tool.implementation.bash.command;
      code += `        command = "${command}"\n`;
      code += '        result = subprocess.run(\n';
      code += '            command,\n';
      code += '            shell=True,\n';
      code += '            capture_output=True,\n';
      code += '            text=True\n';
      code += '        )\n';
      code += '        return result.stdout\n';
    } else if (tool.implementation.type === 'python') {
      code += '        # Call Python function\n';
      code += `        from ${tool.implementation.python.module} import ${tool.implementation.python.function}\n`;
      code += `        result = ${tool.implementation.python.function}(`;
      if (params.length > 0) {
        code += params.map(([name]) => name).join(', ');
      }
      code += ')\n';
      code += '        return str(result)\n';
    } else if (tool.implementation.type === 'http') {
      code += '        import requests\n';
      code += '        \n';
      code += '        # Make HTTP request\n';
      code += `        response = requests.${tool.implementation.http.method.toLowerCase()}(\n`;
      code += `            "${tool.implementation.http.url}",\n`;
      if (tool.implementation.http.headers) {
        code += '            headers={\n';
        for (const [key, value] of Object.entries(tool.implementation.http.headers)) {
          code += `                "${key}": "${value}",\n`;
        }
        code += '            },\n';
      }
      code += '        )\n';
      code += '        return response.text\n';
    }

    code += '\n';

    // Main block for testing
    code += '# Example usage\n';
    code += 'if __name__ == "__main__":\n';
    code += `    tool = ${toolClassName}()\n`;
    code += '    result = tool._run(';
    if (params.length > 0) {
      code += params.map(([name]) => `${name}="test"`).join(', ');
    }
    code += ')\n';
    code += '    print(result)\n';

    return code;
  }

  /**
   * Generate requirements.txt
   */
  private async generateRequirements(
    outputDir: string,
    options: LangChainExportOptions
  ): Promise<ExportedFile> {
    const langchainVersion = options.langchainVersion || '0.1.0';
    const pythonVersion = options.pythonVersion || '3.11';

    let content = '# Python requirements\n';
    content += `# Python >= ${pythonVersion}\n\n`;
    content += `langchain>=${langchainVersion}\n`;
    content += 'langchain-anthropic>=0.1.0\n';
    content += 'langchain-core>=0.1.0\n';
    content += 'pydantic>=2.0.0\n';
    content += 'requests>=2.31.0\n';

    const filePath = path.join(outputDir, 'requirements.txt');
    await fs.writeFile(filePath, content);

    return {
      path: 'requirements.txt',
      type: 'config',
      size: Buffer.byteLength(content),
      sourceName: 'requirements',
    };
  }

  /**
   * Generate README.md
   */
  private async generateReadme(
    outputDir: string,
    components: { agents?: AgentDefinition[]; tools?: ToolDefinition[] },
    options: LangChainExportOptions
  ): Promise<ExportedFile> {
    let content = '# Exported LangChain Agents and Tools\n\n';
    content += 'This directory contains agents and tools exported from Fractary YAML format to LangChain Python code.\n\n';

    content += '## Installation\n\n';
    content += '```bash\n';
    content += 'pip install -r requirements.txt\n';
    content += '```\n\n';

    if (components.agents && components.agents.length > 0) {
      content += '## Agents\n\n';
      for (const agent of components.agents) {
        content += `### ${agent.name}\n\n`;
        content += `${agent.description}\n\n`;
        content += '```python\n';
        content += `from agents.${agent.name.replace(/-/g, '_')} import ${this.toPascalCase(agent.name)}\n\n`;
        content += `agent = ${this.toPascalCase(agent.name)}()\n`;
        if (options.useAsync !== false) {
          content += 'result = await agent.run("Your question here")\n';
        } else {
          content += 'result = agent.run("Your question here")\n';
        }
        content += 'print(result)\n';
        content += '```\n\n';
      }
    }

    if (components.tools && components.tools.length > 0) {
      content += '## Tools\n\n';
      for (const tool of components.tools) {
        content += `### ${tool.name}\n\n`;
        content += `${tool.description}\n\n`;
      }
    }

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
   * Generate file header comment
   */
  private generateFileHeader(name: string, description: string): string {
    let header = '"""\n';
    header += `${name}\n\n`;
    header += `${description}\n\n`;
    header += 'Generated from Fractary YAML by @fractary/forge\n';
    header += `Generated at: ${new Date().toISOString()}\n`;
    header += '"""\n\n';
    return header;
  }

  /**
   * Convert kebab-case or snake_case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert Fractary parameter type to Python type hint
   */
  private toPythonType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'str',
      integer: 'int',
      number: 'float',
      boolean: 'bool',
      object: 'dict',
      array: 'list',
    };

    return typeMap[type] || 'Any';
  }
}
