# Exporters Module

The Exporters module converts Fractary YAML definitions to various framework-specific formats.

## Supported Formats

- **LangChain** - Python code with LangChain/LangGraph
- **Claude Code** - Markdown files for .claude/ directory
- **n8n** - JSON workflow definitions

## Usage

### Basic Export

```typescript
import { Exporters } from '@fractary/forge';
import type { AgentDefinition, ToolDefinition } from '@fractary/forge';

// Load your components (agents, tools)
const components = {
  agents: [/* agent definitions */],
  tools: [/* tool definitions */],
};

// Export to LangChain
const result = await Exporters.exporter.export(components, {
  format: 'langchain',
  outputDir: './output/langchain',
  formatOptions: {
    pythonVersion: '3.11',
    includeTypeHints: true,
    useAsync: true,
    generateRequirements: true,
  },
});

console.log(`Exported ${result.summary.agents} agents`);
console.log(`Generated ${result.summary.totalFiles} files`);
```

### Export Single Agent

```typescript
import { Exporters } from '@fractary/forge';
import type { AgentDefinition } from '@fractary/forge';

const agent: AgentDefinition = {
  name: 'my-agent',
  type: 'agent',
  description: 'A helpful assistant',
  // ... rest of definition
};

const result = await Exporters.exporter.exportAgent(agent, {
  format: 'claude',
  outputDir: './output/claude',
  formatOptions: {
    includeDirectoryStructure: true,
  },
});
```

### Export to Multiple Formats

```typescript
import { Exporters } from '@fractary/forge';

const components = {
  agents: [agent1, agent2],
  tools: [tool1, tool2],
};

// Export to all formats
for (const format of ['langchain', 'claude', 'n8n'] as const) {
  const result = await Exporters.exporter.export(components, {
    format,
    outputDir: `./output/${format}`,
  });

  console.log(`${format}: ${result.summary.totalFiles} files generated`);
}
```

## Format-Specific Options

### LangChain Export Options

```typescript
interface LangChainExportOptions {
  pythonVersion?: '3.9' | '3.10' | '3.11' | '3.12';  // Default: '3.11'
  includeTypeHints?: boolean;                         // Default: true
  useAsync?: boolean;                                 // Default: true
  generateRequirements?: boolean;                     // Default: true
  langchainVersion?: string;                          // Default: '0.1.0'
}
```

**Example:**

```typescript
const result = await Exporters.exporter.export(components, {
  format: 'langchain',
  outputDir: './langchain-export',
  formatOptions: {
    pythonVersion: '3.11',
    includeTypeHints: true,
    useAsync: true,
    generateRequirements: true,
    langchainVersion: '0.1.0',
  },
});
```

**Output structure:**

```
langchain-export/
├── agents/
│   ├── my-agent.py
│   └── another-agent.py
├── tools/
│   ├── my-tool.py
│   └── another-tool.py
├── requirements.txt
└── README.md
```

### Claude Code Export Options

```typescript
interface ClaudeExportOptions {
  asSlashCommands?: boolean;           // Export tools as slash commands
  asMCPTools?: boolean;                // Export tools as MCP tools
  includeDirectoryStructure?: boolean; // Include .claude directory structure
}
```

**Example:**

```typescript
const result = await Exporters.exporter.export(components, {
  format: 'claude',
  outputDir: './claude-export',
  formatOptions: {
    asSlashCommands: false,
    asMCPTools: true,
    includeDirectoryStructure: true,
  },
});
```

**Output structure:**

```
claude-export/
├── .claude/
│   ├── agents/
│   │   ├── my-agent.md
│   │   └── another-agent.md
│   ├── tools/
│   │   ├── my-tool.md
│   │   └── another-tool.md
│   └── mcp/
│       └── tools/
│           ├── my-tool.json
│           └── another-tool.json
└── README.md
```

### n8n Export Options

```typescript
interface N8nExportOptions {
  n8nVersion?: string;            // Default: latest
  includeCredentials?: boolean;   // Default: true
  workflowName?: string;          // Custom workflow name
}
```

**Example:**

```typescript
const result = await Exporters.exporter.export(components, {
  format: 'n8n',
  outputDir: './n8n-export',
  formatOptions: {
    n8nVersion: '1.0.0',
    includeCredentials: true,
    workflowName: 'My Custom Workflow',
  },
});
```

**Output structure:**

```
n8n-export/
├── workflows/
│   ├── my-agent.json
│   └── another-agent.json
├── nodes/
│   ├── my-tool.json
│   └── another-tool.json
└── README.md
```

## Using Specific Exporters

You can also use exporters directly:

```typescript
import {
  LangChainExporter,
  ClaudeExporter,
  N8nExporter
} from '@fractary/forge';

// Use specific exporter
const langchainExporter = new LangChainExporter();
const result = await langchainExporter.exportAll(components, options);

// Or use the factory
import { Exporters } from '@fractary/forge';
const exporter = Exporters.exporter.getExporter('langchain');
const result = await exporter.exportAll(components, options);
```

## Export Result

All export operations return an `ExportResult`:

```typescript
interface ExportResult {
  format: ExportFormat;              // Export format used
  outputDir: string;                 // Output directory
  files: ExportedFile[];            // List of generated files
  summary: {
    agents: number;                  // Number of agents exported
    tools: number;                   // Number of tools exported
    workflows: number;               // Number of workflows exported
    totalFiles: number;              // Total files generated
    totalSize: number;               // Total size in bytes
    duration: number;                // Export duration in ms
  };
}
```

**Example:**

```typescript
const result = await Exporters.exporter.export(components, options);

console.log(`Format: ${result.format}`);
console.log(`Output: ${result.outputDir}`);
console.log(`Agents: ${result.summary.agents}`);
console.log(`Tools: ${result.summary.tools}`);
console.log(`Files: ${result.summary.totalFiles}`);
console.log(`Size: ${(result.summary.totalSize / 1024).toFixed(2)} KB`);
console.log(`Duration: ${result.summary.duration}ms`);

// List all generated files
for (const file of result.files) {
  console.log(`  ${file.type}: ${file.path} (${file.size} bytes)`);
}
```

## CLI Integration

The exporters are designed to be consumed by the `fractary` CLI:

```bash
# In fractary/cli
fractary forge export langchain @fractary/faber-plugin --output ./langchain
fractary forge export claude @fractary/faber-plugin --output ./claude
fractary forge export n8n @fractary/faber-plugin --output ./n8n
```

The CLI implementation would use the exporters like this:

```typescript
// In fractary/cli
import { Exporters, Registry } from '@fractary/forge';

export async function exportCommand(
  format: string,
  pluginName: string,
  options: any
) {
  // 1. Resolve plugin
  const plugin = await Registry.resolver.resolvePlugin(pluginName);

  // 2. Load components from plugin
  const components = await loadPluginComponents(plugin);

  // 3. Export
  const result = await Exporters.exporter.export(components, {
    format: format as any,
    outputDir: options.output,
    formatOptions: options,
  });

  console.log(`✓ Exported to ${result.format}`);
  console.log(`  Files: ${result.summary.totalFiles}`);
  console.log(`  Output: ${result.outputDir}`);
}
```

## Error Handling

```typescript
try {
  const result = await Exporters.exporter.export(components, {
    format: 'langchain',
    outputDir: './output',
  });
} catch (error) {
  if (error.message.includes('Unsupported export format')) {
    console.error('Invalid format specified');
  } else if (error.code === 'ENOENT') {
    console.error('Output directory does not exist');
  } else {
    console.error('Export failed:', error.message);
  }
}
```

## Testing

```typescript
import { Exporters } from '@fractary/forge';
import type { AgentDefinition } from '@fractary/forge';

describe('Exporters', () => {
  it('should export agent to LangChain format', async () => {
    const agent: AgentDefinition = {
      name: 'test-agent',
      type: 'agent',
      description: 'Test agent',
      llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      system_prompt: 'You are a test agent',
      tools: [],
      version: '1.0.0',
      tags: ['test'],
    };

    const result = await Exporters.exporter.exportAgent(agent, {
      format: 'langchain',
      outputDir: './test-output',
    });

    expect(result.summary.agents).toBe(1);
    expect(result.files.length).toBeGreaterThan(0);
  });
});
```

## See Also

- **[SPEC-FORGE-005](../../docs/specs/SPEC-FORGE-005-REGISTRY-MANIFEST-SYSTEM.md)** - Registry manifest specification
- **[LangChain Documentation](https://python.langchain.com/)** - LangChain framework
- **[Claude Code Documentation](https://docs.anthropic.com/claude-code)** - Claude Code format
- **[n8n Documentation](https://docs.n8n.io/)** - n8n workflow automation
