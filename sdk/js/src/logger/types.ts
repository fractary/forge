/**
 * Logger types for Forge SDK
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};
