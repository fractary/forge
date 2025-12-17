/**
 * In-memory cache for definitions
 */

import { logger } from '../../logger';
import type { ResolvedAgent, ResolvedTool } from './types';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class DefinitionCache {
  private agentCache = new Map<string, CacheEntry<ResolvedAgent>>();
  private toolCache = new Map<string, CacheEntry<ResolvedTool>>();
  private ttl = 300000; // 5 minutes default

  constructor(ttl?: number) {
    if (ttl !== undefined) {
      this.ttl = ttl;
    }
  }

  /**
   * Get cached agent
   */
  getAgent(key: string): ResolvedAgent | null {
    const entry = this.agentCache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.agentCache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached agent
   */
  setAgent(key: string, value: ResolvedAgent): void {
    this.agentCache.set(key, {
      value,
      timestamp: Date.now(),
    });
    logger.debug(`Cached agent: ${key}`);
  }

  /**
   * Get cached tool
   */
  getTool(key: string): ResolvedTool | null {
    const entry = this.toolCache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.toolCache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached tool
   */
  setTool(key: string, value: ResolvedTool): void {
    this.toolCache.set(key, {
      value,
      timestamp: Date.now(),
    });
    logger.debug(`Cached tool: ${key}`);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.agentCache.clear();
    this.toolCache.clear();
    logger.debug('Cleared definition cache');
  }

  /**
   * Clear agent cache
   */
  clearAgents(): void {
    this.agentCache.clear();
    logger.debug('Cleared agent cache');
  }

  /**
   * Clear tool cache
   */
  clearTools(): void {
    this.toolCache.clear();
    logger.debug('Cleared tool cache');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      agents: {
        count: this.agentCache.size,
        keys: Array.from(this.agentCache.keys()),
      },
      tools: {
        count: this.toolCache.size,
        keys: Array.from(this.toolCache.keys()),
      },
      ttl: this.ttl,
    };
  }
}
