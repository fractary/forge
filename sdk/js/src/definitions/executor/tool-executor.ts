/**
 * Tool executor with timeout support and multiple implementation types
 */

import { spawn } from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { logger } from '../../logger';
import { ForgeError } from '../../errors/forge-error';
import { DefinitionErrorCode } from '../errors';
import { DependencyResolver } from './dependency-resolver';
import type { ToolDefinition } from '../schemas';
import type { ToolResult, ToolExecutionOptions } from './types';

export class ToolExecutor {
  private dependencyResolver?: DependencyResolver;
  private defaultTimeout = 120000; // 2 minutes

  constructor(resolver?: any) {
    if (resolver) {
      this.dependencyResolver = new DependencyResolver(resolver);
    }
  }

  /**
   * Execute a tool with the given parameters
   */
  async execute(
    tool: ToolDefinition,
    params: Record<string, any>,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Get timeout with type narrowing
    let timeout = options?.timeout ?? this.defaultTimeout;
    if (
      tool.implementation.type === 'bash' &&
      tool.implementation.bash.sandbox?.max_execution_time
    ) {
      timeout = options?.timeout ?? tool.implementation.bash.sandbox.max_execution_time;
    }

    // Validate required parameters
    this.validateParameters(tool, params);

    // Resolve dependencies first
    if (tool.depends_on && tool.depends_on.length > 0 && this.dependencyResolver) {
      logger.debug(`Resolving dependencies for tool: ${tool.name}`);
      await this.dependencyResolver.executeDependencies(tool.depends_on, params);
    }

    // Execute based on implementation type
    switch (tool.implementation.type) {
      case 'bash':
        return this.executeBash(tool, params, timeout, startTime, options);
      case 'python':
        return this.executePython(tool, params, timeout, startTime, options);
      case 'http':
        return this.executeHttp(tool, params, timeout, startTime, options);
      default:
        throw new ForgeError(
          DefinitionErrorCode.TOOL_INVALID,
          `Unsupported tool implementation type`,
          { tool: tool.name }
        );
    }
  }

  /**
   * Execute bash tool
   */
  private async executeBash(
    tool: ToolDefinition,
    params: Record<string, any>,
    timeout: number,
    startTime: number,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    if (tool.implementation.type !== 'bash') {
      throw new Error('Expected bash implementation');
    }

    const bashImpl = tool.implementation.bash;

    return new Promise((resolve) => {
      const command = this.substituteParams(bashImpl.command, params);

      let output = '';
      let timedOut = false;

      const proc = spawn('bash', ['-c', command], {
        env: this.buildEnv(bashImpl.sandbox?.env_vars, options?.env),
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => proc.kill('SIGKILL'), 5000);
      }, timeout);

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration_ms = Date.now() - startTime;

        if (timedOut) {
          resolve({
            success: false,
            output, // Partial output collected before timeout
            timeout: true,
            error: `Tool execution timed out after ${timeout}ms`,
            duration_ms,
            exit_code: code ?? -1,
          });
        } else {
          resolve({
            success: code === 0,
            output,
            timeout: false,
            error: code !== 0 ? `Exit code: ${code}` : undefined,
            duration_ms,
            exit_code: code ?? 0,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          output,
          timeout: false,
          error: err.message,
          duration_ms: Date.now() - startTime,
          exit_code: -1,
        });
      });
    });
  }

  /**
   * Execute Python tool
   */
  private async executePython(
    tool: ToolDefinition,
    params: Record<string, any>,
    timeout: number,
    startTime: number,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    if (tool.implementation.type !== 'python') {
      throw new Error('Expected python implementation');
    }

    // Create Python script that imports and calls the function
    const pyModule = tool.implementation.python.module;
    const pyFunction = tool.implementation.python.function;

    const script = `
import json
import sys
from ${pyModule} import ${pyFunction}

params = json.loads(sys.argv[1])
result = ${pyFunction}(**params)
print(json.dumps(result))
`;

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;

      const proc = spawn('python3', ['-c', script, JSON.stringify(params)], {
        env: this.buildEnv([], options?.env),
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 5000);
      }, timeout);

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration_ms = Date.now() - startTime;

        if (timedOut) {
          resolve({
            success: false,
            output,
            timeout: true,
            error: `Tool execution timed out after ${timeout}ms`,
            duration_ms,
            exit_code: code ?? -1,
          });
        } else if (code === 0) {
          // Try to parse JSON output
          try {
            const parsed = JSON.parse(output.trim());
            resolve({
              success: true,
              output: parsed,
              timeout: false,
              duration_ms,
              exit_code: 0,
            });
          } catch {
            // Not JSON, return as string
            resolve({
              success: true,
              output: output.trim(),
              timeout: false,
              duration_ms,
              exit_code: 0,
            });
          }
        } else {
          resolve({
            success: false,
            output,
            timeout: false,
            error: `Exit code: ${code}`,
            duration_ms,
            exit_code: code ?? -1,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          output,
          timeout: false,
          error: err.message,
          duration_ms: Date.now() - startTime,
          exit_code: -1,
        });
      });
    });
  }

  /**
   * Execute HTTP tool
   */
  private async executeHttp(
    tool: ToolDefinition,
    params: Record<string, any>,
    timeout: number,
    startTime: number,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    if (tool.implementation.type !== 'http') {
      throw new Error('Expected http implementation');
    }

    const httpImpl = tool.implementation.http;
    const url = this.substituteParams(httpImpl.url, params);

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      let timedOut = false;
      let output = '';

      const requestOptions: http.RequestOptions = {
        method: httpImpl.method,
        headers: httpImpl.headers || {},
        timeout,
      };

      const req = client.request(parsedUrl, requestOptions, (res) => {
        res.on('data', (chunk) => {
          output += chunk.toString();
        });

        res.on('end', () => {
          const duration_ms = Date.now() - startTime;
          const success = res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false;

          // Try to parse JSON
          let parsedOutput: any = output;
          try {
            parsedOutput = JSON.parse(output);
          } catch {
            // Not JSON, use as string
          }

          resolve({
            success,
            output: parsedOutput,
            timeout: false,
            error: !success ? `HTTP ${res.statusCode}: ${res.statusMessage}` : undefined,
            duration_ms,
            exit_code: res.statusCode,
          });
        });
      });

      req.on('timeout', () => {
        timedOut = true;
        req.destroy();
        resolve({
          success: false,
          output,
          timeout: true,
          error: `HTTP request timed out after ${timeout}ms`,
          duration_ms: Date.now() - startTime,
        });
      });

      req.on('error', (err) => {
        if (!timedOut) {
          resolve({
            success: false,
            output,
            timeout: false,
            error: err.message,
            duration_ms: Date.now() - startTime,
          });
        }
      });

      // Send body if POST/PUT
      if (httpImpl.body_template && (httpImpl.method === 'POST' || httpImpl.method === 'PUT')) {
        const body = this.substituteParams(httpImpl.body_template, params);
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Substitute parameters in template string
   */
  private substituteParams(template: string, params: Record<string, any>): string {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : '';
    });
  }

  /**
   * Build environment variables
   */
  private buildEnv(
    allowedVars?: string[],
    additionalEnv?: Record<string, string>
  ): NodeJS.ProcessEnv {
    const baseEnv: NodeJS.ProcessEnv = { ...process.env };

    if (allowedVars && allowedVars.length > 0) {
      // Only pass through allowed env vars
      const filtered: NodeJS.ProcessEnv = {};
      for (const varName of allowedVars) {
        if (baseEnv[varName]) {
          filtered[varName] = baseEnv[varName];
        }
      }
      return { ...filtered, ...additionalEnv };
    }

    return { ...baseEnv, ...additionalEnv };
  }

  /**
   * Validate required parameters
   */
  private validateParameters(tool: ToolDefinition, params: Record<string, any>): void {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && params[paramName] === undefined) {
        throw new ForgeError(
          DefinitionErrorCode.TOOL_INVALID,
          `Missing required parameter: ${paramName}`,
          { tool: tool.name, parameter: paramName }
        );
      }
    }
  }
}
