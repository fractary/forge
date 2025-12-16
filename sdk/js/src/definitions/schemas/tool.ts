/**
 * Tool definition schemas
 */

import { z } from 'zod';

/**
 * Tool parameter types
 */
export const ToolParameterTypeSchema = z.enum([
  'string',
  'integer',
  'number',
  'boolean',
  'object',
  'array',
]);

export type ToolParameterType = z.infer<typeof ToolParameterTypeSchema>;

/**
 * Tool parameter schema (recursive for nested objects)
 */
export const ToolParameterSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: ToolParameterTypeSchema,
    description: z.string(),
    required: z.boolean(),
    default: z.any().optional(),
    enum: z.array(z.any()).optional(),
    properties: z.record(ToolParameterSchema).optional(), // For nested objects
  })
);

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

/**
 * Bash implementation schema
 */
export const BashImplementationSchema = z.object({
  command: z.string(),
  sandbox: z
    .object({
      enabled: z.boolean(),
      allowlisted_commands: z.array(z.string()).optional(),
      network_access: z.boolean().optional(),
      max_execution_time: z.number().optional(),
      env_vars: z.array(z.string()).optional(),
    })
    .optional(),
});

export type BashImplementation = z.infer<typeof BashImplementationSchema>;

/**
 * Python implementation schema
 */
export const PythonImplementationSchema = z.object({
  module: z.string(),
  function: z.string(),
});

export type PythonImplementation = z.infer<typeof PythonImplementationSchema>;

/**
 * HTTP implementation schema
 */
export const HTTPImplementationSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  body_template: z.string().optional(),
});

export type HTTPImplementation = z.infer<typeof HTTPImplementationSchema>;

/**
 * Tool implementation schema (discriminated union)
 */
export const ToolImplementationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bash'),
    bash: BashImplementationSchema,
  }),
  z.object({
    type: z.literal('python'),
    python: PythonImplementationSchema,
  }),
  z.object({
    type: z.literal('http'),
    http: HTTPImplementationSchema,
  }),
]);

export type ToolImplementation = z.infer<typeof ToolImplementationSchema>;

/**
 * Tool definition schema
 */
export const ToolDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\-_]+$/),
  type: z.literal('tool'),
  description: z.string(),

  // Definition inheritance support
  extends: z.string().optional(),

  // Parameters
  parameters: z.record(ToolParameterSchema),

  // Tool chaining/dependency support
  depends_on: z.array(z.string()).optional(),

  // Implementation
  implementation: ToolImplementationSchema,

  // Output schema (JSON Schema)
  output: z.record(z.any()).optional(),

  // Metadata
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
