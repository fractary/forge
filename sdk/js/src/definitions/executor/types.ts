/**
 * Tool execution types
 */

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Whether execution completed successfully */
  success: boolean;

  /** Tool output (may be partial if timeout) */
  output: any;

  /** Whether execution timed out */
  timeout?: boolean;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration_ms: number;

  /** Exit code for bash/python tools */
  exit_code?: number;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number; // Timeout in milliseconds
  env?: Record<string, string>; // Environment variables
}
