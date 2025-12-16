/**
 * Logger implementation for Forge SDK
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { LogLevel, LOG_LEVELS } from './types';

export class Logger {
  private level: LogLevel;
  private spinner: Ora | null = null;

  constructor(level?: LogLevel) {
    this.level = level || this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.FORGE_LOG_LEVEL?.toLowerCase();
    if (envLevel && envLevel in LOG_LEVELS) {
      return envLevel as LogLevel;
    }
    return 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = {
      debug: chalk.gray('[DEBUG]'),
      info: chalk.blue('[INFO]'),
      warn: chalk.yellow('[WARN]'),
      error: chalk.red('[ERROR]'),
      silent: '',
    }[level];

    if (this.level === 'debug') {
      return `${chalk.gray(timestamp)} ${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message));
    }
  }

  error(message: string | Error): void {
    if (this.shouldLog('error')) {
      const msg = message instanceof Error ? message.message : message;
      console.error(this.format('error', msg));
      if (message instanceof Error && this.level === 'debug') {
        console.error(chalk.gray(message.stack));
      }
    }
  }

  success(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✓'), chalk.green(message));
    }
  }

  task(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan('→'), message);
    }
  }

  complete(message: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✨'), chalk.bold(message));
    }
  }

  highlight(label: string, value: string): void {
    if (this.shouldLog('info')) {
      console.log(chalk.gray(label + ':'), chalk.cyan(value));
    }
  }

  divider(): void {
    if (this.shouldLog('info')) {
      console.log(chalk.dim('─'.repeat(50)));
    }
  }

  startSpinner(text: string): void {
    if (this.shouldLog('info')) {
      this.spinner = ora(text).start();
    }
  }

  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// Default singleton instance
export const logger = new Logger();
