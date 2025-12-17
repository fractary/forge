/**
 * Forge Configuration Types
 *
 * TypeScript interfaces for forge YAML configuration
 */

// Registry configuration types
export interface LocalRegistryConfig {
  enabled: boolean;
  agents_path: string;
  tools_path: string;
}

export interface GlobalRegistryConfig {
  enabled: boolean;
  path: string;
}

export interface StockyardRegistryConfig {
  enabled: boolean;
  url?: string;
  api_key?: string;
}

export interface RegistryConfig {
  local: LocalRegistryConfig;
  global: GlobalRegistryConfig;
  stockyard: StockyardRegistryConfig;
}

// Lockfile configuration
export interface LockfileConfig {
  path: string;
  auto_generate: boolean;
  validate_on_install: boolean;
}

// Update configuration
export type UpdatePolicy = 'prompt' | 'block' | 'allow';

export interface UpdatesConfig {
  check_frequency: 'daily' | 'weekly' | 'never';
  auto_update: boolean;
  breaking_changes_policy: UpdatePolicy;
}

// Default creation settings
export interface DefaultAgentModelConfig {
  provider: string;
  name: string;
}

export interface DefaultAgentLLMConfig {
  temperature: number;
  max_tokens: number;
}

export interface DefaultAgentConfig {
  model: DefaultAgentModelConfig;
  config: DefaultAgentLLMConfig;
}

export interface DefaultToolImplementationConfig {
  type: string;
}

export interface DefaultToolConfig {
  implementation: DefaultToolImplementationConfig;
}

export interface DefaultsConfig {
  agent: DefaultAgentConfig;
  tool: DefaultToolConfig;
}

// Main configuration
export interface ForgeYamlConfig {
  organization: string;
  registry: RegistryConfig;
  lockfile: LockfileConfig;
  updates: UpdatesConfig;
  defaults: DefaultsConfig;
}

/**
 * Get default YAML configuration
 */
export function getDefaultYamlConfig(organization: string): ForgeYamlConfig {
  return {
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
  };
}

/**
 * Resolve environment variables in a string
 * Supports ${VAR_NAME} syntax
 */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] || '';
  });
}

/**
 * Resolve environment variables in configuration object
 */
export function resolveEnvVarsInConfig(config: any): any {
  if (typeof config === 'string') {
    return resolveEnvVars(config);
  }

  if (Array.isArray(config)) {
    return config.map(item => resolveEnvVarsInConfig(item));
  }

  if (config !== null && typeof config === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveEnvVarsInConfig(value);
    }
    return resolved;
  }

  return config;
}
