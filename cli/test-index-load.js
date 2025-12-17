#!/usr/bin/env node

/**
 * Test loading index.ts to see where it hangs
 */

console.log('1. Starting test...');

setTimeout(() => {
  console.error('TIMEOUT: Module loading took > 5 seconds');
  process.exit(1);
}, 5000);

console.log('2. About to import index.js...');

import('./dist/src/index.js')
  .then(() => {
    console.log('3. Index.js loaded successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('4. Import failed:', error.message);
    process.exit(1);
  });
