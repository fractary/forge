/**
 * Tests for integrity calculation
 */

import { calculateIntegrity, verifyIntegrity } from '../integrity';
import type { AgentDefinition } from '../../../schemas';

describe('Integrity', () => {
  describe('calculateIntegrity', () => {
    it('should calculate SHA-256 hash for agent definition', async () => {
      const definition: AgentDefinition = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'You are a test agent',
        tools: ['tool1', 'tool2'],
        version: '1.0.0',
        tags: ['test'],
      };

      const integrity = await calculateIntegrity(definition);

      expect(integrity).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should produce same hash for same definition regardless of key order', async () => {
      const definition1: AgentDefinition = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: [],
        version: '1.0.0',
        tags: [],
      };

      const definition2: AgentDefinition = {
        version: '1.0.0',
        tags: [],
        tools: [],
        system_prompt: 'Test',
        type: 'agent',
        name: 'test-agent',
        llm: {
          model: 'claude-sonnet-4-20250514',
          provider: 'anthropic',
        },
        description: 'Test agent',
      };

      const hash1 = await calculateIntegrity(definition1);
      const hash2 = await calculateIntegrity(definition2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different definitions', async () => {
      const definition1: AgentDefinition = {
        name: 'test-agent-1',
        type: 'agent',
        description: 'Test agent 1',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: [],
        version: '1.0.0',
        tags: [],
      };

      const definition2: AgentDefinition = {
        name: 'test-agent-2',
        type: 'agent',
        description: 'Test agent 2',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: [],
        version: '1.0.0',
        tags: [],
      };

      const hash1 = await calculateIntegrity(definition1);
      const hash2 = await calculateIntegrity(definition2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyIntegrity', () => {
    it('should return true for matching integrity', async () => {
      const definition: AgentDefinition = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: [],
        version: '1.0.0',
        tags: [],
      };

      const integrity = await calculateIntegrity(definition);
      const valid = await verifyIntegrity(definition, integrity);

      expect(valid).toBe(true);
    });

    it('should return false for mismatched integrity', async () => {
      const definition: AgentDefinition = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: [],
        version: '1.0.0',
        tags: [],
      };

      const fakeIntegrity = 'sha256-0000000000000000000000000000000000000000000000000000000000000000';
      const valid = await verifyIntegrity(definition, fakeIntegrity);

      expect(valid).toBe(false);
    });
  });
});
