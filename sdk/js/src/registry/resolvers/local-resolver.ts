/**
 * Local File System Resolver
 *
 * Resolves agents, tools, workflows, and templates from local file system:
 * - Project: .fractary/
 * - Global: ~/.fractary/registry/
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Types
// ============================================================================

export type ComponentType = 'agent' | 'tool' | 'workflow' | 'template' | 'plugin';

export interface LocalComponent {
  /** Component name */
  name: string;
  /** Component type */
  type: ComponentType;
  /** Absolute path to component file or directory */
  path: string;
  /** Whether found in project (true) or global (false) location */
  isProject: boolean;
  /** Parent plugin name if component is part of a plugin */
  plugin?: string;
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get project .fractary directory
 */
export function getProjectFractaryDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.fractary');
}

/**
 * Get global ~/.fractary/registry directory
 */
export function getGlobalFractaryDir(): string {
  return path.join(os.homedir(), '.fractary', 'registry');
}

/**
 * Get component directory for a given type
 */
function getComponentDir(baseDir: string, type: ComponentType): string {
  if (type === 'plugin') {
    return path.join(baseDir, 'plugins');
  }
  return path.join(baseDir, `${type}s`); // agents, tools, workflows, templates
}

// ============================================================================
// Local Resolver
// ============================================================================

export class LocalResolver {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Find component in project directory
   */
  private async findInProject(
    name: string,
    type: ComponentType
  ): Promise<LocalComponent | null> {
    const baseDir = getProjectFractaryDir(this.cwd);
    const componentDir = getComponentDir(baseDir, type);

    if (type === 'plugin') {
      // Plugin is a directory with plugin.json
      const pluginPath = path.join(componentDir, name);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      if (await fs.pathExists(manifestPath)) {
        return {
          name,
          type,
          path: pluginPath,
          isProject: true,
        };
      }
    } else {
      // Component is a YAML file
      const componentPath = path.join(componentDir, `${name}.yaml`);

      if (await fs.pathExists(componentPath)) {
        return {
          name,
          type,
          path: componentPath,
          isProject: true,
        };
      }
    }

    return null;
  }

  /**
   * Find component in global directory
   */
  private async findInGlobal(
    name: string,
    type: ComponentType
  ): Promise<LocalComponent | null> {
    const baseDir = getGlobalFractaryDir();
    const componentDir = getComponentDir(baseDir, type);

    if (type === 'plugin') {
      // Plugin is a directory with plugin.json
      const pluginPath = path.join(componentDir, name);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      if (await fs.pathExists(manifestPath)) {
        return {
          name,
          type,
          path: pluginPath,
          isProject: false,
        };
      }
    } else {
      // Component is a YAML file
      const componentPath = path.join(componentDir, `${name}.yaml`);

      if (await fs.pathExists(componentPath)) {
        return {
          name,
          type,
          path: componentPath,
          isProject: false,
        };
      }
    }

    return null;
  }

  /**
   * Find component in plugin (project or global)
   */
  private async findInPlugin(
    pluginName: string,
    componentName: string,
    componentType: ComponentType,
    isProject: boolean
  ): Promise<LocalComponent | null> {
    const baseDir = isProject ? getProjectFractaryDir(this.cwd) : getGlobalFractaryDir();
    const pluginDir = path.join(baseDir, 'plugins', pluginName);

    if (!await fs.pathExists(pluginDir)) {
      return null;
    }

    const componentPath = path.join(
      pluginDir,
      `${componentType}s`,
      `${componentName}.yaml`
    );

    if (await fs.pathExists(componentPath)) {
      return {
        name: componentName,
        type: componentType,
        path: componentPath,
        isProject,
        plugin: pluginName,
      };
    }

    return null;
  }

  /**
   * Resolve component with priority: project → global
   * @param name Component name (or @plugin/component for plugin components)
   * @param type Component type
   */
  async resolve(
    name: string,
    type: ComponentType
  ): Promise<LocalComponent | null> {
    // Check if name includes plugin reference (@plugin/component)
    const pluginMatch = name.match(/^@([^/]+)\/(.+)$/);

    if (pluginMatch) {
      const [, pluginName, componentName] = pluginMatch;

      // Look for component in plugin (project first, then global)
      let component = await this.findInPlugin(pluginName, componentName, type, true);
      if (component) return component;

      component = await this.findInPlugin(pluginName, componentName, type, false);
      if (component) return component;

      return null;
    }

    // Look for standalone component (project first, then global)
    let component = await this.findInProject(name, type);
    if (component) return component;

    component = await this.findInGlobal(name, type);
    if (component) return component;

    return null;
  }

  /**
   * List all components of a given type in project directory
   */
  async listProject(type: ComponentType): Promise<LocalComponent[]> {
    const baseDir = getProjectFractaryDir(this.cwd);
    const componentDir = getComponentDir(baseDir, type);

    if (!await fs.pathExists(componentDir)) {
      return [];
    }

    if (type === 'plugin') {
      // List directories with plugin.json
      const entries = await fs.readdir(componentDir);
      const components: LocalComponent[] = [];

      for (const entry of entries) {
        const pluginPath = path.join(componentDir, entry);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory() && await fs.pathExists(manifestPath)) {
          components.push({
            name: entry,
            type,
            path: pluginPath,
            isProject: true,
          });
        }
      }

      return components;
    } else {
      // List YAML files
      const files = await fs.readdir(componentDir);
      return files
        .filter(f => f.endsWith('.yaml'))
        .map(f => ({
          name: f.replace('.yaml', ''),
          type,
          path: path.join(componentDir, f),
          isProject: true,
        }));
    }
  }

  /**
   * List all components of a given type in global directory
   */
  async listGlobal(type: ComponentType): Promise<LocalComponent[]> {
    const baseDir = getGlobalFractaryDir();
    const componentDir = getComponentDir(baseDir, type);

    if (!await fs.pathExists(componentDir)) {
      return [];
    }

    if (type === 'plugin') {
      // List directories with plugin.json
      const entries = await fs.readdir(componentDir);
      const components: LocalComponent[] = [];

      for (const entry of entries) {
        const pluginPath = path.join(componentDir, entry);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory() && await fs.pathExists(manifestPath)) {
          components.push({
            name: entry,
            type,
            path: pluginPath,
            isProject: false,
          });
        }
      }

      return components;
    } else {
      // List YAML files
      const files = await fs.readdir(componentDir);
      return files
        .filter(f => f.endsWith('.yaml'))
        .map(f => ({
          name: f.replace('.yaml', ''),
          type,
          path: path.join(componentDir, f),
          isProject: false,
        }));
    }
  }

  /**
   * List all components of a given type (project + global)
   */
  async listAll(type: ComponentType): Promise<LocalComponent[]> {
    const project = await this.listProject(type);
    const global = await this.listGlobal(type);
    return [...project, ...global];
  }

  /**
   * Check if component exists locally
   */
  async exists(name: string, type: ComponentType): Promise<boolean> {
    const component = await this.resolve(name, type);
    return component !== null;
  }

  /**
   * Read component file content
   */
  async read(component: LocalComponent): Promise<string> {
    if (component.type === 'plugin') {
      throw new Error('Cannot read plugin as file. Use readPlugin() instead.');
    }

    return fs.readFile(component.path, 'utf-8');
  }

  /**
   * Read plugin manifest
   */
  async readPluginManifest(component: LocalComponent): Promise<any> {
    if (component.type !== 'plugin') {
      throw new Error('Component is not a plugin');
    }

    const manifestPath = path.join(component.path, 'plugin.json');
    return fs.readJson(manifestPath);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default local resolver instance
 */
export const localResolver = new LocalResolver();
