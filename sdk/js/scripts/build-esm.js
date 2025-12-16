#!/usr/bin/env node
/**
 * Post-build script to rename .js to .mjs for ESM build
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

async function renameEsmFiles() {
  const distDir = path.join(__dirname, '..', 'dist');

  // Find all .js files (ESM output from tsconfig.esm.json)
  const jsFiles = glob.sync('**/*.js', {
    cwd: distDir,
    absolute: true,
  });

  console.log(`Found ${jsFiles.length} .js files to rename to .mjs`);

  for (const jsFile of jsFiles) {
    const mjsFile = jsFile.replace(/\.js$/, '.mjs');

    // Rename .js to .mjs
    await fs.rename(jsFile, mjsFile);

    // Also update sourcemap if it exists
    const mapFile = jsFile + '.map';
    if (await fs.pathExists(mapFile)) {
      const mjsMapFile = mjsFile + '.map';
      await fs.rename(mapFile, mjsMapFile);

      // Update sourcemap reference in .mjs file
      let content = await fs.readFile(mjsFile, 'utf8');
      content = content.replace(/\.js\.map$/, '.mjs.map');
      await fs.writeFile(mjsFile, content);
    }
  }

  console.log('ESM build complete!');
}

renameEsmFiles().catch(console.error);
