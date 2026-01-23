/**
 * Forge Section Configuration
 *
 * Types, schema, and defaults for the `forge:` section in unified config (.fractary/config.yaml)
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Local registry configuration schema
 */
export const LocalRegistryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  agents_path: z.string().default('.fractary/agents'),
  tools_path: z.string().default('.fractary/tools'),
});

/**
 * Global registry configuration schema
 */
export const GlobalRegistryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  path: z.string().default('~/.fractary/registry'),
});

/**
 * Stockyard registry configuration schema
 */
export const StockyardRegistryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().optional().default('https://stockyard.fractary.dev'),
  token_env: z.string().optional().default('FRACTARY_TOKEN'),
});

/**
 * Registry configuration schema
 */
export const RegistryConfigSchema = z.object({
  local: LocalRegistryConfigSchema.default({}),
  global: GlobalRegistryConfigSchema.default({}),
  stockyard: StockyardRegistryConfigSchema.default({}),
});

/**
 * Lockfile configuration schema
 */
export const LockfileConfigSchema = z.object({
  path: z.string().default('.fractary/forge/lockfile.json'),
  auto_generate: z.boolean().default(true),
  validate_on_install: z.boolean().default(true),
});

/**
 * Update policy type
 */
export const UpdatePolicySchema = z.enum(['prompt', 'block', 'allow']);

/**
 * Updates configuration schema
 */
export const UpdatesConfigSchema = z.object({
  check_frequency: z.enum(['daily', 'weekly', 'never']).default('daily'),
  auto_update: z.boolean().default(false),
  breaking_changes_policy: UpdatePolicySchema.default('prompt'),
});

/**
 * Default agent model configuration schema
 */
export const DefaultAgentModelConfigSchema = z.object({
  provider: z.string().default('anthropic'),
  name: z.string().default('claude-sonnet-4'),
});

/**
 * Default agent LLM configuration schema
 */
export const DefaultAgentLLMConfigSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().positive().default(4096),
});

/**
 * Default agent configuration schema
 */
export const DefaultAgentConfigSchema = z.object({
  model: DefaultAgentModelConfigSchema.default({}),
  config: DefaultAgentLLMConfigSchema.default({}),
});

/**
 * Default tool implementation configuration schema
 */
export const DefaultToolImplementationConfigSchema = z.object({
  type: z.string().default('function'),
});

/**
 * Default tool configuration schema
 */
export const DefaultToolConfigSchema = z.object({
  implementation: DefaultToolImplementationConfigSchema.default({}),
});

/**
 * Defaults configuration schema
 */
export const DefaultsConfigSchema = z.object({
  agent: DefaultAgentConfigSchema.default({}),
  tool: DefaultToolConfigSchema.default({}),
});

/**
 * Features configuration schema
 */
export const FeaturesConfigSchema = z.object({
  telemetry: z.boolean().default(false),
});

/**
 * Complete Forge section configuration schema
 */
export const ForgeSectionConfigSchema = z.object({
  schema_version: z.string().default('2.0'),
  organization: z.string(),
  registry: RegistryConfigSchema.default({}),
  lockfile: LockfileConfigSchema.default({}),
  updates: UpdatesConfigSchema.default({}),
  defaults: DefaultsConfigSchema.default({}),
  features: FeaturesConfigSchema.default({}),
});

// ============================================================================
// TypeScript Types (inferred from schemas)
// ============================================================================

export type LocalRegistryConfig = z.infer<typeof LocalRegistryConfigSchema>;
export type GlobalRegistryConfig = z.infer<typeof GlobalRegistryConfigSchema>;
export type StockyardRegistryConfig = z.infer<typeof StockyardRegistryConfigSchema>;
export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;
export type LockfileConfig = z.infer<typeof LockfileConfigSchema>;
export type UpdatePolicy = z.infer<typeof UpdatePolicySchema>;
export type UpdatesConfig = z.infer<typeof UpdatesConfigSchema>;
export type DefaultAgentModelConfig = z.infer<typeof DefaultAgentModelConfigSchema>;
export type DefaultAgentLLMConfig = z.infer<typeof DefaultAgentLLMConfigSchema>;
export type DefaultAgentConfig = z.infer<typeof DefaultAgentConfigSchema>;
export type DefaultToolImplementationConfig = z.infer<typeof DefaultToolImplementationConfigSchema>;
export type DefaultToolConfig = z.infer<typeof DefaultToolConfigSchema>;
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>;
export type FeaturesConfig = z.infer<typeof FeaturesConfigSchema>;
export type ForgeSectionConfig = z.infer<typeof ForgeSectionConfigSchema>;

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Get default forge section configuration
 *
 * @param organization - Organization slug (e.g., "fractary")
 * @returns Complete forge section config with defaults
 */
export function getDefaultForgeConfig(organization: string): ForgeSectionConfig {
  return {
    schema_version: '2.0',
    organization,
    registry: {
      local: {
        enabled: true,
        agents_path: '.fractary/agents',
        tools_path: '.fractary/tools',
      },
      global: {
        enabled: true,
        path: '~/.fractary/registry',
      },
      stockyard: {
        enabled: false,
        url: 'https://stockyard.fractary.dev',
        token_env: 'FRACTARY_TOKEN',
      },
    },
    lockfile: {
      path: '.fractary/forge/lockfile.json',
      auto_generate: true,
      validate_on_install: true,
    },
    updates: {
      check_frequency: 'daily',
      auto_update: false,
      breaking_changes_policy: 'prompt',
    },
    defaults: {
      agent: {
        model: {
          provider: 'anthropic',
          name: 'claude-sonnet-4',
        },
        config: {
          temperature: 0.7,
          max_tokens: 4096,
        },
      },
      tool: {
        implementation: {
          type: 'function',
        },
      },
    },
    features: {
      telemetry: false,
    },
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result with detailed errors
 */
export interface ForgeConfigValidationResult {
  success: boolean;
  data?: ForgeSectionConfig;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate forge section configuration
 *
 * @param config - Raw config object to validate
 * @returns Validated config or throws on error
 */
export function validateForgeConfig(config: unknown): ForgeSectionConfig {
  return ForgeSectionConfigSchema.parse(config);
}

/**
 * Safely validate forge section configuration
 *
 * @param config - Raw config object to validate
 * @returns Validation result with success status and errors
 */
export function safeValidateForgeConfig(config: unknown): ForgeConfigValidationResult {
  const result = ForgeSectionConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Merge partial config with defaults
 *
 * @param partial - Partial forge config
 * @param organization - Organization slug for defaults
 * @returns Complete config with defaults filled in
 */
export function mergeWithDefaults(
  partial: Partial<ForgeSectionConfig>,
  organization: string
): ForgeSectionConfig {
  const defaults = getDefaultForgeConfig(organization);

  return {
    ...defaults,
    ...partial,
    registry: {
      ...defaults.registry,
      ...partial.registry,
      local: { ...defaults.registry.local, ...partial.registry?.local },
      global: { ...defaults.registry.global, ...partial.registry?.global },
      stockyard: { ...defaults.registry.stockyard, ...partial.registry?.stockyard },
    },
    lockfile: { ...defaults.lockfile, ...partial.lockfile },
    updates: { ...defaults.updates, ...partial.updates },
    defaults: {
      ...defaults.defaults,
      ...partial.defaults,
      agent: {
        ...defaults.defaults.agent,
        ...partial.defaults?.agent,
        model: { ...defaults.defaults.agent.model, ...partial.defaults?.agent?.model },
        config: { ...defaults.defaults.agent.config, ...partial.defaults?.agent?.config },
      },
      tool: {
        ...defaults.defaults.tool,
        ...partial.defaults?.tool,
        implementation: {
          ...defaults.defaults.tool.implementation,
          ...partial.defaults?.tool?.implementation,
        },
      },
    },
    features: { ...defaults.features, ...partial.features },
  };
}
