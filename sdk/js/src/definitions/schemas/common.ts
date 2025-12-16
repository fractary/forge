/**
 * Common schema definitions for agents and tools
 */

import { z } from 'zod';

/**
 * LLM provider types
 */
export const LLMProviderSchema = z.enum(['anthropic', 'openai', 'google']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

/**
 * LLM configuration schema
 */
export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  temperature: z.number().min(0).max(1).optional(),
  max_tokens: z.number().min(1).max(200000).optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

/**
 * Cache source types
 */
export const CacheSourceTypeSchema = z.enum(['file', 'glob', 'inline', 'codex']);
export type CacheSourceType = z.infer<typeof CacheSourceTypeSchema>;

/**
 * Caching source schema
 */
export const CachingSourceSchema = z.object({
  type: CacheSourceTypeSchema,
  path: z.string().optional(), // For type=file
  pattern: z.string().optional(), // For type=glob
  content: z.string().optional(), // For type=inline
  uri: z.string().optional(), // For type=codex (codex://org/project/path)
  label: z.string(),
  ttl: z.number().optional(), // Source-specific TTL override in seconds
});

export type CachingSource = z.infer<typeof CachingSourceSchema>;

/**
 * Caching configuration schema
 */
export const CachingConfigSchema = z.object({
  enabled: z.boolean(),
  cache_sources: z.array(CachingSourceSchema),
});

export type CachingConfig = z.infer<typeof CachingConfigSchema>;
