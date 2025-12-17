/**
 * Cache management tools (2 tools)
 *
 * - fractary_forge_cache_stats: Get cache statistics
 * - fractary_forge_cache_clear: Clear cache entries
 */

import { z } from 'zod';
import { Registry } from '@fractary/forge';
import { ToolDefinition, formatSuccess, formatError } from '../types.js';

const { manifestCache } = Registry;

/**
 * fractary_forge_cache_stats
 */
const cacheStatsSchema = z.object({});

export const cacheStats: ToolDefinition = {
  name: 'fractary_forge_cache_stats',
  description: 'Get cache statistics including size, entry count, and timestamps',
  inputSchema: cacheStatsSchema,
  handler: async () => {
    try {
      const stats = await manifestCache.getStats();

      return formatSuccess({
        totalEntries: stats.total_entries,
        freshEntries: stats.fresh_entries,
        expiredEntries: stats.expired_entries,
        totalSize: stats.total_size_bytes,
        totalSizeReadable: formatBytes(stats.total_size_bytes),
        cacheDir: stats.cache_dir,
      });
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * fractary_forge_cache_clear
 */
const cacheClearSchema = z.object({
  pattern: z.string().optional().describe('Pattern to match cache entries (optional)'),
  all: z.boolean().default(false).describe('Clear all cache entries'),
});

export const cacheClear: ToolDefinition = {
  name: 'fractary_forge_cache_clear',
  description: 'Clear cache entries by pattern or all entries',
  inputSchema: cacheClearSchema,
  handler: async (args) => {
    try {
      if (args.all) {
        await manifestCache.invalidateAll();
        return formatSuccess({
          cleared: 'all',
          message: 'All cache entries cleared',
        });
      } else if (args.pattern) {
        // Pattern-based clearing: clear specific registry cache
        await manifestCache.invalidate(args.pattern as string);
        return formatSuccess({
          cleared: 1,
          pattern: args.pattern,
          message: `Cache cleared for registry: ${args.pattern}`,
        });
      } else {
        return formatSuccess({
          cleared: 0,
          message: 'Specify either "all: true" or provide a registry name pattern',
        });
      }
    } catch (error) {
      return formatError(error);
    }
  },
};

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Export all cache tools
 */
export const cacheTools: ToolDefinition[] = [cacheStats, cacheClear];
