/**
 * Main Registry Resolver
 *
 * Orchestrates three-tier component resolution:
 * 1. Local project (.fractary/)
 * 2. Global user (~/.fractary/registry/)
 * 3. Remote registries (manifest-based or Stockyard)
 *
 * Implements resolution algorithm from SPEC-FORGE-005 section 6.
 */

import * as semver from 'semver';
import {
  LocalResolver,
  type LocalComponent,
  type ComponentType,
} from './resolvers/local-resolver.js';
import { ManifestResolver } from './resolvers/manifest-resolver.js';
import { ConfigManager } from './config-manager.js';
import type { ForgeConfig, RegistryConfig } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface ResolvedComponent {
  /** Component name */
  name: string;
  /** Component type */
  type: ComponentType;
  /** Resolution source: local, global, or registry name */
  source: 'local' | 'global' | string;
  /** Absolute path to component (if local/global) */
  path?: string;
  /** Remote URL (if from registry) */
  url?: string;
  /** Version (if specified) */
  version?: string;
  /** Parent plugin name (if component is part of a plugin) */
  plugin?: string;
  /** Whether component is from project vs global/remote */
  isProject?: boolean;
}

export interface ResolveOptions {
  /** Version constraint (semver) */
  version?: string;
  /** Only search in specific registry */
  registry?: string;
  /** Skip local/global, only search remote */
  remoteOnly?: boolean;
}

// ============================================================================
// Main Resolver
// ============================================================================

export class Resolver {
  private localResolver: LocalResolver;
  private manifestResolver: ManifestResolver;
  private configManager: ConfigManager;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.localResolver = new LocalResolver(cwd);
    this.manifestResolver = new ManifestResolver();
    this.configManager = new ConfigManager();
  }

  /**
   * Resolve component with three-tier priority
   */
  async resolve(
    name: string,
    type: ComponentType,
    options: ResolveOptions = {}
  ): Promise<ResolvedComponent | null> {
    const { remoteOnly = false } = options;

    // Tier 1: Local project (.fractary/)
    if (!remoteOnly) {
      const localComponent = await this.localResolver.resolve(name, type);
      if (localComponent) {
        return this.localComponentToResolved(localComponent, 'local');
      }
    }

    // Tier 2: Global user (~/.fractary/registry/)
    if (!remoteOnly) {
      const globalComponent = await this.localResolver.resolve(name, type);
      if (globalComponent && !globalComponent.isProject) {
        return this.localComponentToResolved(globalComponent, 'global');
      }
    }

    // Tier 3: Remote registries
    return this.resolveFromRemote(name, type, options);
  }

  /**
   * Resolve from remote registries
   */
  private async resolveFromRemote(
    name: string,
    type: ComponentType,
    options: ResolveOptions
  ): Promise<ResolvedComponent | null> {
    // Load configuration
    const configResult = await this.configManager.loadConfig(this.cwd);
    const config = configResult.config;

    // Filter and sort registries
    let registries = config.registries.filter((r) => r.enabled);

    // Filter by specific registry if requested
    if (options.registry) {
      registries = registries.filter((r) => r.name === options.registry);
    }

    // Sort by priority (lower number = higher priority)
    registries.sort((a, b) => a.priority - b.priority);

    // Search each registry in priority order
    for (const registry of registries) {
      try {
        const component = await this.resolveFromRegistry(name, type, registry, options);

        if (component) {
          return component;
        }
      } catch (error) {
        // Log error but continue to next registry
        console.warn(
          `Failed to resolve from registry ${registry.name}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return null;
  }

  /**
   * Resolve from a specific registry
   */
  private async resolveFromRegistry(
    name: string,
    type: ComponentType,
    registry: RegistryConfig,
    options: ResolveOptions
  ): Promise<ResolvedComponent | null> {
    if (registry.type !== 'manifest') {
      // Future: Handle Stockyard registries
      return null;
    }

    // Check if name includes plugin reference (@plugin/component)
    const pluginMatch = name.match(/^@([^/]+)\/(.+)$/);

    if (pluginMatch) {
      const [, pluginName, componentName] = pluginMatch;
      return this.resolvePluginComponent(pluginName, componentName, type, registry, options);
    }

    // For standalone components, we'd need to search all plugins
    // This is less common, so we'll implement plugin-scoped resolution first
    return null;
  }

  /**
   * Resolve component from a specific plugin
   */
  private async resolvePluginComponent(
    pluginName: string,
    componentName: string,
    componentType: ComponentType,
    registry: RegistryConfig,
    options: ResolveOptions
  ): Promise<ResolvedComponent | null> {
    // Fetch registry manifest
    const result = await this.manifestResolver.fetchManifest(registry);

    // Find plugin reference
    const pluginRef = result.manifest.plugins.find((p) => p.name === pluginName);

    if (!pluginRef) {
      return null;
    }

    // Check version constraint
    if (options.version && !semver.satisfies(pluginRef.version, options.version)) {
      return null;
    }

    // Fetch plugin manifest
    const pluginManifest = await this.manifestResolver.fetchPluginManifest(
      pluginRef.manifest_url,
      pluginRef.checksum
    );

    // Find component in plugin manifest
    const componentsList = this.getComponentList(pluginManifest, componentType);
    const component = componentsList?.find((c) => c.name === componentName);

    if (!component) {
      return null;
    }

    return {
      name: componentName,
      type: componentType,
      source: registry.name,
      url: component.source,
      version: component.version,
      plugin: pluginName,
    };
  }

  /**
   * Get component list from plugin manifest by type
   */
  private getComponentList(pluginManifest: any, type: ComponentType): any[] | undefined {
    switch (type) {
      case 'agent':
        return pluginManifest.agents;
      case 'tool':
        return pluginManifest.tools;
      case 'workflow':
        return pluginManifest.workflows;
      case 'template':
        return pluginManifest.templates;
      default:
        return undefined;
    }
  }

  /**
   * Convert LocalComponent to ResolvedComponent
   */
  private localComponentToResolved(
    local: LocalComponent,
    source: 'local' | 'global'
  ): ResolvedComponent {
    return {
      name: local.name,
      type: local.type,
      source,
      path: local.path,
      plugin: local.plugin,
      isProject: local.isProject,
    };
  }

  /**
   * Resolve plugin (searches all registries)
   */
  async resolvePlugin(
    pluginName: string,
    options: ResolveOptions = {}
  ): Promise<ResolvedComponent | null> {
    // Load configuration
    const configResult = await this.configManager.loadConfig(this.cwd);
    const config = configResult.config;

    // Get enabled registries sorted by priority
    let registries = config.registries
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Filter by specific registry if requested
    if (options.registry) {
      registries = registries.filter((r) => r.name === options.registry);
    }

    // Search each registry
    for (const registry of registries) {
      if (registry.type !== 'manifest') {
        continue;
      }

      try {
        const result = await this.manifestResolver.fetchManifest(registry);
        const pluginRef = result.manifest.plugins.find((p) => p.name === pluginName);

        if (pluginRef) {
          // Check version constraint
          if (options.version && !semver.satisfies(pluginRef.version, options.version)) {
            continue;
          }

          return {
            name: pluginName,
            type: 'plugin',
            source: registry.name,
            url: pluginRef.manifest_url,
            version: pluginRef.version,
          };
        }
      } catch (error) {
        console.warn(`Failed to search registry ${registry.name}:`, error);
      }
    }

    return null;
  }

  /**
   * Search for components across all registries
   */
  async search(
    query: string,
    type?: ComponentType,
    options: { registry?: string; tag?: string } = {}
  ): Promise<ResolvedComponent[]> {
    const results: ResolvedComponent[] = [];

    // Load configuration
    const configResult = await this.configManager.loadConfig(this.cwd);
    const config = configResult.config;

    // Get enabled registries
    let registries = config.registries
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Filter by specific registry if requested
    if (options.registry) {
      registries = registries.filter((r) => r.name === options.registry);
    }

    // Search each registry
    for (const registry of registries) {
      if (registry.type !== 'manifest') {
        continue;
      }

      try {
        const result = await this.manifestResolver.fetchManifest(registry);

        for (const pluginRef of result.manifest.plugins) {
          // Filter by tag if specified
          if (options.tag && !pluginRef.tags.includes(options.tag)) {
            continue;
          }

          // Match query against name or description
          const matchesQuery =
            query === '' ||
            pluginRef.name.toLowerCase().includes(query.toLowerCase()) ||
            pluginRef.description.toLowerCase().includes(query.toLowerCase());

          if (matchesQuery) {
            results.push({
              name: pluginRef.name,
              type: 'plugin',
              source: registry.name,
              url: pluginRef.manifest_url,
              version: pluginRef.version,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to search registry ${registry.name}:`, error);
      }
    }

    return results;
  }

  /**
   * List all installed components
   */
  async listInstalled(
    type?: ComponentType,
    scope?: 'local' | 'global' | 'all'
  ): Promise<LocalComponent[]> {
    const actualScope = scope || 'all';

    if (type) {
      if (actualScope === 'local') {
        return this.localResolver.listProject(type);
      } else if (actualScope === 'global') {
        return this.localResolver.listGlobal(type);
      } else {
        return this.localResolver.listAll(type);
      }
    }

    // List all types
    const types: ComponentType[] = ['agent', 'tool', 'workflow', 'template', 'plugin'];
    const allComponents: LocalComponent[] = [];

    for (const t of types) {
      let components: LocalComponent[];

      if (actualScope === 'local') {
        components = await this.localResolver.listProject(t);
      } else if (actualScope === 'global') {
        components = await this.localResolver.listGlobal(t);
      } else {
        components = await this.localResolver.listAll(t);
      }

      allComponents.push(...components);
    }

    return allComponents;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default resolver instance
 */
export const resolver = new Resolver();
