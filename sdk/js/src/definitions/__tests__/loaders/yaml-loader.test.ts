/**
 * YAML loader tests
 */

import * as path from 'path';
import { YAMLLoader } from '../../loaders/yaml-loader';
import { DefinitionErrorCode } from '../../errors';
import { ForgeError } from '../../../errors/forge-error';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('YAMLLoader', () => {
  let loader: YAMLLoader;

  beforeEach(() => {
    loader = new YAMLLoader();
  });

  describe('loadAgent', () => {
    it('should load a valid agent from file', async () => {
      const agentPath = path.join(fixturesDir, 'sample-agent.yaml');
      const agent = await loader.loadAgent(agentPath);

      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.llm.provider).toBe('anthropic');
      expect(agent.llm.model).toBe('claude-3-5-sonnet-20241022');
      expect(agent.tools).toContain('test-bash-tool');
      expect(agent.custom_tools).toHaveLength(1);
      expect(agent.caching?.enabled).toBe(true);
    });

    it('should throw AGENT_NOT_FOUND for non-existent file', async () => {
      const agentPath = path.join(fixturesDir, 'nonexistent.yaml');

      await expect(loader.loadAgent(agentPath)).rejects.toThrow(ForgeError);
      await expect(loader.loadAgent(agentPath)).rejects.toMatchObject({
        code: 'AGENT_NOT_FOUND',
      });
    });

    it('should throw SCHEMA_VALIDATION_ERROR for invalid agent', async () => {
      const yamlContent = `
name: invalid-agent
type: agent
description: Missing required fields
version: 1.0.0
tags: []
      `;

      expect(() => loader.loadAgentFromString(yamlContent)).toThrow(ForgeError);
      expect(() => loader.loadAgentFromString(yamlContent)).toThrow(/validation failed/i);
    });
  });

  describe('loadTool', () => {
    it('should load a valid tool from file', async () => {
      const toolPath = path.join(fixturesDir, 'sample-tool.yaml');
      const tool = await loader.loadTool(toolPath);

      expect(tool.name).toBe('test-bash-tool');
      expect(tool.type).toBe('tool');
      expect(tool.version).toBe('1.0.0');
      expect(tool.implementation.type).toBe('bash');
      expect(tool.parameters.input.required).toBe(true);
      expect(tool.parameters.count.default).toBe(1);
    });

    it('should throw TOOL_NOT_FOUND for non-existent file', async () => {
      const toolPath = path.join(fixturesDir, 'nonexistent.yaml');

      await expect(loader.loadTool(toolPath)).rejects.toThrow(ForgeError);
      await expect(loader.loadTool(toolPath)).rejects.toMatchObject({
        code: 'TOOL_NOT_FOUND',
      });
    });

    it('should throw SCHEMA_VALIDATION_ERROR for invalid tool', async () => {
      const yamlContent = `
name: invalid-tool
type: tool
description: Missing implementation
version: 1.0.0
tags: []
parameters: {}
      `;

      expect(() => loader.loadToolFromString(yamlContent)).toThrow(ForgeError);
      expect(() => loader.loadToolFromString(yamlContent)).toThrow(/validation failed/i);
    });
  });

  describe('loadAgentFromString', () => {
    it('should load agent from YAML string', () => {
      const yamlContent = `
name: string-agent
type: agent
description: Agent from string
version: 1.0.0
tags: []
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
system_prompt: Test prompt
tools: []
      `;

      const agent = loader.loadAgentFromString(yamlContent);

      expect(agent.name).toBe('string-agent');
      expect(agent.llm.provider).toBe('anthropic');
    });

    it('should throw YAML_PARSE_ERROR for invalid YAML', () => {
      const invalidYaml = `
name: test
  invalid: indentation
    nested: bad
      `;

      expect(() => loader.loadAgentFromString(invalidYaml)).toThrow(ForgeError);
      expect(() => loader.loadAgentFromString(invalidYaml)).toThrow(/YAML/i);
    });
  });

  describe('loadToolFromString', () => {
    it('should load tool from YAML string', () => {
      const yamlContent = `
name: string-tool
type: tool
description: Tool from string
version: 1.0.0
tags: []
parameters: {}
implementation:
  type: bash
  bash:
    command: echo "test"
      `;

      const tool = loader.loadToolFromString(yamlContent);

      expect(tool.name).toBe('string-tool');
      expect(tool.implementation.type).toBe('bash');
    });

    it('should throw YAML_PARSE_ERROR for invalid YAML', () => {
      const invalidYaml = `
{
  invalid json in yaml file
}
      `;

      expect(() => loader.loadToolFromString(invalidYaml)).toThrow(ForgeError);
    });
  });
});
