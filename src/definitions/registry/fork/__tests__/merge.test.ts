/**
 * Tests for three-way merge
 */

import { performMerge, resolveConflicts } from '../merge';

// Mock logger
jest.mock('@/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('performMerge', () => {
  it('should handle no changes (all same)', async () => {
    const base = { name: 'test', version: '1.0.0', description: 'Test' };
    const local = { name: 'test', version: '1.0.0', description: 'Test' };
    const upstream = { name: 'test', version: '1.0.0', description: 'Test' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged).toEqual(local);
  });

  it('should auto-merge when only upstream changed', async () => {
    const base = { name: 'test', version: '1.0.0', description: 'Original' };
    const local = { name: 'test', version: '1.0.0', description: 'Original' };
    const upstream = { name: 'test', version: '1.0.0', description: 'Updated by upstream' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged.description).toBe('Updated by upstream');
  });

  it('should keep local changes when only local changed', async () => {
    const base = { name: 'test', version: '1.0.0', description: 'Original' };
    const local = { name: 'test', version: '1.0.0', description: 'Updated locally' };
    const upstream = { name: 'test', version: '1.0.0', description: 'Original' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged.description).toBe('Updated locally');
  });

  it('should auto-merge when both changed to same value', async () => {
    const base = { name: 'test', version: '1.0.0', description: 'Original' };
    const local = { name: 'test', version: '1.0.0', description: 'Same update' };
    const upstream = { name: 'test', version: '1.0.0', description: 'Same update' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged.description).toBe('Same update');
  });

  it('should detect conflict when both changed differently', async () => {
    const base = { name: 'test', version: '1.0.0', description: 'Original' };
    const local = { name: 'test', version: '1.0.0', description: 'Local update' };
    const upstream = { name: 'test', version: '1.0.0', description: 'Upstream update' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      path: 'description',
      base: 'Original',
      local: 'Local update',
      upstream: 'Upstream update',
    });
  });

  it('should handle added fields', async () => {
    const base = { name: 'test', version: '1.0.0' };
    const local = { name: 'test', version: '1.0.0' };
    const upstream = { name: 'test', version: '1.0.0', newField: 'added' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.merged.newField).toBe('added');
  });

  it('should handle removed fields', async () => {
    const base = { name: 'test', version: '1.0.0', oldField: 'removed' };
    const local = { name: 'test', version: '1.0.0', oldField: 'removed' };
    const upstream = { name: 'test', version: '1.0.0' };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.merged.oldField).toBeUndefined();
  });

  it('should handle nested object changes', async () => {
    const base = {
      name: 'test',
      config: { timeout: 1000, retries: 3 },
    };
    const local = {
      name: 'test',
      config: { timeout: 2000, retries: 3 },
    };
    const upstream = {
      name: 'test',
      config: { timeout: 1000, retries: 5 },
    };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.merged.config.timeout).toBe(2000); // local change
    expect(result.merged.config.retries).toBe(5); // upstream change
  });

  it('should handle array changes', async () => {
    const base = { name: 'test', tags: ['a', 'b'] };
    const local = { name: 'test', tags: ['a', 'b', 'c'] };
    const upstream = { name: 'test', tags: ['a', 'b'] };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(true);
    expect(result.merged.tags).toEqual(['a', 'b', 'c']);
  });

  it('should detect conflict in array element changes', async () => {
    const base = { name: 'test', tags: ['a', 'b'] };
    const local = { name: 'test', tags: ['a', 'b', 'c'] };
    const upstream = { name: 'test', tags: ['a', 'b', 'd'] };

    const result = await performMerge({ base, local, upstream });

    // Array element changes are detected at the individual element level
    // tags[2] was added by both with different values, causing a conflict
    expect(result.success).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].path).toContain('[2]');
  });

  it('should handle multiple conflicts', async () => {
    const base = {
      name: 'test',
      description: 'Original',
      version: '1.0.0',
      timeout: 1000,
    };
    const local = {
      name: 'test',
      description: 'Local update',
      version: '1.0.0',
      timeout: 2000,
    };
    const upstream = {
      name: 'test',
      description: 'Upstream update',
      version: '1.0.0',
      timeout: 3000,
    };

    const result = await performMerge({ base, local, upstream });

    expect(result.success).toBe(false);
    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts.map(c => c.path)).toContain('description');
    expect(result.conflicts.map(c => c.path)).toContain('timeout');
  });
});

describe('resolveConflicts', () => {
  it('should resolve conflicts with local strategy', () => {
    const mergeResult = {
      success: false,
      conflicts: [
        {
          path: 'description',
          base: 'Original',
          local: 'Local update',
          upstream: 'Upstream update',
        },
      ],
      merged: { name: 'test', description: 'Local update' },
    };

    const resolved = resolveConflicts(mergeResult, 'local');

    expect(resolved.success).toBe(true);
    expect(resolved.merged.description).toBe('Local update');
    expect(resolved.conflicts[0].resolved).toBe('Local update');
  });

  it('should resolve conflicts with upstream strategy', () => {
    const mergeResult = {
      success: false,
      conflicts: [
        {
          path: 'description',
          base: 'Original',
          local: 'Local update',
          upstream: 'Upstream update',
        },
      ],
      merged: { name: 'test', description: 'Local update' },
    };

    const resolved = resolveConflicts(mergeResult, 'upstream');

    expect(resolved.success).toBe(true);
    expect(resolved.merged.description).toBe('Upstream update');
    expect(resolved.conflicts[0].resolved).toBe('Upstream update');
  });

  it('should return original result for manual strategy', () => {
    const mergeResult = {
      success: false,
      conflicts: [
        {
          path: 'description',
          base: 'Original',
          local: 'Local update',
          upstream: 'Upstream update',
        },
      ],
      merged: { name: 'test', description: 'Local update' },
    };

    const resolved = resolveConflicts(mergeResult, 'manual');

    expect(resolved).toBe(mergeResult);
    expect(resolved.success).toBe(false);
  });

  it('should resolve multiple conflicts', () => {
    const mergeResult = {
      success: false,
      conflicts: [
        {
          path: 'description',
          base: 'Original',
          local: 'Local desc',
          upstream: 'Upstream desc',
        },
        {
          path: 'timeout',
          base: 1000,
          local: 2000,
          upstream: 3000,
        },
      ],
      merged: { name: 'test', description: 'Local desc', timeout: 2000 },
    };

    const resolved = resolveConflicts(mergeResult, 'upstream');

    expect(resolved.success).toBe(true);
    expect(resolved.merged.description).toBe('Upstream desc');
    expect(resolved.merged.timeout).toBe(3000);
  });
});
