#!/usr/bin/env node

/**
 * Test importing specific SDK exports
 */

console.log('Testing specific SDK imports...');

setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(1);
}, 5000);

// Try importing specific exports
import('@fractary/forge')
  .then((sdk) => {
    console.log('SDK imported!');
    console.log('Available exports:', Object.keys(sdk).slice(0, 10));

    // Try to create an AgentAPI instance
    if (sdk.AgentAPI) {
      console.log('Found AgentAPI');
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
