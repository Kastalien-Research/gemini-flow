/**
 * Official MCP SDK-based Client Implementation
 * Replaces custom adapter with standards-compliant MCP client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListPromptsResultSchema,
  GetPromptResultSchema,
  Tool,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';
import { spawn, ChildProcess } from 'child_process';

export interface MCPClientConfig {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  disabled?: boolean;
}

export interface MCPClientStatus {
  connected: boolean;
  serverName: string;
  capabilities: {
    tools?: boolean;
    prompts?: boolean;
    resources?: boolean;
    sampling?: boolean;
  };
  discoveredTools: Tool[];
  discoveredPrompts: Prompt[];
}

/**
 * Standards-compliant MCP Client using official SDK
 */
export class MCPClient {
  private client: Client;
  private transport?: Transport;
  private process?: ChildProcess;
  private config: MCPClientConfig;
  private logger: Logger;
  private status: MCPClientStatus;
  private connected = false;

  constructor(config: MCPClientConfig) {
    this.config = config;
    this.logger = new Logger(`MCP:${config.name}`);
    this.client = new Client(
      {
        name: 'gemini-flow',
        version: '1.3.3',
      },
      {
        capabilities: {
          sampling: {},
          roots: {
            listChanged: true,
          },
        },
      }
    );

    this.status = {
      connected: false,
      serverName: config.name,
      capabilities: {},
      discoveredTools: [],
      discoveredPrompts: [],
    };

    this.setupClientHandlers();
  }

  /**
   * Setup client event handlers for notifications and requests from server
   */
  private setupClientHandlers(): void {
    // Notifications are handled automatically by the SDK transport layer
    // The client will receive notifications through the protocol
    // We could add custom notification handling here if needed in the future
    
    // For now, we'll rely on the SDK's built-in notification handling
    // which will trigger re-discovery automatically when server capabilities change
  }

  /**
   * Connect to MCP server via stdio
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.warn('Already connected');
      return;
    }

    try {
      this.logger.info('Connecting to MCP server', {
        command: this.config.command,
        args: this.config.args,
      });

      // Expand environment variables
      const env = this.expandEnvVars(this.config.env || {});

      // Spawn server process
      this.process = spawn(this.config.command, this.config.args, {
        cwd: this.config.cwd || process.cwd(),
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Setup process error handling
      this.process.on('error', (error) => {
        this.logger.error('Server process error', error);
        this.handleDisconnect();
      });

      this.process.on('exit', (code, signal) => {
        this.logger.info('Server process exited', { code, signal });
        this.handleDisconnect();
      });

      // Setup stderr logging
      this.process.stderr?.on('data', (data) => {
        this.logger.debug('Server stderr', data.toString());
      });

      // Create stdio transport
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        env,
        stderr: 'pipe',
      });

      // Connect client
      await this.client.connect(this.transport);
      this.connected = true;
      this.status.connected = true;

      this.logger.info('Connected to MCP server');

      // Discover capabilities
      await this.discoverCapabilities();
    } catch (error) {
      this.logger.error('Failed to connect', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Discover server capabilities and available primitives
   */
  private async discoverCapabilities(): Promise<void> {
    try {
      // Check server capabilities from initialization
      const serverCapabilities = (this.client as any).serverCapabilities;
      
      this.status.capabilities = {
        tools: !!serverCapabilities?.tools,
        prompts: !!serverCapabilities?.prompts,
        resources: !!serverCapabilities?.resources,
        sampling: !!serverCapabilities?.sampling,
      };

      this.logger.info('Server capabilities discovered', this.status.capabilities);

      // Discover tools if supported
      if (this.status.capabilities.tools) {
        await this.discoverTools();
      }

      // Discover prompts if supported
      if (this.status.capabilities.prompts) {
        await this.discoverPrompts();
      }
    } catch (error) {
      this.logger.error('Failed to discover capabilities', error);
    }
  }

  /**
   * Discover available tools
   */
  private async discoverTools(): Promise<void> {
    try {
      const result = await this.client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );

      this.status.discoveredTools = result.tools || [];
      this.logger.info(`Discovered ${this.status.discoveredTools.length} tools`);
    } catch (error) {
      this.logger.error('Failed to discover tools', error);
    }
  }

  /**
   * Discover available prompts
   */
  private async discoverPrompts(): Promise<void> {
    try {
      const result = await this.client.request(
        { method: 'prompts/list' },
        ListPromptsResultSchema
      );

      this.status.discoveredPrompts = result.prompts || [];
      this.logger.info(`Discovered ${this.status.discoveredPrompts.length} prompts`);
    } catch (error) {
      this.logger.error('Failed to discover prompts', error);
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      this.logger.debug('Calling tool', { name, args });

      const result = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name,
            arguments: args,
          },
        },
        CallToolResultSchema
      );

      this.logger.debug('Tool result', { name, result });
      return result;
    } catch (error) {
      this.logger.error('Tool call failed', { name, error });
      throw error;
    }
  }

  /**
   * Get a prompt with optional arguments
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      this.logger.debug('Getting prompt', { name, args });

      const result = await this.client.request(
        {
          method: 'prompts/get',
          params: {
            name,
            arguments: args,
          },
        },
        GetPromptResultSchema
      );

      this.logger.debug('Prompt result', { name, result });
      return result;
    } catch (error) {
      this.logger.error('Prompt get failed', { name, error });
      throw error;
    }
  }

  /**
   * Get current client status
   */
  getStatus(): MCPClientStatus {
    return { ...this.status };
  }

  /**
   * Get list of discovered tools
   */
  getTools(): Tool[] {
    return [...this.status.discoveredTools];
  }

  /**
   * Get list of discovered prompts
   */
  getPrompts(): Prompt[] {
    return [...this.status.discoveredPrompts];
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.logger.info('Disconnecting from MCP server');
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.connected = false;
    this.status.connected = false;

    try {
      await this.client.close();
    } catch (error) {
      this.logger.error('Error closing client', error);
    }

    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }

    this.process = undefined;
    this.transport = undefined;
  }

  /**
   * Handle unexpected disconnect
   */
  private handleDisconnect(): void {
    if (this.connected) {
      this.logger.warn('Unexpected disconnect from server');
      this.connected = false;
      this.status.connected = false;
    }
  }

  /**
   * Expand environment variables in format $VAR or ${VAR}
   */
  private expandEnvVars(env: Record<string, string>): Record<string, string> {
    const expanded: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      expanded[key] = value.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/gi, (_, varName) => {
        return process.env[varName] || '';
      });
    }

    return expanded;
  }
}
