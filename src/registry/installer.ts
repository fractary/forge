/**
 * Registry Installer
 *
 * Downloads and installs plugins and components from registries.
 * Handles checksum verification, dependency resolution, and installation.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Resolver } from './resolver.js';
import { ManifestResolver } from './resolvers/manifest-resolver.js';
import { getProjectFractaryDir, getGlobalFractaryDir } from './resolvers/local-resolver.js';
import type { PluginManifest, PluginItem } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface InstallOptions {
  /** Install scope: global or local */
  scope?: 'global' | 'local';
  /** Force overwrite existing files */
  force?: boolean;
  /** Skip dependency installation */
  noDeps?: boolean;
  /** Dry run (don't actually install) */
  dryRun?: boolean;
  /** Only install specific component types */
  agentsOnly?: boolean;
  toolsOnly?: boolean;
  workflowsOnly?: boolean;
  templatesOnly?: boolean;
  /** Skip specific component types */
  noHooks?: boolean;
  noCommands?: boolean;
}

export interface InstallResult {
  /** Whether installation was successful */
  success: boolean;
  /** Installed plugin/component name */
  name: string;
  /** Installation path */
  path?: string;
  /** Components installed */
  installed: {
    agents?: number;
    tools?: number;
    workflows?: number;
    templates?: number;
    hooks?: number;
    commands?: number;
  };
  /** Total bytes installed */
  totalSize: number;
  /** Whether this was a dry run */
  dryRun: boolean;
  /** Any warnings */
  warnings?: string[];
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Installer
// ============================================================================

export class Installer {
  private resolver: Resolver;
  private manifestResolver: ManifestResolver;

  constructor() {
    this.resolver = new Resolver();
    this.manifestResolver = new ManifestResolver();
  }

  /**
   * Verify SHA-256 checksum
   */
  private verifyChecksum(content: string, expectedChecksum: string): boolean {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const actual = `sha256:${hash}`;
    return actual === expectedChecksum;
  }

  /**
   * Download file from URL
   */
  private async download(url: string, timeout: number = 30000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Forge-Registry-Client/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Download timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get installation base directory
   */
  private getInstallBaseDir(scope: 'global' | 'local', cwd: string = process.cwd()): string {
    return scope === 'global'
      ? getGlobalFractaryDir()
      : getProjectFractaryDir(cwd);
  }

  /**
   * Install a plugin item (agent, tool, workflow, template)
   */
  private async installItem(
    item: PluginItem,
    type: 'agent' | 'tool' | 'workflow' | 'template',
    pluginDir: string,
    options: InstallOptions
  ): Promise<number> {
    const itemPath = path.join(pluginDir, `${type}s`, `${item.name}.yaml`);

    // Check if already exists
    if (!options.force && await fs.pathExists(itemPath)) {
      console.warn(`  ⚠ ${item.name} already exists (use --force to overwrite)`);
      return 0;
    }

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would install ${item.name}@${item.version} (${item.size} bytes)`);
      return item.size;
    }

    // Download content
    const content = await this.download(item.source);

    // Verify checksum
    if (!this.verifyChecksum(content, item.checksum)) {
      throw new Error(
        `Checksum mismatch for ${item.name}\nExpected: ${item.checksum}\nActual: sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
      );
    }

    // Write file
    await fs.ensureDir(path.dirname(itemPath));
    await fs.writeFile(itemPath, content, 'utf-8');

    console.log(`  ✓ ${item.name}@${item.version} (${(item.size / 1024).toFixed(1)} KB)`);

    return item.size;
  }

  /**
   * Install plugin from resolved reference
   */
  async installPlugin(
    pluginName: string,
    options: InstallOptions = {}
  ): Promise<InstallResult> {
    const scope = options.scope || 'global';
    const result: InstallResult = {
      success: false,
      name: pluginName,
      installed: {},
      totalSize: 0,
      dryRun: options.dryRun || false,
      warnings: [],
    };

    try {
      // Resolve plugin
      const resolved = await this.resolver.resolvePlugin(pluginName);

      if (!resolved || !resolved.url) {
        result.error = `Plugin ${pluginName} not found in any registry`;
        return result;
      }

      console.log(`Installing ${pluginName}@${resolved.version}...`);
      console.log(`  ✓ Resolved from registry: ${resolved.source}`);

      // Fetch plugin manifest
      const pluginManifest = await this.manifestResolver.fetchPluginManifest(resolved.url);
      console.log(`  ✓ Downloaded plugin manifest`);

      // Determine installation directory
      const baseDir = this.getInstallBaseDir(scope);
      const pluginDir = path.join(baseDir, 'plugins', pluginName);
      result.path = pluginDir;

      if (!options.dryRun) {
        await fs.ensureDir(pluginDir);

        // Write plugin.json
        await fs.writeJson(path.join(pluginDir, 'plugin.json'), pluginManifest, { spaces: 2 });
      }

      // Install agents
      if (pluginManifest.agents && !options.toolsOnly && !options.workflowsOnly && !options.templatesOnly) {
        console.log('\nInstalling agents (Fractary YAML format)...');
        let count = 0;
        for (const agent of pluginManifest.agents) {
          result.totalSize += await this.installItem(agent, 'agent', pluginDir, options);
          count++;
        }
        result.installed.agents = count;
      }

      // Install tools
      if (pluginManifest.tools && !options.agentsOnly && !options.workflowsOnly && !options.templatesOnly) {
        console.log('\nInstalling tools (Fractary YAML format)...');
        let count = 0;
        for (const tool of pluginManifest.tools) {
          result.totalSize += await this.installItem(tool, 'tool', pluginDir, options);
          count++;
        }
        result.installed.tools = count;
      }

      // Install workflows
      if (pluginManifest.workflows && !options.agentsOnly && !options.toolsOnly && !options.templatesOnly) {
        console.log('\nInstalling workflows (Fractary YAML format)...');
        let count = 0;
        for (const workflow of pluginManifest.workflows) {
          result.totalSize += await this.installItem(workflow, 'workflow', pluginDir, options);
          count++;
        }
        result.installed.workflows = count;
      }

      // Install templates
      if (pluginManifest.templates && !options.agentsOnly && !options.toolsOnly && !options.workflowsOnly) {
        console.log('\nInstalling templates (Fractary YAML format)...');
        let count = 0;
        for (const template of pluginManifest.templates) {
          result.totalSize += await this.installItem(template, 'template', pluginDir, options);
          count++;
        }
        result.installed.templates = count;
      }

      // Install hooks (unless skipped)
      if (pluginManifest.hooks && !options.noHooks) {
        console.log('\nInstalling hooks...');
        let count = 0;
        for (const hook of pluginManifest.hooks) {
          if (!options.dryRun) {
            const hookPath = path.join(pluginDir, 'hooks', `${hook.name}.js`);
            await fs.ensureDir(path.dirname(hookPath));

            const content = await this.download(hook.source);
            if (!this.verifyChecksum(content, hook.checksum)) {
              throw new Error(`Checksum mismatch for hook ${hook.name}`);
            }

            await fs.writeFile(hookPath, content, 'utf-8');
            console.log(`  ✓ ${hook.name}@${hook.version} (${(hook.size / 1024).toFixed(1)} KB)`);
          } else {
            console.log(`  [DRY RUN] Would install ${hook.name}@${hook.version}`);
          }
          result.totalSize += hook.size;
          count++;
        }
        result.installed.hooks = count;
      }

      // Install commands (unless skipped)
      if (pluginManifest.commands && !options.noCommands) {
        console.log('\nInstalling commands...');
        let count = 0;
        for (const command of pluginManifest.commands) {
          if (!options.dryRun) {
            const commandPath = path.join(pluginDir, 'commands', `${command.name}.md`);
            await fs.ensureDir(path.dirname(commandPath));

            const content = await this.download(command.source);
            if (!this.verifyChecksum(content, command.checksum)) {
              throw new Error(`Checksum mismatch for command ${command.name}`);
            }

            await fs.writeFile(commandPath, content, 'utf-8');
            console.log(`  ✓ ${command.name}@${command.version} (${(command.size / 1024).toFixed(1)} KB)`);
          } else {
            console.log(`  [DRY RUN] Would install ${command.name}@${command.version}`);
          }
          result.totalSize += command.size;
          count++;
        }
        result.installed.commands = count;
      }

      result.success = true;

      // Print summary
      console.log(`\nSuccessfully installed ${pluginName}@${resolved.version} (Fractary YAML format)`);
      const parts = [];
      if (result.installed.agents) parts.push(`${result.installed.agents} agents`);
      if (result.installed.tools) parts.push(`${result.installed.tools} tools`);
      if (result.installed.workflows) parts.push(`${result.installed.workflows} workflows`);
      if (result.installed.templates) parts.push(`${result.installed.templates} templates`);
      if (result.installed.hooks) parts.push(`${result.installed.hooks} hooks`);
      if (result.installed.commands) parts.push(`${result.installed.commands} commands`);
      console.log(`  ${parts.join(', ')}`);
      console.log(`  Installed to: ${pluginDir}`);

      if (!options.dryRun) {
        console.log(`\n  Run with FABER: forge faber run <issue-number>`);
        console.log(`  Export to other formats: forge export <langchain|claude|n8n> ${pluginName}`);
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Installation failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(
    pluginName: string,
    scope: 'global' | 'local' = 'global',
    cwd: string = process.cwd()
  ): Promise<boolean> {
    const baseDir = this.getInstallBaseDir(scope, cwd);
    const pluginDir = path.join(baseDir, 'plugins', pluginName);

    if (!await fs.pathExists(pluginDir)) {
      console.warn(`Plugin ${pluginName} is not installed in ${scope} scope`);
      return false;
    }

    await fs.remove(pluginDir);
    console.log(`✓ Uninstalled ${pluginName} from ${scope} scope`);

    return true;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default installer instance
 */
export const installer = new Installer();
