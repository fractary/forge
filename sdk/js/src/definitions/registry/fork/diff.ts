/**
 * Diff utilities for comparing agent/tool definitions
 */

import type { DiffResult } from './types';

/**
 * Compare two objects and return differences
 */
export function diff(base: any, current: any): DiffResult {
  const result: DiffResult = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  // Get all keys from both objects
  const baseKeys = new Set(Object.keys(base || {}));
  const currentKeys = new Set(Object.keys(current || {}));
  const allKeys = new Set([...Array.from(baseKeys), ...Array.from(currentKeys)]);

  for (const key of Array.from(allKeys)) {
    if (!baseKeys.has(key)) {
      // Key added in current
      result.added.push(key);
    } else if (!currentKeys.has(key)) {
      // Key removed in current
      result.removed.push(key);
    } else {
      // Key exists in both - check if modified
      const baseValue = base[key];
      const currentValue = current[key];

      if (isDeepEqual(baseValue, currentValue)) {
        result.unchanged.push(key);
      } else {
        result.modified.push(key);
      }
    }
  }

  return result;
}

/**
 * Deep equality check for values
 */
function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isDeepEqual(item, b[index]));
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => bKeys.includes(key) && isDeepEqual(a[key], b[key]));
}

/**
 * Get value at JSON path
 */
export function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Set value at JSON path
 */
export function setValueAtPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Generate a list of all paths in an object
 */
export function getAllPaths(obj: any, prefix: string = ''): string[] {
  if (obj == null || typeof obj !== 'object') {
    return [prefix];
  }

  if (Array.isArray(obj)) {
    return obj.flatMap((item, index) =>
      getAllPaths(item, prefix ? `${prefix}[${index}]` : `[${index}]`)
    );
  }

  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === 'object') {
      paths.push(...getAllPaths(value, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}
