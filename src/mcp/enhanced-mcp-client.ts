/**
 * Enhanced MCP Client
 *
 * Complete MCP client implementation with official SDK integration.
 * Supports stdio and HTTP transports, tool discovery, and execution.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { TransportFactory, TransportType } from "./transports/transport-factory.js";
import { ToolDiscovery, DiscoveredTool, ToolFilter } from "./tools/tool-discovery.js";
import { ToolExecution, ToolCallRequest, ToolCallResponse } from "./tools/tool-execution.js";
import { Logger } from "../utils/logger.js";
import fs from "node:fs";
import path from "node:path";

export interface MCPServerConfig {
  // Stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stderr?: "inherit" | "pipe" | "ignore";

  // HTTP transport
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;

  // General
  disabled?: boolean;
  toolFilter?: ToolFilter;
}

export interface MCPClientStatus {
  serverName: string;
  connected: boolean;
  transportType: TransportType | null;
  toolCount: number;
  lastError?: string;
}

export class EnhancedMCPClient {
  private clients = new Map<string, Client>();
  private transports = new Map<string, Transport>();
  private transportTypes = new Map<string, TransportType>();
  private toolDiscovery: ToolDiscovery;
  private toolExecution: ToolExecution;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("EnhancedMCPClient");
    this.toolDiscovery = new ToolDiscovery();
    this.toolExecution = new ToolExecution();
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string, config: MCPServerConfig): Promise<Client> {
    if (config.disabled) {
      this.logger.info(`Server ${serverName} is disabled, skipping connection`);
      throw new Error(`Server ${serverName} is disabled`);
    }

    if (this.clients.has(serverName)) {
      this.logger.info(`Server ${serverName} already connected`);
      return this.clients.get(serverName)!;
    }

    try {
      this.logger.info(`Connecting to MCP server: ${serverName}`);

      // Create appropriate transport
      const transport = await TransportFactory.createFromServerConfig(config);
      const transportType = TransportFactory.detectTransportType(config);

      // Create and connect client
      const client = new Client(
        {
          name: `gemini-flow:${serverName}`,
          version: "1.3.3",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);

      // Store client and transport
      this.clients.set(serverName, client);
      this.transports.set(serverName, transport);
      this.transportTypes.set(serverName, transportType);

      this.logger.info(
        `Successfully connected to ${serverName} via ${transportType} transport`
      );

      // Discover tools
      await this.discoverTools(serverName, config.toolFilter);

      return client;
    } catch (error) {
      this.logger.error(`Failed to connect to ${serverName}`, error);
      throw new Error(`Connection to ${serverName} failed: ${error}`);
    }
  }

  /**
   * Connect to all servers from config file
   */
  async connectAll(configPath = path.join(process.cwd(), ".mcp.json")): Promise<void> {
    try {
      const raw = fs.readFileSync(configPath, "utf8");
      const json = JSON.parse(raw);
      const servers: Record<string, MCPServerConfig> = json.mcpServers || {};

      const connectionPromises = Object.entries(servers).map(async ([name, config]) => {
        try {
          await this.connect(name, config);
        } catch (error) {
          this.logger.error(`Failed to connect to ${name}`, error);
          // Continue with other servers even if one fails
        }
      });

      await Promise.all(connectionPromises);

      this.logger.info(
        `Connected to ${this.clients.size} of ${Object.keys(servers).length} servers`
      );
    } catch (error) {
      this.logger.error("Failed to connect to servers from config", error);
      throw error;
    }
  }

  /**
   * Discover tools from a connected server
   */
  async discoverTools(serverName: string, filter?: ToolFilter): Promise<DiscoveredTool[]> {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return this.toolDiscovery.discoverTools(serverName, client, filter);
  }

  /**
   * Execute a tool on a server
   */
  async executeTool(
    serverName: string,
    request: ToolCallRequest
  ): Promise<ToolCallResponse> {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return this.toolExecution.executeTool(serverName, client, request);
  }

  /**
   * Get a connected client
   */
  getClient(serverName: string): Client | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Get all discovered tools
   */
  getAllTools(): DiscoveredTool[] {
    return this.toolDiscovery.getAllTools();
  }

  /**
   * Get tools from a specific server
   */
  getToolsByServer(serverName: string): DiscoveredTool[] {
    return this.toolDiscovery.getToolsByServer(serverName);
  }

  /**
   * Get tool by name
   */
  getTool(name: string): DiscoveredTool | undefined {
    return this.toolDiscovery.getTool(name);
  }

  /**
   * Get status of all connected servers
   */
  getStatus(): MCPClientStatus[] {
    const statuses: MCPClientStatus[] = [];

    for (const [serverName, client] of this.clients.entries()) {
      statuses.push({
        serverName,
        connected: true,
        transportType: this.transportTypes.get(serverName) || null,
        toolCount: this.toolDiscovery.getToolsByServer(serverName).length,
      });
    }

    return statuses;
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      this.logger.warn(`Server ${serverName} not connected`);
      return;
    }

    try {
      await client.close();
      this.clients.delete(serverName);
      this.transports.delete(serverName);
      this.transportTypes.delete(serverName);
      this.toolDiscovery.removeServerTools(serverName);

      this.logger.info(`Disconnected from ${serverName}`);
    } catch (error) {
      this.logger.error(`Error disconnecting from ${serverName}`, error);
      throw error;
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map((serverName) =>
      this.disconnect(serverName)
    );

    await Promise.all(disconnectPromises);
    this.logger.info("Disconnected from all servers");
  }
}

// Export singleton instance
export const enhancedMCP = new EnhancedMCPClient();
