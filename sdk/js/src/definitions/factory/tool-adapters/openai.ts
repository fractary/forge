/**
 * OpenAI tool adapter
 */

import type { ToolDefinition, ToolParameter } from '../../schemas';
import type { IToolAdapter } from './types';

export class OpenAIToolAdapter implements IToolAdapter {
  provider = 'openai';

  adaptTool(tool: ToolDefinition): any {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(tool.parameters),
          required: Object.entries(tool.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      },
    };
  }

  private convertParameters(params: Record<string, ToolParameter>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, param] of Object.entries(params)) {
      result[name] = {
        type: param.type,
        description: param.description,
        ...(param.enum && { enum: param.enum }),
        ...(param.default !== undefined && { default: param.default }),
      };
    }
    return result;
  }
}
