/**
 * AgentAPI tests
 */

import { AgentAPI } from '../../api/agent-api';

describe('AgentAPI', () => {
  let api: AgentAPI;

  beforeEach(() => {
    api = new AgentAPI({
      definitions: {
        registry: {
          local: { enabled: false, paths: [] },
          global: { enabled: false, path: '' },
          stockyard: { enabled: false },
        },
      },
    });
  });

  describe('hasAgent', () => {
    it('should return false for non-existent agent', async () => {
      const exists = await api.hasAgent('nonexistent-agent');
      expect(exists).toBe(false);
    });
  });

  describe('listAgents', () => {
    it('should return empty array when no agents available', async () => {
      const agents = await api.listAgents();
      expect(agents).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return unhealthy for non-existent agent', async () => {
      const health = await api.healthCheck('nonexistent-agent');

      expect(health.healthy).toBe(false);
      expect(health.agent).toBe('nonexistent-agent');
      expect(health.checks.definition.passed).toBe(false);
      expect(health.duration_ms).toBeGreaterThan(0);
    });
  });
});
