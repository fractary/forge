/**
 * File system utilities for Forge SDK
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { logger } from '../logger';
import { ForgeError, ErrorCode } from '../errors';

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
    logger.debug(`Ensured directory: ${dirPath}`);
  } catch (error) {
    throw new ForgeError(
      ErrorCode.PERMISSION_DENIED,
      `Failed to create directory: ${dirPath}`,
      error
    );
  }
}

export async function copyFile(
  src: string,
  dest: string,
  options?: { overwrite?: boolean }
): Promise<void> {
  const { overwrite = false } = options || {};

  if (!overwrite && (await exists(dest))) {
    throw new ForgeError(ErrorCode.FILE_EXISTS, `File already exists: ${dest}`);
  }

  try {
    await fs.copyFile(src, dest);
    logger.debug(`Copied: ${src} → ${dest}`);
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to copy file: ${src} → ${dest}`, error);
  }
}

export async function copyDir(
  src: string,
  dest: string,
  options?: {
    overwrite?: boolean;
    filter?: (src: string) => boolean;
  }
): Promise<void> {
  const { overwrite = false, filter } = options || {};

  if (!overwrite && (await exists(dest))) {
    throw new ForgeError(ErrorCode.FILE_EXISTS, `Directory already exists: ${dest}`);
  }

  try {
    await fs.copy(src, dest, { overwrite, filter });
    logger.debug(`Copied directory: ${src} → ${dest}`);
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to copy directory: ${src} → ${dest}`, error);
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new ForgeError(ErrorCode.FILE_NOT_FOUND, `Failed to read file: ${filePath}`, error);
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
    logger.debug(`Wrote file: ${filePath}`);
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to write file: ${filePath}`, error);
  }
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof ForgeError) {
      throw error;
    }
    throw new ForgeError(ErrorCode.INVALID_CONFIG, `Failed to parse JSON file: ${filePath}`, error);
  }
}

export async function writeJson<T = unknown>(
  filePath: string,
  data: T,
  options?: { spaces?: number }
): Promise<void> {
  const { spaces = 2 } = options || {};
  const content = JSON.stringify(data, null, spaces);
  await writeFile(filePath, content);
}

export async function remove(filePath: string): Promise<void> {
  try {
    await fs.remove(filePath);
    logger.debug(`Removed: ${filePath}`);
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to remove: ${filePath}`, error);
  }
}

export async function findFiles(
  pattern: string,
  options?: {
    cwd?: string;
    ignore?: string[];
  }
): Promise<string[]> {
  const { cwd = process.cwd(), ignore = [] } = options || {};

  try {
    const files = await glob(pattern, {
      cwd,
      ignore,
      absolute: true,
    });
    return files;
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to find files matching: ${pattern}`, error);
  }
}

export function resolvePath(...paths: string[]): string {
  return path.resolve(...paths);
}

export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

export function relativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function dirname(filePath: string): string {
  return path.dirname(filePath);
}

export function basename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

export function extname(filePath: string): string {
  return path.extname(filePath);
}

export async function readdir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    throw new ForgeError(ErrorCode.FILE_NOT_FOUND, `Failed to read directory: ${dirPath}`, error);
  }
}

export async function stat(filePath: string): Promise<fs.Stats> {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw new ForgeError(ErrorCode.FILE_NOT_FOUND, `Failed to stat file: ${filePath}`, error);
  }
}

export async function rmdir(dirPath: string): Promise<void> {
  try {
    await fs.rmdir(dirPath);
    logger.debug(`Removed directory: ${dirPath}`);
  } catch (error) {
    throw new ForgeError(ErrorCode.UNKNOWN, `Failed to remove directory: ${dirPath}`, error);
  }
}

export async function isEmptyDir(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.length === 0;
  } catch {
    return true;
  }
}

export async function copyTemplate(
  templatePath: string,
  destPath: string,
  variables?: Record<string, string>
): Promise<void> {
  if (!(await exists(templatePath))) {
    throw new ForgeError(ErrorCode.TEMPLATE_NOT_FOUND, `Template not found: ${templatePath}`);
  }

  if (await isDirectory(templatePath)) {
    // Copy directory template
    await copyDir(templatePath, destPath, { overwrite: false });

    // Process template variables if provided
    if (variables) {
      await processTemplateVariables(destPath, variables);
    }
  } else {
    // Copy single file template
    let content = await readFile(templatePath);

    // Replace template variables
    if (variables) {
      content = replaceTemplateVariables(content, variables);
    }

    await writeFile(destPath, content);
  }
}

async function processTemplateVariables(
  dirPath: string,
  variables: Record<string, string>
): Promise<void> {
  const files = await findFiles('**/*', { cwd: dirPath });

  for (const file of files) {
    if (await isFile(file)) {
      let content = await readFile(file);
      content = replaceTemplateVariables(content, variables);
      await writeFile(file, content);
    }
  }
}

function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}
