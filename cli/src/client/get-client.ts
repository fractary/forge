/**
 * Singleton Forge Client Getter
 *
 * Provides a singleton instance of ForgeClient for use across commands
 */

import { ForgeClient, type ForgeClientOptions } from './forge-client.js';

let clientInstance: ForgeClient | null = null;

/**
 * Get singleton ForgeClient instance
 *
 * Creates a new client if one doesn't exist, otherwise returns the existing instance.
 * The client is lazily initialized on first use.
 */
export async function getClient(
  options?: ForgeClientOptions
): Promise<ForgeClient> {
  if (!clientInstance) {
    clientInstance = await ForgeClient.create(options);
  }
  return clientInstance;
}

/**
 * Reset the client instance
 *
 * Useful for testing or when configuration changes require a fresh client.
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Check if client is initialized
 */
export function isClientInitialized(): boolean {
  return clientInstance !== null;
}
