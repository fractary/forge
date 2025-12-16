/**
 * Custom Resolver Example
 *
 * This example demonstrates how to extend DefinitionResolver
 * to implement custom resolution logic.
 */

import {
  DefinitionResolver,
  type ResolverConfig,
  type ResolvedAgent,
  type ResolvedTool,
  type AgentDefinition,
  type ToolDefinition,
} from '@fractary/forge';
import * as path from 'path';
import * as os from 'os';

/**
 * Example 1: Database Resolver
 *
 * Resolves agents/tools from a database before falling back
 * to the default resolution strategy.
 */
class DatabaseResolver extends DefinitionResolver {
  constructor(
    config: ResolverConfig,
    private dbConnection: any // Your database connection
  ) {
    super(config);
  }

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    console.log(`[DatabaseResolver] Attempting to resolve: ${nameWithVersion}`);

    // Try database first
    const fromDb = await this.resolveFromDatabase(nameWithVersion, 'agent');
    if (fromDb) {
      console.log(`[DatabaseResolver] ✓ Resolved from database`);
      return fromDb as ResolvedAgent;
    }

    // Fall back to default resolution (local → global → stockyard)
    console.log(`[DatabaseResolver] Not in database, using default resolution`);
    return super.resolveAgent(nameWithVersion);
  }

  async resolveTool(nameWithVersion: string): Promise<ResolvedTool> {
    console.log(`[DatabaseResolver] Attempting to resolve: ${nameWithVersion}`);

    const fromDb = await this.resolveFromDatabase(nameWithVersion, 'tool');
    if (fromDb) {
      console.log(`[DatabaseResolver] ✓ Resolved from database`);
      return fromDb as ResolvedTool;
    }

    console.log(`[DatabaseResolver] Not in database, using default resolution`);
    return super.resolveTool(nameWithVersion);
  }

  private async resolveFromDatabase(
    nameWithVersion: string,
    type: 'agent' | 'tool'
  ): Promise<ResolvedAgent | ResolvedTool | null> {
    const { name, versionConstraint } = this.parseNameVersion(nameWithVersion);

    // Query database (example - replace with actual DB logic)
    const query = `
      SELECT * FROM ${type}s
      WHERE name = ? AND version LIKE ?
      ORDER BY version DESC
      LIMIT 1
    `;

    try {
      const result = await this.dbConnection.query(query, [name, versionConstraint]);

      if (!result || result.length === 0) {
        return null;
      }

      const definition = JSON.parse(result[0].definition);

      return {
        definition,
        version: result[0].version,
        source: 'database' as any, // Custom source
        path: '', // Database doesn't have file path
      };
    } catch (error) {
      console.error(`[DatabaseResolver] Database error:`, error);
      return null;
    }
  }

  private parseNameVersion(nameWithVersion: string): {
    name: string;
    versionConstraint: string;
  } {
    const parts = nameWithVersion.split('@');
    return {
      name: parts[0],
      versionConstraint: parts[1] || '*',
    };
  }
}

/**
 * Example 2: API Resolver
 *
 * Resolves agents/tools from a remote API.
 */
class APIResolver extends DefinitionResolver {
  constructor(
    config: ResolverConfig,
    private apiBaseUrl: string,
    private apiKey?: string
  ) {
    super(config);
  }

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    // Try API first
    const fromApi = await this.resolveFromAPI(nameWithVersion, 'agent');
    if (fromApi) {
      return fromApi as ResolvedAgent;
    }

    // Fall back to default
    return super.resolveAgent(nameWithVersion);
  }

  async resolveTool(nameWithVersion: string): Promise<ResolvedTool> {
    const fromApi = await this.resolveFromAPI(nameWithVersion, 'tool');
    if (fromApi) {
      return fromApi as ResolvedTool;
    }

    return super.resolveTool(nameWithVersion);
  }

  private async resolveFromAPI(
    nameWithVersion: string,
    type: 'agent' | 'tool'
  ): Promise<ResolvedAgent | ResolvedTool | null> {
    const { name, versionConstraint } = this.parseNameVersion(nameWithVersion);

    try {
      const url = `${this.apiBaseUrl}/${type}s/${name}?version=${versionConstraint}`;
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        definition: data.definition,
        version: data.version,
        source: 'api' as any,
        path: data.downloadUrl || '',
      };
    } catch (error) {
      console.error(`[APIResolver] API error:`, error);
      return null;
    }
  }

  private parseNameVersion(nameWithVersion: string): {
    name: string;
    versionConstraint: string;
  } {
    const parts = nameWithVersion.split('@');
    return {
      name: parts[0],
      versionConstraint: parts[1] || '*',
    };
  }
}

/**
 * Example 3: Caching Resolver
 *
 * Adds an in-memory cache to speed up repeated resolutions.
 */
class CachingResolver extends DefinitionResolver {
  private cache = new Map<string, ResolvedAgent | ResolvedTool>();
  private cacheExpiry = new Map<string, number>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    // Check cache first
    const cached = this.getFromCache(nameWithVersion);
    if (cached) {
      console.log(`[CachingResolver] ✓ Cache hit for ${nameWithVersion}`);
      return cached as ResolvedAgent;
    }

    console.log(`[CachingResolver] Cache miss for ${nameWithVersion}`);

    // Resolve normally
    const resolved = await super.resolveAgent(nameWithVersion);

    // Store in cache
    this.setInCache(nameWithVersion, resolved);

    return resolved;
  }

  async resolveTool(nameWithVersion: string): Promise<ResolvedTool> {
    const cached = this.getFromCache(nameWithVersion);
    if (cached) {
      console.log(`[CachingResolver] ✓ Cache hit for ${nameWithVersion}`);
      return cached as ResolvedTool;
    }

    console.log(`[CachingResolver] Cache miss for ${nameWithVersion}`);

    const resolved = await super.resolveTool(nameWithVersion);
    this.setInCache(nameWithVersion, resolved);

    return resolved;
  }

  private getFromCache(key: string): ResolvedAgent | ResolvedTool | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      // Expired or not in cache
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  private setInCache(key: string, value: ResolvedAgent | ResolvedTool): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.cacheTTL);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('[CachingResolver] Cache cleared');
  }
}

/**
 * Example 4: Validation Resolver
 *
 * Adds custom validation logic after resolution.
 */
class ValidationResolver extends DefinitionResolver {
  async resolveAgent(nameWithVersion: string): Promise<ResolvedAgent> {
    const resolved = await super.resolveAgent(nameWithVersion);

    // Custom validation
    this.validateAgent(resolved.definition);

    return resolved;
  }

  async resolveTool(nameWithVersion: string): Promise<ResolvedTool> {
    const resolved = await super.resolveTool(nameWithVersion);

    this.validateTool(resolved.definition);

    return resolved;
  }

  private validateAgent(definition: AgentDefinition): void {
    // Example: Enforce approved models only
    const approvedModels = ['claude-sonnet-4', 'claude-opus-4', 'claude-haiku-4'];

    if (!approvedModels.includes(definition.model.name)) {
      throw new Error(
        `Agent uses unapproved model: ${definition.model.name}. ` +
          `Approved models: ${approvedModels.join(', ')}`
      );
    }

    // Example: Agents must have at least one tool
    if (!definition.tools || definition.tools.length === 0) {
      throw new Error(`Agent ${definition.name} must have at least one tool`);
    }

    // Example: Prompts must be under 10000 characters
    if (definition.prompt && definition.prompt.length > 10000) {
      throw new Error(
        `Agent ${definition.name} prompt exceeds 10000 characters (${definition.prompt.length})`
      );
    }

    console.log(`[ValidationResolver] ✓ Agent ${definition.name} passed validation`);
  }

  private validateTool(definition: ToolDefinition): void {
    // Example: Tools must have implementation
    if (!definition.implementation) {
      throw new Error(`Tool ${definition.name} missing implementation`);
    }

    // Example: Tools must have parameters
    if (!definition.parameters) {
      throw new Error(`Tool ${definition.name} missing parameters`);
    }

    console.log(`[ValidationResolver] ✓ Tool ${definition.name} passed validation`);
  }
}

// Demo function
async function main() {
  console.log('=== Custom Resolver Examples ===\n');

  const config: ResolverConfig = {
    local: {
      enabled: true,
      paths: [path.join(process.cwd(), '.fractary')],
    },
    global: {
      enabled: true,
      path: path.join(os.homedir(), '.fractary/registry'),
    },
    stockyard: {
      enabled: false,
    },
  };

  // Example 1: Caching Resolver
  console.log('Example 1: Caching Resolver\n');
  const cachingResolver = new CachingResolver(config);

  try {
    console.log('First resolution (cache miss):');
    await cachingResolver.resolveAgent('my-agent');

    console.log('\nSecond resolution (cache hit):');
    await cachingResolver.resolveAgent('my-agent');

    console.log();
  } catch (error: any) {
    console.error(`Error: ${error.message}\n`);
  }

  // Example 2: Validation Resolver
  console.log('Example 2: Validation Resolver\n');
  const validationResolver = new ValidationResolver(config);

  try {
    await validationResolver.resolveAgent('my-agent');
  } catch (error: any) {
    console.error(`Validation error: ${error.message}\n`);
  }

  // Example 3: API Resolver
  console.log('Example 3: API Resolver\n');
  const apiResolver = new APIResolver(
    config,
    'https://api.example.com',
    'your-api-key'
  );

  try {
    await apiResolver.resolveAgent('remote-agent');
  } catch (error: any) {
    console.error(`API error: ${error.message}\n`);
  }

  console.log('=== Examples Complete ===');
}

// Run the demo
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use in other modules
export { DatabaseResolver, APIResolver, CachingResolver, ValidationResolver };
