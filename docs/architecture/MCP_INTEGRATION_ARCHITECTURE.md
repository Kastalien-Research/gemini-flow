# MCP Integration Architecture for Gemini Flow
**Version:** 1.0.0
**Date:** October 6, 2025
**Author:** System Architecture Agent
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Vision](#architecture-vision)
3. [Phase 1: Critical Foundation](#phase-1-critical-foundation)
4. [Phase 2: High Priority Primitives](#phase-2-high-priority-primitives)
5. [Phase 3: Medium Priority Features](#phase-3-medium-priority-features)
6. [Phase 4: Advanced Features](#phase-4-advanced-features)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Risk Analysis & Mitigation](#risk-analysis--mitigation)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

### Current State
Gemini Flow currently implements a **custom MCP adapter** (`src/core/mcp-adapter.ts`) that provides basic tool transformation without using the official `@modelcontextprotocol/sdk`. This results in:
- 15% MCP specification compliance (8/53 features)
- No actual transport layer implementation
- No protocol-level communication (`tools/list`, `tools/call`)
- Significant compatibility risks with standard MCP servers

### Target State
A fully compliant MCP implementation providing:
- Official SDK integration (`@modelcontextprotocol/sdk`)
- Complete transport layer (stdio, Streamable HTTP)
- Full Tools primitive with protocol compliance
- Prompts, Resources, and Authentication support
- 75%+ MCP specification coverage

### Architecture Decision Records (ADRs)

#### ADR-001: Migrate to Official MCP SDK
**Decision:** Replace custom adapter with `@modelcontextprotocol/sdk`
**Rationale:**
- Ensures protocol compliance and interoperability
- Reduces maintenance burden
- Provides battle-tested transport implementations
- Aligns with gemini-cli's proven approach

**Alternatives Considered:**
- Enhance custom adapter → Rejected: reinventing the wheel, compatibility risks
- Fork MCP SDK → Rejected: maintenance overhead, divergence from standard

**Consequences:**
- Major refactor of `src/core/mcp-adapter.ts`
- Breaking changes to existing MCP integration
- Migration path needed for existing configurations
- Long-term: reduced complexity, improved reliability

#### ADR-002: Dual Transport Architecture
**Decision:** Implement stdio and Streamable HTTP transports, skip deprecated SSE
**Rationale:**
- Stdio: Local process communication (most common use case)
- Streamable HTTP: Remote server support (growing importance)
- SSE: Deprecated in recent MCP versions (avoid technical debt)

**Alternatives Considered:**
- Implement all three including SSE → Rejected: SSE deprecated, wastes effort
- Only stdio → Rejected: limits cloud/remote capabilities

**Consequences:**
- Need process lifecycle management for stdio
- Need HTTP client infrastructure for Streamable HTTP
- May need to document migration for users expecting SSE

#### ADR-003: Phased Implementation Strategy
**Decision:** Four-phase rollout prioritizing critical features first
**Rationale:**
- Phase 1 (Critical): Enables basic MCP functionality
- Phase 2 (High): Core primitives for production use
- Phase 3 (Medium): Enhanced security and workflows
- Phase 4 (Advanced): Cutting-edge features

**Alternatives Considered:**
- Big-bang implementation → Rejected: high risk, delayed value
- Feature-by-feature → Rejected: lacks cohesion, integration challenges

**Consequences:**
- Clear milestones and deliverables
- Early feedback and validation
- Incremental value delivery
- Risk mitigation through phased approach

---

## Architecture Vision

### System Context Diagram (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Gemini Flow System                        │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────────┐   │
│  │                │         │                              │   │
│  │  Gemini Flow   │◄────────┤   MCP Integration Layer      │   │
│  │  Core Engine   │         │  (NEW: Official SDK Based)   │   │
│  │                │         │                              │   │
│  └────────────────┘         └───────────┬──────────────────┘   │
│                                         │                       │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
             ┌──────▼──────┐       ┌─────▼──────┐      ┌──────▼──────┐
             │   Stdio      │       │  Streamable│      │   OAuth     │
             │  Transport   │       │    HTTP    │      │  Provider   │
             │  (Local)     │       │  (Remote)  │      │             │
             └──────┬───────┘       └─────┬──────┘      └─────────────┘
                    │                     │
        ┌───────────┼─────────────────────┼───────────┐
        │           │                     │           │
   ┌────▼────┐ ┌───▼─────┐         ┌────▼────┐ ┌────▼────┐
   │  Local  │ │  Local  │         │ Remote  │ │ Remote  │
   │  MCP    │ │  MCP    │         │  MCP    │ │  MCP    │
   │ Server  │ │ Server  │         │ Server  │ │ Server  │
   │    A    │ │    B    │         │    C    │ │    D    │
   └─────────┘ └─────────┘         └─────────┘ └─────────┘
```

### Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MCP Integration Layer (New Architecture)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Client Manager Layer                          │  │
│  │                                                                    │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │  │
│  │  │  McpClient   │    │ McpClient     │    │  McpClient       │  │  │
│  │  │  Manager     │───►│  Lifecycle    │───►│  Registry        │  │  │
│  │  │  (Multi-     │    │  (Connect/    │    │  (Tool/Prompt    │  │  │
│  │  │   server)    │    │   Discover)   │    │   Discovery)     │  │  │
│  │  └──────────────┘    └───────────────┘    └──────────────────┘  │  │
│  │                                                                    │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼───────────────────────────────────┐  │
│  │                     Protocol Layer                                  │  │
│  │                                                                      │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐   │  │
│  │  │  Tools       │    │  Prompts      │    │  Resources       │   │  │
│  │  │  Protocol    │    │  Protocol     │    │  Protocol        │   │  │
│  │  │  (tools/     │    │  (prompts/    │    │  (resources/     │   │  │
│  │  │   list/call) │    │   list/get)   │    │   list/read)     │   │  │
│  │  └──────────────┘    └───────────────┘    └──────────────────┘   │  │
│  │                                                                      │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼───────────────────────────────────┐  │
│  │                     Transport Layer                                  │  │
│  │                                                                      │  │
│  │  ┌──────────────────┐              ┌────────────────────────────┐  │  │
│  │  │  Stdio           │              │  Streamable HTTP           │  │  │
│  │  │  Transport       │              │  Transport                 │  │  │
│  │  │  - Process spawn │              │  - HTTP POST               │  │  │
│  │  │  - stdin/stdout  │              │  - Bidirectional streaming │  │  │
│  │  │  - Lifecycle mgmt│              │  - Custom headers          │  │  │
│  │  └──────────────────┘              └────────────────────────────┘  │  │
│  │                                                                      │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   │                                      │
│  ┌────────────────────────────────▼───────────────────────────────────┐  │
│  │                     Authentication Layer                             │  │
│  │                                                                      │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐   │  │
│  │  │  OAuth 2.0   │    │  Token        │    │  Auth Provider   │   │  │
│  │  │  Provider    │    │  Storage      │    │  Manager         │   │  │
│  │  │  (Dynamic    │    │  (Secure      │    │  (Multi-         │   │  │
│  │  │   discovery) │    │   cache)      │    │   provider)      │   │  │
│  │  └──────────────┘    └───────────────┘    └──────────────────┘   │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Official SDK First**: Use `@modelcontextprotocol/sdk` for all protocol operations
2. **Separation of Concerns**: Clear boundaries between transport, protocol, and application layers
3. **Backward Compatibility**: Gradual migration path for existing adapter users
4. **Security by Design**: Authentication and authorization at every layer
5. **Observable**: Comprehensive logging, metrics, and debugging support
6. **Testable**: Unit and integration tests for all components
7. **Extensible**: Plugin architecture for custom transports and primitives

---

## Phase 1: Critical Foundation
**Duration:** 4-6 weeks
**Priority:** CRITICAL
**Goal:** Establish MCP-compliant foundation with official SDK

### 1.1 Official SDK Integration

#### File Structure
```
src/mcp/
├── client/
│   ├── mcp-client.ts           # Core client wrapper around SDK
│   ├── mcp-client-manager.ts   # Multi-server management
│   ├── lifecycle-manager.ts    # Connection lifecycle
│   └── discovery-manager.ts    # Tool/prompt discovery
├── transport/
│   ├── stdio-transport.ts      # Stdio implementation
│   ├── http-transport.ts       # Streamable HTTP implementation
│   ├── transport-factory.ts    # Transport creation
│   └── process-manager.ts      # Process lifecycle for stdio
├── protocol/
│   ├── tools-protocol.ts       # tools/list, tools/call
│   ├── schema-sanitizer.ts     # Gemini API compatibility
│   └── response-transformer.ts # MCP to Gemini conversion
├── config/
│   ├── mcp-config.ts          # Configuration types
│   └── server-config.ts       # Server-specific settings
└── index.ts                   # Public API exports
```

#### Class Design: McpClient

```typescript
// src/mcp/client/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Tool, Prompt } from '@modelcontextprotocol/sdk/types.js';

export enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

export interface McpClientConfig {
  serverName: string;
  serverConfig: MCPServerConfig;
  debugMode?: boolean;
  timeout?: number;
}

export class McpClient {
  private client: Client | undefined;
  private transport: Transport | undefined;
  private status: MCPServerStatus = MCPServerStatus.DISCONNECTED;
  private discoveredTools: Map<string, Tool> = new Map();
  private discoveredPrompts: Map<string, Prompt> = new Map();

  constructor(
    private readonly config: McpClientConfig,
    private readonly logger: Logger
  ) {}

  /**
   * Connect to MCP server and initialize client
   */
  async connect(): Promise<void> {
    this.setStatus(MCPServerStatus.CONNECTING);

    try {
      // Create transport based on config
      this.transport = await this.createTransport();

      // Initialize MCP client from official SDK
      this.client = new Client({
        name: 'gemini-flow',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      });

      // Connect client to transport
      await this.client.connect(this.transport);

      this.setStatus(MCPServerStatus.CONNECTED);
      this.logger.info(`Connected to MCP server: ${this.config.serverName}`);

    } catch (error) {
      this.setStatus(MCPServerStatus.ERROR);
      this.logger.error(`Failed to connect to ${this.config.serverName}:`, error);
      throw error;
    }
  }

  /**
   * Discover tools from connected server
   */
  async discoverTools(): Promise<Tool[]> {
    this.assertConnected();

    try {
      const result = await this.client!.request({
        method: 'tools/list'
      }, ToolsListResultSchema);

      // Store tools in registry
      result.tools.forEach(tool => {
        this.discoveredTools.set(tool.name, tool);
      });

      this.logger.info(`Discovered ${result.tools.length} tools from ${this.config.serverName}`);
      return result.tools;

    } catch (error) {
      this.logger.error(`Tool discovery failed for ${this.config.serverName}:`, error);
      throw error;
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    this.assertConnected();

    try {
      const result = await this.client!.request({
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      }, ToolCallResultSchema);

      this.logger.debug(`Tool call successful: ${name}`, { result });
      return result;

    } catch (error) {
      this.logger.error(`Tool call failed: ${name}`, error);
      throw error;
    }
  }

  /**
   * Gracefully disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.status === MCPServerStatus.DISCONNECTED) return;

    this.setStatus(MCPServerStatus.DISCONNECTING);

    try {
      await this.client?.close();
      this.transport = undefined;
      this.client = undefined;
      this.setStatus(MCPServerStatus.DISCONNECTED);

      this.logger.info(`Disconnected from ${this.config.serverName}`);

    } catch (error) {
      this.logger.error(`Error during disconnect:`, error);
      throw error;
    }
  }

  getStatus(): MCPServerStatus {
    return this.status;
  }

  private setStatus(status: MCPServerStatus): void {
    this.status = status;
    // Emit status change event for monitoring
  }

  private assertConnected(): void {
    if (this.status !== MCPServerStatus.CONNECTED || !this.client) {
      throw new Error(`MCP client not connected: ${this.config.serverName}`);
    }
  }

  private async createTransport(): Promise<Transport> {
    // Implemented in transport-factory.ts
  }
}
```

#### Class Design: TransportFactory

```typescript
// src/mcp/transport/transport-factory.ts
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export type TransportType = 'stdio' | 'http';

export interface StdioConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface HttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export type TransportConfig = StdioConfig | HttpConfig;

export class TransportFactory {

  static async create(config: TransportConfig, logger: Logger): Promise<Transport> {
    switch (config.type) {
      case 'stdio':
        return this.createStdioTransport(config, logger);

      case 'http':
        return this.createHttpTransport(config, logger);

      default:
        throw new Error(`Unsupported transport type: ${(config as any).type}`);
    }
  }

  private static async createStdioTransport(
    config: StdioConfig,
    logger: Logger
  ): Promise<Transport> {
    logger.debug('Creating stdio transport', { config });

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...process.env,
        ...config.env
      },
      cwd: config.cwd || process.cwd()
    });

    return transport;
  }

  private static async createHttpTransport(
    config: HttpConfig,
    logger: Logger
  ): Promise<Transport> {
    logger.debug('Creating HTTP transport', { url: config.url });

    const transport = new StreamableHTTPClientTransport(
      new URL(config.url),
      {
        headers: config.headers,
        requestTimeoutMs: config.timeout || 30000
      }
    );

    return transport;
  }
}
```

### 1.2 Tools Protocol Implementation

#### Schema Sanitization

```typescript
// src/mcp/protocol/schema-sanitizer.ts

/**
 * Sanitizes MCP tool schemas for Gemini API compatibility
 * Based on gemini-cli implementation
 */
export class SchemaSanitizer {

  /**
   * Sanitize tool parameter schema for Gemini API
   */
  static sanitize(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const sanitized = { ...schema };

    // Remove $schema (Gemini doesn't support it)
    delete sanitized.$schema;

    // Remove additionalProperties (causes validation issues)
    delete sanitized.additionalProperties;

    // Handle anyOf with default (Vertex AI compatibility issue)
    if (sanitized.anyOf && Array.isArray(sanitized.anyOf)) {
      delete sanitized.default;
    }

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    });

    // Recursively sanitize properties
    if (sanitized.properties) {
      Object.keys(sanitized.properties).forEach(prop => {
        sanitized.properties[prop] = this.sanitize(sanitized.properties[prop]);
      });
    }

    return sanitized;
  }

  /**
   * Convert MCP tool to Gemini FunctionDeclaration
   */
  static toGeminiFunctionDeclaration(tool: Tool): FunctionDeclaration {
    return {
      name: tool.name,
      description: tool.description || '',
      parameters: this.sanitize(tool.inputSchema)
    };
  }
}
```

#### Response Transformation

```typescript
// src/mcp/protocol/response-transformer.ts

/**
 * Transforms MCP tool responses to formats compatible with Gemini Flow
 */
export class ResponseTransformer {

  /**
   * Transform MCP tool call result to Gemini-compatible format
   */
  static transformToolResult(result: ToolCallResult): any {
    const content: any[] = [];

    // Process content blocks
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach(block => {
        switch (block.type) {
          case 'text':
            content.push({
              type: 'text',
              text: block.text
            });
            break;

          case 'image':
            content.push({
              type: 'image',
              mimeType: block.mimeType,
              data: block.data
            });
            break;

          case 'audio':
            content.push({
              type: 'audio',
              mimeType: block.mimeType,
              data: block.data
            });
            break;

          case 'resource':
            // Embed resource content
            if (block.resource.text) {
              content.push({
                type: 'text',
                text: `[Resource: ${block.resource.uri}]\n${block.resource.text}`
              });
            }
            break;

          default:
            // Unknown block type - log warning
            console.warn(`Unknown content block type: ${(block as any).type}`);
        }
      });
    }

    // Handle errors
    if (result.isError) {
      return {
        error: true,
        message: this.extractTextContent(content),
        content
      };
    }

    return {
      success: true,
      content
    };
  }

  private static extractTextContent(content: any[]): string {
    return content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
}
```

### 1.3 Migration Strategy

#### Adapter Compatibility Layer

```typescript
// src/mcp/legacy/adapter-compat.ts

/**
 * Compatibility layer for existing MCPToGeminiAdapter users
 * Provides backward compatibility during migration
 */
export class AdapterCompatibilityLayer {
  private clientManager: McpClientManager;

  constructor(apiKey: string, modelName?: string) {
    // Initialize new MCP infrastructure
    this.clientManager = new McpClientManager({
      debugMode: false
    });
  }

  /**
   * @deprecated Use McpClientManager directly
   */
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    console.warn(
      'MCPToGeminiAdapter.processRequest is deprecated. ' +
      'Migrate to McpClientManager for full MCP support.'
    );

    // Bridge to new implementation
    // ... implementation details
  }

  /**
   * @deprecated Use McpClient.callTool directly
   */
  async callMCPTool<T extends MCPToolName>(
    toolName: T,
    params: MCPToolParameters<T>
  ): Promise<MCPToolReturnType<T>> {
    console.warn(
      'MCPToGeminiAdapter.callMCPTool is deprecated. ' +
      'Use McpClient.callTool for direct MCP protocol access.'
    );

    // Bridge to new implementation
    // ... implementation details
  }
}
```

### 1.4 Configuration Management

```typescript
// src/mcp/config/mcp-config.ts

export interface MCPServerConfig {
  // Transport configuration
  transport: 'stdio' | 'http';

  // Stdio-specific
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;

  // HTTP-specific
  url?: string;
  headers?: Record<string, string>;

  // Common settings
  timeout?: number;
  trust?: boolean;
  disabled?: boolean;

  // Authentication
  auth?: {
    type: 'oauth' | 'api-key' | 'google-credentials';
    config?: any;
  };

  // Tool filtering
  includeTools?: string[];
  excludeTools?: string[];

  // Prompt filtering
  includePrompts?: string[];
  excludePrompts?: string[];
}

export interface MCPConfiguration {
  servers: Record<string, MCPServerConfig>;
  globalSettings?: {
    defaultTimeout?: number;
    debugMode?: boolean;
    trustedFolders?: string[];
  };
}
```

### 1.5 Testing Strategy

#### Unit Tests
```typescript
// tests/mcp/client/mcp-client.test.ts

describe('McpClient', () => {
  describe('connection lifecycle', () => {
    it('should connect to stdio server', async () => {
      const client = new McpClient({
        serverName: 'test-server',
        serverConfig: {
          transport: 'stdio',
          command: 'node',
          args: ['test-mcp-server.js']
        }
      }, logger);

      await client.connect();
      expect(client.getStatus()).toBe(MCPServerStatus.CONNECTED);

      await client.disconnect();
      expect(client.getStatus()).toBe(MCPServerStatus.DISCONNECTED);
    });

    it('should connect to HTTP server', async () => {
      const client = new McpClient({
        serverName: 'remote-server',
        serverConfig: {
          transport: 'http',
          url: 'https://mcp.example.com'
        }
      }, logger);

      await client.connect();
      expect(client.getStatus()).toBe(MCPServerStatus.CONNECTED);
    });
  });

  describe('tool discovery', () => {
    it('should discover tools from server', async () => {
      const client = createConnectedClient();
      const tools = await client.discoverTools();

      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });
  });

  describe('tool execution', () => {
    it('should call tool and return result', async () => {
      const client = createConnectedClient();
      await client.discoverTools();

      const result = await client.callTool('echo', { message: 'hello' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle tool execution errors', async () => {
      const client = createConnectedClient();

      await expect(
        client.callTool('nonexistent-tool', {})
      ).rejects.toThrow();
    });
  });
});
```

#### Integration Tests
```typescript
// tests/mcp/integration/end-to-end.test.ts

describe('MCP End-to-End Integration', () => {
  it('should connect, discover, and execute tool', async () => {
    const manager = new McpClientManager();

    // Register server
    await manager.addServer('test-server', {
      transport: 'stdio',
      command: 'npx',
      args: ['@modelcontextprotocol/server-everything']
    });

    // Connect
    await manager.connect('test-server');

    // Discover
    const tools = await manager.getClient('test-server').discoverTools();
    expect(tools.length).toBeGreaterThan(0);

    // Execute
    const result = await manager.getClient('test-server').callTool(
      tools[0].name,
      {}
    );
    expect(result).toBeDefined();

    // Cleanup
    await manager.disconnectAll();
  });
});
```

### 1.6 Phase 1 Deliverables

- [ ] `@modelcontextprotocol/sdk` integrated as dependency
- [ ] `McpClient` class with full lifecycle management
- [ ] `TransportFactory` for stdio and HTTP transports
- [ ] `tools/list` and `tools/call` protocol implementation
- [ ] Schema sanitization for Gemini API compatibility
- [ ] Response transformation for multi-part content
- [ ] Configuration management for server settings
- [ ] Backward compatibility layer for existing adapter
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests with reference MCP servers
- [ ] Migration guide documentation
- [ ] API reference documentation

### 1.7 Success Criteria

✅ Can connect to stdio MCP servers
✅ Can connect to HTTP MCP servers
✅ Can discover tools using `tools/list`
✅ Can execute tools using `tools/call`
✅ Multi-part responses handled correctly
✅ Gemini API schema compatibility maintained
✅ Existing adapter users can migrate incrementally
✅ All tests passing
✅ Zero regressions in gemini-flow core functionality

---

## Phase 2: High Priority Primitives
**Duration:** 4-6 weeks
**Priority:** HIGH
**Goal:** Implement Prompts, Resources, and OAuth authentication

### 2.1 Prompts Primitive

#### File Structure
```
src/mcp/protocol/
├── prompts-protocol.ts         # prompts/list, prompts/get
├── prompt-registry.ts          # Prompt storage and management
└── prompt-argument-parser.ts   # Argument parsing and validation
```

#### Class Design: PromptsProtocol

```typescript
// src/mcp/protocol/prompts-protocol.ts

import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export interface DiscoveredPrompt extends Prompt {
  serverName: string;
  invoke: (args: Record<string, unknown>) => Promise<GetPromptResult>;
}

export class PromptsProtocol {

  constructor(
    private readonly client: McpClient,
    private readonly registry: PromptRegistry
  ) {}

  /**
   * Discover prompts from MCP server
   */
  async discoverPrompts(): Promise<DiscoveredPrompt[]> {
    const result = await this.client.request({
      method: 'prompts/list'
    }, ListPromptsResultSchema);

    const discoveredPrompts = result.prompts.map(prompt => ({
      ...prompt,
      serverName: this.client.getServerName(),
      invoke: async (args: Record<string, unknown>) => {
        return this.getPrompt(prompt.name, args);
      }
    }));

    // Register prompts
    discoveredPrompts.forEach(prompt => {
      this.registry.register(prompt);
    });

    return discoveredPrompts;
  }

  /**
   * Get prompt with arguments
   */
  async getPrompt(name: string, args: Record<string, unknown> = {}): Promise<GetPromptResult> {
    const result = await this.client.request({
      method: 'prompts/get',
      params: {
        name,
        arguments: args
      }
    }, GetPromptResultSchema);

    return result;
  }

  /**
   * Get prompt as formatted messages for Gemini
   */
  async getPromptAsMessages(name: string, args: Record<string, unknown> = {}): Promise<any[]> {
    const result = await this.getPrompt(name, args);

    // Transform MCP prompt messages to Gemini format
    return result.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.content.text ? [{ text: msg.content.text }] : []
    }));
  }
}
```

#### Integration with CLI Commands

```typescript
// src/cli/commands/prompts.ts

export class PromptsCommand {

  /**
   * List available prompts from all connected servers
   */
  async listPrompts(): Promise<void> {
    const manager = await this.getClientManager();
    const allPrompts: DiscoveredPrompt[] = [];

    for (const serverName of manager.getConnectedServers()) {
      const client = manager.getClient(serverName);
      const prompts = await client.discoverPrompts();
      allPrompts.push(...prompts);
    }

    // Display prompts
    console.log('\nAvailable MCP Prompts:\n');
    allPrompts.forEach(prompt => {
      console.log(`  ${prompt.serverName}/${prompt.name}`);
      console.log(`    ${prompt.description || 'No description'}`);
      if (prompt.arguments && prompt.arguments.length > 0) {
        console.log(`    Arguments: ${prompt.arguments.map(a => a.name).join(', ')}`);
      }
      console.log();
    });
  }

  /**
   * Execute a prompt as a slash command
   */
  async executePrompt(promptName: string, args: Record<string, unknown>): Promise<void> {
    const manager = await this.getClientManager();

    // Parse server/prompt format
    const [serverName, name] = this.parsePromptName(promptName);

    const client = manager.getClient(serverName);
    const messages = await client.getPromptAsMessages(name, args);

    // Send messages to Gemini
    // ... implementation
  }

  private parsePromptName(fullName: string): [string, string] {
    const parts = fullName.split('/');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    } else {
      // Assume first server if no prefix
      const servers = this.getClientManager().getConnectedServers();
      return [servers[0], fullName];
    }
  }
}
```

### 2.2 Resources Primitive

#### File Structure
```
src/mcp/protocol/
├── resources-protocol.ts       # resources/list, resources/read
├── resource-registry.ts        # Resource storage and caching
└── resource-uri-handler.ts     # URI parsing and validation
```

#### Class Design: ResourcesProtocol

```typescript
// src/mcp/protocol/resources-protocol.ts

import type { Resource, ResourceContents } from '@modelcontextprotocol/sdk/types.js';

export interface DiscoveredResource extends Resource {
  serverName: string;
  read: () => Promise<ResourceContents>;
}

export class ResourcesProtocol {

  constructor(
    private readonly client: McpClient,
    private readonly registry: ResourceRegistry,
    private readonly cache: CacheManager
  ) {}

  /**
   * Discover resources from MCP server
   */
  async discoverResources(): Promise<DiscoveredResource[]> {
    const result = await this.client.request({
      method: 'resources/list'
    }, ListResourcesResultSchema);

    const discoveredResources = result.resources.map(resource => ({
      ...resource,
      serverName: this.client.getServerName(),
      read: async () => {
        return this.readResource(resource.uri);
      }
    }));

    // Register resources
    discoveredResources.forEach(resource => {
      this.registry.register(resource);
    });

    return discoveredResources;
  }

  /**
   * Read resource content
   */
  async readResource(uri: string): Promise<ResourceContents> {
    // Check cache first
    const cacheKey = `resource:${uri}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.client.request({
      method: 'resources/read',
      params: { uri }
    }, ReadResourceResultSchema);

    // Cache resource content
    await this.cache.set(cacheKey, result.contents, 300); // 5 min TTL

    return result.contents;
  }

  /**
   * Subscribe to resource updates
   */
  async subscribeToResource(uri: string, callback: (contents: ResourceContents) => void): Promise<Unsubscribe> {
    // Subscribe to resource notifications
    const subscription = await this.client.subscribe({
      method: 'resources/subscribe',
      params: { uri }
    });

    // Handle notifications
    subscription.on('notification', (notification) => {
      if (notification.method === 'notifications/resources/updated' &&
          notification.params.uri === uri) {
        // Invalidate cache and fetch updated content
        this.cache.delete(`resource:${uri}`);
        this.readResource(uri).then(callback);
      }
    });

    return () => subscription.unsubscribe();
  }
}
```

#### Resource Integration with Gemini Context

```typescript
// src/mcp/integration/resource-context-provider.ts

/**
 * Provides resource content as context for Gemini requests
 */
export class ResourceContextProvider {

  constructor(private readonly resourcesProtocol: ResourcesProtocol) {}

  /**
   * Fetch resources and format for Gemini context
   */
  async getResourcesAsContext(uris: string[]): Promise<string> {
    const contents = await Promise.all(
      uris.map(uri => this.resourcesProtocol.readResource(uri))
    );

    // Format resources as context
    return contents.map((content, i) => {
      const uri = uris[i];

      if (content.text) {
        return `[Resource: ${uri}]\n${content.text}\n`;
      } else if (content.blob) {
        return `[Binary Resource: ${uri}]\n[MIME Type: ${content.mimeType}]\n`;
      }

      return '';
    }).join('\n');
  }

  /**
   * Auto-include relevant resources based on workspace context
   */
  async getRelevantResources(query: string): Promise<string[]> {
    // Discover all resources
    const resources = await this.resourcesProtocol.discoverResources();

    // Simple relevance scoring (can be enhanced with embeddings)
    const scored = resources.map(resource => ({
      uri: resource.uri,
      score: this.calculateRelevance(resource, query)
    }));

    // Return top 5 most relevant
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.uri);
  }

  private calculateRelevance(resource: DiscoveredResource, query: string): number {
    // Simple keyword matching (can be enhanced)
    const keywords = query.toLowerCase().split(' ');
    const resourceText = `${resource.name} ${resource.description || ''}`.toLowerCase();

    return keywords.filter(k => resourceText.includes(k)).length;
  }
}
```

### 2.3 OAuth 2.0 Authentication

#### File Structure
```
src/mcp/auth/
├── oauth-provider.ts           # OAuth 2.0 flow implementation
├── oauth-token-storage.ts      # Secure token storage
├── oauth-utils.ts              # OAuth helper utilities
├── google-auth-provider.ts     # Google ADC integration
└── auth-manager.ts             # Unified authentication management
```

#### Class Design: OAuthProvider

```typescript
// src/mcp/auth/oauth-provider.ts

export interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

export class MCPOAuthProvider {
  private readonly callbackPort = 7777;
  private readonly callbackPath = '/oauth/callback';

  constructor(
    private readonly config: OAuthConfig,
    private readonly tokenStorage: MCPOAuthTokenStorage,
    private readonly logger: Logger
  ) {}

  /**
   * Perform OAuth 2.0 authorization flow
   */
  async authorize(serverName: string): Promise<string> {
    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = OAuthUtils.generatePKCE();

    // Build authorization URL
    const authUrl = this.buildAuthorizationUrl(codeChallenge);

    // Start local callback server
    const authCode = await this.startCallbackServer();

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);

    // Store token securely
    await this.tokenStorage.storeToken(serverName, tokenResponse);

    return tokenResponse.access_token;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(serverName: string): Promise<string> {
    const token = await this.tokenStorage.getToken(serverName);

    if (!token) {
      throw new Error(`No token found for server: ${serverName}`);
    }

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      // Refresh token
      const newToken = await this.refreshAccessToken(serverName, token.refresh_token);
      await this.tokenStorage.storeToken(serverName, newToken);
      return newToken.access_token;
    }

    return token.access_token;
  }

  private buildAuthorizationUrl(codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.getRedirectUri(),
      scope: this.config.scopes?.join(' ') || '',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  private async startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url!, `http://localhost:${this.callbackPort}`);

        if (url.pathname === this.callbackPath) {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400);
            res.end('Authorization failed');
            reject(new Error(`OAuth error: ${error}`));
          } else if (code) {
            res.writeHead(200);
            res.end('Authorization successful! You can close this window.');
            resolve(code);
          }

          server.close();
        }
      });

      server.listen(this.callbackPort);
    });
  }

  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getRedirectUri(),
        client_id: this.config.clientId,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private getRedirectUri(): string {
    return this.config.redirectUri ||
      `http://localhost:${this.callbackPort}${this.callbackPath}`;
  }
}
```

#### Dynamic OAuth Discovery

```typescript
// src/mcp/auth/oauth-discovery.ts

/**
 * Automatically discovers OAuth configuration from MCP server
 */
export class OAuthDiscovery {

  /**
   * Detect OAuth requirement from 401 response
   */
  static async detectOAuthRequirement(url: string): Promise<OAuthConfig | null> {
    try {
      const response = await fetch(url, { method: 'POST' });

      if (response.status === 401) {
        const wwwAuth = response.headers.get('WWW-Authenticate');

        if (wwwAuth && wwwAuth.includes('OAuth')) {
          // Parse OAuth endpoints from metadata
          return this.discoverEndpoints(url);
        }
      }
    } catch (error) {
      // Not OAuth-protected
    }

    return null;
  }

  /**
   * Discover OAuth endpoints from server metadata
   */
  private static async discoverEndpoints(baseUrl: string): Promise<OAuthConfig> {
    const metadataUrl = new URL('/.well-known/oauth-authorization-server', baseUrl);

    const response = await fetch(metadataUrl.toString());
    const metadata = await response.json();

    return {
      authorizationEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint,
      clientId: '', // Will be registered dynamically
      scopes: metadata.scopes_supported || []
    };
  }
}
```

### 2.4 Phase 2 Deliverables

- [ ] `PromptsProtocol` with `prompts/list` and `prompts/get`
- [ ] `PromptRegistry` for prompt management
- [ ] CLI commands for listing and executing prompts
- [ ] `ResourcesProtocol` with `resources/list` and `resources/read`
- [ ] Resource subscriptions for live updates
- [ ] Resource context provider for Gemini integration
- [ ] `MCPOAuthProvider` with PKCE flow
- [ ] OAuth token storage with encryption
- [ ] Dynamic OAuth discovery
- [ ] Google ADC integration
- [ ] Unit tests for all components (80%+ coverage)
- [ ] Integration tests with MCP servers
- [ ] Documentation for prompts, resources, and auth

### 2.5 Success Criteria

✅ Can discover and invoke prompts from MCP servers
✅ Prompts work as reusable templates with arguments
✅ Can list and read resources from MCP servers
✅ Resource subscriptions notify of updates
✅ Resources provide context to Gemini requests
✅ OAuth 2.0 flow completes successfully
✅ Tokens are stored securely and refreshed automatically
✅ Dynamic OAuth discovery works with compliant servers
✅ All tests passing
✅ Documentation complete and accurate

---

## Phase 3: Medium Priority Features
**Duration:** 3-4 weeks
**Priority:** MEDIUM
**Goal:** Implement Roots, Sampling, and enhanced security

### 3.1 Roots Primitive

#### File Structure
```
src/mcp/protocol/
├── roots-protocol.ts           # roots/list implementation
├── roots-enforcer.ts           # Filesystem boundary enforcement
└── roots-validator.ts          # URI validation
```

#### Class Design: RootsProtocol

```typescript
// src/mcp/protocol/roots-protocol.ts

import type { Root } from '@modelcontextprotocol/sdk/types.js';

export class RootsProtocol {
  private allowedRoots: Set<string> = new Set();

  constructor(
    private readonly client: McpClient,
    private readonly logger: Logger
  ) {}

  /**
   * Discover allowed root directories from server
   */
  async discoverRoots(): Promise<Root[]> {
    const result = await this.client.request({
      method: 'roots/list'
    }, ListRootsResultSchema);

    // Store allowed roots for enforcement
    result.roots.forEach(root => {
      this.allowedRoots.add(root.uri);
    });

    this.logger.info(
      `Discovered ${result.roots.length} roots for ${this.client.getServerName()}`
    );

    return result.roots;
  }

  /**
   * Check if a file URI is within allowed roots
   */
  isPathAllowed(fileUri: string): boolean {
    // Parse file:// URI
    const url = new URL(fileUri);
    if (url.protocol !== 'file:') {
      return false; // Only file:// URIs are subject to roots
    }

    const filePath = url.pathname;

    // Check if path is within any allowed root
    for (const root of this.allowedRoots) {
      const rootUrl = new URL(root);
      if (filePath.startsWith(rootUrl.pathname)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate and enforce roots for file operations
   */
  enforceRoots(operation: string, fileUri: string): void {
    if (!this.isPathAllowed(fileUri)) {
      throw new Error(
        `Access denied: ${fileUri} is outside allowed roots for operation ${operation}`
      );
    }
  }

  getAllowedRoots(): string[] {
    return Array.from(this.allowedRoots);
  }
}
```

#### Integration with File Operations

```typescript
// src/mcp/integration/file-operations.ts

/**
 * Wraps file operations with roots enforcement
 */
export class SecureFileOperations {

  constructor(private readonly rootsProtocol: RootsProtocol) {}

  /**
   * Read file with roots validation
   */
  async readFile(uri: string): Promise<string> {
    this.rootsProtocol.enforceRoots('read', uri);

    // Proceed with file read
    const url = new URL(uri);
    return fs.promises.readFile(url.pathname, 'utf-8');
  }

  /**
   * Write file with roots validation
   */
  async writeFile(uri: string, content: string): Promise<void> {
    this.rootsProtocol.enforceRoots('write', uri);

    // Proceed with file write
    const url = new URL(uri);
    await fs.promises.writeFile(url.pathname, content, 'utf-8');
  }

  /**
   * List directory with roots validation
   */
  async listDirectory(uri: string): Promise<string[]> {
    this.rootsProtocol.enforceRoots('list', uri);

    // Proceed with directory list
    const url = new URL(uri);
    return fs.promises.readdir(url.pathname);
  }
}
```

### 3.2 Sampling Primitive

#### File Structure
```
src/mcp/protocol/
├── sampling-protocol.ts        # Handle sampling requests from servers
├── sampling-review.ts          # Human review workflow
└── sampling-executor.ts        # LLM execution
```

#### Class Design: SamplingProtocol

```typescript
// src/mcp/protocol/sampling-protocol.ts

export interface SamplingRequest {
  prompt: string;
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

export interface SamplingResponse {
  content: string;
  model: string;
  stopReason: string;
}

export class SamplingProtocol {

  constructor(
    private readonly geminiClient: GoogleGenerativeAI,
    private readonly reviewWorkflow: SamplingReviewWorkflow,
    private readonly logger: Logger
  ) {}

  /**
   * Handle sampling request from MCP server
   * Servers can request LLM completions from the client
   */
  async handleSamplingRequest(
    serverName: string,
    request: SamplingRequest
  ): Promise<SamplingResponse> {
    // Human review for sampling requests
    const approved = await this.reviewWorkflow.reviewRequest(serverName, request);

    if (!approved) {
      throw new Error('Sampling request denied by user');
    }

    // Execute sampling with Gemini
    const model = this.geminiClient.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const result = await model.generateContent({
      contents: [
        ...(request.systemPrompt ? [{
          role: 'user',
          parts: [{ text: request.systemPrompt }]
        }] : []),
        {
          role: 'user',
          parts: [{ text: request.prompt }]
        }
      ],
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        stopSequences: request.stopSequences
      }
    });

    const response = await result.response;

    return {
      content: response.text(),
      model: 'gemini-2.5-flash',
      stopReason: response.candidates?.[0]?.finishReason || 'stop'
    };
  }

  /**
   * Register sampling notification handler
   */
  registerSamplingHandler(client: McpClient): void {
    client.on('notification', async (notification) => {
      if (notification.method === 'sampling/createMessage') {
        const request = notification.params as SamplingRequest;

        try {
          const response = await this.handleSamplingRequest(
            client.getServerName(),
            request
          );

          // Send response back to server
          await client.notify({
            method: 'sampling/messageCreated',
            params: response
          });

        } catch (error) {
          this.logger.error('Sampling request failed:', error);

          await client.notify({
            method: 'sampling/error',
            params: {
              error: error.message
            }
          });
        }
      }
    });
  }
}
```

#### Human Review Workflow

```typescript
// src/mcp/protocol/sampling-review.ts

/**
 * Manages human review of sampling requests from MCP servers
 */
export class SamplingReviewWorkflow {
  private trustedServers: Set<string> = new Set();

  constructor(private readonly logger: Logger) {}

  /**
   * Review sampling request (may prompt user)
   */
  async reviewRequest(
    serverName: string,
    request: SamplingRequest
  ): Promise<boolean> {
    // Auto-approve if server is trusted
    if (this.trustedServers.has(serverName)) {
      return true;
    }

    // Show user confirmation dialog
    console.log(`\n⚠️  Sampling Request from ${serverName}:`);
    console.log(`   Prompt: ${request.prompt.substring(0, 100)}...`);
    console.log(`   Temperature: ${request.temperature || 'default'}`);
    console.log(`   Max Tokens: ${request.maxTokens || 'default'}`);

    const answer = await this.promptUser(
      'Allow this server to use LLM sampling? (y/n/always): '
    );

    if (answer === 'always') {
      this.trustedServers.add(serverName);
      return true;
    }

    return answer === 'y';
  }

  private async promptUser(question: string): Promise<string> {
    // Implementation using readline or inquirer
    // ... implementation details
  }
}
```

### 3.3 Enhanced Security & Trust Management

#### File Structure
```
src/mcp/security/
├── trust-manager.ts            # Trust levels and policies
├── permission-enforcer.ts      # Runtime permission checks
├── audit-logger.ts             # Security event logging
└── sandbox-validator.ts        # Validate server sandboxing
```

#### Class Design: TrustManager

```typescript
// src/mcp/security/trust-manager.ts

export enum TrustLevel {
  UNTRUSTED = 0,
  SERVER_TRUSTED = 1,
  TOOL_ALLOWLISTED = 2,
  TRUSTED_FOLDER = 3
}

export interface TrustPolicy {
  serverName: string;
  trustLevel: TrustLevel;
  allowlistedTools?: string[];
  requireConfirmation?: boolean;
  allowSampling?: boolean;
  allowFileAccess?: boolean;
}

export class TrustManager {
  private policies: Map<string, TrustPolicy> = new Map();
  private trustedFolders: Set<string> = new Set();

  constructor(
    private readonly configPath: string,
    private readonly logger: Logger
  ) {
    this.loadPolicies();
  }

  /**
   * Get trust policy for server
   */
  getPolicy(serverName: string): TrustPolicy {
    return this.policies.get(serverName) || {
      serverName,
      trustLevel: TrustLevel.UNTRUSTED,
      requireConfirmation: true,
      allowSampling: false,
      allowFileAccess: false
    };
  }

  /**
   * Check if tool execution requires confirmation
   */
  requiresConfirmation(serverName: string, toolName: string): boolean {
    const policy = this.getPolicy(serverName);

    // Trusted folder - no confirmation needed
    if (policy.trustLevel === TrustLevel.TRUSTED_FOLDER) {
      return false;
    }

    // Tool allowlisted - no confirmation needed
    if (policy.allowlistedTools?.includes(toolName)) {
      return false;
    }

    // Server trusted - no confirmation needed
    if (policy.trustLevel === TrustLevel.SERVER_TRUSTED) {
      return false;
    }

    // Default - require confirmation
    return true;
  }

  /**
   * Update trust policy for server
   */
  updatePolicy(serverName: string, updates: Partial<TrustPolicy>): void {
    const current = this.getPolicy(serverName);
    const updated = { ...current, ...updates };

    this.policies.set(serverName, updated);
    this.savePolicies();

    this.logger.info(`Updated trust policy for ${serverName}`, updated);
  }

  /**
   * Add folder to trusted folders
   */
  addTrustedFolder(folderPath: string): void {
    this.trustedFolders.add(folderPath);
    this.savePolicies();
  }

  /**
   * Check if current working directory is trusted
   */
  isCurrentDirectoryTrusted(): boolean {
    const cwd = process.cwd();

    for (const trusted of this.trustedFolders) {
      if (cwd.startsWith(trusted)) {
        return true;
      }
    }

    return false;
  }

  private loadPolicies(): void {
    // Load from config file
    // ... implementation details
  }

  private savePolicies(): void {
    // Save to config file
    // ... implementation details
  }
}
```

#### Audit Logging

```typescript
// src/mcp/security/audit-logger.ts

export interface AuditEvent {
  timestamp: number;
  eventType: 'connection' | 'tool_call' | 'prompt_invocation' |
             'resource_access' | 'sampling_request' | 'auth_event';
  serverName: string;
  details: Record<string, unknown>;
  userId?: string;
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 10000;

  constructor(
    private readonly logPath: string,
    private readonly logger: Logger
  ) {}

  /**
   * Log audit event
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Write to persistent storage
    this.persistEvent(fullEvent);

    // Log to console in debug mode
    this.logger.debug('Audit event:', fullEvent);
  }

  /**
   * Query audit events
   */
  query(filters: {
    serverName?: string;
    eventType?: AuditEvent['eventType'];
    startTime?: number;
    endTime?: number;
  }): AuditEvent[] {
    return this.events.filter(event => {
      if (filters.serverName && event.serverName !== filters.serverName) {
        return false;
      }
      if (filters.eventType && event.eventType !== filters.eventType) {
        return false;
      }
      if (filters.startTime && event.timestamp < filters.startTime) {
        return false;
      }
      if (filters.endTime && event.timestamp > filters.endTime) {
        return false;
      }
      return true;
    });
  }

  private persistEvent(event: AuditEvent): void {
    // Append to log file
    // ... implementation details
  }
}
```

### 3.4 Phase 3 Deliverables

- [ ] `RootsProtocol` with `roots/list` implementation
- [ ] Filesystem boundary enforcement
- [ ] Secure file operations wrapper
- [ ] `SamplingProtocol` for server-to-client LLM requests
- [ ] Human review workflow for sampling
- [ ] `TrustManager` with multi-level trust policies
- [ ] Permission enforcement at runtime
- [ ] `AuditLogger` for security events
- [ ] Trusted folder management
- [ ] CLI commands for trust configuration
- [ ] Unit tests (80%+ coverage)
- [ ] Security documentation

### 3.5 Success Criteria

✅ Roots are discovered and enforced
✅ File operations respect root boundaries
✅ Sampling requests work with user approval
✅ Trust policies are configurable
✅ Audit logs capture all security events
✅ Trusted folders bypass confirmations
✅ All tests passing
✅ Security documentation complete

---

## Phase 4: Advanced Features
**Duration:** 3-4 weeks
**Priority:** LOW
**Goal:** Implement Elicitation, conformance testing, and advanced features

### 4.1 Elicitation Primitive

#### Class Design: ElicitationProtocol

```typescript
// src/mcp/protocol/elicitation-protocol.ts

export interface ElicitationRequest {
  prompt: string;
  inputType?: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  defaultValue?: unknown;
}

export class ElicitationProtocol {

  constructor(
    private readonly logger: Logger
  ) {}

  /**
   * Handle elicitation request from MCP server
   * Prompts user for input during workflow
   */
  async handleElicitationRequest(
    serverName: string,
    request: ElicitationRequest
  ): Promise<unknown> {
    console.log(`\n📋 Input Required from ${serverName}:`);
    console.log(`   ${request.prompt}`);

    const input = await this.promptUser(request);

    this.logger.info('Elicitation response:', { serverName, input });

    return input;
  }

  /**
   * Register elicitation notification handler
   */
  registerElicitationHandler(client: McpClient): void {
    client.on('notification', async (notification) => {
      if (notification.method === 'elicitation/requestInput') {
        const request = notification.params as ElicitationRequest;

        try {
          const response = await this.handleElicitationRequest(
            client.getServerName(),
            request
          );

          await client.notify({
            method: 'elicitation/inputReceived',
            params: { value: response }
          });

        } catch (error) {
          this.logger.error('Elicitation failed:', error);

          await client.notify({
            method: 'elicitation/error',
            params: { error: error.message }
          });
        }
      }
    });
  }

  private async promptUser(request: ElicitationRequest): Promise<unknown> {
    // Use inquirer or readline for user input
    // ... implementation details
  }
}
```

### 4.2 Conformance Testing

#### Test Suite Structure
```
tests/conformance/
├── transport-conformance.test.ts    # Transport layer tests
├── protocol-conformance.test.ts     # Protocol compliance tests
├── tools-conformance.test.ts        # Tools primitive tests
├── prompts-conformance.test.ts      # Prompts primitive tests
├── resources-conformance.test.ts    # Resources primitive tests
├── sampling-conformance.test.ts     # Sampling primitive tests
├── roots-conformance.test.ts        # Roots primitive tests
└── elicitation-conformance.test.ts  # Elicitation primitive tests
```

#### Conformance Test Example

```typescript
// tests/conformance/tools-conformance.test.ts

describe('MCP Tools Primitive Conformance', () => {

  describe('tools/list', () => {
    it('should return valid tool list schema', async () => {
      const client = await createTestClient();
      const result = await client.request({
        method: 'tools/list'
      });

      // Validate against MCP schema
      expect(result).toMatchSchema(ToolsListResultSchema);

      // Each tool must have required fields
      result.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');

        // inputSchema must be valid JSON Schema
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('tools/call', () => {
    it('should execute tool and return valid result', async () => {
      const client = await createTestClient();

      const result = await client.request({
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'hello' }
        }
      });

      // Validate against MCP schema
      expect(result).toMatchSchema(ToolCallResultSchema);

      // Must have content
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // Content blocks must be valid
      result.content.forEach(block => {
        expect(block).toHaveProperty('type');
        expect(['text', 'image', 'audio', 'resource', 'resource_link'])
          .toContain(block.type);
      });
    });

    it('should handle tool errors correctly', async () => {
      const client = await createTestClient();

      const result = await client.request({
        method: 'tools/call',
        params: {
          name: 'error_tool',
          arguments: {}
        }
      });

      // Error results should have isError flag
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('schema validation', () => {
    it('should sanitize schemas for Gemini API', async () => {
      const tool = {
        name: 'test',
        description: 'test tool',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            foo: { type: 'string' }
          },
          additionalProperties: false
        }
      };

      const sanitized = SchemaSanitizer.sanitize(tool.inputSchema);

      // Should remove Gemini-incompatible fields
      expect(sanitized.$schema).toBeUndefined();
      expect(sanitized.additionalProperties).toBeUndefined();

      // Should preserve valid fields
      expect(sanitized.type).toBe('object');
      expect(sanitized.properties).toBeDefined();
    });
  });
});
```

### 4.3 Advanced Debugging & Monitoring

#### Debug Mode Implementation

```typescript
// src/mcp/debug/debug-inspector.ts

export class MCPDebugInspector {
  private messageLog: Array<{
    timestamp: number;
    direction: 'sent' | 'received';
    method: string;
    params?: any;
    result?: any;
    error?: any;
  }> = [];

  constructor(private readonly enabled: boolean) {}

  /**
   * Log protocol message
   */
  logMessage(
    direction: 'sent' | 'received',
    message: any
  ): void {
    if (!this.enabled) return;

    this.messageLog.push({
      timestamp: Date.now(),
      direction,
      method: message.method,
      params: message.params,
      result: message.result,
      error: message.error
    });

    // Print to console in debug mode
    console.log(`\n[MCP ${direction.toUpperCase()}] ${message.method}`);
    if (message.params) {
      console.log('  Params:', JSON.stringify(message.params, null, 2));
    }
    if (message.result) {
      console.log('  Result:', JSON.stringify(message.result, null, 2));
    }
    if (message.error) {
      console.error('  Error:', message.error);
    }
  }

  /**
   * Export message log
   */
  exportLog(): string {
    return JSON.stringify(this.messageLog, null, 2);
  }

  /**
   * Analyze protocol usage
   */
  analyzeUsage(): {
    totalMessages: number;
    methodCounts: Record<string, number>;
    errorRate: number;
  } {
    const methodCounts: Record<string, number> = {};
    let errorCount = 0;

    this.messageLog.forEach(msg => {
      methodCounts[msg.method] = (methodCounts[msg.method] || 0) + 1;
      if (msg.error) errorCount++;
    });

    return {
      totalMessages: this.messageLog.length,
      methodCounts,
      errorRate: errorCount / this.messageLog.length
    };
  }
}
```

### 4.4 Phase 4 Deliverables

- [ ] `ElicitationProtocol` for interactive workflows
- [ ] Comprehensive conformance test suite
- [ ] MCP protocol validator
- [ ] Debug inspector with message logging
- [ ] Performance profiling tools
- [ ] CLI commands for debugging
- [ ] Documentation for advanced features
- [ ] Migration completion guide
- [ ] Best practices documentation

### 4.5 Success Criteria

✅ Elicitation enables multi-step interactive tools
✅ Conformance tests pass 100%
✅ Protocol validator catches spec violations
✅ Debug mode helps troubleshoot issues
✅ All documentation complete
✅ Full MCP compliance achieved

---

## Cross-Cutting Concerns

### Logging & Observability

```typescript
// src/mcp/observability/mcp-logger.ts

export class MCPLogger {
  constructor(
    private readonly component: string,
    private readonly level: LogLevel = LogLevel.INFO
  ) {}

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${LogLevel[level]}] [${this.component}]`;

    console.log(`${prefix} ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}
```

### Error Handling

```typescript
// src/mcp/errors/mcp-errors.ts

export class MCPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly serverName?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(serverName: string, details?: any) {
    super(
      `Failed to connect to MCP server: ${serverName}`,
      'MCP_CONNECTION_ERROR',
      serverName,
      details
    );
  }
}

export class MCPToolExecutionError extends MCPError {
  constructor(toolName: string, serverName: string, details?: any) {
    super(
      `Tool execution failed: ${toolName} on ${serverName}`,
      'MCP_TOOL_EXECUTION_ERROR',
      serverName,
      details
    );
  }
}

export class MCPAuthenticationError extends MCPError {
  constructor(serverName: string, details?: any) {
    super(
      `Authentication failed for server: ${serverName}`,
      'MCP_AUTHENTICATION_ERROR',
      serverName,
      details
    );
  }
}
```

### Metrics Collection

```typescript
// src/mcp/observability/metrics-collector.ts

export interface MCPMetrics {
  connections: {
    total: number;
    active: number;
    failed: number;
  };
  tools: {
    discovered: number;
    executed: number;
    errors: number;
    avgExecutionTime: number;
  };
  prompts: {
    discovered: number;
    invoked: number;
  };
  resources: {
    discovered: number;
    accessed: number;
    cacheHits: number;
  };
  auth: {
    tokenRefreshes: number;
    authFailures: number;
  };
}

export class MetricsCollector {
  private metrics: MCPMetrics = {
    connections: { total: 0, active: 0, failed: 0 },
    tools: { discovered: 0, executed: 0, errors: 0, avgExecutionTime: 0 },
    prompts: { discovered: 0, invoked: 0 },
    resources: { discovered: 0, accessed: 0, cacheHits: 0 },
    auth: { tokenRefreshes: 0, authFailures: 0 }
  };

  private executionTimes: number[] = [];

  recordConnection(success: boolean): void {
    this.metrics.connections.total++;
    if (success) {
      this.metrics.connections.active++;
    } else {
      this.metrics.connections.failed++;
    }
  }

  recordToolExecution(duration: number, success: boolean): void {
    this.metrics.tools.executed++;
    if (!success) {
      this.metrics.tools.errors++;
    }

    this.executionTimes.push(duration);
    this.metrics.tools.avgExecutionTime =
      this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
  }

  getMetrics(): MCPMetrics {
    return { ...this.metrics };
  }

  exportPrometheus(): string {
    // Export in Prometheus format for monitoring
    return `
# HELP mcp_connections_total Total number of MCP connections
# TYPE mcp_connections_total counter
mcp_connections_total ${this.metrics.connections.total}

# HELP mcp_connections_active Active MCP connections
# TYPE mcp_connections_active gauge
mcp_connections_active ${this.metrics.connections.active}

# HELP mcp_tool_executions_total Total tool executions
# TYPE mcp_tool_executions_total counter
mcp_tool_executions_total ${this.metrics.tools.executed}

# HELP mcp_tool_execution_duration_seconds Average tool execution time
# TYPE mcp_tool_execution_duration_seconds gauge
mcp_tool_execution_duration_seconds ${this.metrics.tools.avgExecutionTime / 1000}
    `.trim();
  }
}
```

---

## Implementation Roadmap

### Timeline Overview

```
Month 1-1.5: Phase 1 (Critical Foundation)
├── Week 1-2: SDK integration, McpClient, Transport layer
├── Week 3-4: Tools protocol, Schema sanitization
├── Week 5-6: Testing, documentation, migration guide

Month 2.5-4: Phase 2 (High Priority)
├── Week 7-8: Prompts primitive
├── Week 9-10: Resources primitive
├── Week 11-12: OAuth authentication
├── Week 13: Testing and documentation

Month 4-5: Phase 3 (Medium Priority)
├── Week 14-15: Roots primitive, Security enhancements
├── Week 16-17: Sampling primitive, Trust management
├── Week 18: Testing and documentation

Month 5-6: Phase 4 (Advanced Features)
├── Week 19-20: Elicitation primitive
├── Week 21-22: Conformance testing
├── Week 23-24: Final polish, documentation, release
```

### Resource Allocation

**Phase 1 (Critical):**
- 2 senior developers (full-time)
- 1 QA engineer (half-time)
- 1 tech writer (quarter-time)

**Phase 2 (High):**
- 2 developers (full-time)
- 1 QA engineer (half-time)
- 1 tech writer (half-time)

**Phase 3 (Medium):**
- 1 senior developer (full-time)
- 1 developer (full-time)
- 1 security specialist (half-time)
- 1 QA engineer (half-time)

**Phase 4 (Advanced):**
- 1 senior developer (full-time)
- 1 QA engineer (full-time)
- 1 tech writer (full-time)

### Dependencies

**External:**
- `@modelcontextprotocol/sdk` (critical)
- `@google/generative-ai` (existing)
- Node.js 18+ (existing)

**Internal:**
- Gemini Flow core engine (existing)
- Logger utility (existing)
- Cache manager (existing)

### Rollout Strategy

1. **Alpha Release (Phase 1 Complete)**
   - Internal testing only
   - Limited MCP server compatibility
   - Feedback from early adopters

2. **Beta Release (Phase 2 Complete)**
   - Public beta with feature flags
   - Support for major MCP servers
   - Community feedback integration

3. **RC Release (Phase 3 Complete)**
   - Release candidate with full features
   - Production testing
   - Performance optimization

4. **GA Release (Phase 4 Complete)**
   - General availability
   - Full MCP compliance
   - Production-ready

---

## Risk Analysis & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Breaking changes in MCP SDK** | Medium | High | Pin SDK version, monitor changelog, test against multiple versions |
| **Gemini API incompatibility with MCP schemas** | Medium | High | Extensive schema sanitization, compatibility testing |
| **Performance degradation from protocol overhead** | Low | Medium | Caching, connection pooling, async operations |
| **OAuth flow complexity** | Medium | Medium | Use battle-tested libraries, follow OAuth 2.0 best practices |
| **Backward compatibility issues** | High | High | Compatibility layer, phased migration, version flags |

### Organizational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Insufficient testing resources** | Medium | High | Automated testing, CI/CD integration |
| **Scope creep** | High | Medium | Strict phase boundaries, stakeholder alignment |
| **Developer learning curve** | Medium | Medium | Training sessions, comprehensive documentation |
| **User migration resistance** | Medium | High | Clear migration guide, backward compatibility, incremental migration path |

### Mitigation Strategies

1. **Comprehensive Testing**
   - Unit tests (80%+ coverage)
   - Integration tests with reference MCP servers
   - Conformance tests against MCP specification
   - Performance benchmarks
   - Security testing

2. **Incremental Migration**
   - Compatibility layer for existing adapter
   - Feature flags for new functionality
   - Clear deprecation timeline
   - Migration automation tools

3. **Documentation**
   - API reference documentation
   - Integration guides
   - Migration guides
   - Troubleshooting guides
   - Architecture decision records

4. **Community Engagement**
   - Early feedback from power users
   - Public roadmap
   - Regular status updates
   - Open issue tracking

---

## Success Metrics

### Quantitative Metrics

1. **MCP Compliance:**
   - Target: 75%+ feature coverage (40+/53 features)
   - Measurement: Conformance test pass rate

2. **Performance:**
   - Target: <100ms overhead per tool call
   - Measurement: Benchmark suite

3. **Reliability:**
   - Target: 99%+ connection success rate
   - Measurement: Connection metrics

4. **Test Coverage:**
   - Target: 80%+ code coverage
   - Measurement: Coverage reports

5. **Migration Success:**
   - Target: 90%+ existing users migrated within 6 months
   - Measurement: Usage analytics

### Qualitative Metrics

1. **Developer Experience:**
   - Clear, comprehensive documentation
   - Positive feedback from developers
   - Low support ticket volume

2. **Interoperability:**
   - Works with major MCP servers
   - Compatible with MCP ecosystem
   - Community adoption

3. **Security:**
   - No critical security vulnerabilities
   - Proper trust management
   - Audit logging complete

4. **Maintainability:**
   - Clean architecture
   - Well-documented code
   - Easy to extend

---

## Conclusion

This architecture provides a comprehensive roadmap for implementing full MCP support in Gemini Flow. The phased approach minimizes risk while delivering incremental value:

- **Phase 1** establishes the critical foundation with official SDK integration
- **Phase 2** adds high-priority primitives for production use
- **Phase 3** enhances security and advanced workflows
- **Phase 4** achieves full MCP compliance

By following this architecture, Gemini Flow will evolve from 15% MCP coverage to 75%+ coverage, enabling seamless integration with the Model Context Protocol ecosystem while maintaining backward compatibility and a smooth migration path for existing users.

The architecture is designed to be:
- **Compliant:** Follows MCP specification using official SDK
- **Secure:** Multi-level trust management and audit logging
- **Scalable:** Supports multiple servers and concurrent operations
- **Maintainable:** Clean separation of concerns, comprehensive testing
- **Observable:** Detailed logging, metrics, and debugging tools

This positions Gemini Flow as a production-ready MCP client comparable to gemini-cli while leveraging gemini-flow's unique strengths in AI orchestration and workflow automation.
