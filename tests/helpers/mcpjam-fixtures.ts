/**
 * MCPJam Test Fixtures
 *
 * Provides fixtures and mock data for MCPJam testing
 */

import {
  MCPJamEnvironmentConfig,
  MCPJamTestsConfig,
  MCPJamLLMConfig,
  MCPJamServerConfig,
  MCPJamTestConfig,
  MCPJamTestResult,
} from '../../src/types/mcp-config.js';

/**
 * Create a valid server configuration
 */
export function createServerConfig(overrides: Partial<MCPJamServerConfig> = {}): MCPJamServerConfig {
  return {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    ...overrides,
  };
}

/**
 * Create a valid environment configuration
 */
export function createEnvironmentConfig(
  servers: Record<string, MCPJamServerConfig> = {}
): MCPJamEnvironmentConfig {
  return {
    servers: Object.keys(servers).length > 0 ? servers : {
      'filesystem': createServerConfig(),
      'memory': createServerConfig({
        args: ['-y', '@modelcontextprotocol/server-memory'],
      }),
    },
  };
}

/**
 * Create a valid test configuration
 */
export function createTestConfig(overrides: Partial<MCPJamTestConfig> = {}): MCPJamTestConfig {
  return {
    title: 'Test File Operations',
    query: 'List files in the current directory',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    runs: 1,
    expectedToolCalls: [],
    temperature: 0,
    maxTokens: 4096,
    ...overrides,
  };
}

/**
 * Create a valid tests configuration
 */
export function createTestsConfig(count: number = 3): MCPJamTestsConfig {
  return Array.from({ length: count }, (_, i) =>
    createTestConfig({
      title: `Test ${i + 1}`,
      query: `Test query ${i + 1}`,
    })
  );
}

/**
 * Create a valid LLM configuration
 */
export function createLLMConfig(overrides: Partial<MCPJamLLMConfig> = {}): MCPJamLLMConfig {
  return {
    anthropic: 'test-anthropic-key',
    openai: 'test-openai-key',
    gemini: 'test-gemini-key',
    ...overrides,
  };
}

/**
 * Create a mock test result
 */
export function createTestResult(overrides: Partial<MCPJamTestResult> = {}): MCPJamTestResult {
  return {
    testTitle: 'Test Result',
    query: 'Test query',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    runNumber: 1,
    success: true,
    actualToolCalls: [],
    expectedToolCalls: [],
    toolCallsMatch: true,
    response: 'Test response',
    duration: 1000,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create invalid server configurations for error testing
 */
export function createInvalidServerConfigs(): Array<{
  name: string;
  config: any;
  expectedError: string;
}> {
  return [
    {
      name: 'missing-command-and-url',
      config: { env: {} },
      expectedError: 'must have either "command" or "url"',
    },
    {
      name: 'invalid-args-type',
      config: { command: 'test', args: 'not-an-array' },
      expectedError: 'args must be an array',
    },
    {
      name: 'invalid-env-type',
      config: { command: 'test', env: 'not-an-object' },
      expectedError: 'env must be an object',
    },
  ];
}

/**
 * Create invalid test configurations for error testing
 */
export function createInvalidTestConfigs(): Array<{
  name: string;
  config: any;
  expectedError: string;
}> {
  return [
    {
      name: 'missing-title',
      config: { query: 'test', model: 'test', provider: 'test' },
      expectedError: 'title must be a string',
    },
    {
      name: 'missing-query',
      config: { title: 'test', model: 'test', provider: 'test' },
      expectedError: 'query must be a string',
    },
    {
      name: 'missing-model',
      config: { title: 'test', query: 'test', provider: 'test' },
      expectedError: 'model must be a string',
    },
    {
      name: 'missing-provider',
      config: { title: 'test', query: 'test', model: 'test' },
      expectedError: 'provider must be a string',
    },
    {
      name: 'invalid-runs-type',
      config: { title: 'test', query: 'test', model: 'test', provider: 'test', runs: 'not-a-number' },
      expectedError: 'runs must be a number',
    },
    {
      name: 'invalid-expectedToolCalls-type',
      config: {
        title: 'test',
        query: 'test',
        model: 'test',
        provider: 'test',
        expectedToolCalls: 'not-an-array'
      },
      expectedError: 'expectedToolCalls must be an array',
    },
  ];
}

/**
 * Create mock LLM provider responses
 */
export function createMockLLMResponse(toolCalls: string[] = []) {
  return {
    text: 'Mock LLM response',
    toolCalls,
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
  };
}

/**
 * Create encrypted data format for LLM config testing
 */
export function createEncryptedFormat(data: string): string {
  // Simulate encrypted format: iv:authTag:encryptedData
  const iv = Buffer.from('0123456789abcdef').toString('hex');
  const authTag = Buffer.from('fedcba9876543210').toString('hex');
  const encrypted = Buffer.from(data).toString('hex');
  return `${iv}:${authTag}:${encrypted}`;
}

/**
 * Valid Ollama configuration
 */
export function createOllamaConfig() {
  return {
    url: 'http://localhost:11434',
    models: ['llama2', 'mistral'],
  };
}
