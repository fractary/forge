/**
 * Default configuration for Forge SDK
 */

import path from 'path';
import os from 'os';
import type { ForgeConfig } from '../types';

export function getDefaultGlobalConfig(): ForgeConfig {
  return {
    resolvers: {
      default: 'github',
      github: {
        defaultOrg: 'fractary',
      },
    },
    cache: {
      enabled: true,
      ttl: 60 * 60 * 1000, // 1 hour
      dir: path.join(os.homedir(), '.forge', 'cache'),
    },
    defaults: {
      organization: 'fractary',
    },
    features: {
      telemetry: false,
      updateCheck: true,
    },
    paths: {
      cache: path.join(os.homedir(), '.forge', 'cache'),
      templates: path.join(os.homedir(), '.forge', 'templates'),
    },
  };
}
