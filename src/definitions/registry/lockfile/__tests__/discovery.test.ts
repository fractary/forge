/**
 * Tests for discovery utilities
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { discoverUsedAgents, discoverUsedTools } from '../discovery';

// Mock logger
jest.mock('@/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Discovery', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(__dirname, '.test-temp', `discovery-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
  });

  describe('discoverUsedAgents', () => {
    it('should discover local agents from .fractary/agents/', async () => {
      const agentsDir = path.join(testDir, '.fractary/agents');
      await fs.ensureDir(agentsDir);
      await fs.writeFile(path.join(agentsDir, 'agent1.yaml'), 'name: agent1');
      await fs.writeFile(path.join(agentsDir, 'agent2.yaml'), 'name: agent2');

      const agents = await discoverUsedAgents();

      expect(agents).toContain('agent1');
      expect(agents).toContain('agent2');
      expect(agents).toHaveLength(2);
    });

    it('should discover agents from config file', async () => {
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(
        configPath,
        JSON.stringify({
          agents: {
            'config-agent': { version: '1.0.0' },
          },
        }),
        'utf-8'
      );

      const agents = await discoverUsedAgents();

      expect(agents).toContain('config-agent');
    });

    it('should discover agents from workflow files', async () => {
      const workflowPath = path.join(testDir, '.fractary/workflows');
      await fs.ensureDir(workflowPath);
      await fs.writeFile(
        path.join(workflowPath, 'workflow1.yaml'),
        `
steps:
  - agent: workflow-agent-1
    description: Test step
  - agent: workflow-agent-2
    description: Another step
        `,
        'utf-8'
      );

      const agents = await discoverUsedAgents();

      expect(agents).toContain('workflow-agent-1');
      expect(agents).toContain('workflow-agent-2');
    });

    it('should return empty array if no agents found', async () => {
      const agents = await discoverUsedAgents();

      expect(agents).toEqual([]);
    });

    it('should deduplicate agents from multiple sources', async () => {
      // Create local agent
      const agentsDir = path.join(testDir, '.fractary/agents');
      await fs.ensureDir(agentsDir);
      await fs.writeFile(path.join(agentsDir, 'test-agent.yaml'), 'name: test-agent');

      // Add same agent to config
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(
        configPath,
        JSON.stringify({
          agents: {
            'test-agent': { version: '1.0.0' },
          },
        }),
        'utf-8'
      );

      const agents = await discoverUsedAgents();

      expect(agents).toContain('test-agent');
      expect(agents).toHaveLength(1);
    });

    it('should handle invalid config file gracefully', async () => {
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, 'invalid json', 'utf-8');

      const agents = await discoverUsedAgents();

      expect(agents).toEqual([]);
    });

    it('should handle workflow file read errors gracefully', async () => {
      const workflowPath = path.join(testDir, '.fractary/workflows');
      await fs.ensureDir(workflowPath);

      // Create a directory with .yaml extension (will cause read error)
      await fs.ensureDir(path.join(workflowPath, 'invalid.yaml'));

      const agents = await discoverUsedAgents();

      // Should not throw, just return empty or continue
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('discoverUsedTools', () => {
    it('should discover local tools from .fractary/tools/', async () => {
      const toolsDir = path.join(testDir, '.fractary/tools');
      await fs.ensureDir(toolsDir);
      await fs.writeFile(path.join(toolsDir, 'tool1.yaml'), 'name: tool1');
      await fs.writeFile(path.join(toolsDir, 'tool2.yaml'), 'name: tool2');

      const tools = await discoverUsedTools();

      expect(tools).toContain('tool1');
      expect(tools).toContain('tool2');
      expect(tools).toHaveLength(2);
    });

    it('should discover tools from config file', async () => {
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(
        configPath,
        JSON.stringify({
          tools: {
            'config-tool': { version: '1.0.0' },
          },
        }),
        'utf-8'
      );

      const tools = await discoverUsedTools();

      expect(tools).toContain('config-tool');
    });

    it('should return empty array if no tools found', async () => {
      const tools = await discoverUsedTools();

      expect(tools).toEqual([]);
    });

    it('should deduplicate tools from multiple sources', async () => {
      // Create local tool
      const toolsDir = path.join(testDir, '.fractary/tools');
      await fs.ensureDir(toolsDir);
      await fs.writeFile(path.join(toolsDir, 'test-tool.yaml'), 'name: test-tool');

      // Add same tool to config
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(
        configPath,
        JSON.stringify({
          tools: {
            'test-tool': { version: '1.0.0' },
          },
        }),
        'utf-8'
      );

      const tools = await discoverUsedTools();

      expect(tools).toContain('test-tool');
      expect(tools).toHaveLength(1);
    });

    it('should handle invalid config file gracefully', async () => {
      const configPath = path.join(testDir, '.fractary/plugins/forge/config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, 'invalid json', 'utf-8');

      const tools = await discoverUsedTools();

      expect(tools).toEqual([]);
    });
  });
});
