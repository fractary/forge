#!/usr/bin/env node

/**
 * Binary entry point for fractary-forge CLI
 * Uses dynamic import to load the main CLI program
 */

import('../dist/src/index.js')
  .then(({ main }) => {
    return main();
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
