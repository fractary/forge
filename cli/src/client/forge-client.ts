/**
 * ForgeClient - Unified client wrapper for Forge SDK
 *
 * Wraps AgentAPI, ToolAPI, DefinitionResolver, and other SDK managers
 * to provide a clean interface for CLI commands.
 *
 * Now uses unified config (.fractary/config.yaml) with the forge: section.
 */

// Type-only imports
import type {
  DefinitionResolver,
  AgentAPI,
  ToolAPI,
  ResolvedAgent,
  ResolvedTool,
  AgentInfo,
  ToolInfo,
  DefinitionRegistryConfig as RegistryConfig,
  ForgeSectionConfig,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

export interface ForgeClientOptions {
  projectRoot?: string;
  organization?: string;
}

/**
 * Unified Forge client
 *
 * Provides high-level operations for:
 * - Agent resolution and management
 * - Tool resolution and execution
 * - Registry operations
 *
 * Uses unified config (.fractary/config.yaml) forge: section.
 */
export class ForgeClient {
  private resolver: DefinitionResolver;
  private agentAPI: AgentAPI;
  private toolAPI: ToolAPI;
  private organization: string;
  private projectRoot: string;
  private config: ForgeSectionConfig;

  /**
   * Private constructor - use ForgeClient.create() instead
   */
  private constructor(
    resolver: DefinitionResolver,
    agentAPI: AgentAPI,
    toolAPI: ToolAPI,
    config: ForgeSectionConfig,
    projectRoot: string
  ) {
    this.resolver = resolver;
    this.agentAPI = agentAPI;
    this.toolAPI = toolAPI;
    this.config = config;
    this.organization = config.organization;
    this.projectRoot = projectRoot;
  }

  /**
   * Create ForgeClient instance
   *
   * Loads configuration from unified config (.fractary/config.yaml) forge: section.
   * Falls back to old config location (.fractary/forge/config.yaml) for migration.
   */
  static async create(options?: ForgeClientOptions): Promise<ForgeClient> {
    // Dynamic imports to avoid loading SDK at module time
    const {
      DefinitionResolver,
      AgentAPI,
      ToolAPI,
      findProjectRoot,
      loadForgeSection,
      needsMigration,
      safeLoadForgeSection,
    } = await import('@fractary/forge');

    // Find project root
    const projectRoot = options?.projectRoot || await findProjectRoot() || process.cwd();

    // Load configuration from unified config
    let config: ForgeSectionConfig;
    try {
      // First try unified config
      const loadedConfig = await safeLoadForgeSection(projectRoot);

      if (loadedConfig) {
        config = loadedConfig;
      } else {
        // Check if migration is needed
        const migrationNeeded = await needsMigration(projectRoot);
        if (migrationNeeded) {
          throw new Error(
            'Old configuration found at .fractary/forge/config.yaml. ' +
            'Run "fractary-forge configure" to migrate to unified config.'
          );
        }
        throw new Error(
          'Forge configuration not found. Run "fractary-forge configure" to create one.'
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to load forge configuration. Run "fractary-forge configure" to create one.\nError: ${(error as Error).message}`
      );
    }

    // Override organization if provided
    if (options?.organization) {
      config = { ...config, organization: options.organization };
    }

    // Build resolver config
    const resolverConfig = ForgeClient.buildResolverConfig(config, projectRoot);

    // Create resolver
    const resolver = new DefinitionResolver(resolverConfig);

    // Initialize SDK managers with resolver config
    const sdkConfig = {
      definitions: {
        registry: resolverConfig,
      },
    };
    const agentAPI = new AgentAPI(sdkConfig);
    const toolAPI = new ToolAPI(sdkConfig);

    return new ForgeClient(resolver, agentAPI, toolAPI, config, projectRoot);
  }

  /**
   * Build resolver configuration from forge section config
   */
  private static buildResolverConfig(
    config: ForgeSectionConfig,
    projectRoot: string
  ): RegistryConfig {
    // Resolve token from environment variable
    // Note: token_env has a default value ('FRACTARY_TOKEN'), so we check
    // if the environment variable itself is set, not just if token_env exists
    const tokenEnvName = config.registry.stockyard.token_env;
    const stockyardApiKey = tokenEnvName ? process.env[tokenEnvName] : undefined;

    return {
      local: {
        enabled: config.registry.local.enabled,
        paths: [
          path.join(projectRoot, config.registry.local.agents_path),
          path.join(projectRoot, config.registry.local.tools_path),
        ],
      },
      global: {
        enabled: config.registry.global.enabled,
        path: path.isAbsolute(config.registry.global.path)
          ? config.registry.global.path
          : path.join(os.homedir(), config.registry.global.path.replace('~/', '')),
      },
      stockyard: {
        enabled: config.registry.stockyard.enabled,
        url: config.registry.stockyard.url,
        apiKey: stockyardApiKey,
      },
    };
  }

  // Agent operations

  /**
   * Resolve an agent definition
   */
  async agentResolve(name: string): Promise<ResolvedAgent> {
    return this.resolver.agentResolve(name);
  }

  /**
   * Get agent information
   */
  async agentInfoGet(name: string): Promise<AgentInfo> {
    return this.agentAPI.agentInfoGet(name);
  }

  /**
   * Check if agent exists
   */
  async agentHas(name: string): Promise<boolean> {
    return this.agentAPI.agentHas(name);
  }

  /**
   * List available agents
   */
  async agentList(filters?: { tags?: string[] }): Promise<AgentInfo[]> {
    return this.agentAPI.agentList(filters);
  }

  /**
   * Health check an agent
   */
  async agentHealthCheck(name: string) {
    return this.agentAPI.agentHealthCheck(name);
  }

  /**
   * Refresh agent prompt cache
   */
  async agentCacheRefresh(name: string): Promise<void> {
    return this.agentAPI.agentCacheRefresh(name);
  }

  // Tool operations

  /**
   * Resolve a tool definition
   */
  async toolResolve(name: string): Promise<ResolvedTool> {
    return this.resolver.toolResolve(name);
  }

  /**
   * Get tool information
   */
  async toolInfoGet(name: string): Promise<ToolInfo> {
    return this.toolAPI.toolInfoGet(name);
  }

  /**
   * Check if tool exists
   */
  async toolHas(name: string): Promise<boolean> {
    return this.toolAPI.toolHas(name);
  }

  /**
   * List available tools
   */
  async toolList(filters?: { tags?: string[] }): Promise<ToolInfo[]> {
    return this.toolAPI.toolList(filters);
  }

  /**
   * Execute a tool
   */
  async toolExecute(
    name: string,
    params: Record<string, any>,
    options?: any
  ) {
    return this.toolAPI.toolExecute(name, params, options);
  }

  // Getters

  getOrganization(): string {
    return this.organization;
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }

  getConfig(): ForgeSectionConfig {
    return this.config;
  }

  getResolver(): DefinitionResolver {
    return this.resolver;
  }
}
