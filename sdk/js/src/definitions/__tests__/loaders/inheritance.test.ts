/**
 * Inheritance resolver tests
 */

import { InheritanceResolver, IDefinitionResolver } from '../../loaders/inheritance';
import { DefinitionErrorCode } from '../../errors';
import { ForgeError } from '../../../errors/forge-error';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

describe('InheritanceResolver', () => {
  describe('Tool inheritance', () => {
    it('should resolve tool that extends base tool', async () => {
      const baseTool: ToolDefinition = {
        name: 'base-tool',
        type: 'tool',
        description: 'Base tool',
        version: '1.0.0',
        tags: ['base'],
        parameters: {
          input: {
            type: 'string',
            description: 'Input param',
            required: true,
          },
        },
        implementation: {
          type: 'bash',
          bash: { command: 'echo "${input}"' },
        },
      };

      const childTool: ToolDefinition = {
        name: 'child-tool',
        type: 'tool',
        description: 'Child tool',
        extends: 'base-tool',
        version: '1.1.0',
        tags: ['child'],
        parameters: {
          extra: {
            type: 'string',
            description: 'Extra param',
            required: false,
            default: 'default',
          },
        },
        implementation: {
          type: 'bash',
          bash: { command: 'echo "${input} ${extra}"' },
        },
      };

      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn(),
        toolResolve: jest.fn().mockResolvedValue({ definition: baseTool }),
      };

      const resolver = new InheritanceResolver(mockResolver);
      const result = await resolver.toolResolve(childTool);

      expect(result.extends).toBeUndefined();
      expect(result.parameters.input).toBeDefined();
      expect(result.parameters.extra).toBeDefined();
      expect(result.tags).toContain('base');
      expect(result.tags).toContain('child');
    });

    it('should detect circular tool inheritance', async () => {
      const toolA: ToolDefinition = {
        name: 'tool-a',
        type: 'tool',
        description: 'Tool A',
        extends: 'tool-b',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo "a"' },
        },
      };

      const toolB: ToolDefinition = {
        name: 'tool-b',
        type: 'tool',
        description: 'Tool B',
        extends: 'tool-a',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo "b"' },
        },
      };

      let callCount = 0;
      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn(),
        toolResolve: jest.fn().mockImplementation(async (name: string) => {
          callCount++;
          if (callCount > 5) throw new Error('Too many calls');
          return { definition: name === 'tool-a' ? toolA : toolB };
        }),
      };

      const resolver = new InheritanceResolver(mockResolver);

      await expect(resolver.toolResolve(toolA)).rejects.toThrow(ForgeError);
      await expect(resolver.toolResolve(toolA)).rejects.toMatchObject({
        code: 'INHERITANCE_CYCLE',
      });
    });

    it('should throw error when base tool not found', async () => {
      const childTool: ToolDefinition = {
        name: 'child-tool',
        type: 'tool',
        description: 'Child tool',
        extends: 'nonexistent-tool',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo "test"' },
        },
      };

      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn(),
        toolResolve: jest.fn().mockResolvedValue(null),
      };

      const resolver = new InheritanceResolver(mockResolver);

      await expect(resolver.toolResolve(childTool)).rejects.toThrow(ForgeError);
      await expect(resolver.toolResolve(childTool)).rejects.toMatchObject({
        code: 'INHERITANCE_BASE_NOT_FOUND',
      });
    });

    it('should merge depends_on arrays', async () => {
      const baseTool: ToolDefinition = {
        name: 'base-tool',
        type: 'tool',
        description: 'Base tool',
        version: '1.0.0',
        tags: [],
        depends_on: ['dep1', 'dep2'],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo' },
        },
      };

      const childTool: ToolDefinition = {
        name: 'child-tool',
        type: 'tool',
        description: 'Child tool',
        extends: 'base-tool',
        version: '1.0.0',
        tags: [],
        depends_on: ['dep3', 'dep1'],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo' },
        },
      };

      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn(),
        toolResolve: jest.fn().mockResolvedValue({ definition: baseTool }),
      };

      const resolver = new InheritanceResolver(mockResolver);
      const result = await resolver.toolResolve(childTool);

      expect(result.depends_on).toEqual(expect.arrayContaining(['dep1', 'dep2', 'dep3']));
      expect(result.depends_on).toHaveLength(3);
    });
  });

  describe('Agent inheritance', () => {
    it('should resolve agent that extends base agent', async () => {
      const baseAgent: AgentDefinition = {
        name: 'base-agent',
        type: 'agent',
        description: 'Base agent',
        version: '1.0.0',
        tags: ['base'],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Base prompt',
        tools: ['tool1', 'tool2'],
      };

      const childAgent: AgentDefinition = {
        name: 'child-agent',
        type: 'agent',
        description: 'Child agent',
        extends: 'base-agent',
        version: '1.1.0',
        tags: ['child'],
        llm: {
          provider: 'openai',
          model: 'gpt-4',
        },
        system_prompt: 'Child prompt',
        tools: ['tool3'],
      };

      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn().mockResolvedValue({ definition: baseAgent }),
        toolResolve: jest.fn(),
      };

      const resolver = new InheritanceResolver(mockResolver);
      const result = await resolver.agentResolve(childAgent);

      expect(result.extends).toBeUndefined();
      expect(result.llm.provider).toBe('openai');
      expect(result.tools).toContain('tool1');
      expect(result.tools).toContain('tool2');
      expect(result.tools).toContain('tool3');
      expect(result.tags).toContain('base');
      expect(result.tags).toContain('child');
    });

    it('should detect circular agent inheritance', async () => {
      const agentA: AgentDefinition = {
        name: 'agent-a',
        type: 'agent',
        description: 'Agent A',
        extends: 'agent-b',
        version: '1.0.0',
        tags: [],
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
        system_prompt: 'Test',
        tools: [],
      };

      const agentB: AgentDefinition = {
        name: 'agent-b',
        type: 'agent',
        description: 'Agent B',
        extends: 'agent-a',
        version: '1.0.0',
        tags: [],
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
        system_prompt: 'Test',
        tools: [],
      };

      let callCount = 0;
      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn().mockImplementation(async (name: string) => {
          callCount++;
          if (callCount > 5) throw new Error('Too many calls');
          return { definition: name === 'agent-a' ? agentA : agentB };
        }),
        toolResolve: jest.fn(),
      };

      const resolver = new InheritanceResolver(mockResolver);

      await expect(resolver.agentResolve(agentA)).rejects.toThrow(ForgeError);
      await expect(resolver.agentResolve(agentA)).rejects.toMatchObject({
        code: 'INHERITANCE_CYCLE',
      });
    });

    it('should merge config objects deeply', async () => {
      const baseAgent: AgentDefinition = {
        name: 'base-agent',
        type: 'agent',
        description: 'Base',
        version: '1.0.0',
        tags: [],
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
        system_prompt: 'Test',
        tools: [],
        config: {
          timeout: 30000,
          retries: 3,
        },
      };

      const childAgent: AgentDefinition = {
        name: 'child-agent',
        type: 'agent',
        description: 'Child',
        extends: 'base-agent',
        version: '1.0.0',
        tags: [],
        llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
        system_prompt: 'Test',
        tools: [],
        config: {
          retries: 5,
          debug: true,
        },
      };

      const mockResolver: IDefinitionResolver = {
        agentResolve: jest.fn().mockResolvedValue({ definition: baseAgent }),
        toolResolve: jest.fn(),
      };

      const resolver = new InheritanceResolver(mockResolver);
      const result = await resolver.agentResolve(childAgent);

      expect(result.config).toEqual({
        timeout: 30000,
        retries: 5,
        debug: true,
      });
    });
  });
});
