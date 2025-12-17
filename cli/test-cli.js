#!/usr/bin/env node

/**
 * Test script to debug CLI initialization
 */

console.log('Step 1: Starting CLI test...');

try {
  console.log('Step 2: Importing index...');

  import('./dist/src/index.js')
    .then((module) => {
      console.log('Step 3: Module loaded successfully');
      console.log('Step 4: Available exports:', Object.keys(module));

      if (module.createProgram) {
        console.log('Step 5: Creating program...');
        const program = module.createProgram();
        console.log('Step 6: Program created');

        console.log('Step 7: Parsing arguments...');
        program.parse(['node', 'test', '--help']);
        console.log('Step 8: Complete!');
      }
    })
    .catch((error) => {
      console.error('Error during import:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}

// Set a timeout to detect hangs
setTimeout(() => {
  console.error('TIMEOUT: CLI hung for 10 seconds');
  process.exit(1);
}, 10000);
