#!/usr/bin/env node

console.log('Testing minimal CLI...');

import('./dist/src/index-minimal.js')
  .then(({ main }) => {
    console.log('Module loaded, running main...');
    return main();
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
