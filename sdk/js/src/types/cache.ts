/**
 * Cache-related types
 */

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  entries: number;
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in MB
  dir?: string; // Cache directory path
}
