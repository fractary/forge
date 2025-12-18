/**
 * Tests for LockfileManager
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { LockfileManager } from '../lockfile-manager';
import { DefinitionResolver } from '../../resolver';
import type { Lockfile, LockfileValidationResult } from '../types';
import type { AgentDefinition, ToolDefinition } from '../../../schemas';
import { discoverUsedAgents, discoverUsedTools } from '../discovery';
import { calculateIntegrity, verifyIntegrity } from '../integrity';

// Mock dependencies
jest.mock('@/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock('../discovery');
jest.mock('../integrity');

const mockDiscoverUsedAgents = discoverUsedAgents as jest.MockedFunction<typeof discoverUsedAgents>;
const mockDiscoverUsedTools = discoverUsedTools as jest.MockedFunction<typeof discoverUsedTools>;
const mockCalculateIntegrity = calculateIntegrity as jest.MockedFunction<typeof calculateIntegrity>;
const mockVerifyIntegrity = verifyIntegrity as jest.MockedFunction<typeof verifyIntegrity>;

describe('LockfileManager', () => {
  let manager: LockfileManager;
  let mockResolver: jest.Mocked<DefinitionResolver>;
  let testDir: string;
  let lockfilePath: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(__dirname, '.test-temp', `test-${Date.now()}`);
    await fs.ensureDir(testDir);
    lockfilePath = path.join(testDir, '.fractary/plugins/forge/lockfile.json');

    // Mock resolver
    mockResolver = {
      agentResolve: jest.fn(),
      toolResolve: jest.fn(),
    } as any;

    manager = new LockfileManager(mockResolver, testDir);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
  });

  describe('generate', () => {
    it('should generate lockfile with agents and tools', async () => {
      // Mock discovery
      mockDiscoverUsedAgents.mockResolvedValue(['test-agent']);
      mockDiscoverUsedTools.mockResolvedValue(['test-tool']);

      // Mock resolver
      const agentDef: AgentDefinition = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
        system_prompt: 'Test',
        tools: ['test-tool'],
        version: '1.0.0',
        tags: [],
      };

      const toolDef: ToolDefinition = {
        name: 'test-tool',
        type: 'tool',
        description: 'Test tool',
        version: '1.0.0',
        tags: [],
        parameters: {},
        implementation: {
          type: 'bash',
          bash: {
            command: 'echo "test"',
          },
        },
      };

      mockResolver.agentResolve.mockResolvedValue({
        definition: agentDef,
        version: '1.0.0',
        source: 'local' as const,
        path: '/test/path/agent.yaml',
      });

      mockResolver.toolResolve.mockResolvedValue({
        definition: toolDef,
        version: '1.0.0',
        source: 'local' as const,
        path: '/test/path/tool.yaml',
      });

      // Mock integrity
      mockCalculateIntegrity
        .mockResolvedValueOnce('sha256-agent123')
        .mockResolvedValueOnce('sha256-tool123');

      const lockfile = await manager.generate();

      expect(lockfile.version).toBe(1);
      expect(lockfile.agents['test-agent']).toEqual({
        version: '1.0.0',
        resolved: 'local',
        integrity: 'sha256-agent123',
        dependencies: {
          tools: {
            'test-tool': '1.0.0',
          },
        },
      });
      expect(lockfile.tools['test-tool']).toEqual({
        version: '1.0.0',
        resolved: 'local',
        integrity: 'sha256-tool123',
      });
    });

    it('should not regenerate if lockfile exists without force', async () => {
      // Create existing lockfile
      const existingLockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {},
        tools: {},
      };

      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, JSON.stringify(existingLockfile), 'utf-8');

      const lockfile = await manager.generate({ force: false });

      expect(lockfile).toEqual(existingLockfile);
      expect(mockDiscoverUsedAgents).not.toHaveBeenCalled();
    });

    it('should regenerate if lockfile exists with force', async () => {
      // Create existing lockfile
      const existingLockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {},
        tools: {},
      };

      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, JSON.stringify(existingLockfile), 'utf-8');

      mockDiscoverUsedAgents.mockResolvedValue([]);
      mockDiscoverUsedTools.mockResolvedValue([]);

      const lockfile = await manager.generate({ force: true });

      expect(lockfile.generated).not.toBe(existingLockfile.generated);
      expect(mockDiscoverUsedAgents).toHaveBeenCalled();
    });

    it('should handle agent resolution failure', async () => {
      mockDiscoverUsedAgents.mockResolvedValue(['missing-agent']);
      mockDiscoverUsedTools.mockResolvedValue([]);

      mockResolver.agentResolve.mockRejectedValue(new Error('Agent not found'));

      await expect(manager.generate()).rejects.toThrow('Agent not found');
    });
  });

  describe('load', () => {
    it('should load existing lockfile', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'local',
            integrity: 'sha256-123',
          },
        },
        tools: {},
      };

      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, JSON.stringify(lockfile), 'utf-8');

      const loaded = await manager.load();

      expect(loaded).toEqual(lockfile);
    });

    it('should throw error if lockfile does not exist', async () => {
      await expect(manager.load()).rejects.toThrow(/Lockfile not found/);
    });

    it('should throw error for invalid JSON', async () => {
      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, 'invalid json', 'utf-8');

      await expect(manager.load()).rejects.toThrow(/Failed to parse lockfile/);
    });

    it('should throw error for unsupported version', async () => {
      const lockfile = {
        version: 999,
        generated: new Date().toISOString(),
        agents: {},
        tools: {},
      };

      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, JSON.stringify(lockfile), 'utf-8');

      await expect(manager.load()).rejects.toThrow(/Unsupported lockfile version/);
    });
  });

  describe('save', () => {
    it('should save lockfile to disk', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {},
        tools: {},
      };

      await manager.save(lockfile);

      const saved = JSON.parse(await fs.readFile(lockfilePath, 'utf-8'));
      expect(saved).toEqual(lockfile);
    });

    it('should create directory if it does not exist', async () => {
      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {},
        tools: {},
      };

      await manager.save(lockfile);

      expect(await fs.pathExists(path.dirname(lockfilePath))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate lockfile with matching integrity', async () => {
      const agentDef: AgentDefinition = {
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

      mockResolver.agentResolve.mockResolvedValue({
        definition: agentDef,
        version: '1.0.0',
        source: 'local',
        path: '/test/path/agent.yaml',
      });

      mockCalculateIntegrity.mockResolvedValue('sha256-123');

      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'local',
            integrity: 'sha256-123',
          },
        },
        tools: {},
      };

      const result = await manager.validate(lockfile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect integrity mismatch', async () => {
      const agentDef: AgentDefinition = {
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

      mockResolver.agentResolve.mockResolvedValue({
        definition: agentDef,
        version: '1.0.0',
        source: 'local',
        path: '/test/path/agent.yaml',
      });

      mockCalculateIntegrity.mockResolvedValue('sha256-different');

      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {
          'test-agent': {
            version: '1.0.0',
            resolved: 'local',
            integrity: 'sha256-123',
          },
        },
        tools: {},
      };

      const result = await manager.validate(lockfile);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'integrity_mismatch',
        name: 'test-agent',
        expected: 'sha256-123',
        actual: 'sha256-different',
      });
    });

    it('should detect missing definitions', async () => {
      mockResolver.agentResolve.mockRejectedValue(new Error('Agent not found'));

      const lockfile: Lockfile = {
        version: 1,
        generated: new Date().toISOString(),
        agents: {
          'missing-agent': {
            version: '1.0.0',
            resolved: 'local',
            integrity: 'sha256-123',
          },
        },
        tools: {},
      };

      const result = await manager.validate(lockfile);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'missing',
        name: 'missing-agent',
      });
    });
  });

  describe('exists', () => {
    it('should return true if lockfile exists', async () => {
      await fs.ensureDir(path.dirname(lockfilePath));
      await fs.writeFile(lockfilePath, '{}', 'utf-8');

      expect(await manager.exists()).toBe(true);
    });

    it('should return false if lockfile does not exist', async () => {
      expect(await manager.exists()).toBe(false);
    });
  });

  describe('getPath', () => {
    it('should return lockfile path', () => {
      expect(manager.getPath()).toBe(lockfilePath);
    });
  });
});
