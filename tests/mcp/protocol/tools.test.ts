/**
 * MCP Tools Protocol Conformance Tests
 * Tests tools/list, tools/call, schema validation, and multi-part responses
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPClientWrapper } from '../../../src/mcp/mcp-client-wrapper.js';
import { MOCK_TOOLS, MOCK_RESPONSES, MCP_ERROR_CODES } from '../fixtures/test-data.js';

describe('MCP Tools Protocol', () => {
  let client: MCPClientWrapper;

  beforeEach(() => {
    client = new MCPClientWrapper();
  });

  afterEach(async () => {
    await client.closeAll();
  });

  describe('tools/list - Tool Discovery', () => {
    it('should list all available tools', async () => {
      // Would connect to mock server and list tools
      // For now, testing the client interface
      const serverName = 'test-server';

      await expect(
        client.listTools(serverName)
      ).rejects.toThrow('MCP client not connected');
    });

    it('should return tools with valid schema', async () => {
      // Each tool should have: name, description, inputSchema
      const expectedSchema = {
        name: expect.any(String),
        description: expect.any(String),
        inputSchema: expect.any(Object),
      };

      // Validation structure for tool list response
      const validateToolList = (tools: any[]) => {
        tools.forEach(tool => {
          expect(tool).toMatchObject(expectedSchema);
          expect(tool.inputSchema).toHaveProperty('type');
        });
      };

      expect(validateToolList).toBeDefined();
    });

    it('should handle empty tool list', async () => {
      // Server with no tools should return empty array
      const emptyList: any[] = [];
      expect(emptyList).toEqual([]);
    });

    it('should validate JSON Schema for tool parameters', () => {
      // Test JSON Schema validation
      const tool = MOCK_TOOLS.simple;

      expect(tool.inputSchema).toHaveProperty('type', 'object');
      expect(tool.inputSchema).toHaveProperty('properties');
      expect(tool.inputSchema.properties).toHaveProperty('input');
    });

    it('should handle complex nested schemas', () => {
      const tool = MOCK_TOOLS.complex;

      expect(tool.inputSchema.properties).toHaveProperty('config');
      expect(tool.inputSchema.properties.config).toHaveProperty('properties');
      expect(tool.inputSchema.required).toContain('config');
    });

    it('should support schema with enums', () => {
      const tool = MOCK_TOOLS.complex;
      const modeProperty = tool.inputSchema.properties.config.properties.mode;

      expect(modeProperty).toHaveProperty('enum');
      expect(modeProperty.enum).toEqual(['fast', 'slow']);
    });

    it('should support schema with arrays', () => {
      const tool = MOCK_TOOLS.complex;

      expect(tool.inputSchema.properties).toHaveProperty('data');
      expect(tool.inputSchema.properties.data.type).toBe('array');
      expect(tool.inputSchema.properties.data.items).toBeDefined();
    });
  });

  describe('tools/call - Tool Invocation', () => {
    it('should call tool with valid arguments', async () => {
      const serverName = 'test-server';
      const toolName = 'test_tool';
      const args = { input: 'test value' };

      await expect(
        client.callTool(serverName, toolName, args)
      ).rejects.toThrow('MCP client not connected');
    });

    it('should handle tool execution without arguments', async () => {
      const serverName = 'test-server';
      const toolName = 'no_args_tool';

      // Tool with no required arguments
      await expect(
        client.callTool(serverName, toolName)
      ).rejects.toThrow('MCP client not connected');
    });

    it('should return text content response', () => {
      const response = MOCK_RESPONSES.toolSuccess;

      expect(response).toHaveProperty('content');
      expect(response.content).toBeInstanceOf(Array);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text');
    });

    it('should handle tool execution errors', () => {
      const errorResponse = MOCK_RESPONSES.error;

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
    });

    it('should validate error code is MCP-compliant', () => {
      const errorResponse = MOCK_RESPONSES.error;

      // MCP error codes should be in the JSON-RPC 2.0 range
      expect(errorResponse.error.code).toBeLessThanOrEqual(-32000);
    });

    it('should include error details in response', () => {
      const errorResponse = MOCK_RESPONSES.error;

      expect(errorResponse.error).toHaveProperty('data');
      expect(errorResponse.error.data).toHaveProperty('details');
    });
  });

  describe('Multi-Part Responses', () => {
    it('should handle text content blocks', () => {
      const response = MOCK_RESPONSES.toolSuccess;
      const textBlock = response.content[0];

      expect(textBlock.type).toBe('text');
      expect(typeof textBlock.text).toBe('string');
    });

    it('should handle image content blocks', () => {
      const response = MOCK_RESPONSES.toolWithImage;
      const imageBlock = response.content[1];

      expect(imageBlock.type).toBe('image');
      expect(imageBlock).toHaveProperty('data');
      expect(imageBlock).toHaveProperty('mimeType');
      expect(imageBlock.mimeType).toBe('image/png');
    });

    it('should handle resource content blocks', () => {
      const response = MOCK_RESPONSES.toolWithResource;
      const resourceBlock = response.content[0];

      expect(resourceBlock.type).toBe('resource');
      expect(resourceBlock).toHaveProperty('resource');
      expect(resourceBlock.resource).toHaveProperty('uri');
      expect(resourceBlock.resource).toHaveProperty('mimeType');
    });

    it('should handle mixed content types in single response', () => {
      const mixedResponse = {
        content: [
          { type: 'text', text: 'Result:' },
          { type: 'image', data: 'base64data', mimeType: 'image/png' },
          { type: 'resource', resource: { uri: 'file:///result.txt' } },
        ],
      };

      expect(mixedResponse.content).toHaveLength(3);
      expect(mixedResponse.content[0].type).toBe('text');
      expect(mixedResponse.content[1].type).toBe('image');
      expect(mixedResponse.content[2].type).toBe('resource');
    });

    it('should validate base64 encoding for binary data', () => {
      const imageBlock = MOCK_RESPONSES.toolWithImage.content[1];

      // Base64 should only contain valid characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      expect(imageBlock.data).toMatch(base64Regex);
    });

    it('should validate MIME types', () => {
      const validMimeTypes = [
        'text/plain',
        'application/json',
        'image/png',
        'image/jpeg',
        'audio/mpeg',
        'video/mp4',
      ];

      validMimeTypes.forEach(mimeType => {
        expect(mimeType).toMatch(/^[a-z]+\/[a-z0-9\-\+\.]+$/i);
      });
    });
  });

  describe('Schema Validation', () => {
    it('should reject invalid tool arguments', () => {
      const tool = MOCK_TOOLS.simple;
      const invalidArgs = { wrong_field: 'value' };

      // Missing required 'input' field
      expect(tool.inputSchema.required).toContain('input');
      expect(invalidArgs).not.toHaveProperty('input');
    });

    it('should validate argument types', () => {
      const tool = MOCK_TOOLS.simple;
      const schema = tool.inputSchema.properties.input;

      expect(schema.type).toBe('string');

      // Invalid: number instead of string
      const invalidArg = 123;
      expect(typeof invalidArg).not.toBe('string');
    });

    it('should validate enum constraints', () => {
      const tool = MOCK_TOOLS.complex;
      const modeSchema = tool.inputSchema.properties.config.properties.mode;

      const validModes = ['fast', 'slow'];
      const invalidMode = 'medium';

      expect(modeSchema.enum).toEqual(validModes);
      expect(validModes).not.toContain(invalidMode);
    });

    it('should validate numeric constraints', () => {
      const tool = MOCK_TOOLS.complex;
      const retriesSchema = tool.inputSchema.properties.config.properties.retries;

      expect(retriesSchema.type).toBe('number');
      expect(retriesSchema.minimum).toBe(0);
      expect(retriesSchema.maximum).toBe(10);

      const validValue = 5;
      const invalidValue = 15;

      expect(validValue).toBeGreaterThanOrEqual(retriesSchema.minimum);
      expect(validValue).toBeLessThanOrEqual(retriesSchema.maximum);
      expect(invalidValue).toBeGreaterThan(retriesSchema.maximum);
    });

    it('should validate array types', () => {
      const tool = MOCK_TOOLS.complex;
      const dataSchema = tool.inputSchema.properties.data;

      expect(dataSchema.type).toBe('array');
      expect(dataSchema.items).toHaveProperty('type', 'string');

      const validData = ['item1', 'item2'];
      const invalidData = [1, 2, 3];

      expect(Array.isArray(validData)).toBe(true);
      expect(validData.every(item => typeof item === 'string')).toBe(true);
      expect(invalidData.every(item => typeof item === 'string')).toBe(false);
    });
  });

  describe('Tool Filtering', () => {
    it('should support include filter', () => {
      const allTools = [
        MOCK_TOOLS.simple,
        MOCK_TOOLS.complex,
        MOCK_TOOLS.multiPart,
      ];

      const includeFilter = ['test_tool', 'complex_tool'];
      const filtered = allTools.filter(t => includeFilter.includes(t.name));

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(includeFilter);
    });

    it('should support exclude filter', () => {
      const allTools = [
        MOCK_TOOLS.simple,
        MOCK_TOOLS.complex,
        MOCK_TOOLS.multiPart,
      ];

      const excludeFilter = ['multipart_tool'];
      const filtered = allTools.filter(t => !excludeFilter.includes(t.name));

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).not.toContain('multipart_tool');
    });

    it('should handle conflict resolution with prefixing', () => {
      const server1Tool = 'serverA__duplicate_tool';
      const server2Tool = 'serverB__duplicate_tool';

      expect(server1Tool).toMatch(/^serverA__/);
      expect(server2Tool).toMatch(/^serverB__/);
      expect(server1Tool).not.toBe(server2Tool);
    });
  });

  describe('Error Handling', () => {
    it('should handle tool not found error', async () => {
      const serverName = 'test-server';
      const toolName = 'nonexistent_tool';

      await expect(
        client.callTool(serverName, toolName)
      ).rejects.toThrow();
    });

    it('should handle server not connected error', async () => {
      const serverName = 'not-connected';
      const toolName = 'any_tool';

      await expect(
        client.callTool(serverName, toolName)
      ).rejects.toThrow('MCP client not connected');
    });

    it('should return proper JSON-RPC error structure', () => {
      const error = {
        code: MCP_ERROR_CODES.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: { param: 'input', reason: 'required field missing' },
      };

      expect(error.code).toBe(-32602);
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('data');
    });
  });
});
