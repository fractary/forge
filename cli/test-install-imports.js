#!/usr/bin/env node

/**
 * Test loading install.ts dependencies one by one
 */

console.log('1. Starting test...');

setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(1);
}, 5000);

async function test() {
  console.log('2. Loading ora...');
  await import('ora');
  console.log('3. Ora OK');

  console.log('4. Loading chalk...');
  await import('chalk');
  console.log('5. Chalk OK');

  console.log('6. Loading forge-config...');
  await import('./dist/src/utils/forge-config.js');
  console.log('7. Forge-config OK');

  console.log('8. Loading formatters...');
  await import('./dist/src/utils/formatters.js');
  console.log('9. Formatters OK');

  console.log('10. All dependencies loaded successfully!');
  process.exit(0);
}

test().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
