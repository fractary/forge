/**
 * Agent schema validation tests
 */

import { AgentDefinitionSchema } from '../../schemas/agent';

describe('AgentDefinitionSchema', () => {
  describe('valid agent definitions', () => {
    it('should validate a complete agent', () => {
      const validAgent = {
        name: 'test-agent',
        type: 'agent',
        description: 'A test agent',
        version: '1.0.0',
        tags: ['test'],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4096,
        },
        system_prompt: 'You are a helpful assistant.',
        tools: ['tool1', 'tool2'],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with OpenAI provider', () => {
      const validAgent = {
        name: 'openai-agent',
        type: 'agent',
        description: 'OpenAI agent',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'openai',
          model: 'gpt-4',
        },
        system_prompt: 'Test prompt',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with Google provider', () => {
      const validAgent = {
        name: 'google-agent',
        type: 'agent',
        description: 'Google agent',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'google',
          model: 'gemini-pro',
        },
        system_prompt: 'Test prompt',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with extends', () => {
      const validAgent = {
        name: 'extended-agent',
        type: 'agent',
        description: 'Extended agent',
        extends: 'base-agent',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with custom tools', () => {
      const validAgent = {
        name: 'agent-with-custom-tools',
        type: 'agent',
        description: 'Agent with inline tools',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: ['external-tool'],
        custom_tools: [
          {
            name: 'inline-tool',
            type: 'tool',
            description: 'Inline tool',
            version: '1.0.0',
            tags: [],
            parameters: {},
            implementation: {
              type: 'bash',
              bash: { command: 'echo "test"' },
            },
          },
        ],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with caching enabled', () => {
      const validAgent = {
        name: 'cached-agent',
        type: 'agent',
        description: 'Agent with caching',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: [],
        caching: {
          enabled: true,
          cache_sources: [
            {
              type: 'file',
              path: './docs/api.md',
              label: 'API Documentation',
              ttl: 3600,
            },
            {
              type: 'inline',
              content: 'Inline content',
              label: 'System Context',
            },
          ],
        },
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with namespaced name', () => {
      const validAgent = {
        name: 'org:team:agent-name',
        type: 'agent',
        description: 'Namespaced agent',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid agent definitions', () => {
    it('should reject agent with invalid provider', () => {
      const invalidAgent = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'invalid-provider',
          model: 'model-name',
        },
        system_prompt: 'Test',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should reject agent with invalid temperature', () => {
      const invalidAgent = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 2.0,
        },
        system_prompt: 'Test',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should reject agent with wrong type literal', () => {
      const invalidAgent = {
        name: 'test-agent',
        type: 'tool',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: [],
      };

      const result = AgentDefinitionSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should reject agent with invalid cache source type', () => {
      const invalidAgent = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        system_prompt: 'Test',
        tools: [],
        caching: {
          enabled: true,
          cache_sources: [
            {
              type: 'invalid-type',
              label: 'Test',
            },
          ],
        },
      };

      const result = AgentDefinitionSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });
  });
});
