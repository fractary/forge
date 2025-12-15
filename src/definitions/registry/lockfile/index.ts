/**
 * Lockfile module exports
 */

export { LockfileManager } from './lockfile-manager';
export { calculateIntegrity, verifyIntegrity } from './integrity';
export { discoverUsedAgents, discoverUsedTools } from './discovery';

export type {
  Lockfile,
  LockfileEntry,
  LockfileDependencies,
  LockfileGenerateOptions,
  LockfileValidationResult,
  LockfileValidationError,
  LockfileValidationWarning,
} from './types';
