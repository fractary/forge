/**
 * Prompt cache manager with TTL per source type
 */

import { logger } from '../../logger';
import type { CachingSource, AgentDefinition } from '../schemas';
import { FileSourceHandler, GlobSourceHandler, CodexSourceHandler } from './source-handlers';

interface CacheEntry {
  content: string;
  loadedAt: number;
  ttl: number;
  source: CachingSource;
}

export class PromptCacheManager {
  private cache = new Map<string, CacheEntry>();
  private defaultTtls: Record<string, number> = {
    file: 3600, // 1 hour
    glob: 1800, // 30 minutes
    codex: 7200, // 2 hours
    inline: Infinity, // Never expires (static content)
  };

  constructor(ttlOverrides?: Record<string, number>) {
    if (ttlOverrides) {
      this.defaultTtls = { ...this.defaultTtls, ...ttlOverrides };
    }
  }

  /**
   * Get cached content for a source, loading if needed
   */
  async get(source: CachingSource): Promise<string> {
    const cacheKey = this.getCacheKey(source);
    const entry = this.cache.get(cacheKey);

    if (entry && !this.isExpired(entry)) {
      logger.debug(`Cache hit for source: ${source.label || cacheKey}`);
      return entry.content;
    }

    logger.debug(`Cache miss for source: ${source.label || cacheKey}`);
    return this.load(source);
  }

  /**
   * Load content from source and cache it
   */
  async load(source: CachingSource): Promise<string> {
    const content = await this.loadFromSource(source);
    const ttl = this.getTtl(source);

    const entry: CacheEntry = {
      content,
      loadedAt: Date.now(),
      ttl,
      source,
    };

    this.cache.set(this.getCacheKey(source), entry);
    return content;
  }

  /**
   * Invalidate cache for an agent
   */
  async invalidate(agentName: string): Promise<void> {
    // Invalidate all entries associated with this agent
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${agentName}:`)) {
        this.cache.delete(key);
      }
    }
    logger.info(`Invalidated cache for agent: ${agentName}`);
  }

  /**
   * Preload all cache sources for an agent
   */
  async preload(definition: AgentDefinition): Promise<void> {
    if (!definition.caching?.enabled) return;

    logger.info(`Preloading cache for agent: ${definition.name}`);

    for (const source of definition.caching.cache_sources || []) {
      try {
        await this.load(source);
      } catch (error) {
        logger.warn(
          `Failed to preload cache source: ${source.label}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Check if a source is accessible
   */
  async checkSourceAccessible(source: CachingSource): Promise<boolean> {
    try {
      await this.loadFromSource(source);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Manual refresh method
   */
  async refresh(agentName: string, definition: AgentDefinition): Promise<void> {
    await this.invalidate(agentName);
    await this.preload(definition);
  }

  private getCacheKey(source: CachingSource): string {
    switch (source.type) {
      case 'file':
        return `file:${source.path}`;
      case 'glob':
        return `glob:${source.pattern}`;
      case 'codex':
        return `codex:${source.uri}`;
      case 'inline':
        return `inline:${this.hashCode(source.content || '')}`;
    }
  }

  private getTtl(source: CachingSource): number {
    // Source-specific TTL override
    if (source.ttl !== undefined) {
      return source.ttl * 1000; // Convert to milliseconds
    }

    // Default TTL by source type
    return (this.defaultTtls[source.type] || 3600) * 1000;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === Infinity) return false;
    return Date.now() - entry.loadedAt > entry.ttl;
  }

  private async loadFromSource(source: CachingSource): Promise<string> {
    switch (source.type) {
      case 'file':
        return FileSourceHandler.load(source.path!);
      case 'glob':
        return GlobSourceHandler.load(source.pattern!);
      case 'codex':
        return CodexSourceHandler.load(source.uri!);
      case 'inline':
        return source.content || '';
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
