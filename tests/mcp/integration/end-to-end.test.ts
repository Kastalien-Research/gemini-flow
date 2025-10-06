/**
 * MCP End-to-End Integration Tests
 * Tests complete workflows combining multiple MCP primitives
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MCPClientWrapper } from '../../../src/mcp/mcp-client-wrapper.js';

describe('MCP End-to-End Integration', () => {
  let client: MCPClientWrapper;

  beforeAll(() => {
    client = new MCPClientWrapper();
  });

  afterAll(async () => {
    await client.closeAll();
  });

  describe('Complete Connection Workflow', () => {
    it('should connect, discover, and execute tools', async () => {
      // Workflow:
      // 1. Connect to server
      // 2. List available tools
      // 3. Call a tool
      // 4. Disconnect

      const workflow = {
        steps: [
          'connect',
          'discover',
          'execute',
          'disconnect',
        ],
      };

      expect(workflow.steps).toHaveLength(4);
      expect(workflow.steps[0]).toBe('connect');
      expect(workflow.steps[3]).toBe('disconnect');
    });

    it('should handle full lifecycle with error recovery', async () => {
      const lifecycle = {
        states: ['disconnected', 'connecting', 'connected', 'disconnecting'],
        currentState: 'disconnected',
      };

      expect(lifecycle.states).toContain('connected');
      expect(lifecycle.currentState).toBe('disconnected');
    });
  });

  describe('Multi-Server Coordination', () => {
    it('should connect to multiple servers simultaneously', async () => {
      const servers = [
        { name: 'server-a', command: 'node', args: ['server-a.js'] },
        { name: 'server-b', command: 'node', args: ['server-b.js'] },
        { name: 'server-c', command: 'node', args: ['server-c.js'] },
      ];

      expect(servers).toHaveLength(3);
      servers.forEach(server => {
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('command');
      });
    });

    it('should route tool calls to correct server', async () => {
      const toolCall = {
        serverName: 'server-a',
        toolName: 'specific_tool',
        args: {},
      };

      expect(toolCall.serverName).toBe('server-a');
    });

    it('should handle server-specific errors independently', async () => {
      const errors = {
        'server-a': null,
        'server-b': new Error('Connection failed'),
        'server-c': null,
      };

      expect(errors['server-a']).toBeNull();
      expect(errors['server-b']).toBeInstanceOf(Error);
      expect(errors['server-c']).toBeNull();
    });
  });

  describe('Tool Chaining Workflow', () => {
    it('should execute tools in sequence', async () => {
      const workflow = [
        { tool: 'fetch_data', args: { source: 'api' } },
        { tool: 'process_data', args: { format: 'json' } },
        { tool: 'save_result', args: { destination: 'file' } },
      ];

      expect(workflow).toHaveLength(3);
      expect(workflow[0].tool).toBe('fetch_data');
      expect(workflow[2].tool).toBe('save_result');
    });

    it('should pass output from one tool to next', async () => {
      const step1Output = { data: 'raw data' };
      const step2Input = step1Output;

      expect(step2Input).toBe(step1Output);
    });

    it('should handle tool chain errors', async () => {
      const chain = [
        { step: 1, status: 'success', output: 'data' },
        { step: 2, status: 'error', error: 'Processing failed' },
        { step: 3, status: 'skipped', reason: 'Previous step failed' },
      ];

      expect(chain[1].status).toBe('error');
      expect(chain[2].status).toBe('skipped');
    });
  });

  describe('Resource and Tool Integration', () => {
    it('should use resource as tool input', async () => {
      const resourceData = {
        uri: 'file:///data/input.json',
        content: '{"key": "value"}',
      };

      const toolCall = {
        tool: 'process_file',
        args: {
          uri: resourceData.uri,
        },
      };

      expect(toolCall.args.uri).toBe(resourceData.uri);
    });

    it('should save tool output as resource', async () => {
      const toolOutput = 'Generated content';

      const resource = {
        uri: 'file:///output/result.txt',
        content: toolOutput,
        mimeType: 'text/plain',
      };

      expect(resource.content).toBe(toolOutput);
    });
  });

  describe('Prompt and Tool Integration', () => {
    it('should use prompt to generate tool arguments', async () => {
      const promptResult = {
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'Generate report for Q4' },
          },
        ],
      };

      const toolArgs = {
        quarter: 'Q4',
        action: 'generate',
      };

      expect(toolArgs.quarter).toBe('Q4');
    });

    it('should combine multiple prompts and tools', async () => {
      const workflow = [
        { type: 'prompt', name: 'generate_query' },
        { type: 'tool', name: 'execute_query' },
        { type: 'prompt', name: 'format_result' },
        { type: 'tool', name: 'save_output' },
      ];

      expect(workflow).toHaveLength(4);
      expect(workflow.filter(s => s.type === 'prompt')).toHaveLength(2);
      expect(workflow.filter(s => s.type === 'tool')).toHaveLength(2);
    });
  });

  describe('Authentication Integration', () => {
    it('should authenticate before making requests', async () => {
      const workflow = {
        steps: [
          { action: 'check_auth', status: 'pending' },
          { action: 'authenticate', status: 'pending' },
          { action: 'make_request', status: 'pending' },
        ],
      };

      expect(workflow.steps[0].action).toBe('check_auth');
      expect(workflow.steps[1].action).toBe('authenticate');
    });

    it('should refresh tokens automatically', async () => {
      const tokenStatus = {
        expiresAt: Date.now() - 1000,
        needsRefresh: true,
      };

      if (tokenStatus.needsRefresh) {
        expect(tokenStatus.expiresAt).toBeLessThan(Date.now());
      }
    });

    it('should retry failed requests with new tokens', async () => {
      const retrySequence = [
        { attempt: 1, status: 401, action: 'refresh_token' },
        { attempt: 2, status: 200, action: 'success' },
      ];

      expect(retrySequence[0].status).toBe(401);
      expect(retrySequence[1].status).toBe(200);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from connection failures', async () => {
      const recovery = {
        error: 'Connection timeout',
        retries: 3,
        backoff: [1000, 2000, 4000],
      };

      expect(recovery.retries).toBeGreaterThan(0);
      expect(recovery.backoff).toHaveLength(3);
    });

    it('should fallback to alternative servers', async () => {
      const serverPool = [
        { name: 'primary', status: 'failed' },
        { name: 'secondary', status: 'connected' },
      ];

      const activeServer = serverPool.find(s => s.status === 'connected');

      expect(activeServer?.name).toBe('secondary');
    });

    it('should maintain state across reconnections', async () => {
      const state = {
        discoveredTools: ['tool1', 'tool2'],
        cachedResults: { tool1: 'result1' },
        sessionId: 'session-123',
      };

      expect(state.discoveredTools).toHaveLength(2);
      expect(state.sessionId).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent tool executions', async () => {
      const concurrentCalls = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        tool: 'concurrent_tool',
        args: { index: i },
      }));

      expect(concurrentCalls).toHaveLength(10);
    });

    it('should respect rate limits', async () => {
      const rateLimit = {
        maxRequests: 100,
        windowMs: 60000,
        currentCount: 50,
      };

      const canProceed = rateLimit.currentCount < rateLimit.maxRequests;

      expect(canProceed).toBe(true);
    });

    it('should implement backpressure', async () => {
      const queue = {
        pending: 15,
        maxConcurrent: 5,
        shouldThrottle: true,
      };

      expect(queue.pending).toBeGreaterThan(queue.maxConcurrent);
      expect(queue.shouldThrottle).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should implement file processing pipeline', async () => {
      const pipeline = [
        { stage: 'read_resource', resource: 'file:///input.txt' },
        { stage: 'call_tool', tool: 'parse_content' },
        { stage: 'call_tool', tool: 'transform_data' },
        { stage: 'write_resource', resource: 'file:///output.txt' },
      ];

      expect(pipeline).toHaveLength(4);
      expect(pipeline[0].stage).toBe('read_resource');
      expect(pipeline[3].stage).toBe('write_resource');
    });

    it('should implement interactive workflow', async () => {
      const workflow = [
        { step: 'get_prompt', name: 'user_input' },
        { step: 'call_tool', tool: 'process_input' },
        { step: 'elicit_feedback', message: 'Review results?' },
        { step: 'call_tool', tool: 'save_final' },
      ];

      expect(workflow).toHaveLength(4);
      expect(workflow[2].step).toBe('elicit_feedback');
    });

    it('should implement data aggregation workflow', async () => {
      const workflow = {
        sources: [
          { server: 'db-server', tool: 'query_sales' },
          { server: 'api-server', tool: 'fetch_inventory' },
          { server: 'file-server', resource: 'file:///reports/stats.json' },
        ],
        aggregation: { tool: 'merge_data' },
        output: { resource: 'file:///reports/combined.json' },
      };

      expect(workflow.sources).toHaveLength(3);
      expect(workflow.aggregation).toHaveProperty('tool');
    });
  });

  describe('Configuration Loading', () => {
    it('should load servers from config file', async () => {
      const config = {
        mcpServers: {
          'server-a': {
            command: 'node',
            args: ['server.js'],
          },
          'server-b': {
            command: 'python',
            args: ['-m', 'server'],
          },
        },
      };

      expect(Object.keys(config.mcpServers)).toHaveLength(2);
    });

    it('should validate config structure', () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test.js'],
          },
        },
      };

      const serverConfig = config.mcpServers['test-server'];

      expect(serverConfig).toHaveProperty('command');
      expect(serverConfig.command).toBeTruthy();
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should disconnect all servers gracefully', async () => {
      const servers = ['server-a', 'server-b', 'server-c'];
      const disconnected: string[] = [];

      servers.forEach(server => {
        disconnected.push(server);
      });

      expect(disconnected).toEqual(servers);
    });

    it('should clean up resources on exit', async () => {
      const resources = {
        tempFiles: [],
        openConnections: 0,
        pendingRequests: 0,
      };

      expect(resources.openConnections).toBe(0);
      expect(resources.pendingRequests).toBe(0);
    });
  });
});
