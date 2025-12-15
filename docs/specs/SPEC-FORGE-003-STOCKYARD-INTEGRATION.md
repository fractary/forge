# SPEC-FORGE-003: Stockyard Integration - Full Implementation

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Created** | 2025-12-14 |
| **Updated** | 2025-12-14 |
| **Author** | Implementation Team |
| **Project** | `@fractary/forge` |
| **Parent Spec** | SPEC-FORGE-002 |
| **Related** | SPEC-FORGE-002-IMPLEMENTATION |
| **Phase** | Phase 5: Stockyard Integration |

---

## 1. Executive Summary

This specification details the implementation of **full Stockyard integration** for the `@fractary/forge` SDK, upgrading the current stub implementation to a complete, production-ready HTTP client with authentication, caching, and resolver integration.

### 1.1 Current State

From SPEC-FORGE-002-IMPLEMENTATION, we currently have:

| Component | Status | Location |
|-----------|--------|----------|
| Stockyard Client Stub | ✅ Stubbed | `src/definitions/registry/stockyard/client.ts` |
| Basic Types | ✅ Complete | `src/definitions/registry/stockyard/types.ts` |
| Resolver Integration | ✅ Stubbed | `src/definitions/registry/resolver.ts` |

The stub throws "not implemented" errors for all Stockyard operations.

### 1.2 What Needs Implementation

This specification covers:

| Component | Priority | Complexity | Dependencies |
|-----------|----------|------------|--------------|
| HTTP Client | High | Medium | axios |
| Authentication Manager | High | Medium | None |
| Stockyard Resolver | High | Medium | HTTP Client |
| Response Cache | Medium | Low | None |
| Rate Limiting | Medium | Medium | HTTP Client |
| Retry Logic | Medium | Low | HTTP Client |
| Error Handling | High | Medium | None |

### 1.3 Success Criteria

- [ ] Full HTTP client implementation with axios
- [ ] Multi-source authentication (env, config, keychain)
- [ ] Stockyard resolver downloads and caches definitions
- [ ] Response caching with TTL (Time To Live)
- [ ] Rate limiting to respect API limits
- [ ] Automatic retry with exponential backoff
- [ ] Comprehensive error handling and user-friendly messages
- [ ] Unit tests with mocked API responses (>90% coverage)
- [ ] Integration tests with mock Stockyard server

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Stockyard Integration Architecture                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ DefinitionResolver│
│   (resolver.ts)  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    StockyardResolver                         │
│  - resolveAgent(name, version)                              │
│  - resolveTool(name, version)                               │
│  - cacheToGlobal()                                          │
└─────────┬───────────────────────────────────────────────────┘
          │
          ├──────────────┬──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Stockyard│  │   Auth   │  │  Cache   │  │   Rate   │
    │  Client  │  │ Manager  │  │          │  │ Limiter  │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
          │              │              │              │
          └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Stockyard API   │
                    │  (stockyard.     │
                    │   fractary.dev)  │
                    └──────────────────┘
```

---

## 3. Detailed Implementation

### 3.1 Authentication Manager

#### 3.1.1 Auth Types

```typescript
// src/definitions/registry/stockyard/auth.ts

export interface StockyardAuth {
  token?: string;
  tokenSource?: 'env' | 'config' | 'keychain';
  user?: {
    username: string;
    email: string;
  };
}

export interface AuthValidationResult {
  valid: boolean;
  user?: {
    username: string;
    email: string;
  };
  error?: string;
}
```

#### 3.1.2 Auth Manager Implementation

```typescript
// src/definitions/registry/stockyard/auth-manager.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { logger } from '../../../logger';

export class StockyardAuthManager {
  private configPath: string;
  private stockyardUrl: string;

  constructor(stockyardUrl: string = 'https://stockyard.fractary.dev') {
    this.configPath = path.join(os.homedir(), '.fractary/config/forge.json');
    this.stockyardUrl = stockyardUrl;
  }

  /**
   * Resolve authentication from available sources (priority order)
   * 1. STOCKYARD_TOKEN environment variable (highest - for CI/CD)
   * 2. Config file (~/.fractary/config/forge.json)
   * 3. System keychain (optional, platform-specific)
   * 4. Anonymous access (no token)
   */
  async resolveAuth(): Promise<StockyardAuth> {
    // 1. Environment variable (highest priority)
    const envToken = process.env.STOCKYARD_TOKEN;
    if (envToken) {
      logger.debug('Using token from STOCKYARD_TOKEN environment variable');
      return { token: envToken, tokenSource: 'env' };
    }

    // 2. Config file
    if (await fs.pathExists(this.configPath)) {
      try {
        const config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
        if (config.stockyard?.token) {
          logger.debug('Using token from config file');
          return {
            token: config.stockyard.token,
            tokenSource: 'config',
            user: config.stockyard.user,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to read config: ${errorMessage}`);
      }
    }

    // 3. System keychain (optional)
    try {
      const keytar = await this.loadKeytar();
      if (keytar) {
        const token = await keytar.getPassword('fractary-stockyard', 'token');
        if (token) {
          logger.debug('Using token from system keychain');
          return { token, tokenSource: 'keychain' };
        }
      }
    } catch {
      // Keychain not available - silent fail
    }

    // 4. Anonymous access
    logger.debug('No authentication found - using anonymous access');
    return {};
  }

  /**
   * Store token in config file
   */
  async storeToken(token: string, user?: { username: string; email: string }): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));

    let config: Record<string, unknown> = {};
    if (await fs.pathExists(this.configPath)) {
      try {
        config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
      } catch {
        // Parse error - start fresh
      }
    }

    config.stockyard = {
      ...(config.stockyard as object || {}),
      token,
      user,
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Set restrictive permissions (owner read/write only)
    await fs.chmod(this.configPath, 0o600);

    logger.debug('Token stored in config file');
  }

  /**
   * Clear stored token from all sources
   */
  async clearToken(): Promise<void> {
    // Clear from config file
    if (await fs.pathExists(this.configPath)) {
      const config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
      if (config.stockyard) {
        delete config.stockyard.token;
        delete config.stockyard.user;
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    }

    // Clear from keychain
    try {
      const keytar = await this.loadKeytar();
      if (keytar) {
        await keytar.deletePassword('fractary-stockyard', 'token');
      }
    } catch {
      // Ignore keychain errors
    }

    logger.info('Token cleared from all sources');
  }

  /**
   * Validate token against Stockyard API
   */
  async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      const response = await axios.get(`${this.stockyardUrl}/api/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      return {
        valid: true,
        user: {
          username: response.data.username,
          email: response.data.email,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          valid: false,
          error: 'Invalid or expired token'
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Token validation failed: ${errorMessage}`);
    }
  }

  /**
   * Get current authentication status
   */
  async whoami(): Promise<{
    authenticated: boolean;
    user?: { username: string; email: string };
    source?: string;
  }> {
    const auth = await this.resolveAuth();

    if (!auth.token) {
      return { authenticated: false };
    }

    const validation = await this.validateToken(auth.token);

    return {
      authenticated: validation.valid,
      user: validation.user || auth.user,
      source: auth.tokenSource,
    };
  }

  /**
   * Load keytar module (optional dependency)
   */
  private async loadKeytar(): Promise<typeof import('keytar') | null> {
    try {
      return await import('keytar');
    } catch {
      return null;
    }
  }
}
```

### 3.2 HTTP Client with Rate Limiting and Retry

#### 3.2.1 Rate Limiter

```typescript
// src/definitions/registry/stockyard/rate-limiter.ts

export interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
}

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Wait until a request can be made (respects rate limit)
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove requests outside the current window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursive check
      }
    }

    // Record this request
    this.requests.push(now);
  }

  /**
   * Get current usage stats
   */
  getUsage(): { remaining: number; resetIn: number } {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    const remaining = this.config.maxRequests - this.requests.length;
    const resetIn = this.requests.length > 0
      ? this.config.windowMs - (now - this.requests[0])
      : 0;

    return { remaining, resetIn };
  }
}
```

#### 3.2.2 Full Stockyard Client

```typescript
// src/definitions/registry/stockyard/client.ts (REPLACE STUB)

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import { StockyardAuthManager } from './auth-manager';
import { RateLimiter } from './rate-limiter';
import type {
  StockyardConfig,
  StockyardAgentMetadata,
  StockyardToolMetadata,
  StockyardSearchResult,
} from './types';
import type { AgentDefinition, ToolDefinition } from '../../schemas';

export class StockyardClient {
  private client: AxiosInstance;
  private authManager: StockyardAuthManager;
  private rateLimiter: RateLimiter;
  private maxRetries: number = 3;

  constructor(private config: StockyardConfig) {
    this.authManager = new StockyardAuthManager(config.url);
    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimit?.maxRequests || 100,
      windowMs: config.rateLimit?.windowMs || 60000,
    });

    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `fractary-forge/${this.getPackageVersion()}`,
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const auth = await this.authManager.resolveAuth();
      if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`;
      }
      return config;
    });
  }

  /**
   * Get agent metadata from Stockyard
   */
  async getAgentMetadata(name: string): Promise<StockyardAgentMetadata> {
    return this.retryRequest(async () => {
      await this.rateLimiter.waitForSlot();

      logger.debug(`Fetching agent metadata from Stockyard: ${name}`);

      try {
        const response = await this.client.get(`/api/v1/agents/${name}/metadata`);
        return response.data;
      } catch (error) {
        throw this.handleError(error, 'agent metadata', name);
      }
    });
  }

  /**
   * Get tool metadata from Stockyard
   */
  async getToolMetadata(name: string): Promise<StockyardToolMetadata> {
    return this.retryRequest(async () => {
      await this.rateLimiter.waitForSlot();

      logger.debug(`Fetching tool metadata from Stockyard: ${name}`);

      try {
        const response = await this.client.get(`/api/v1/tools/${name}/metadata`);
        return response.data;
      } catch (error) {
        throw this.handleError(error, 'tool metadata', name);
      }
    });
  }

  /**
   * Download agent definition from Stockyard
   */
  async downloadAgent(name: string, version: string): Promise<AgentDefinition> {
    return this.retryRequest(async () => {
      await this.rateLimiter.waitForSlot();

      logger.debug(`Downloading agent from Stockyard: ${name}@${version}`);

      try {
        const response = await this.client.get(
          `/api/v1/agents/${name}/versions/${version}`
        );
        return response.data;
      } catch (error) {
        throw this.handleError(error, 'agent definition', `${name}@${version}`);
      }
    });
  }

  /**
   * Download tool definition from Stockyard
   */
  async downloadTool(name: string, version: string): Promise<ToolDefinition> {
    return this.retryRequest(async () => {
      await this.rateLimiter.waitForSlot();

      logger.debug(`Downloading tool from Stockyard: ${name}@${version}`);

      try {
        const response = await this.client.get(
          `/api/v1/tools/${name}/versions/${version}`
        );
        return response.data;
      } catch (error) {
        throw this.handleError(error, 'tool definition', `${name}@${version}`);
      }
    });
  }

  /**
   * Search agents and tools on Stockyard
   */
  async search(
    query: string,
    options: { type?: 'agent' | 'tool'; page?: number; pageSize?: number } = {}
  ): Promise<StockyardSearchResult> {
    return this.retryRequest(async () => {
      await this.rateLimiter.waitForSlot();

      logger.debug(`Searching Stockyard: ${query}`);

      try {
        const response = await this.client.get('/api/v1/search', {
          params: {
            q: query,
            type: options.type,
            page: options.page || 1,
            pageSize: options.pageSize || 20,
          },
        });
        return response.data;
      } catch (error) {
        throw this.handleError(error, 'search', query);
      }
    });
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on auth errors or client errors (4xx)
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        throw error;
      }

      // Retry on network errors or 5xx errors
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.debug(`Retrying request after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(fn, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Handle and format errors
   */
  private handleError(error: unknown, operation: string, identifier: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 404) {
        return new ForgeError(
          DefinitionErrorCode.DEFINITION_NOT_FOUND,
          `${identifier} not found on Stockyard`,
          { operation, identifier, status }
        );
      }

      if (status === 401 || status === 403) {
        return new ForgeError(
          DefinitionErrorCode.AUTHENTICATION_FAILED,
          `Authentication failed: ${message}\n\nRun 'forge login' to authenticate with Stockyard`,
          { operation, identifier, status }
        );
      }

      if (status === 429) {
        return new ForgeError(
          DefinitionErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Please wait before making more requests.`,
          { operation, identifier, status }
        );
      }

      if (status && status >= 500) {
        return new ForgeError(
          DefinitionErrorCode.STOCKYARD_ERROR,
          `Stockyard server error: ${message}`,
          { operation, identifier, status }
        );
      }

      return new ForgeError(
        DefinitionErrorCode.STOCKYARD_ERROR,
        `Failed to ${operation}: ${message}`,
        { operation, identifier, error }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ForgeError(
      DefinitionErrorCode.STOCKYARD_ERROR,
      `Failed to ${operation}: ${errorMessage}`,
      { operation, identifier, error }
    );
  }

  /**
   * Get package version for User-Agent header
   */
  private getPackageVersion(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('../../../../package.json');
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}
```

### 3.3 Response Cache

```typescript
// src/definitions/registry/stockyard/cache.ts (REPLACE)

import { logger } from '../../../logger';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class StockyardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtl = 3600000; // 1 hour

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.debug(`Stockyard cache expired: ${key}`);
      return null;
    }

    logger.debug(`Stockyard cache hit: ${key}`);
    return entry.value;
  }

  /**
   * Set cached value with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
    logger.debug(`Stockyard cache set: ${key} (TTL: ${ttl || this.defaultTtl}ms)`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      logger.debug(`Stockyard cache deleted: ${key}`);
    }
    return result;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Stockyard cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    expired: number;
    hitRate?: number;
  } {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Stockyard cache cleanup: removed ${removed} expired entries`);
    }

    return removed;
  }
}
```

### 3.4 Stockyard Resolver

```typescript
// src/definitions/registry/stockyard/resolver.ts (REPLACE STUB)

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as semver from 'semver';
import { logger } from '../../../logger';
import { ForgeError } from '../../../errors';
import { DefinitionErrorCode } from '../../errors';
import { StockyardClient } from './client';
import { StockyardCache } from './cache';
import type { ResolvedAgent, ResolvedTool } from '../types';
import type { AgentDefinition, ToolDefinition } from '../../schemas';
import type { ManifestManager } from '../manifest/manifest-manager';

export class StockyardResolver {
  private cache: StockyardCache;

  constructor(
    private client: StockyardClient,
    private manifestManager: ManifestManager,
    private globalRegistryPath: string = path.join(os.homedir(), '.fractary/registry')
  ) {
    this.cache = new StockyardCache();
  }

  /**
   * Resolve agent from Stockyard
   */
  async resolveAgent(name: string, versionRange: string): Promise<ResolvedAgent | null> {
    logger.info(`Resolving agent from Stockyard: ${name}@${versionRange}`);

    try {
      // Check cache first
      const cacheKey = `agent:${name}:${versionRange}`;
      const cached = this.cache.get<ResolvedAgent>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get metadata from Stockyard
      const metadata = await this.client.getAgentMetadata(name);

      // Find best matching version
      const version = this.findBestVersion(metadata.versions, versionRange);
      if (!version) {
        logger.warn(`No matching version found for ${name}@${versionRange}`);
        return null;
      }

      // Download definition
      const definition = await this.client.downloadAgent(name, version);

      // Cache to global registry
      await this.cacheToGlobal('agents', name, version, definition);

      // Update manifest
      await this.manifestManager.updateManifest(name, 'agent', {
        description: metadata.description,
        versions: metadata.versions,
        latest: metadata.latest,
        stockyard: metadata.stockyard,
        installed_versions: [version],
        active_version: version,
      });

      const resolved: ResolvedAgent = {
        definition,
        source: 'stockyard',
        version,
        path: this.getGlobalPath('agents', name, version),
      };

      // Cache the resolved result
      this.cache.set(cacheKey, resolved, 300000); // 5 min cache

      return resolved;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to resolve agent from Stockyard: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Resolve tool from Stockyard
   */
  async resolveTool(name: string, versionRange: string): Promise<ResolvedTool | null> {
    logger.info(`Resolving tool from Stockyard: ${name}@${versionRange}`);

    try {
      // Check cache first
      const cacheKey = `tool:${name}:${versionRange}`;
      const cached = this.cache.get<ResolvedTool>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get metadata
      const metadata = await this.client.getToolMetadata(name);

      // Find best matching version
      const version = this.findBestVersion(metadata.versions, versionRange);
      if (!version) {
        logger.warn(`No matching version found for ${name}@${versionRange}`);
        return null;
      }

      // Download definition
      const definition = await this.client.downloadTool(name, version);

      // Cache to global registry
      await this.cacheToGlobal('tools', name, version, definition);

      // Update manifest
      await this.manifestManager.updateManifest(name, 'tool', {
        description: metadata.description,
        versions: metadata.versions,
        latest: metadata.latest,
        stockyard: metadata.stockyard,
        installed_versions: [version],
        active_version: version,
      });

      const resolved: ResolvedTool = {
        definition,
        source: 'stockyard',
        version,
        path: this.getGlobalPath('tools', name, version),
      };

      // Cache the resolved result
      this.cache.set(cacheKey, resolved, 300000); // 5 min cache

      return resolved;
    } catch (error) {
      if (error instanceof ForgeError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to resolve tool from Stockyard: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Cache definition to global registry
   */
  private async cacheToGlobal(
    type: 'agents' | 'tools',
    name: string,
    version: string,
    definition: AgentDefinition | ToolDefinition
  ): Promise<void> {
    const targetPath = this.getGlobalPath(type, name, version);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, yaml.dump(definition), 'utf-8');
    logger.debug(`Cached to global registry: ${targetPath}`);
  }

  /**
   * Get global registry path
   */
  private getGlobalPath(type: 'agents' | 'tools', name: string, version: string): string {
    return path.join(this.globalRegistryPath, type, `${name}@${version}.yaml`);
  }

  /**
   * Find best matching version from available versions
   */
  private findBestVersion(
    versions: Array<{ version: string; status: string }>,
    range: string
  ): string | null {
    // Filter stable versions only
    const stableVersions = versions
      .filter((v) => v.status === 'stable')
      .map((v) => v.version);

    if (stableVersions.length === 0) {
      return null;
    }

    // Use semver to find best match
    const normalizedRange = range === 'latest' ? '*' : range;
    return semver.maxSatisfying(stableVersions, normalizedRange);
  }

  /**
   * Clear resolver cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
```

### 3.5 Updated Types

```typescript
// src/definitions/registry/stockyard/types.ts (EXTEND)

export interface StockyardConfig {
  url: string;
  apiKey?: string; // Deprecated - use auth manager instead
  timeout?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

// Add new error codes
export enum StockyardErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  STOCKYARD_ERROR = 'STOCKYARD_ERROR',
}

// ... rest of existing types remain the same ...
```

### 3.6 Integration with Resolver

```typescript
// src/definitions/registry/resolver.ts (UPDATE)

import { StockyardClient } from './stockyard/client';
import { StockyardResolver } from './stockyard/resolver';
import { ManifestManager } from './manifest/manifest-manager';

export class DefinitionResolver {
  // ... existing code ...
  private stockyardResolver?: StockyardResolver;

  constructor(config?: Partial<RegistryConfig>) {
    // ... existing initialization ...

    // Initialize Stockyard resolver if enabled
    if (this.config.stockyard.enabled && this.config.stockyard.url) {
      const stockyardClient = new StockyardClient({
        url: this.config.stockyard.url,
        timeout: this.config.stockyard.timeout,
        rateLimit: this.config.stockyard.rateLimit,
      });

      const manifestManager = new ManifestManager(this.config.global.path);

      this.stockyardResolver = new StockyardResolver(
        stockyardClient,
        manifestManager,
        this.config.global.path
      );
    }
  }

  async resolveAgent(name: string): Promise<ResolvedAgent> {
    // ... existing local and global checks ...

    // 3. Check Stockyard (UPDATED - now fully functional)
    if (this.config.stockyard.enabled && this.stockyardResolver) {
      logger.debug(`Fetching ${name} from Stockyard`);
      const stockyard = await this.stockyardResolver.resolveAgent(
        parsed.name,
        parsed.versionRange
      );

      if (stockyard) {
        // Resolve inheritance
        stockyard.definition = await this.inheritanceResolver.resolveAgent(
          stockyard.definition
        );

        this.cache.setAgent(name, stockyard);
        return stockyard;
      }
    }

    throw new ForgeError(
      DefinitionErrorCode.AGENT_NOT_FOUND,
      `Agent '${name}' not found in any registry`,
      { name, versionRange: parsed.versionRange }
    );
  }

  // Similar update for resolveTool...
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests

```typescript
// src/definitions/registry/stockyard/__tests__/client.test.ts

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { StockyardClient } from '../client';

describe('StockyardClient', () => {
  let client: StockyardClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    client = new StockyardClient({
      url: 'https://test.stockyard.dev',
      timeout: 5000,
    });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getAgentMetadata', () => {
    it('should fetch agent metadata successfully', async () => {
      const metadata = {
        name: 'test-agent',
        description: 'Test',
        versions: [{ version: '1.0.0', released: '2025-01-01', status: 'stable' }],
        latest: '1.0.0',
      };

      mockAxios.onGet('/api/v1/agents/test-agent/metadata').reply(200, metadata);

      const result = await client.getAgentMetadata('test-agent');
      expect(result).toEqual(metadata);
    });

    it('should handle 404 errors', async () => {
      mockAxios.onGet('/api/v1/agents/missing-agent/metadata').reply(404);

      await expect(client.getAgentMetadata('missing-agent')).rejects.toThrow(
        'not found on Stockyard'
      );
    });

    it('should handle rate limit errors', async () => {
      mockAxios.onGet('/api/v1/agents/test-agent/metadata').reply(429);

      await expect(client.getAgentMetadata('test-agent')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });

  // More tests for retry logic, authentication, etc.
});
```

### 4.2 Integration Tests

Test with a mock Stockyard server using `nock` or similar.

---

## 5. Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/axios": "^0.14.0",
    "axios-mock-adapter": "^1.22.0"
  },
  "optionalDependencies": {
    "keytar": "^7.9.0"
  }
}
```

---

## 6. Configuration Example

```typescript
// Example configuration
const config: StockyardConfig = {
  url: 'https://stockyard.fractary.dev',
  timeout: 10000,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
};
```

---

## 7. Error Codes

Add to `src/definitions/errors.ts`:

```typescript
export enum DefinitionErrorCode {
  // ... existing codes ...
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  STOCKYARD_ERROR = 'STOCKYARD_ERROR',
}
```

---

## 8. Implementation Checklist

### Phase 1: Authentication (Week 1)
- [ ] Implement `StockyardAuthManager`
- [ ] Add environment variable support
- [ ] Add config file support
- [ ] Add optional keychain support
- [ ] Implement token validation
- [ ] Write unit tests
- [ ] Test authentication flow

### Phase 2: HTTP Client (Week 2)
- [ ] Implement rate limiter
- [ ] Implement retry logic with exponential backoff
- [ ] Update `StockyardClient` with full implementation
- [ ] Add request/response interceptors
- [ ] Implement error handling
- [ ] Write unit tests with mocked API
- [ ] Test rate limiting and retries

### Phase 3: Resolver Integration (Week 3)
- [ ] Implement full `StockyardResolver`
- [ ] Add response caching
- [ ] Implement cache-to-global functionality
- [ ] Update `DefinitionResolver` integration
- [ ] Write integration tests
- [ ] Test complete resolution flow
- [ ] Performance testing

### Phase 4: Polish & Documentation (Week 4)
- [ ] Comprehensive error messages
- [ ] User-friendly logging
- [ ] API documentation
- [ ] Usage examples
- [ ] Migration guide
- [ ] Update README

---

## 9. Success Metrics

- [ ] All Stockyard operations work end-to-end
- [ ] Authentication supports all sources (env, config, keychain)
- [ ] Rate limiting prevents API abuse
- [ ] Retry logic handles transient failures
- [ ] Response caching reduces API calls by >70%
- [ ] Unit test coverage >95%
- [ ] Integration tests pass with mock server
- [ ] Performance: Agent resolution <2s (network call)
- [ ] No breaking changes to existing API

---

**Status**: Ready for implementation when Stockyard API is available.
