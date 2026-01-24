/**
 * Git Utilities
 *
 * Shared utilities for git operations in the CLI.
 */

import { execSync } from 'child_process';

/**
 * Organization slug validation regex
 * Allows: lowercase letters, numbers, hyphens
 * Must start with a letter
 */
const ORG_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Extract organization from git remote URL
 *
 * Supports:
 * - SSH format: git@github.com:org/repo.git
 * - HTTPS format: https://github.com/org/repo.git
 *
 * @returns Organization slug or null if not detected
 */
export function getOrgFromGitRemote(): string | null {
  try {
    const remote = execSync('git remote get-url origin 2>/dev/null', {
      encoding: 'utf-8',
    }).trim();

    // Parse GitHub URL formats
    // SSH: git@github.com:org/repo.git
    const sshMatch = remote.match(/git@github\.com:([^/]+)\//);
    // HTTPS: https://github.com/org/repo.git
    const httpsMatch = remote.match(/github\.com\/([^/]+)\//);

    const org = sshMatch?.[1] || httpsMatch?.[1] || null;

    // Validate org format
    if (org && !isValidOrgSlug(org)) {
      return org.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    return org;
  } catch {
    return null;
  }
}

/**
 * Validate organization slug format
 *
 * Valid slugs:
 * - Start with a lowercase letter
 * - Contain only lowercase letters, numbers, and hyphens
 * - Examples: "fractary", "my-company", "acme123"
 *
 * Invalid slugs:
 * - Start with number: "123company"
 * - Uppercase: "MyCompany"
 * - Special chars: "my_company"
 *
 * @param slug - Organization slug to validate
 * @returns True if valid
 */
export function isValidOrgSlug(slug: string): boolean {
  return ORG_SLUG_PATTERN.test(slug);
}

/**
 * Normalize a string to a valid organization slug
 *
 * @param input - Input string to normalize
 * @returns Normalized slug
 */
export function normalizeOrgSlug(input: string): string {
  // Convert to lowercase
  let slug = input.toLowerCase();

  // Replace invalid characters with hyphens
  slug = slug.replace(/[^a-z0-9-]/g, '-');

  // Remove consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Ensure it starts with a letter
  if (slug && !/^[a-z]/.test(slug)) {
    slug = 'org-' + slug;
  }

  return slug || 'default';
}

/**
 * Extract organization from project path
 *
 * Uses the first segment of the directory name (split by hyphen) as org.
 * Falls back to 'default' if extraction fails.
 *
 * @param projectPath - Path to project directory
 * @returns Organization slug
 */
export function getOrgFromProjectPath(projectPath: string): string {
  const path = require('path');
  const basename = path.basename(projectPath);

  // Try to extract first segment before hyphen
  const firstSegment = basename.split('-')[0];

  if (firstSegment && isValidOrgSlug(firstSegment)) {
    return firstSegment;
  }

  // Normalize the basename
  return normalizeOrgSlug(firstSegment || basename);
}
