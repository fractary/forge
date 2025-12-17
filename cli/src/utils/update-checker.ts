/**
 * Update Checker
 *
 * Checks for available updates of installed components and plugins.
 * Supports semantic versioning constraints and version comparison.
 */

import semver from 'semver';
import type { RegistryConfig } from '@fractary/forge';
import { loadForgeConfig } from './forge-config.js';

type ComponentType = 'agent' | 'tool' | 'workflow' | 'template' | 'plugin';

interface LocalComponent {
  name: string;
  type: ComponentType;
  version?: string;
  source: string;
  path?: string;
  plugin?: string;
  isProject?: boolean;
}

/**
 * Update availability information
 */
export interface UpdateInfo {
  name: string;
  current: string;
  latest: string;
  available: string[];
  constraint?: string;
  hasUpdate: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'none';
}

/**
 * Check for updates for a single component
 */
export async function checkComponentUpdate(
  name: string,
  currentVersion: string,
  type: ComponentType,
  constraint?: string,
  registries?: RegistryConfig[]
): Promise<UpdateInfo> {
  const info: UpdateInfo = {
    name,
    current: currentVersion,
    latest: currentVersion,
    available: [],
    constraint,
    hasUpdate: false,
    updateType: 'none',
  };

  // Lazy-load SDK to avoid CommonJS/ESM interop issues
  const { Registry } = await import('@fractary/forge');

  // Normalize version
  const current = semver.coerce(currentVersion)?.version || currentVersion;

  try {
    // Try to resolve latest version from registries
    const config = registries ? { registries } : (await loadForgeConfig()).config;

    for (const registry of config.registries) {
      if (!registry.enabled) continue;

      try {
        // Try to fetch from registry
        const resolved = await Registry.resolver.resolve(name, type, {
          registry: registry.name,
        });

        if (resolved && resolved.version) {
          const latest = semver.coerce(resolved.version)?.version || resolved.version;

          if (semver.gt(latest, current)) {
            info.latest = latest;
            info.hasUpdate = true;

            // Determine update type
            const diff = semver.diff(current, latest);
            info.updateType = (diff as 'major' | 'minor' | 'patch') || 'patch';

            if (!info.available.includes(latest)) {
              info.available.push(latest);
            }
          }
        }
      } catch (error) {
        // Continue with other registries
      }
    }
  } catch (error) {
    // If update checking fails, return current info
  }

  return info;
}

/**
 * Check for updates for multiple components
 */
export async function checkAllComponentUpdates(
  components: LocalComponent[]
): Promise<Record<string, UpdateInfo>> {
  const { config } = await loadForgeConfig();
  const results: Record<string, UpdateInfo> = {};

  for (const component of components) {
    const updateInfo = await checkComponentUpdate(
      component.name,
      component.version || 'unknown',
      component.type,
      undefined,
      config.registries
    );

    results[component.name] = updateInfo;
  }

  return results;
}

/**
 * Compare two semantic versions
 *
 * Returns:
 * - Positive if version1 > version2
 * - Negative if version1 < version2
 * - 0 if versions are equal
 */
export function compareVersions(version1: string, version2: string): number {
  try {
    const v1 = semver.coerce(version1)?.version || version1;
    const v2 = semver.coerce(version2)?.version || version2;

    if (semver.gt(v1, v2)) return 1;
    if (semver.lt(v1, v2)) return -1;
    return 0;
  } catch (error) {
    // Fallback to string comparison
    return version1.localeCompare(version2);
  }
}

/**
 * Check if version satisfies constraint
 */
export function satisfiesConstraint(
  version: string,
  constraint: string
): boolean {
  try {
    const v = semver.coerce(version)?.version || version;
    return semver.satisfies(v, constraint);
  } catch (error) {
    return false;
  }
}

/**
 * Get available versions matching constraint
 */
export function filterVersionsByConstraint(
  versions: string[],
  constraint: string
): string[] {
  return versions.filter((v) => satisfiesConstraint(v, constraint));
}

/**
 * Find latest version from list
 */
export function findLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;

  try {
    const validVersions = versions
      .map((v) => semver.coerce(v)?.version || v)
      .filter((v) => semver.valid(v));

    if (validVersions.length === 0) return null;

    return validVersions.sort(semver.compare).reverse()[0];
  } catch (error) {
    return null;
  }
}

/**
 * Get update suggestions
 */
export function getUpdateSuggestions(
  updates: Record<string, UpdateInfo>,
  options: { majorOnly?: boolean; includeUnstable?: boolean } = {}
): UpdateInfo[] {
  return Object.values(updates)
    .filter((info) => {
      if (!info.hasUpdate) return false;
      if (options.majorOnly && info.updateType !== 'major') return false;
      if (!options.includeUnstable && isUnstableVersion(info.latest)) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by update type (major first, then minor, then patch)
      const typeOrder = { major: 0, minor: 1, patch: 2, none: 3 };
      const typeDiff = typeOrder[a.updateType] - typeOrder[b.updateType];
      if (typeDiff !== 0) return typeDiff;
      // Then by name
      return a.name.localeCompare(b.name);
    });
}

/**
 * Check if version is unstable (pre-release or build metadata)
 */
export function isUnstableVersion(version: string): boolean {
  try {
    const parsed = semver.parse(version);
    return parsed ? parsed.prerelease.length > 0 : false;
  } catch (error) {
    return false;
  }
}

/**
 * Get version release notes URL (if available)
 */
export function getReleaseNotesUrl(
  name: string,
  version: string,
  registry?: RegistryConfig
): string | null {
  // This is a placeholder for future registry implementations
  // Different registries may have different URL patterns

  if (!registry) return null;

  // GitHub pattern
  if (registry.url.includes('github.com')) {
    const match = name.match(/@?([^/]+)\/(.+)/);
    if (match) {
      const [, org, repo] = match;
      return `https://github.com/${org}/${repo}/releases/tag/${version}`;
    }
  }

  // Stockyard pattern
  if (registry.url.includes('stockyard')) {
    return `https://stockyard.fractary.dev/plugins/${name}/${version}`;
  }

  return null;
}
