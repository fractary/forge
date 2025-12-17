#!/usr/bin/env node

/**
 * Fractary Forge MCP Server CLI entry point
 */

import { startServer } from '../dist/index.js';

startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
