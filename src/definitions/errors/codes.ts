/**
 * Error codes for definition system
 */

import { ErrorCode as BaseErrorCode } from '../../errors/codes';

/**
 * Extended error codes for definitions module
 */
export const DefinitionErrorCode = {
  ...BaseErrorCode,

  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND' as const,
  AGENT_INVALID: 'AGENT_INVALID' as const,
  AGENT_LOAD_FAILED: 'AGENT_LOAD_FAILED' as const,
  AGENT_HEALTH_CHECK_FAILED: 'AGENT_HEALTH_CHECK_FAILED' as const,

  // Tool errors
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND' as const,
  TOOL_INVALID: 'TOOL_INVALID' as const,
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED' as const,
  TOOL_EXECUTION_TIMEOUT: 'TOOL_EXECUTION_TIMEOUT' as const,
  TOOL_DEPENDENCY_CYCLE: 'TOOL_DEPENDENCY_CYCLE' as const,
  TOOL_DEPENDENCY_NOT_FOUND: 'TOOL_DEPENDENCY_NOT_FOUND' as const,

  // Registry errors
  DEFINITION_NOT_FOUND: 'DEFINITION_NOT_FOUND' as const,
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND' as const,
  LOCKFILE_INVALID: 'LOCKFILE_INVALID' as const,

  // Validation errors
  YAML_PARSE_ERROR: 'YAML_PARSE_ERROR' as const,
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR' as const,

  // Inheritance errors
  INHERITANCE_CYCLE: 'INHERITANCE_CYCLE' as const,
  INHERITANCE_BASE_NOT_FOUND: 'INHERITANCE_BASE_NOT_FOUND' as const,
} as const;

export type DefinitionErrorCode =
  | BaseErrorCode
  | (typeof DefinitionErrorCode)[keyof typeof DefinitionErrorCode];
