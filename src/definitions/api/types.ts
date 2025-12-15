/**
 * Public API types
 */

/**
 * Agent result with structured output support
 */
export interface AgentResult {
  /** String output for backward compatibility */
  output: string;

  /** Structured output for JSON/object returns (when applicable) */
  structured_output?: any;

  /** Conversation messages */
  messages: any[];

  /** Token usage statistics */
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_hits?: number;
  };

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent information
 */
export interface AgentInfo {
  name: string;
  version: string;
  description: string;
  tags: string[];
  author?: string;
  source: 'local' | 'global' | 'stockyard';
}

/**
 * Health check result for CI/CD validation
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;

  /** Agent name */
  agent: string;

  /** Checks performed */
  checks: {
    /** Agent definition exists and is valid */
    definition: { passed: boolean; error?: string };

    /** All referenced tools are available */
    tools: { passed: boolean; missing?: string[]; error?: string };

    /** LLM provider is configured */
    llm: { passed: boolean; provider?: string; error?: string };

    /** Prompt cache sources are accessible */
    cache_sources: { passed: boolean; inaccessible?: string[]; error?: string };
  };

  /** Check duration in milliseconds */
  duration_ms: number;
}

/**
 * Executable agent interface
 */
export interface ExecutableAgentInterface {
  name: string;
  version: string;
  invoke(task: string, context?: Record<string, any>): Promise<AgentResult>;
}
