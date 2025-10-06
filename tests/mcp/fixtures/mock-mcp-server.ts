/**
 * Mock MCP Server for Testing
 * Implements a complete MCP server that can be configured for different test scenarios
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export interface MockServerOptions {
  name?: string;
  version?: string;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
    handler?: (args: any) => Promise<any>;
  }>;
  prompts?: Array<{
    name: string;
    description: string;
    arguments?: any[];
    handler?: (args: any) => Promise<any>;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    mimeType?: string;
    description?: string;
    handler?: () => Promise<any>;
  }>;
  failOnConnect?: boolean;
  delayMs?: number;
  throwErrors?: boolean;
}

export class MockMCPServer {
  private server: Server;
  private options: MockServerOptions;

  constructor(options: MockServerOptions = {}) {
    this.options = {
      name: 'mock-server',
      version: '1.0.0',
      tools: [],
      prompts: [],
      resources: [],
      ...options,
    };

    this.server = new Server(
      {
        name: this.options.name!,
        version: this.options.version!,
      },
      {
        capabilities: {
          tools: (this.options.tools?.length ?? 0) > 0 ? {} : undefined,
          prompts: (this.options.prompts?.length ?? 0) > 0 ? {} : undefined,
          resources: (this.options.resources?.length ?? 0) > 0 ? {} : undefined,
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools handlers
    if (this.options.tools && this.options.tools.length > 0) {
      this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: this.options.tools!.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }));

      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (this.options.delayMs) {
          await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        }

        const tool = this.options.tools!.find(t => t.name === request.params.name);
        if (!tool) {
          throw new Error(`Tool not found: ${request.params.name}`);
        }

        if (tool.handler) {
          const result = await tool.handler(request.params.arguments || {});
          return {
            content: [
              {
                type: 'text' as const,
                text: typeof result === 'string' ? result : JSON.stringify(result),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Tool ${tool.name} executed with args: ${JSON.stringify(request.params.arguments)}`,
            },
          ],
        };
      });
    }

    // Prompts handlers
    if (this.options.prompts && this.options.prompts.length > 0) {
      this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: this.options.prompts!.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      }));

      this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const prompt = this.options.prompts!.find(p => p.name === request.params.name);
        if (!prompt) {
          throw new Error(`Prompt not found: ${request.params.name}`);
        }

        if (prompt.handler) {
          const result = await prompt.handler(request.params.arguments || {});
          return result;
        }

        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `Prompt ${prompt.name} with args: ${JSON.stringify(request.params.arguments)}`,
              },
            },
          ],
        };
      });
    }

    // Resources handlers
    if (this.options.resources && this.options.resources.length > 0) {
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: this.options.resources!.map(r => ({
          uri: r.uri,
          name: r.name,
          mimeType: r.mimeType,
          description: r.description,
        })),
      }));

      this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const resource = this.options.resources!.find(r => r.uri === request.params.uri);
        if (!resource) {
          throw new Error(`Resource not found: ${request.params.uri}`);
        }

        if (resource.handler) {
          const result = await resource.handler();
          return result;
        }

        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType || 'text/plain',
              text: `Content of ${resource.name}`,
            },
          ],
        };
      });
    }
  }

  async connect() {
    if (this.options.failOnConnect) {
      throw new Error('Mock server configured to fail on connect');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    return this.server;
  }

  async close() {
    await this.server.close();
  }

  getServer() {
    return this.server;
  }
}

/**
 * Factory functions for common test scenarios
 */
export const createMockToolServer = (tools: MockServerOptions['tools']) =>
  new MockMCPServer({ tools });

export const createMockPromptServer = (prompts: MockServerOptions['prompts']) =>
  new MockMCPServer({ prompts });

export const createMockResourceServer = (resources: MockServerOptions['resources']) =>
  new MockMCPServer({ resources });

export const createMockMultiCapabilityServer = (options: MockServerOptions) =>
  new MockMCPServer(options);
