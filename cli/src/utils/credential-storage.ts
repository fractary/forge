/**
 * Credential Storage Utility
 *
 * Secure storage of registry credentials with encryption.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Registry authentication
 */
export interface RegistryAuth {
  type: 'oauth' | 'token' | 'basic';
  token?: string;
  username?: string;
  password?: string;
  email?: string;
  authenticated_at?: string;
  expires_at?: string;
  scopes?: string[];
}

/**
 * Credentials storage
 */
export interface Credentials {
  version: string;
  created_at: string;
  updated_at: string;
  registries: Record<string, RegistryAuth>;
}

/**
 * Get credentials file path
 */
export function getCredentialFile(): string {
  const home = os.homedir();
  return path.join(home, '.fractary', 'auth', 'credentials.json');
}

/**
 * Get auth directory
 */
export function getAuthDirectory(): string {
  const home = os.homedir();
  return path.join(home, '.fractary', 'auth');
}

/**
 * Setup credential file with proper permissions
 */
export async function setupCredentialFile(): Promise<void> {
  const authDir = getAuthDirectory();
  const credFile = getCredentialFile();

  // Create auth directory
  await fs.mkdir(authDir, { recursive: true, mode: 0o700 });

  // Create empty credentials file if it doesn't exist
  try {
    await fs.stat(credFile);
  } catch (error) {
    const initialCreds: Credentials = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registries: {},
    };

    const content = JSON.stringify(initialCreds, null, 2);
    await fs.writeFile(credFile, content, { mode: 0o600 });
  }
}

/**
 * Check if credential file exists
 */
export async function checkCredentialFile(): Promise<boolean> {
  const credFile = getCredentialFile();

  try {
    await fs.stat(credFile);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load credentials from storage
 */
export async function loadCredentials(): Promise<Credentials> {
  const credFile = getCredentialFile();

  try {
    await setupCredentialFile();
    const content = await fs.readFile(credFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registries: {},
    };
  }
}

/**
 * Save credentials to storage
 */
export async function saveCredentials(credentials: Credentials): Promise<void> {
  const credFile = getCredentialFile();

  await setupCredentialFile();

  credentials.updated_at = new Date().toISOString();
  const content = JSON.stringify(credentials, null, 2);

  await fs.writeFile(credFile, content, { mode: 0o600 });
}

/**
 * Get auth for specific registry
 */
export async function getRegistryAuth(registry: string): Promise<RegistryAuth | null> {
  const creds = await loadCredentials();
  return creds.registries[registry] || null;
}

/**
 * Save auth for specific registry
 */
export async function saveRegistryAuth(registry: string, auth: RegistryAuth): Promise<void> {
  const creds = await loadCredentials();
  creds.registries[registry] = auth;
  await saveCredentials(creds);
}

/**
 * Clear auth for specific registry
 */
export async function clearRegistryAuth(registry: string): Promise<void> {
  const creds = await loadCredentials();
  delete creds.registries[registry];
  await saveCredentials(creds);
}

/**
 * Clear all auth
 */
export async function clearAllAuth(): Promise<void> {
  const creds = await loadCredentials();
  creds.registries = {};
  await saveCredentials(creds);
}

/**
 * Check if auth exists and is valid
 */
export async function hasValidAuth(registry: string): Promise<boolean> {
  const auth = await getRegistryAuth(registry);

  if (!auth) {
    return false;
  }

  // Check expiration
  if (auth.expires_at) {
    const expiresAt = new Date(auth.expires_at);
    if (expiresAt < new Date()) {
      return false;
    }
  }

  // Check required fields
  if (auth.type === 'token') {
    return !!auth.token;
  } else if (auth.type === 'basic') {
    return !!(auth.username && auth.password);
  } else if (auth.type === 'oauth') {
    return !!auth.token;
  }

  return false;
}

/**
 * Get all authenticated registries
 */
export async function getAuthenticatedRegistries(): Promise<string[]> {
  const creds = await loadCredentials();
  const authenticated: string[] = [];

  for (const [registry, auth] of Object.entries(creds.registries)) {
    if (auth && auth.authenticated_at) {
      // Check if not expired
      if (!auth.expires_at || new Date(auth.expires_at) >= new Date()) {
        authenticated.push(registry);
      }
    }
  }

  return authenticated;
}

/**
 * Encrypt credential value (basic encryption for non-sensitive data)
 */
export function encryptCredential(value: string, key?: string): string {
  if (!key) {
    // Use machine ID as basic encryption key
    const machineId = crypto.createHash('sha256').update(os.hostname()).digest('hex');
    key = machineId.substring(0, 32);
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0')), iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return iv:encrypted format
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt credential value
 */
export function decryptCredential(encrypted: string, key?: string): string {
  if (!key) {
    const machineId = crypto.createHash('sha256').update(os.hostname()).digest('hex');
    key = machineId.substring(0, 32);
  }

  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0')), iv);

  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Export credentials (should be protected)
 */
export async function exportCredentials(): Promise<string> {
  const creds = await loadCredentials();
  return JSON.stringify(creds, null, 2);
}

/**
 * Validate credential structure
 */
export function isValidAuth(auth: RegistryAuth): boolean {
  if (!auth.type) {
    return false;
  }

  switch (auth.type) {
    case 'token':
      return !!auth.token;
    case 'basic':
      return !!(auth.username && auth.password);
    case 'oauth':
      return !!auth.token;
    default:
      return false;
  }
}
