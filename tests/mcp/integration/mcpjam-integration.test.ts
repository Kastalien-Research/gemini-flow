/**
 * MCPJam Integration Tests
 * Real-world testing with MCPJam inspector and evals-cli
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { StdioTransport } from '../../../src/mcp/transports/stdio-transport';
import { EnhancedMCPClient } from '../../../src/mcp/enhanced-mcp-client';
import { discoverTools } from '../../../src/mcp/tools/tool-discovery';

describe('MCPJam Inspector Integration', () => {
  let inspectorProcess: ChildProcess;
  let transport: StdioTransport;
  let client: EnhancedMCPClient;

  beforeAll(async () => {
    // Start MCPJam inspector server
    inspectorProcess = spawn('mcpjam', ['inspect', '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for process to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create transport and client
    transport = new StdioTransport({
      command: 'mcpjam',
      args: ['inspect', '--stdio'],
    });

    client = new EnhancedMCPClient('mcpjam-inspector', transport);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    inspectorProcess.kill();
  });

  describe('Protocol Validation', () => {
    it('should support tools/list protocol', async () => {
      const tools = await discoverTools(client.getClient());
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should support prompts/list protocol', async () => {
      const result = await client.getClient().request({
        method: 'prompts/list',
        params: {},
      });
      expect(result).toBeDefined();
    });

    it('should support resources/list protocol', async () => {
      const result = await client.getClient().request({
        method: 'resources/list',
        params: {},
      });
      expect(result).toBeDefined();
    });

    it('should handle capability negotiation', async () => {
      const serverInfo = await client.getClient().getServerVersion();
      expect(serverInfo).toBeDefined();
      expect(serverInfo.capabilities).toBeDefined();
    });
  });

  describe('MCPJam Inspector Features', () => {
    it('should provide introspection tools', async () => {
      const tools = await discoverTools(client.getClient());
      const introspectionTools = tools.filter((t) =>
        t.name.includes('inspect') || t.name.includes('debug')
      );
      expect(introspectionTools.length).toBeGreaterThan(0);
    });

    it('should expose server metadata', async () => {
      const serverInfo = await client.getClient().getServerVersion();
      expect(serverInfo.name).toBeDefined();
      expect(serverInfo.version).toBeDefined();
    });
  });
});

describe('MCPJam Evals-CLI Integration', () => {
  describe('Conformance Testing', () => {
    it('should run MCP conformance tests via evals-cli', async () => {
      const evalProcess = spawn('npx', ['@mcpjam/evals-cli', 'test', '--config', './tests/mcp/config/eval-config.json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      evalProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        evalProcess.on('close', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
      expect(output).toContain('PASS');
    });

    it('should validate tools protocol compliance', async () => {
      // Run evals specifically for tools
      const evalProcess = spawn('npx', ['@mcpjam/evals-cli', 'test', '--suite', 'tools', '--server', 'gemini-flow'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errors = '';

      evalProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      evalProcess.stderr?.on('data', (data) => {
        errors += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        evalProcess.on('close', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
      expect(errors).not.toContain('ERROR');
    });

    it('should validate prompts protocol compliance', async () => {
      const evalProcess = spawn('npx', ['@mcpjam/evals-cli', 'test', '--suite', 'prompts'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const exitCode = await new Promise<number>((resolve) => {
        evalProcess.on('close', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
    });

    it('should validate resources protocol compliance', async () => {
      const evalProcess = spawn('npx', ['@mcpjam/evals-cli', 'test', '--suite', 'resources'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const exitCode = await new Promise<number>((resolve) => {
        evalProcess.on('close', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should benchmark tool execution performance', async () => {
      const benchProcess = spawn('npx', ['@mcpjam/evals-cli', 'benchmark', '--metric', 'latency'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      benchProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise<void>((resolve) => {
        benchProcess.on('close', () => resolve());
      });

      expect(output).toContain('latency');
      expect(output).toMatch(/\d+ms/); // Should contain millisecond measurements
    });
  });
});

describe('Real MCP Servers Integration', () => {
  describe('Weather Server (@modelcontextprotocol/server-weather)', () => {
    let client: EnhancedMCPClient;

    beforeAll(async () => {
      const transport = new StdioTransport({
        command: 'npx',
        args: ['@modelcontextprotocol/server-weather'],
      });
      client = new EnhancedMCPClient('weather-server', transport);
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should discover weather tools', async () => {
      const tools = await discoverTools(client.getClient());
      expect(tools).toBeDefined();
      const weatherTools = tools.filter((t) => t.name.includes('weather'));
      expect(weatherTools.length).toBeGreaterThan(0);
    });

    it('should execute weather forecast tool', async () => {
      const result = await client.getClient().request({
        method: 'tools/call',
        params: {
          name: 'get_forecast',
          arguments: { city: 'San Francisco' },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('Memory Server (@modelcontextprotocol/server-memory)', () => {
    let client: EnhancedMCPClient;

    beforeAll(async () => {
      const transport = new StdioTransport({
        command: 'npx',
        args: ['@modelcontextprotocol/server-memory'],
      });
      client = new EnhancedMCPClient('memory-server', transport);
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should store and retrieve memories', async () => {
      // Store a memory
      await client.getClient().request({
        method: 'tools/call',
        params: {
          name: 'store_memory',
          arguments: { key: 'test', value: 'integration test data' },
        },
      });

      // Retrieve the memory
      const result = await client.getClient().request({
        method: 'tools/call',
        params: {
          name: 'retrieve_memory',
          arguments: { key: 'test' },
        },
      });

      expect(result).toBeDefined();
      expect(result).toContain('integration test data');
    });
  });

  describe('Filesystem Server (@modelcontextprotocol/server-filesystem)', () => {
    let client: EnhancedMCPClient;

    beforeAll(async () => {
      const transport = new StdioTransport({
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
      });
      client = new EnhancedMCPClient('filesystem-server', transport);
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should list resources', async () => {
      const result = await client.getClient().request({
        method: 'resources/list',
        params: {},
      });
      expect(result).toBeDefined();
      expect(result.resources).toBeDefined();
    });

    it('should read file resources', async () => {
      // First list to get a valid URI
      const list = await client.getClient().request({
        method: 'resources/list',
        params: {},
      });

      if (list.resources && list.resources.length > 0) {
        const uri = list.resources[0].uri;
        const content = await client.getClient().request({
          method: 'resources/read',
          params: { uri },
        });
        expect(content).toBeDefined();
      }
    });
  });
});
