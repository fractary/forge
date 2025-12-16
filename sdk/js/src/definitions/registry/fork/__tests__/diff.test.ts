/**
 * Tests for diff utilities
 */

import { diff, getAllPaths, getValueAtPath, setValueAtPath } from '../diff';

describe('diff', () => {
  it('should detect added keys', () => {
    const base = { a: 1, b: 2 };
    const current = { a: 1, b: 2, c: 3 };

    const result = diff(base, current);

    expect(result.added).toEqual(['c']);
    expect(result.removed).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.unchanged).toEqual(['a', 'b']);
  });

  it('should detect removed keys', () => {
    const base = { a: 1, b: 2, c: 3 };
    const current = { a: 1, b: 2 };

    const result = diff(base, current);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['c']);
    expect(result.modified).toEqual([]);
    expect(result.unchanged).toEqual(['a', 'b']);
  });

  it('should detect modified keys', () => {
    const base = { a: 1, b: 2 };
    const current = { a: 1, b: 3 };

    const result = diff(base, current);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.modified).toEqual(['b']);
    expect(result.unchanged).toEqual(['a']);
  });

  it('should handle nested objects', () => {
    const base = { config: { timeout: 1000 } };
    const current = { config: { timeout: 2000 } };

    const result = diff(base, current);

    expect(result.modified).toEqual(['config']);
  });

  it('should handle arrays', () => {
    const base = { tags: ['a', 'b'] };
    const current = { tags: ['a', 'b', 'c'] };

    const result = diff(base, current);

    expect(result.modified).toEqual(['tags']);
  });

  it('should handle null and undefined', () => {
    const base = { a: null, b: undefined };
    const current = { a: null, b: undefined };

    const result = diff(base, current);

    expect(result.unchanged).toContain('a');
    expect(result.unchanged).toContain('b');
  });

  it('should handle empty objects', () => {
    const base = {};
    const current = {};

    const result = diff(base, current);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('should handle complex changes', () => {
    const base = {
      name: 'test',
      version: '1.0.0',
      config: { timeout: 1000, retries: 3 },
      tags: ['a', 'b'],
    };

    const current = {
      name: 'test',
      version: '2.0.0',
      config: { timeout: 2000, retries: 3 },
      tags: ['a', 'b', 'c'],
      newField: 'added',
    };

    const result = diff(base, current);

    expect(result.added).toEqual(['newField']);
    expect(result.removed).toEqual([]);
    expect(result.modified).toEqual(['version', 'config', 'tags']);
    expect(result.unchanged).toEqual(['name']);
  });
});

describe('getAllPaths', () => {
  it('should get all paths from simple object', () => {
    const obj = { a: 1, b: 2, c: 3 };

    const paths = getAllPaths(obj);

    expect(paths).toContain('a');
    expect(paths).toContain('b');
    expect(paths).toContain('c');
  });

  it('should get nested paths', () => {
    const obj = {
      config: {
        timeout: 1000,
        retries: 3,
      },
    };

    const paths = getAllPaths(obj);

    expect(paths).toContain('config.timeout');
    expect(paths).toContain('config.retries');
  });

  it('should handle arrays', () => {
    const obj = { tags: ['a', 'b', 'c'] };

    const paths = getAllPaths(obj);

    expect(paths).toContain('tags[0]');
    expect(paths).toContain('tags[1]');
    expect(paths).toContain('tags[2]');
  });

  it('should handle deeply nested structures', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };

    const paths = getAllPaths(obj);

    expect(paths).toContain('level1.level2.level3.value');
  });

  it('should handle mixed nesting', () => {
    const obj = {
      config: {
        servers: [
          { host: 'server1', port: 8080 },
          { host: 'server2', port: 8081 },
        ],
      },
    };

    const paths = getAllPaths(obj);

    expect(paths).toContain('config.servers[0].host');
    expect(paths).toContain('config.servers[0].port');
    expect(paths).toContain('config.servers[1].host');
    expect(paths).toContain('config.servers[1].port');
  });

  it('should handle null and undefined', () => {
    const obj = { a: null, b: undefined };

    const paths = getAllPaths(obj);

    expect(paths).toContain('a');
    expect(paths).toContain('b');
  });
});

describe('getValueAtPath', () => {
  it('should get simple value', () => {
    const obj = { name: 'test' };

    const value = getValueAtPath(obj, 'name');

    expect(value).toBe('test');
  });

  it('should get nested value', () => {
    const obj = { config: { timeout: 1000 } };

    const value = getValueAtPath(obj, 'config.timeout');

    expect(value).toBe(1000);
  });

  it('should return undefined for missing path', () => {
    const obj = { name: 'test' };

    const value = getValueAtPath(obj, 'missing');

    expect(value).toBeUndefined();
  });

  it('should return undefined for partial missing path', () => {
    const obj = { config: { timeout: 1000 } };

    const value = getValueAtPath(obj, 'config.missing.value');

    expect(value).toBeUndefined();
  });

  it('should handle deeply nested paths', () => {
    const obj = {
      a: {
        b: {
          c: {
            d: 'deep value',
          },
        },
      },
    };

    const value = getValueAtPath(obj, 'a.b.c.d');

    expect(value).toBe('deep value');
  });
});

describe('setValueAtPath', () => {
  it('should set simple value', () => {
    const obj: any = {};

    setValueAtPath(obj, 'name', 'test');

    expect(obj.name).toBe('test');
  });

  it('should set nested value', () => {
    const obj: any = {};

    setValueAtPath(obj, 'config.timeout', 1000);

    expect(obj.config.timeout).toBe(1000);
  });

  it('should overwrite existing value', () => {
    const obj: any = { name: 'old' };

    setValueAtPath(obj, 'name', 'new');

    expect(obj.name).toBe('new');
  });

  it('should create intermediate objects', () => {
    const obj: any = {};

    setValueAtPath(obj, 'a.b.c.d', 'deep');

    expect(obj.a.b.c.d).toBe('deep');
  });

  it('should handle overwriting nested values', () => {
    const obj: any = { config: { timeout: 1000 } };

    setValueAtPath(obj, 'config.timeout', 2000);

    expect(obj.config.timeout).toBe(2000);
  });

  it('should preserve other fields when setting nested', () => {
    const obj: any = { config: { timeout: 1000, retries: 3 } };

    setValueAtPath(obj, 'config.timeout', 2000);

    expect(obj.config.timeout).toBe(2000);
    expect(obj.config.retries).toBe(3);
  });
});
