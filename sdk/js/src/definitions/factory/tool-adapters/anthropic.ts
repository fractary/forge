/**
 * Anthropic tool adapter
 */

import type { ToolDefinition, ToolParameter } from '../../schemas';
import type { IToolAdapter } from './types';

export class AnthropicToolAdapter implements IToolAdapter {
  provider = 'anthropic';

  adaptTool(tool: ToolDefinition): any {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: this.convertParameters(tool.parameters),
        required: Object.entries(tool.parameters)
          .filter(([_, p]) => p.required)
          .map(([name]) => name),
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
