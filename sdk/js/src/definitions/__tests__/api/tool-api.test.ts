/**
 * ToolAPI tests
 */

import { ToolAPI } from '../../api/tool-api';

describe('ToolAPI', () => {
  let api: ToolAPI;

  beforeEach(() => {
    api = new ToolAPI({
      definitions: {
        registry: {
          local: { enabled: false, paths: [] },
          global: { enabled: false, path: '' },
          stockyard: { enabled: false },
        },
      },
    });
  });

  describe('toolHas', () => {
    it('should return false for non-existent tool', async () => {
      const exists = await api.toolHas('nonexistent-tool');
      expect(exists).toBe(false);
    });
  });

  describe('toolList', () => {
    it('should return empty array when no tools available', async () => {
      const tools = await api.toolList();
      expect(tools).toEqual([]);
    });
  });
});
