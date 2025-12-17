# Contributing to @fractary/forge-mcp

Thank you for your interest in contributing to the Fractary Forge MCP server!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/fractary/forge.git
cd forge/mcp/server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run in development mode:
```bash
npm run dev
```

## Project Structure

```
mcp/server/
├── src/
│   ├── tools/          # Tool implementations (agent, tool, plugin, config, cache, fork)
│   ├── server.ts       # MCP server core
│   ├── types.ts        # Shared type definitions
│   └── index.ts        # Main entry point
├── bin/
│   └── fractary-forge-mcp.js  # Executable
├── dist/               # Compiled output
└── tests/              # Test files
```

## Adding New Tools

To add a new tool to the MCP server:

1. **Define the tool in the appropriate category file** (`src/tools/{category}.ts`):

```typescript
const myToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

export const myTool: ToolDefinition = {
  name: 'fractary_forge_category_action',
  description: 'Description of what the tool does',
  inputSchema: myToolSchema,
  handler: async (args) => {
    try {
      // Implement tool logic
      const result = await someSDKFunction(args.param1 as string);
      return formatSuccess(result);
    } catch (error) {
      return formatError(error);
    }
  },
};
```

2. **Add to exports**:
```typescript
export const categoryTools: ToolDefinition[] = [..., myTool];
```

3. **Follow naming conventions**:
   - Tool names: `fractary_forge_{category}_{action}`
   - Use snake_case for tool names
   - Use clear, descriptive action verbs

4. **Add proper types**:
   - Cast args to proper types (e.g., `args.param as string`)
   - Use Zod schemas for validation
   - Define interfaces for complex return types

5. **Write tests** for the new tool.

## Code Style

- Use TypeScript strict mode
- Follow existing code formatting (Prettier)
- Add JSDoc comments for exported functions
- Use meaningful variable names
- Keep functions focused and single-purpose

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Type Checking

```bash
npm run typecheck
```

## Linting

```bash
npm run lint
npm run lint:fix
```

## Building

```bash
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request with:
   - Clear description of changes
   - Link to related issue
   - Test results

## Architecture Guidelines

### Read-Focused Operations Only

The MCP server is designed for **read-only operations**. Do not add tools that:
- Modify files or directories
- Install or uninstall components
- Create or delete assets
- Mutate configuration

These operations belong in the CLI.

### Stateless Design

Tools should:
- Not maintain state between calls
- Not require project context
- Work from any directory
- Use SDK APIs for all data access

### Error Handling

Always use `formatError()` for errors:
```typescript
try {
  // Tool logic
} catch (error) {
  return formatError(error);
}
```

### Response Formatting

Use `formatSuccess()` for successful responses:
```typescript
return formatSuccess({
  data: result,
  count: items.length,
});
```

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

Thank you for contributing!
