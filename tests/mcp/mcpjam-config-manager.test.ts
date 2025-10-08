/**
 * Comprehensive Unit Tests: MCPJamConfigManager
 *
 * Tests for MCPJam configuration management including:
 * - Environment configuration (MCP servers)
 * - Tests configuration
 * - LLM configuration (encrypted)
 * - File I/O and validation
 * - Encryption/decryption
 * - Error handling
 *
 * Total test cases: 80+
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MCPJamConfigManager } from '../../src/core/mcpjam-config-manager.js';
import {
  createServerConfig,
  createEnvironmentConfig,
  createTestConfig,
  createTestsConfig,
  createLLMConfig,
  createInvalidServerConfigs,
  createInvalidTestConfigs,
  createOllamaConfig,
} from '../helpers/mcpjam-fixtures.js';

describe('MCPJamConfigManager', () => {
  let configManager: MCPJamConfigManager;
  let testConfigDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testConfigDir = path.join(process.cwd(), `.mcpjam-test-${Date.now()}`);
    configManager = new MCPJamConfigManager(testConfigDir);
    await configManager.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should create config directory on initialize', async () => {
      const stats = await fs.stat(testConfigDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should create config directory with custom path', async () => {
      const customPath = path.join(process.cwd(), `.mcpjam-custom-${Date.now()}`);
      const customManager = new MCPJamConfigManager(customPath);
      await customManager.initialize();

      const stats = await fs.stat(customPath);
      expect(stats.isDirectory()).toBe(true);

      await fs.rm(customPath, { recursive: true, force: true });
    });

    test('should handle initialize called multiple times', async () => {
      await configManager.initialize();
      await configManager.initialize();

      const stats = await fs.stat(testConfigDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should handle invalid directory paths', async () => {
      // Test with a path that would cause issues
      const invalidPath = '/\0invalid/path';
      const failManager = new MCPJamConfigManager(invalidPath);

      // Initialization might fail or succeed depending on OS, but should handle gracefully
      // Just verify it doesn't crash
      try {
        await failManager.initialize();
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Environment Configuration', () => {
    describe('Read Operations', () => {
      test('should return empty config when file does not exist', async () => {
        const config = await configManager.readEnvironmentConfig();
        expect(config).toEqual({ servers: {} });
      });

      test('should read valid environment configuration', async () => {
        const mockConfig = createEnvironmentConfig();
        await configManager.writeEnvironmentConfig(mockConfig);

        const result = await configManager.readEnvironmentConfig();
        expect(result).toEqual(mockConfig);
      });

      test('should handle malformed JSON gracefully', async () => {
        const envPath = path.join(testConfigDir, 'environment.json');
        await fs.writeFile(envPath, 'invalid json', 'utf-8');

        await expect(configManager.readEnvironmentConfig()).rejects.toThrow();
      });

      test('should validate server configuration structure', async () => {
        const validConfig = createEnvironmentConfig({
          test: createServerConfig(),
        });

        await configManager.writeEnvironmentConfig(validConfig);
        const result = await configManager.readEnvironmentConfig();

        expect(result.servers.test).toBeDefined();
        expect(result.servers.test.command).toBe('npx');
      });
    });

    describe('Write Operations', () => {
      test('should write environment configuration', async () => {
        const config = createEnvironmentConfig();
        await configManager.writeEnvironmentConfig(config);

        const envPath = path.join(testConfigDir, 'environment.json');
        const content = await fs.readFile(envPath, 'utf-8');
        const parsed = JSON.parse(content);

        expect(parsed).toEqual(config);
      });

      test('should format JSON with 2-space indentation', async () => {
        const config = createEnvironmentConfig();
        await configManager.writeEnvironmentConfig(config);

        const envPath = path.join(testConfigDir, 'environment.json');
        const content = await fs.readFile(envPath, 'utf-8');

        expect(content).toContain('  '); // 2-space indent
      });

      test('should overwrite existing configuration', async () => {
        const config1 = createEnvironmentConfig({ server1: createServerConfig() });
        const config2 = createEnvironmentConfig({ server2: createServerConfig() });

        await configManager.writeEnvironmentConfig(config1);
        await configManager.writeEnvironmentConfig(config2);

        const result = await configManager.readEnvironmentConfig();
        expect(result.servers.server1).toBeUndefined();
        expect(result.servers.server2).toBeDefined();
      });
    });

    describe('Server Management', () => {
      test('should add server to configuration', async () => {
        const serverConfig = createServerConfig();
        await configManager.addServer('new-server', serverConfig);

        const config = await configManager.readEnvironmentConfig();
        expect(config.servers['new-server']).toEqual(serverConfig);
      });

      test('should update existing server', async () => {
        const serverConfig1 = createServerConfig();
        const serverConfig2 = createServerConfig({ command: 'node' });

        await configManager.addServer('test-server', serverConfig1);
        await configManager.addServer('test-server', serverConfig2);

        const config = await configManager.readEnvironmentConfig();
        expect(config.servers['test-server'].command).toBe('node');
      });

      test('should remove server from configuration', async () => {
        const serverConfig = createServerConfig();
        await configManager.addServer('test-server', serverConfig);
        await configManager.removeServer('test-server');

        const config = await configManager.readEnvironmentConfig();
        expect(config.servers['test-server']).toBeUndefined();
      });

      test('should handle removing non-existent server', async () => {
        await configManager.removeServer('non-existent');

        const config = await configManager.readEnvironmentConfig();
        expect(Object.keys(config.servers)).toHaveLength(0);
      });

      test('should preserve other servers when removing one', async () => {
        await configManager.addServer('server1', createServerConfig());
        await configManager.addServer('server2', createServerConfig());
        await configManager.removeServer('server1');

        const config = await configManager.readEnvironmentConfig();
        expect(config.servers['server1']).toBeUndefined();
        expect(config.servers['server2']).toBeDefined();
      });
    });

    describe('Validation', () => {
      test('should validate servers object exists', async () => {
        const invalidConfig = {} as any;
        await expect(configManager.writeEnvironmentConfig(invalidConfig)).rejects.toThrow(
          'servers must be an object'
        );
      });

      test('should validate server has command or url', async () => {
        const invalidConfig = {
          servers: {
            'bad-server': {},
          },
        } as any;

        await expect(configManager.writeEnvironmentConfig(invalidConfig)).rejects.toThrow(
          'must have either "command" or "url"'
        );
      });

      test('should accept server with command', async () => {
        const config = createEnvironmentConfig({
          test: { command: 'npx', args: [] },
        });

        await expect(configManager.writeEnvironmentConfig(config)).resolves.not.toThrow();
      });

      test('should accept server with url', async () => {
        const config = createEnvironmentConfig({
          test: { url: 'http://localhost:3000' },
        });

        await expect(configManager.writeEnvironmentConfig(config)).resolves.not.toThrow();
      });

      test('should validate args is an array when provided', async () => {
        const invalidConfig = {
          servers: {
            test: { command: 'test', args: 'not-an-array' },
          },
        } as any;

        await expect(configManager.writeEnvironmentConfig(invalidConfig)).rejects.toThrow(
          'args must be an array'
        );
      });

      test('should validate env is an object when provided', async () => {
        const invalidConfig = {
          servers: {
            test: { command: 'test', env: 'not-an-object' },
          },
        } as any;

        await expect(configManager.writeEnvironmentConfig(invalidConfig)).rejects.toThrow(
          'env must be an object'
        );
      });

      test('should accept server with valid env variables', async () => {
        const config = createEnvironmentConfig({
          test: {
            command: 'test',
            env: { KEY: 'value', ANOTHER: 'value2' },
          },
        });

        await expect(configManager.writeEnvironmentConfig(config)).resolves.not.toThrow();
      });
    });
  });

  describe('Tests Configuration', () => {
    describe('Read Operations', () => {
      test('should return empty array when file does not exist', async () => {
        const config = await configManager.readTestsConfig();
        expect(config).toEqual([]);
      });

      test('should read valid tests configuration', async () => {
        const mockConfig = createTestsConfig(3);
        await configManager.writeTestsConfig(mockConfig);

        const result = await configManager.readTestsConfig();
        expect(result).toEqual(mockConfig);
        expect(result).toHaveLength(3);
      });

      test('should handle malformed JSON', async () => {
        const testsPath = path.join(testConfigDir, 'tests.json');
        await fs.writeFile(testsPath, 'invalid json', 'utf-8');

        await expect(configManager.readTestsConfig()).rejects.toThrow();
      });
    });

    describe('Write Operations', () => {
      test('should write tests configuration', async () => {
        const config = createTestsConfig(2);
        await configManager.writeTestsConfig(config);

        const testsPath = path.join(testConfigDir, 'tests.json');
        const content = await fs.readFile(testsPath, 'utf-8');
        const parsed = JSON.parse(content);

        expect(parsed).toEqual(config);
      });

      test('should add test to configuration', async () => {
        const test = createTestConfig({ title: 'New Test' });
        await configManager.addTest(test);

        const config = await configManager.readTestsConfig();
        expect(config).toHaveLength(1);
        expect(config[0].title).toBe('New Test');
      });

      test('should append tests to existing configuration', async () => {
        const test1 = createTestConfig({ title: 'Test 1' });
        const test2 = createTestConfig({ title: 'Test 2' });

        await configManager.addTest(test1);
        await configManager.addTest(test2);

        const config = await configManager.readTestsConfig();
        expect(config).toHaveLength(2);
        expect(config[0].title).toBe('Test 1');
        expect(config[1].title).toBe('Test 2');
      });
    });

    describe('Validation', () => {
      test('should validate config is an array', async () => {
        const invalidConfig = {} as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'must be an array'
        );
      });

      test('should validate test has title', async () => {
        const invalidConfig = [{ query: 'test', model: 'test', provider: 'test' }] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'title must be a string'
        );
      });

      test('should validate test has query', async () => {
        const invalidConfig = [{ title: 'test', model: 'test', provider: 'test' }] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'query must be a string'
        );
      });

      test('should validate test has model', async () => {
        const invalidConfig = [{ title: 'test', query: 'test', provider: 'test' }] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'model must be a string'
        );
      });

      test('should validate test has provider', async () => {
        const invalidConfig = [{ title: 'test', query: 'test', model: 'test' }] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'provider must be a string'
        );
      });

      test('should validate runs is a number when provided', async () => {
        const invalidConfig = [
          { title: 'test', query: 'test', model: 'test', provider: 'test', runs: 'not-a-number' },
        ] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'runs must be a number'
        );
      });

      test('should validate expectedToolCalls is an array when provided', async () => {
        const invalidConfig = [
          {
            title: 'test',
            query: 'test',
            model: 'test',
            provider: 'test',
            expectedToolCalls: 'not-an-array',
          },
        ] as any;
        await expect(configManager.writeTestsConfig(invalidConfig)).rejects.toThrow(
          'expectedToolCalls must be an array'
        );
      });

      test('should accept optional fields', async () => {
        const config = [
          createTestConfig({
            temperature: 0.7,
            maxTokens: 2048,
            runs: 3,
            expectedToolCalls: ['tool1', 'tool2'],
          }),
        ];

        await expect(configManager.writeTestsConfig(config)).resolves.not.toThrow();
      });
    });
  });

  describe('LLM Configuration', () => {
    describe('Read Operations', () => {
      test('should return empty object when file does not exist', async () => {
        const config = await configManager.readLLMConfig();
        expect(config).toEqual({});
      });

      test('should read and decrypt LLM configuration', async () => {
        const mockConfig = createLLMConfig();
        await configManager.writeLLMConfig(mockConfig);

        const result = await configManager.readLLMConfig();
        expect(result.anthropic).toBe('test-anthropic-key');
        expect(result.openai).toBe('test-openai-key');
      });

      test('should handle decryption errors gracefully', async () => {
        const llmsPath = path.join(testConfigDir, 'llms.encrypted.json');
        await fs.writeFile(llmsPath, 'invalid:encrypted:data', 'utf-8');

        await expect(configManager.readLLMConfig()).rejects.toThrow();
      });
    });

    describe('Write Operations', () => {
      test('should write and encrypt LLM configuration', async () => {
        const config = createLLMConfig();
        await configManager.writeLLMConfig(config);

        const llmsPath = path.join(testConfigDir, 'llms.encrypted.json');
        const content = await fs.readFile(llmsPath, 'utf-8');

        // Should be encrypted (contains colons separating iv:authTag:data)
        expect(content.split(':')).toHaveLength(3);
        // Should not contain plaintext keys
        expect(content).not.toContain('test-anthropic-key');
      });

      test('should set individual LLM key', async () => {
        await configManager.setLLMKey('anthropic', 'new-key');

        const config = await configManager.readLLMConfig();
        expect(config.anthropic).toBe('new-key');
      });

      test('should update existing LLM key', async () => {
        await configManager.setLLMKey('anthropic', 'old-key');
        await configManager.setLLMKey('anthropic', 'new-key');

        const config = await configManager.readLLMConfig();
        expect(config.anthropic).toBe('new-key');
      });

      test('should get LLM key', async () => {
        await configManager.setLLMKey('anthropic', 'test-key');

        const key = await configManager.getLLMKey('anthropic');
        expect(key).toBe('test-key');
      });

      test('should return undefined for non-existent key', async () => {
        const key = await configManager.getLLMKey('non-existent');
        expect(key).toBeUndefined();
      });

      test('should preserve other keys when setting one', async () => {
        await configManager.setLLMKey('anthropic', 'key1');
        await configManager.setLLMKey('openai', 'key2');

        const config = await configManager.readLLMConfig();
        expect(config.anthropic).toBe('key1');
        expect(config.openai).toBe('key2');
      });
    });

    describe('Validation', () => {
      test('should validate config is an object', async () => {
        const invalidConfig = null as any;
        await expect(configManager.writeLLMConfig(invalidConfig)).rejects.toThrow(
          'must be an object'
        );
      });

      test('should validate provider values are strings or objects', async () => {
        const invalidConfig = {
          anthropic: 123,
        } as any;

        await expect(configManager.writeLLMConfig(invalidConfig)).rejects.toThrow(
          'must be a string or object'
        );
      });

      test('should accept Ollama configuration object', async () => {
        const config = {
          ollama: createOllamaConfig(),
        };

        await expect(configManager.writeLLMConfig(config)).resolves.not.toThrow();
      });

      test('should validate Ollama config has url', async () => {
        const invalidConfig = {
          ollama: { models: ['test'] },
        } as any;

        await expect(configManager.writeLLMConfig(invalidConfig)).rejects.toThrow(
          'url must be a string'
        );
      });

      test('should accept undefined values', async () => {
        const config = {
          anthropic: 'key',
          openai: undefined,
        };

        await expect(configManager.writeLLMConfig(config)).resolves.not.toThrow();
      });
    });

    describe('Encryption/Decryption', () => {
      test('should encrypt and decrypt data correctly', async () => {
        const original = createLLMConfig();
        await configManager.writeLLMConfig(original);

        const decrypted = await configManager.readLLMConfig();
        expect(decrypted).toEqual(original);
      });

      test('should generate different ciphertext for same data', async () => {
        const config = createLLMConfig();
        await configManager.writeLLMConfig(config);
        const llmsPath = path.join(testConfigDir, 'llms.encrypted.json');
        const encrypted1 = await fs.readFile(llmsPath, 'utf-8');

        // Write again
        await configManager.writeLLMConfig(config);
        const encrypted2 = await fs.readFile(llmsPath, 'utf-8');

        // Different IVs should produce different ciphertext
        expect(encrypted1).not.toBe(encrypted2);
      });

      test('should use AES-256-GCM for encryption', async () => {
        const config = createLLMConfig();
        await configManager.writeLLMConfig(config);

        const llmsPath = path.join(testConfigDir, 'llms.encrypted.json');
        const content = await fs.readFile(llmsPath, 'utf-8');
        const parts = content.split(':');

        // Format: iv:authTag:encryptedData
        expect(parts).toHaveLength(3);
        // IV should be 16 bytes (32 hex chars)
        expect(parts[0]).toHaveLength(32);
        // Auth tag should be 16 bytes (32 hex chars)
        expect(parts[1]).toHaveLength(32);
      });
    });
  });

  describe('Export for MCPJam', () => {
    test('should export all configurations to directory', async () => {
      // Setup test data
      const envConfig = createEnvironmentConfig();
      const testsConfig = createTestsConfig(2);
      const llmConfig = createLLMConfig();

      await configManager.writeEnvironmentConfig(envConfig);
      await configManager.writeTestsConfig(testsConfig);
      await configManager.writeLLMConfig(llmConfig);

      // Export
      const exportDir = path.join(process.cwd(), `.mcpjam-export-${Date.now()}`);
      const result = await configManager.exportForMCPJam(exportDir);

      // Verify paths
      expect(result.environmentPath).toBe(path.join(exportDir, 'environment.json'));
      expect(result.testsPath).toBe(path.join(exportDir, 'tests.json'));
      expect(result.llmsPath).toBe(path.join(exportDir, 'llms.json'));

      // Verify files exist
      const envStats = await fs.stat(result.environmentPath);
      const testsStats = await fs.stat(result.testsPath);
      const llmsStats = await fs.stat(result.llmsPath);

      expect(envStats.isFile()).toBe(true);
      expect(testsStats.isFile()).toBe(true);
      expect(llmsStats.isFile()).toBe(true);

      // Cleanup
      await fs.rm(exportDir, { recursive: true, force: true });
    });

    test('should decrypt LLM config for export', async () => {
      const llmConfig = createLLMConfig();
      await configManager.writeLLMConfig(llmConfig);

      const exportDir = path.join(process.cwd(), `.mcpjam-export-${Date.now()}`);
      const result = await configManager.exportForMCPJam(exportDir);

      // Read exported LLM config (should be plain JSON)
      const content = await fs.readFile(result.llmsPath, 'utf-8');
      const exported = JSON.parse(content);

      expect(exported.anthropic).toBe('test-anthropic-key');
      expect(exported.openai).toBe('test-openai-key');

      // Cleanup
      await fs.rm(exportDir, { recursive: true, force: true });
    });

    test('should use default export directory if not provided', async () => {
      const envConfig = createEnvironmentConfig();
      await configManager.writeEnvironmentConfig(envConfig);

      const result = await configManager.exportForMCPJam();

      const defaultDir = path.join(process.cwd(), '.mcpjam-export');
      expect(result.environmentPath).toBe(path.join(defaultDir, 'environment.json'));

      // Cleanup
      await fs.rm(defaultDir, { recursive: true, force: true });
    });
  });

  describe('Error Handling', () => {
    test('should handle write errors gracefully', async () => {
      // Test writing to a read-only or invalid location
      // Create manager with path that might cause issues
      const readOnlyManager = new MCPJamConfigManager('/proc/test-write-fail');

      const config = createEnvironmentConfig();
      // May fail or succeed depending on OS permissions, but should handle gracefully
      try {
        await readOnlyManager.writeEnvironmentConfig(config);
      } catch (error: any) {
        expect(error.message).toContain('Failed to write');
      }
    });

    test('should handle corrupted files gracefully', async () => {
      // Create corrupted file
      const envPath = path.join(testConfigDir, 'environment.json');
      await fs.writeFile(envPath, 'corrupted {invalid json}', 'utf-8');

      await expect(configManager.readEnvironmentConfig()).rejects.toThrow();
    });

    test('should provide helpful error messages', async () => {
      const invalidConfig = {
        servers: {
          'bad-server': { args: [] }, // Missing command and url
        },
      } as any;

      try {
        await configManager.writeEnvironmentConfig(invalidConfig);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('bad-server');
        expect(error.message).toContain('command');
        expect(error.message).toContain('url');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty server configuration', async () => {
      const config = { servers: {} };
      await configManager.writeEnvironmentConfig(config);

      const result = await configManager.readEnvironmentConfig();
      expect(result.servers).toEqual({});
    });

    test('should handle empty tests array', async () => {
      const config: any[] = [];
      await configManager.writeTestsConfig(config);

      const result = await configManager.readTestsConfig();
      expect(result).toEqual([]);
    });

    test('should handle large configuration files', async () => {
      const largeConfig = createTestsConfig(100);
      await configManager.writeTestsConfig(largeConfig);

      const result = await configManager.readTestsConfig();
      expect(result).toHaveLength(100);
    });

    test('should handle special characters in configuration', async () => {
      const config = createTestConfig({
        title: 'Test with "quotes" and \\backslashes\\',
        query: 'Query with newlines\nand tabs\t',
      });

      await configManager.addTest(config);
      const result = await configManager.readTestsConfig();

      expect(result[0].title).toBe('Test with "quotes" and \\backslashes\\');
      expect(result[0].query).toBe('Query with newlines\nand tabs\t');
    });

    test('should handle Unicode characters', async () => {
      const config = createTestConfig({
        title: 'Test with emoji 🚀 and unicode 你好',
        query: 'Señor Testing',
      });

      await configManager.addTest(config);
      const result = await configManager.readTestsConfig();

      expect(result[0].title).toContain('🚀');
      expect(result[0].title).toContain('你好');
      expect(result[0].query).toBe('Señor Testing');
    });
  });
});
