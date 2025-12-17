/**
 * Tests for local resolver
 */

import { vol } from 'memfs';
import { LocalResolver } from '../../resolvers/local-resolver.js';

// Mock fs-extra to use memfs
jest.mock('fs-extra', () => require('memfs'));

// Mock os.homedir()
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => '/home/user',
}));

describe('LocalResolver', () => {
  let resolver: LocalResolver;

  beforeEach(() => {
    vol.reset();
    resolver = new LocalResolver();

    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/project');

    // Setup directory structure
    vol.mkdirSync('/project/.fractary/agents', { recursive: true });
    vol.mkdirSync('/project/.fractary/tools', { recursive: true });
    vol.mkdirSync('/home/user/.fractary/registry/agents', { recursive: true });
    vol.mkdirSync('/home/user/.fractary/registry/tools', { recursive: true });
  });

  afterEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

  describe('resolve - standalone components', () => {
    it('should resolve agent from project directory', async () => {
      const agentYaml = `
name: test-agent
type: agent
version: 1.0.0
description: Test agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test prompt
tools: []
tags: []
`;

      vol.writeFileSync('/project/.fractary/agents/test-agent.yaml', agentYaml);

      const result = await resolver.resolve('test-agent', 'agent');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-agent');
      expect(result?.version).toBe('1.0.0');
      expect(result?.source).toBe('project');
    });

    it('should resolve tool from global directory', async () => {
      const toolYaml = `
name: test-tool
type: tool
version: 1.0.0
description: Test tool
parameters: {}
implementation:
  type: bash
  bash:
    command: echo test
tags: []
`;

      vol.writeFileSync('/home/user/.fractary/registry/tools/test-tool.yaml', toolYaml);

      const result = await resolver.resolve('test-tool', 'tool');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-tool');
      expect(result?.version).toBe('1.0.0');
      expect(result?.source).toBe('global');
    });

    it('should prioritize project over global', async () => {
      const projectAgent = `
name: test-agent
type: agent
version: 1.0.0
description: Project agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Project prompt
tools: []
tags: []
`;

      const globalAgent = `
name: test-agent
type: agent
version: 2.0.0
description: Global agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Global prompt
tools: []
tags: []
`;

      vol.writeFileSync('/project/.fractary/agents/test-agent.yaml', projectAgent);
      vol.writeFileSync('/home/user/.fractary/registry/agents/test-agent.yaml', globalAgent);

      const result = await resolver.resolve('test-agent', 'agent');

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0.0');
      expect(result?.source).toBe('project');
    });

    it('should return null for non-existent component', async () => {
      const result = await resolver.resolve('non-existent', 'agent');
      expect(result).toBeNull();
    });
  });

  describe('resolve - plugin-scoped components', () => {
    it('should resolve plugin-scoped component from project', async () => {
      const pluginJson = `
{
  "name": "@test/plugin",
  "version": "1.0.0",
  "description": "Test plugin",
  "config": {
    "author": "Test",
    "repository": "https://github.com/test/plugin",
    "license": "MIT"
  }
}
`;

      const agentYaml = `
name: test-agent
type: agent
version: 1.0.0
description: Test agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test prompt
tools: []
tags: []
`;

      vol.mkdirSync('/project/.fractary/agents/@test/plugin', { recursive: true });
      vol.writeFileSync('/project/.fractary/agents/@test/plugin/plugin.json', pluginJson);
      vol.writeFileSync('/project/.fractary/agents/@test/plugin/test-agent.yaml', agentYaml);

      const result = await resolver.resolve('@test/plugin/test-agent', 'agent');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-agent');
      expect(result?.plugin).toBe('@test/plugin');
      expect(result?.source).toBe('project');
    });

    it('should resolve plugin-scoped component from global', async () => {
      const pluginJson = `
{
  "name": "@test/plugin",
  "version": "1.0.0",
  "description": "Test plugin",
  "config": {
    "author": "Test",
    "repository": "https://github.com/test/plugin",
    "license": "MIT"
  }
}
`;

      const toolYaml = `
name: test-tool
type: tool
version: 1.0.0
description: Test tool
parameters: {}
implementation:
  type: bash
  bash:
    command: echo test
tags: []
`;

      vol.mkdirSync('/home/user/.fractary/registry/tools/@test/plugin', { recursive: true });
      vol.writeFileSync('/home/user/.fractary/registry/tools/@test/plugin/plugin.json', pluginJson);
      vol.writeFileSync(
        '/home/user/.fractary/registry/tools/@test/plugin/test-tool.yaml',
        toolYaml
      );

      const result = await resolver.resolve('@test/plugin/test-tool', 'tool');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-tool');
      expect(result?.plugin).toBe('@test/plugin');
      expect(result?.source).toBe('global');
    });
  });

  describe('listInstalled', () => {
    it('should list all installed components of a type', async () => {
      const agent1 = `
name: agent-1
type: agent
version: 1.0.0
description: Agent 1
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test
tools: []
tags: []
`;

      const agent2 = `
name: agent-2
type: agent
version: 1.0.0
description: Agent 2
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test
tools: []
tags: []
`;

      vol.writeFileSync('/project/.fractary/agents/agent-1.yaml', agent1);
      vol.writeFileSync('/home/user/.fractary/registry/agents/agent-2.yaml', agent2);

      const installed = await resolver.listInstalled('agent');

      expect(installed).toHaveLength(2);
      expect(installed).toContainEqual(expect.objectContaining({ name: 'agent-1' }));
      expect(installed).toContainEqual(expect.objectContaining({ name: 'agent-2' }));
    });

    it('should return empty array when no components installed', async () => {
      const installed = await resolver.listInstalled('agent');
      expect(installed).toEqual([]);
    });

    it('should include plugin-scoped components', async () => {
      const pluginJson = `
{
  "name": "@test/plugin",
  "version": "1.0.0",
  "description": "Test plugin",
  "config": {
    "author": "Test",
    "repository": "https://github.com/test/plugin",
    "license": "MIT"
  }
}
`;

      const agentYaml = `
name: test-agent
type: agent
version: 1.0.0
description: Test agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test
tools: []
tags: []
`;

      vol.mkdirSync('/project/.fractary/agents/@test/plugin', { recursive: true });
      vol.writeFileSync('/project/.fractary/agents/@test/plugin/plugin.json', pluginJson);
      vol.writeFileSync('/project/.fractary/agents/@test/plugin/test-agent.yaml', agentYaml);

      const installed = await resolver.listInstalled('agent');

      expect(installed).toHaveLength(1);
      expect(installed[0].plugin).toBe('@test/plugin');
    });
  });
});
