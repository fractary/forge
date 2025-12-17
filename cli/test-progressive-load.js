#!/usr/bin/env node

/**
 * Test loading modules progressively to find which causes the hang
 */

console.log('1. Starting progressive test...');

setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(1);
}, 5000);

async function test() {
  console.log('2. Loading commander...');
  await import('commander');
  console.log('3. Commander loaded OK');

  console.log('4. Loading init command...');
  await import('./dist/src/commands/init.js');
  console.log('5. Init command loaded OK');

  console.log('6. Loading agent/create command...');
  await import('./dist/src/commands/agent/create.js');
  console.log('7. Agent/create loaded OK');

  console.log('8. Loading registry/install command...');
  await import('./dist/src/commands/registry/install.js');
  console.log('9. Registry/install loaded OK');

  console.log('10. Loading registry/update command...');
  await import('./dist/src/commands/registry/update.js');
  console.log('11. Registry/update loaded OK');

  console.log('12. Loading registry/index...');
  await import('./dist/src/commands/registry/index.js');
  console.log('13. Registry/index loaded OK');

  console.log('14. All modules loaded successfully!');
  process.exit(0);
}

test().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
