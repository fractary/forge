/**
 * Agent definition schemas
 */

import { z } from 'zod';
import { LLMConfigSchema, CachingConfigSchema } from './common';
import { ToolDefinitionSchema } from './tool';

/**
 * Agent definition schema
 */
export const AgentDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\-_:]+$/),
  type: z.literal('agent'),
  description: z.string(),

  // Definition inheritance support
  extends: z.string().optional(),

  // LLM configuration
  llm: LLMConfigSchema,

  // System prompt (optional in frontmatter, derived from Markdown body)
  system_prompt: z.string().optional(),

  // Tools
  tools: z.array(z.string()),
  custom_tools: z.array(ToolDefinitionSchema).optional(),

  // Prompt caching
  caching: CachingConfigSchema.optional(),

  // Additional configuration
  config: z.record(z.any()).optional(),

  // Metadata
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  tags: z.array(z.string()),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
