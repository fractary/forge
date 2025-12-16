/**
 * Markdown loader tests
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { MarkdownLoader } from '../../loaders/markdown-loader';
import { DefinitionErrorCode } from '../../errors';
import { ForgeError } from '../../../errors/forge-error';

const fixturesDir = path.join(__dirname, '../fixtures');
const tempDir = path.join(__dirname, '../temp');

describe('MarkdownLoader', () => {
  let loader: MarkdownLoader;

  beforeEach(async () => {
    loader = new MarkdownLoader();
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('loadAgent', () => {
    it('should parse YAML frontmatter and Markdown body', async () => {
      const agentContent = `---
name: test-agent
type: agent
version: "1.0.0"
description: Test agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
tools:
  - bash
  - skill
tags: []
---

# Test Agent

You are a test agent responsible for testing functionality.

## Responsibilities

- Test feature 1
- Test feature 2
`;

      const agentPath = path.join(tempDir, 'test-agent.md');
      await fs.writeFile(agentPath, agentContent);

      const agent = await loader.loadAgent(agentPath);

      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('agent');
      expect(agent.system_prompt).toContain('# Test Agent');
      expect(agent.system_prompt).toContain('## Responsibilities');
    });

    it('should throw EMPTY_SYSTEM_PROMPT for empty body', async () => {
      const agentContent = `---
name: empty-agent
type: agent
version: "1.0.0"
description: Agent with no body
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
tools: []
tags: []
---

`;

      const agentPath = path.join(tempDir, 'empty-agent.md');
      await fs.writeFile(agentPath, agentContent);

      await expect(loader.loadAgent(agentPath)).rejects.toThrow(ForgeError);
      await expect(loader.loadAgent(agentPath)).rejects.toMatchObject({
        code: 'EMPTY_SYSTEM_PROMPT',
      });
    });

    it('should throw AGENT_NOT_FOUND for missing file', async () => {
      const agentPath = path.join(tempDir, 'nonexistent.md');

      await expect(loader.loadAgent(agentPath)).rejects.toThrow(ForgeError);
      await expect(loader.loadAgent(agentPath)).rejects.toMatchObject({
        code: 'AGENT_NOT_FOUND',
      });
    });

    it('should use body content over frontmatter system_prompt', async () => {
      const agentContent = `---
name: duplicate-agent
type: agent
version: "1.0.0"
description: Agent with duplicate system_prompt
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
tools: []
tags: []
system_prompt: "This is in frontmatter"
---

Body content wins
`;

      const agentPath = path.join(tempDir, 'duplicate-agent.md');
      await fs.writeFile(agentPath, agentContent);

      const agent = await loader.loadAgent(agentPath);

      expect(agent.system_prompt).toBe('Body content wins');
      expect(agent.system_prompt).not.toContain('frontmatter');
    });
  });

  describe('loadTool', () => {
    it('should parse tool frontmatter and extended description', async () => {
      const toolContent = `---
name: test-tool
type: tool
version: "1.0.0"
description: Test tool
implementation:
  type: bash
  bash:
    command: echo test
parameters:
  input:
    type: string
    required: true
tags: []
---

# Test Tool

Extended description for the tool.

## Usage

Example usage here.
`;

      const toolPath = path.join(tempDir, 'test-tool.md');
      await fs.writeFile(toolPath, toolContent);

      const tool = await loader.loadTool(toolPath);

      expect(tool.name).toBe('test-tool');
      expect(tool.type).toBe('tool');
      expect(tool.extended_description).toContain('# Test Tool');
    });

    it('should throw TOOL_NOT_FOUND for missing file', async () => {
      const toolPath = path.join(tempDir, 'nonexistent.md');

      await expect(loader.loadTool(toolPath)).rejects.toThrow(ForgeError);
      await expect(loader.loadTool(toolPath)).rejects.toMatchObject({
        code: 'TOOL_NOT_FOUND',
      });
    });
  });

  describe('loadAgentFromString', () => {
    it('should load agent from Markdown string', () => {
      const mdContent = `---
name: string-agent
type: agent
version: "1.0.0"
description: Agent from string
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
tools: []
tags: []
---

# String Agent

System prompt from string.
`;

      const agent = loader.loadAgentFromString(mdContent);

      expect(agent.name).toBe('string-agent');
      expect(agent.system_prompt).toContain('# String Agent');
    });

    it('should throw EMPTY_SYSTEM_PROMPT for empty body in string', () => {
      const mdContent = `---
name: empty-string-agent
type: agent
version: "1.0.0"
description: Empty agent
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
tools: []
tags: []
---

`;

      expect(() => loader.loadAgentFromString(mdContent)).toThrow(ForgeError);
      expect(() => loader.loadAgentFromString(mdContent)).toThrow(/EMPTY_SYSTEM_PROMPT/);
    });
  });

  describe('loadToolFromString', () => {
    it('should load tool from Markdown string', () => {
      const mdContent = `---
name: string-tool
type: tool
version: "1.0.0"
description: Tool from string
implementation:
  type: bash
  bash:
    command: echo test
parameters: {}
tags: []
---

# String Tool

Tool description.
`;

      const tool = loader.loadToolFromString(mdContent);

      expect(tool.name).toBe('string-tool');
      expect(tool.extended_description).toContain('# String Tool');
    });
  });
});
