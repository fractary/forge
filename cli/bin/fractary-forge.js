#!/usr/bin/env node

/**
 * Binary entry point for fractary-forge CLI
 * Loads the CommonJS main CLI program
 */

try {
  const { main } = require('../dist/src/index.js');
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
