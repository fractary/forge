/**
 * Registry and Plugin Manifest Schemas
 *
 * Defines Zod schemas for validating registry manifests (registry.json)
 * and plugin manifests (plugin.json) following SPEC-FORGE-005.
 */

import { z } from 'zod';

// ============================================================================
// Registry Manifest Schemas
// ============================================================================

/**
 * Plugin reference in registry manifest
 * Points to a plugin's manifest URL with metadata
 */
export const RegistryPluginReferenceSchema = z.object({
  name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/, 'Plugin name must match @org/name format'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version (X.Y.Z)'),
  description: z.string().min(1, 'Description is required'),
  manifest_url: z.string().url('Manifest URL must be valid HTTPS URL'),
  homepage: z.string().url('Homepage must be valid URL').optional(),
  repository: z.string().url('Repository must be valid URL'),
  license: z.string().min(1, 'License is required'),
  tags: z.array(z.string()),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
});

export type RegistryPluginReference = z.infer<typeof RegistryPluginReferenceSchema>;

/**
 * Registry manifest (registry.json)
 * Lives at repository root (e.g., fractary/plugins/registry.json)
 */
export const RegistryManifestSchema = z.object({
  $schema: z.string().url('Schema URL must be valid').optional(),
  name: z.string().min(1, 'Registry name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  updated: z.string().datetime('Updated must be ISO 8601 datetime'),
  plugins: z.array(RegistryPluginReferenceSchema),
});

export type RegistryManifest = z.infer<typeof RegistryManifestSchema>;

// ============================================================================
// Plugin Manifest Schemas
// ============================================================================

/**
 * Generic plugin item (agents, tools, workflows, templates)
 * All have same base structure with name, version, source URL, checksum
 */
export const PluginItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  source: z.string().url('Source URL must be valid HTTPS URL'),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
  size: z.number().min(1, 'Size must be positive number'),
  dependencies: z.array(z.string()).optional(),
});

export type PluginItem = z.infer<typeof PluginItemSchema>;

/**
 * Plugin hook definition
 * Hooks are scripts that execute on specific events
 */
export const PluginHookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['pre-commit', 'post-commit', 'pre-push', 'post-push', 'session-start', 'session-end']),
  source: z.string().url('Source URL must be valid HTTPS URL'),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
  size: z.number().min(1, 'Size must be positive number'),
});

export type PluginHook = z.infer<typeof PluginHookSchema>;

/**
 * Plugin command definition
 * Commands are markdown prompts that can be invoked
 */
export const PluginCommandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  source: z.string().url('Source URL must be valid HTTPS URL'),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
  size: z.number().min(1, 'Size must be positive number'),
});

export type PluginCommand = z.infer<typeof PluginCommandSchema>;

/**
 * Plugin workflow definition
 * Workflows orchestrate multiple agents in sequence
 */
export const PluginWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  source: z.string().url('Source URL must be valid HTTPS URL'),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
  size: z.number().min(1, 'Size must be positive number'),
  dependencies: z.array(z.string()).optional(),
});

export type PluginWorkflow = z.infer<typeof PluginWorkflowSchema>;

/**
 * Plugin template definition
 * Templates provide reusable structures for specs, configs, etc.
 */
export const PluginTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  source: z.string().url('Source URL must be valid HTTPS URL'),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Checksum must be SHA-256 hash'),
  size: z.number().min(1, 'Size must be positive number'),
});

export type PluginTemplate = z.infer<typeof PluginTemplateSchema>;

/**
 * Plugin configuration
 * Default settings for LLM and permissions
 */
export const PluginConfigSchema = z.object({
  default_llm: z.object({
    provider: z.enum(['anthropic', 'openai', 'google']),
    model: z.string(),
  }).optional(),
  permissions: z.object({
    read: z.array(z.string()).optional(),
    write: z.array(z.string()).optional(),
    execute: z.array(z.string()).optional(),
  }).optional(),
}).optional();

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

/**
 * Plugin manifest (plugin.json)
 * Lives in each plugin directory (e.g., fractary/plugins/faber-plugin/plugin.json)
 */
export const PluginManifestSchema = z.object({
  $schema: z.string().url('Schema URL must be valid').optional(),
  name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/, 'Plugin name must match @org/name format'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version'),
  description: z.string().min(1, 'Description is required'),
  author: z.string().min(1, 'Author is required'),
  homepage: z.string().url('Homepage must be valid URL').optional(),
  repository: z.string().url('Repository must be valid URL'),
  license: z.string().min(1, 'License is required'),
  tags: z.array(z.string()),
  agents: z.array(PluginItemSchema).optional(),
  tools: z.array(PluginItemSchema).optional(),
  workflows: z.array(PluginWorkflowSchema).optional(),
  templates: z.array(PluginTemplateSchema).optional(),
  hooks: z.array(PluginHookSchema).optional(),
  commands: z.array(PluginCommandSchema).optional(),
  config: PluginConfigSchema,
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and parse registry manifest
 * @throws ZodError if validation fails
 */
export function validateRegistryManifest(data: unknown): RegistryManifest {
  return RegistryManifestSchema.parse(data);
}

/**
 * Validate and parse plugin manifest
 * @throws ZodError if validation fails
 */
export function validatePluginManifest(data: unknown): PluginManifest {
  return PluginManifestSchema.parse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidateRegistryManifest(data: unknown) {
  return RegistryManifestSchema.safeParse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidatePluginManifest(data: unknown) {
  return PluginManifestSchema.safeParse(data);
}
