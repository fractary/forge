#!/usr/bin/env node

/**
 * Test which import is causing the hang
 */

console.log('Testing imports...');

setTimeout(() => {
  console.error('TIMEOUT: Import hung');
  process.exit(1);
}, 5000);

// Test importing just commander
console.log('1. Testing commander...');
import('commander')
  .then(() => {
    console.log('✓ commander OK');

    // Test importing SDK
    console.log('2. Testing @fractary/forge...');
    return import('@fractary/forge');
  })
  .then(() => {
    console.log('✓ @fractary/forge OK');

    // Test importing a simple command
    console.log('3. Testing init command...');
    return import('./dist/src/commands/init.js');
  })
  .then(() => {
    console.log('✓ init command OK');
    console.log('All imports successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
