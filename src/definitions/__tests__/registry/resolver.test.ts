/**
 * Registry resolver tests with semver scenarios
 */

import { DefinitionResolver } from '../../registry/resolver';
import type { RegistryConfig } from '../../registry/types';

describe('DefinitionResolver', () => {
  describe('parseName', () => {
    it('should parse name without version as latest', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('latest');
    });

    it('should parse name with exact version', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@1.0.0');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('1.0.0');
    });

    it('should parse name with caret range', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@^1.0.0');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('^1.0.0');
    });

    it('should parse name with tilde range', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@~1.2.3');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('~1.2.3');
    });

    it('should parse name with greater than range', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@>=1.0.0');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('>=1.0.0');
    });

    it('should parse name with x-range', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@1.x');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('1.x');
    });

    it('should parse name with complex OR range', () => {
      const resolver = new DefinitionResolver();
      const parsed = (resolver as any).parseName('agent-name@>=1.0.0 <2.0.0 || >=3.0.0');

      expect(parsed.name).toBe('agent-name');
      expect(parsed.versionRange).toBe('>=1.0.0 <2.0.0 || >=3.0.0');
    });
  });

  describe('findBestVersion', () => {
    it('should find latest when version is "latest"', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0', '1.1.0', '2.0.0'];
      const best = (resolver as any).findBestVersion(available, 'latest');

      expect(best).toBe('2.0.0');
    });

    it('should find exact version match', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0', '1.1.0', '2.0.0'];
      const best = (resolver as any).findBestVersion(available, '1.1.0');

      expect(best).toBe('1.1.0');
    });

    it('should find best match for caret range ^1.0.0', () => {
      const resolver = new DefinitionResolver();
      const available = ['0.9.0', '1.0.0', '1.5.0', '1.9.9', '2.0.0'];
      const best = (resolver as any).findBestVersion(available, '^1.0.0');

      expect(best).toBe('1.9.9');
    });

    it('should find best match for tilde range ~1.2.3', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.2.0', '1.2.3', '1.2.5', '1.3.0', '2.0.0'];
      const best = (resolver as any).findBestVersion(available, '~1.2.3');

      expect(best).toBe('1.2.5');
    });

    it('should find best match for >= range', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0', '1.5.0', '2.0.0', '3.0.0'];
      const best = (resolver as any).findBestVersion(available, '>=1.5.0');

      expect(best).toBe('3.0.0');
    });

    it('should find best match for x-range 1.x', () => {
      const resolver = new DefinitionResolver();
      const available = ['0.9.0', '1.0.0', '1.5.0', '1.9.9', '2.0.0'];
      const best = (resolver as any).findBestVersion(available, '1.x');

      expect(best).toBe('1.9.9');
    });

    it('should find best match for complex OR range', () => {
      const resolver = new DefinitionResolver();
      const available = ['0.9.0', '1.5.0', '2.5.0', '3.0.0', '3.5.0'];
      const best = (resolver as any).findBestVersion(available, '>=1.0.0 <2.0.0 || >=3.0.0');

      expect(best).toBe('3.5.0');
    });

    it('should return null when no version satisfies range', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0', '1.1.0'];
      const best = (resolver as any).findBestVersion(available, '^2.0.0');

      expect(best).toBeNull();
    });

    it('should handle prerelease versions', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0-alpha.1', '1.0.0-beta.1', '1.0.0', '1.1.0'];
      const best = (resolver as any).findBestVersion(available, '^1.0.0');

      expect(best).toBe('1.1.0');
    });

    it('should handle build metadata', () => {
      const resolver = new DefinitionResolver();
      const available = ['1.0.0+build.1', '1.0.0+build.2', '1.1.0'];
      const best = (resolver as any).findBestVersion(available, '^1.0.0');

      expect(best).toBe('1.1.0');
    });
  });

  describe('cache behavior', () => {
    it('should use cache on second resolve', async () => {
      const config: Partial<RegistryConfig> = {
        local: { enabled: false, paths: [] },
        global: { enabled: false, path: '' },
        stockyard: { enabled: false },
      };

      const resolver = new DefinitionResolver(config);

      // First call should miss cache
      const stats1 = resolver.getCacheStats();
      expect(stats1.agents.count).toBe(0);

      // After clearing cache
      resolver.clearCache();
      const stats2 = resolver.getCacheStats();
      expect(stats2.agents.count).toBe(0);
      expect(stats2.tools.count).toBe(0);
    });

    it('should clear cache successfully', () => {
      const resolver = new DefinitionResolver();

      resolver.clearCache();
      const stats = resolver.getCacheStats();

      expect(stats.agents.count).toBe(0);
      expect(stats.tools.count).toBe(0);
    });
  });
});
