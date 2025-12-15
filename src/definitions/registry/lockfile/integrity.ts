/**
 * Integrity calculation using SHA-256
 */

import * as crypto from 'crypto';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

/**
 * Calculate SHA-256 integrity hash for a definition
 *
 * Uses canonicalization to ensure consistent hashing regardless of key order
 */
export async function calculateIntegrity(
  definition: AgentDefinition | ToolDefinition
): Promise<string> {
  // Create deterministic JSON representation
  const canonical = canonicalize(definition);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  return `sha256-${hash}`;
}

/**
 * Canonicalize object for consistent hashing
 *
 * Recursively sorts object keys to ensure the same JSON output
 * regardless of the order in which properties were defined
 */
function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(',')}]`;
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => `"${key}":${canonicalize(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Verify integrity of a definition against expected hash
 */
export async function verifyIntegrity(
  definition: AgentDefinition | ToolDefinition,
  expectedIntegrity: string
): Promise<boolean> {
  const actualIntegrity = await calculateIntegrity(definition);
  return actualIntegrity === expectedIntegrity;
}
