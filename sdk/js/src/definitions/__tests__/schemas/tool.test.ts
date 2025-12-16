/**
 * Tool schema validation tests
 */

import { ToolDefinitionSchema, ToolParameterSchema } from '../../schemas/tool';

describe('ToolDefinitionSchema', () => {
  describe('valid tool definitions', () => {
    it('should validate a complete bash tool', () => {
      const validTool = {
        name: 'test-tool',
        type: 'tool',
        description: 'A test tool',
        version: '1.0.0',
        tags: ['test'],
        parameters: {
          input: {
            type: 'string',
            description: 'Input param',
            required: true,
          },
        },
        implementation: {
          type: 'bash',
          bash: {
            command: 'echo "${input}"',
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate a python tool', () => {
      const validTool = {
        name: 'python-tool',
        type: 'tool',
        description: 'A Python tool',
        version: '2.0.0',
        tags: ['python'],
        parameters: {},
        implementation: {
          type: 'python',
          python: {
            module: 'my_module',
            function: 'my_function',
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate an HTTP tool', () => {
      const validTool = {
        name: 'http-tool',
        type: 'tool',
        description: 'An HTTP tool',
        version: '1.5.0',
        tags: ['http', 'api'],
        parameters: {
          endpoint: {
            type: 'string',
            description: 'API endpoint',
            required: true,
          },
        },
        implementation: {
          type: 'http',
          http: {
            method: 'GET',
            url: 'https://api.example.com/${endpoint}',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate a tool with extends', () => {
      const validTool = {
        name: 'extended-tool',
        type: 'tool',
        description: 'Extended tool',
        extends: 'base-tool',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: {
            command: 'echo "test"',
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate a tool with depends_on', () => {
      const validTool = {
        name: 'dependent-tool',
        type: 'tool',
        description: 'Tool with dependencies',
        version: '1.0.0',
        tags: [],
        depends_on: ['tool1', 'tool2'],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: {
            command: 'echo "test"',
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate tool with sandbox configuration', () => {
      const validTool = {
        name: 'sandboxed-tool',
        type: 'tool',
        description: 'Sandboxed tool',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: {
            command: 'echo "test"',
            sandbox: {
              enabled: true,
              allowlisted_commands: ['echo', 'ls'],
              network_access: false,
              max_execution_time: 5000,
              env_vars: ['PATH', 'HOME'],
            },
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid tool definitions', () => {
    it('should reject tool with invalid name', () => {
      const invalidTool = {
        name: 'invalid tool!',
        type: 'tool',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo' },
        },
      };

      const result = ToolDefinitionSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with invalid version', () => {
      const invalidTool = {
        name: 'test-tool',
        type: 'tool',
        description: 'Test',
        version: 'v1.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo' },
        },
      };

      const result = ToolDefinitionSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool without implementation', () => {
      const invalidTool = {
        name: 'test-tool',
        type: 'tool',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        parameters: {},
      };

      const result = ToolDefinitionSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with wrong type literal', () => {
      const invalidTool = {
        name: 'test-tool',
        type: 'agent',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: { command: 'echo' },
        },
      };

      const result = ToolDefinitionSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject HTTP tool with invalid method', () => {
      const invalidTool = {
        name: 'http-tool',
        type: 'tool',
        description: 'Test',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'http',
          http: {
            method: 'PATCH',
            url: 'https://example.com',
          },
        },
      };

      const result = ToolDefinitionSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });
  });
});

describe('ToolParameterSchema', () => {
  it('should validate string parameter', () => {
    const param = {
      type: 'string',
      description: 'A string param',
      required: true,
    };

    const result = ToolParameterSchema.safeParse(param);
    expect(result.success).toBe(true);
  });

  it('should validate parameter with enum', () => {
    const param = {
      type: 'string',
      description: 'A choice param',
      required: true,
      enum: ['option1', 'option2', 'option3'],
    };

    const result = ToolParameterSchema.safeParse(param);
    expect(result.success).toBe(true);
  });

  it('should validate parameter with default', () => {
    const param = {
      type: 'integer',
      description: 'A number param',
      required: false,
      default: 42,
    };

    const result = ToolParameterSchema.safeParse(param);
    expect(result.success).toBe(true);
  });

  it('should validate nested object parameter', () => {
    const param = {
      type: 'object',
      description: 'A nested object',
      required: true,
      properties: {
        name: {
          type: 'string',
          description: 'Name field',
          required: true,
        },
        age: {
          type: 'integer',
          description: 'Age field',
          required: false,
        },
      },
    };

    const result = ToolParameterSchema.safeParse(param);
    expect(result.success).toBe(true);
  });
});
