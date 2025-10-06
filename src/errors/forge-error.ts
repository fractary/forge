/**
 * ForgeError class for SDK errors
 */

import { ErrorCode } from './codes';

export class ForgeError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ForgeError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForgeError);
    }
  }

  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * User-friendly error messages
 */
export const USER_FRIENDLY_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.FILE_NOT_FOUND]: 'The specified file could not be found.',
  [ErrorCode.DIRECTORY_NOT_FOUND]: 'The specified directory could not be found.',
  [ErrorCode.FILE_EXISTS]: 'The file already exists.',
  [ErrorCode.PERMISSION_DENIED]: 'Permission denied. Try running with elevated privileges.',
  [ErrorCode.PACKAGE_NOT_FOUND]: 'The specified package could not be found in the registry.',
  [ErrorCode.INVALID_PACKAGE]: 'The package appears to be corrupted or invalid.',
  [ErrorCode.VERSION_MISMATCH]: 'Version requirements could not be satisfied.',
  [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
  [ErrorCode.AUTHENTICATION_FAILED]: 'Authentication failed. Please check your GitHub token.',
  [ErrorCode.CONFIG_NOT_FOUND]: 'Configuration file not found.',
  [ErrorCode.INVALID_CONFIG]: 'Configuration file is invalid.',
  [ErrorCode.TEMPLATE_NOT_FOUND]: 'The specified template could not be found.',
  [ErrorCode.INVALID_TEMPLATE]: 'The template appears to be invalid.',
  [ErrorCode.BUNDLE_NOT_FOUND]: 'The specified bundle could not be found.',
  [ErrorCode.INVALID_BUNDLE]: 'The bundle appears to be invalid.',
  [ErrorCode.ASSET_NOT_FOUND]: 'The specified asset could not be found.',
  [ErrorCode.MANIFEST_NOT_FOUND]: 'Asset manifest not found.',
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed.',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
  [ErrorCode.INVALID_JSON]: 'Invalid JSON format.',
  [ErrorCode.EXTRACTION_ERROR]: 'Failed to extract asset files.',
};

/**
 * Get user-friendly message for error code
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  return USER_FRIENDLY_MESSAGES[code] || 'An unknown error occurred.';
}

/**
 * Type guard to check if error is ForgeError
 */
export function isForgeError(error: unknown): error is ForgeError {
  return error instanceof ForgeError;
}

/**
 * Assert that value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new ForgeError(ErrorCode.INVALID_ARGUMENT, message);
  }
}
