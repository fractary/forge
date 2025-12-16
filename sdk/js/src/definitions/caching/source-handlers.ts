/**
 * Cache source handlers for different source types
 */

import * as fs from 'fs-extra';
import { glob } from 'glob';
import { logger } from '../../logger';

/**
 * File source handler
 */
export class FileSourceHandler {
  static async load(filePath: string): Promise<string> {
    logger.debug(`Loading cache source from file: ${filePath}`);
    return await fs.readFile(filePath, 'utf-8');
  }
}

/**
 * Glob source handler
 */
export class GlobSourceHandler {
  static async load(pattern: string): Promise<string> {
    logger.debug(`Loading cache source from glob: ${pattern}`);
    const files = await glob(pattern);

    const contents = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(file, 'utf-8');
        return `// File: ${file}\n${content}\n`;
      })
    );

    return contents.join('\n\n');
  }
}

/**
 * Codex source handler (optional integration)
 */
export class CodexSourceHandler {
  static async load(uri: string): Promise<string> {
    logger.debug(`Loading cache source from codex: ${uri}`);

    // Parse codex://org/project/path
    const match = uri.match(/^codex:\/\/([^\/]+)\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid codex URI: ${uri}`);
    }

    const [, org, project, path] = match;

    // Try to load from @fractary/codex if available
    try {
      // Dynamic import to make codex optional
      const codex = await import('@fractary/codex' as any);
      const client = new codex.CodexClient();
      return await client.fetch({ org, project, path });
    } catch (error) {
      logger.warn(`Codex integration not available or failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Codex integration not available for: ${uri}`);
    }
  }
}
