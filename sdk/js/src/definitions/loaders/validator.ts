/**
 * Definition validator using Zod schemas
 */

import { z } from 'zod';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import {
  AgentDefinitionSchema,
  ToolDefinitionSchema,
  zodErrorsToValidationErrors,
  type AgentDefinition,
  type ToolDefinition,
} from '../schemas';

export class DefinitionValidator {
  /**
   * Validate agent definition
   */
  validateAgent(data: unknown): AgentDefinition {
    try {
      return AgentDefinitionSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = zodErrorsToValidationErrors(error);
        throw new ForgeError(
          DefinitionErrorCode.SCHEMA_VALIDATION_ERROR,
          'Agent definition validation failed',
          { errors: validationErrors }
        );
      }
      throw error;
    }
  }

  /**
   * Validate tool definition
   */
  validateTool(data: unknown): ToolDefinition {
    try {
      return ToolDefinitionSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = zodErrorsToValidationErrors(error);
        throw new ForgeError(
          DefinitionErrorCode.SCHEMA_VALIDATION_ERROR,
          'Tool definition validation failed',
          { errors: validationErrors }
        );
      }
      throw error;
    }
  }

  /**
   * Safe validate - returns result instead of throwing
   */
  validateAgentSafe(data: unknown): {
    success: boolean;
    data?: AgentDefinition;
    error?: string;
  } {
    try {
      const validated = this.validateAgent(data);
      return { success: true, data: validated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Safe validate - returns result instead of throwing
   */
  validateToolSafe(data: unknown): {
    success: boolean;
    data?: ToolDefinition;
    error?: string;
  } {
    try {
      const validated = this.validateTool(data);
      return { success: true, data: validated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
