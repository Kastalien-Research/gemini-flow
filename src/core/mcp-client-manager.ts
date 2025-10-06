/**
 * MCP Client Manager
 * Manages multiple MCP server connections and provides unified interface
 */

import { MCPClient, MCPClientConfig, MCPClientStatus } from './mcp-client.js';
import { MCPSettingsManager } from './mcp-settings-manager.js';
import { Logger } from '../utils/logger.js';
import { Tool, Prompt } from '@modelcontextprotocol/sdk/types.js';

export interface MCPToolDescriptor {
  serverName: string;
  tool: Tool;
  prefixedName: string; // Includes server prefix if needed for conflict resolution
}

export interface MCPPromptDescriptor {
  serverName: string;
  prompt: Prompt;
}

/**
 * Manages multiple MCP client connections
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private settingsManager: MCPSettingsManager;
  private logger: Logger;
  private toolRegistry: Map<string, MCPToolDescriptor> = new Map();
  private promptRegistry: Map<string, MCPPromptDescriptor> = new Map();

  constructor(settingsManager: MCPSettingsManager) {
    this.settingsManager = settingsManager;
    this.logger = new Logger('MCPClientManager');
  }

  /**
   * Initialize all configured MCP servers
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing MCP Client Manager');

    const settings = await this.settingsManager.readSettings();

    for (const [serverName, serverConfig] of Object.entries(settings.mcpServers)) {
      const config = serverConfig as MCPClientConfig;
      if (config.disabled) {
        this.logger.info(`Skipping disabled server: ${serverName}`);
        continue;
      }

      try {
        await this.connectServer(serverName, config);
      } catch (error) {
        this.logger.error(`Failed to connect to server ${serverName}`, error);
      }
    }

    this.logger.info(`Initialized ${this.clients.size} MCP servers`);
  }

  /**
   * Connect to a specific server
   */
  async connectServer(serverName: string, config: MCPClientConfig): Promise<void> {
    if (this.clients.has(serverName)) {
      this.logger.warn(`Server ${serverName} already connected`);
      return;
    }

    this.logger.info(`Connecting to server: ${serverName}`);

    const client = new MCPClient({
      name: serverName,
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env: config.env,
    });

    await client.connect();
    this.clients.set(serverName, client);

    // Register tools and prompts from this server
    await this.registerServerTools(serverName, client);
    await this.registerServerPrompts(serverName, client);

    this.logger.info(`Server ${serverName} connected successfully`);
  }

  /**
   * Register tools from a server with conflict resolution
   */
  private async registerServerTools(serverName: string, client: MCPClient): Promise<void> {
    const tools = client.getTools();

    for (const tool of tools) {
      const toolName = tool.name;
      let prefixedName = tool.name;

      // Check for naming conflicts
      if (this.toolRegistry.has(toolName)) {
        // Conflict detected - use prefixed name
        prefixedName = `${serverName}__${toolName}`;
        this.logger.warn(
          `Tool name conflict: ${toolName}. Using prefixed name: ${prefixedName}`
        );
      }

      this.toolRegistry.set(prefixedName, {
        serverName,
        tool,
        prefixedName,
      });

      this.logger.debug(`Registered tool: ${prefixedName} from ${serverName}`);
    }
  }

  /**
   * Register prompts from a server
   */
  private async registerServerPrompts(serverName: string, client: MCPClient): Promise<void> {
    const prompts = client.getPrompts();

    for (const prompt of prompts) {
      const key = `${serverName}::${prompt.name}`;
      this.promptRegistry.set(key, {
        serverName,
        prompt,
      });

      this.logger.debug(`Registered prompt: ${prompt.name} from ${serverName}`);
    }
  }

  /**
   * Call a tool by name (with automatic server resolution)
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    const descriptor = this.toolRegistry.get(toolName);

    if (!descriptor) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const client = this.clients.get(descriptor.serverName);
    if (!client) {
      throw new Error(`Server not connected: ${descriptor.serverName}`);
    }

    this.logger.debug(`Calling tool ${toolName} on server ${descriptor.serverName}`);
    return await client.callTool(descriptor.tool.name, args);
  }

  /**
   * Get a prompt by name
   */
  async getPrompt(serverName: string, promptName: string, args?: Record<string, string>): Promise<any> {
    const key = `${serverName}::${promptName}`;
    const descriptor = this.promptRegistry.get(key);

    if (!descriptor) {
      throw new Error(`Prompt not found: ${promptName} on server ${serverName}`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    return await client.getPrompt(promptName, args);
  }

  /**
   * Get all available tools across all servers
   */
  getAllTools(): MCPToolDescriptor[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverName: string): MCPToolDescriptor[] {
    return Array.from(this.toolRegistry.values()).filter(
      (desc) => desc.serverName === serverName
    );
  }

  /**
   * Get all available prompts across all servers
   */
  getAllPrompts(): MCPPromptDescriptor[] {
    return Array.from(this.promptRegistry.values());
  }

  /**
   * Get prompts from a specific server
   */
  getServerPrompts(serverName: string): MCPPromptDescriptor[] {
    return Array.from(this.promptRegistry.values()).filter(
      (desc) => desc.serverName === serverName
    );
  }

  /**
   * Get status of a specific server
   */
  getServerStatus(serverName: string): MCPClientStatus | null {
    const client = this.clients.get(serverName);
    return client ? client.getStatus() : null;
  }

  /**
   * Get status of all servers
   */
  getAllServerStatus(): Map<string, MCPClientStatus> {
    const statusMap = new Map<string, MCPClientStatus>();

    for (const [serverName, client] of this.clients.entries()) {
      statusMap.set(serverName, client.getStatus());
    }

    return statusMap;
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);

    if (!client) {
      this.logger.warn(`Server not connected: ${serverName}`);
      return;
    }

    this.logger.info(`Disconnecting from server: ${serverName}`);

    await client.disconnect();
    this.clients.delete(serverName);

    // Remove tools and prompts from this server
    for (const [toolName, descriptor] of this.toolRegistry.entries()) {
      if (descriptor.serverName === serverName) {
        this.toolRegistry.delete(toolName);
      }
    }

    for (const [key, descriptor] of this.promptRegistry.entries()) {
      if (descriptor.serverName === serverName) {
        this.promptRegistry.delete(key);
      }
    }

    this.logger.info(`Server ${serverName} disconnected`);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    this.logger.info('Disconnecting from all servers');

    const disconnectPromises = Array.from(this.clients.keys()).map((serverName) =>
      this.disconnectServer(serverName)
    );

    await Promise.allSettled(disconnectPromises);

    this.clients.clear();
    this.toolRegistry.clear();
    this.promptRegistry.clear();

    this.logger.info('All servers disconnected');
  }

  /**
   * Reconnect to a server
   */
  async reconnectServer(serverName: string): Promise<void> {
    this.logger.info(`Reconnecting to server: ${serverName}`);

    // Disconnect if currently connected
    if (this.clients.has(serverName)) {
      await this.disconnectServer(serverName);
    }

    // Get server config
    const settings = await this.settingsManager.readSettings();
    const serverConfig = settings.mcpServers[serverName];

    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverName}`);
    }

    if (serverConfig.disabled) {
      throw new Error(`Server is disabled: ${serverName}`);
    }

    await this.connectServer(serverName, serverConfig);
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Get client instance for a server (for advanced use cases)
   */
  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }
}
