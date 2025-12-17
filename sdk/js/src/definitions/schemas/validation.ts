/**
 * Validation types and helpers
 */

import { z } from 'zod';

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Convert Zod errors to ValidationError array
 */
export function zodErrorsToValidationErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.code === 'invalid_type' ? err.received : undefined,
  }));
}
