/**
 * Auth Manager Utility
 *
 * Manage registry authentication and user sessions.
 */

import {
  getRegistryAuth,
  saveRegistryAuth,
  clearRegistryAuth,
  hasValidAuth,
  RegistryAuth,
} from './credential-storage.js';

/**
 * User information
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
  profile_url?: string;
  organizations?: Organization[];
}

/**
 * Organization information
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
}

/**
 * Auth status
 */
export interface AuthStatus {
  authenticated: boolean;
  registry: string;
  auth_type?: string;
  username?: string;
  email?: string;
  authenticated_at?: string;
  expires_at?: string;
  is_expired: boolean;
}

/**
 * Authenticate with registry
 */
export async function authenticateRegistry(
  registry: string,
  auth: RegistryAuth,
  userInfo?: UserInfo
): Promise<UserInfo> {
  // Store authentication
  const authEntry: RegistryAuth = {
    ...auth,
    authenticated_at: new Date().toISOString(),
  };

  // Set default expiration to 24 hours if not specified
  if (!authEntry.expires_at) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    authEntry.expires_at = expiresAt.toISOString();
  }

  // Add user info if provided
  if (userInfo) {
    authEntry.username = userInfo.username;
    authEntry.email = userInfo.email;
  }

  await saveRegistryAuth(registry, authEntry);

  return userInfo || {
    id: 'unknown',
    username: authEntry.username || 'unknown',
    email: authEntry.email || '',
  };
}

/**
 * Check if authenticated
 */
export async function isAuthenticated(registry: string): Promise<boolean> {
  return hasValidAuth(registry);
}

/**
 * Get auth status for registry
 */
export async function getAuthStatus(registry: string): Promise<AuthStatus> {
  const auth = await getRegistryAuth(registry);

  if (!auth) {
    return {
      authenticated: false,
      registry,
      is_expired: false,
    };
  }

  const isExpired = auth.expires_at ? new Date(auth.expires_at) < new Date() : false;

  return {
    authenticated: !isExpired && !!auth.token,
    registry,
    auth_type: auth.type,
    username: auth.username,
    email: auth.email,
    authenticated_at: auth.authenticated_at,
    expires_at: auth.expires_at,
    is_expired: isExpired,
  };
}

/**
 * Get stored auth
 */
export async function getStoredAuth(registry: string): Promise<RegistryAuth | null> {
  const auth = await getRegistryAuth(registry);

  if (!auth) {
    return null;
  }

  // Check expiration
  if (auth.expires_at && new Date(auth.expires_at) < new Date()) {
    // Clear expired auth
    await clearRegistryAuth(registry);
    return null;
  }

  return auth;
}

/**
 * Save auth
 */
export async function saveAuth(registry: string, auth: RegistryAuth): Promise<void> {
  await saveRegistryAuth(registry, auth);
}

/**
 * Clear auth
 */
export async function clearAuth(registry: string): Promise<void> {
  await clearRegistryAuth(registry);
}

/**
 * Validate credentials
 */
export function validateCredentials(auth: RegistryAuth): boolean {
  if (!auth.type) {
    return false;
  }

  switch (auth.type) {
    case 'token':
      if (!auth.token || auth.token.trim().length === 0) {
        return false;
      }
      break;
    case 'basic':
      if (!auth.username || !auth.password) {
        return false;
      }
      break;
    case 'oauth':
      if (!auth.token) {
        return false;
      }
      break;
    default:
      return false;
  }

  return true;
}

/**
 * Create token auth
 */
export function createTokenAuth(token: string, email?: string): RegistryAuth {
  return {
    type: 'token',
    token,
    email,
  };
}

/**
 * Create basic auth
 */
export function createBasicAuth(username: string, password: string, email?: string): RegistryAuth {
  return {
    type: 'basic',
    username,
    password,
    email,
  };
}

/**
 * Create OAuth auth
 */
export function createOAuthAuth(token: string, email?: string, scopes?: string[]): RegistryAuth {
  return {
    type: 'oauth',
    token,
    email,
    scopes,
  };
}

/**
 * Check if auth is expired
 */
export function isAuthExpired(auth: RegistryAuth): boolean {
  if (!auth.expires_at) {
    return false;
  }

  return new Date(auth.expires_at) < new Date();
}

/**
 * Get time until expiration
 */
export function getTimeUntilExpiration(auth: RegistryAuth): number | null {
  if (!auth.expires_at) {
    return null;
  }

  const expiresAt = new Date(auth.expires_at);
  const now = new Date();
  const millisUntilExpiration = expiresAt.getTime() - now.getTime();

  return Math.max(0, millisUntilExpiration);
}

/**
 * Mock fetch user info (for testing)
 */
export async function fetchUserInfo(registry: string, auth: RegistryAuth): Promise<UserInfo> {
  // This would be implemented to actually fetch user info from the registry
  // For now, return mock data based on auth
  const username = auth.username || 'anonymous';
  const email = auth.email || `${username}@${registry}`;

  return {
    id: `user_${username}`,
    username,
    email,
    name: username,
    avatar_url: `https://api.example.com/avatars/${username}.jpg`,
    profile_url: `https://example.com/${username}`,
    organizations: [],
  };
}

/**
 * Format auth status for display
 */
export function formatAuthStatus(status: AuthStatus): string {
  if (!status.authenticated) {
    return `Not authenticated with ${status.registry}`;
  }

  let message = `Authenticated as ${status.username}`;

  if (status.email) {
    message += ` (${status.email})`;
  }

  if (status.expires_at) {
    const expiresAt = new Date(status.expires_at);
    message += ` [expires ${expiresAt.toLocaleString()}]`;
  }

  return message;
}
