/**
 * MCP Tool Discovery Implementation
 *
 * Implements the tools/list protocol for discovering available tools from MCP servers.
 * Handles tool filtering, conflict resolution, and schema transformation.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../../utils/logger.js";

export interface ToolFilter {
  include?: string[];  // Specific tools to include
  exclude?: string[];  // Specific tools to exclude
}

export interface DiscoveredTool extends Tool {
  serverName: string;
  prefixed?: boolean;
  originalName?: string;
}

export class ToolDiscovery {
  private logger: Logger;
  private toolRegistry = new Map<string, DiscoveredTool>();

  constructor() {
    this.logger = new Logger("ToolDiscovery");
  }

  /**
   * Discover tools from an MCP server using the tools/list protocol
   */
  async discoverTools(
    serverName: string,
    client: Client,
    filter?: ToolFilter
  ): Promise<DiscoveredTool[]> {
    try {
      this.logger.info(`Discovering tools from ${serverName}`);

      // Call the tools/list protocol method
      const response = await client.listTools();
      const tools = response.tools || [];

      this.logger.info(`Discovered ${tools.length} tools from ${serverName}`);

      // Transform and filter tools
      const discoveredTools = tools
        .map((tool) => this.transformTool(serverName, tool))
        .filter((tool) => this.shouldIncludeTool(tool, filter));

      // Register tools and handle conflicts
      const registeredTools = this.registerTools(discoveredTools);

      this.logger.info(`Registered ${registeredTools.length} tools from ${serverName}`);

      return registeredTools;
    } catch (error) {
      this.logger.error(`Failed to discover tools from ${serverName}`, error);
      throw new Error(`Tool discovery failed for ${serverName}: ${error}`);
    }
  }

  /**
   * Transform tool to include server metadata
   */
  private transformTool(serverName: string, tool: Tool): DiscoveredTool {
    return {
      ...tool,
      serverName,
      prefixed: false,
    };
  }

  /**
   * Check if tool should be included based on filter
   */
  private shouldIncludeTool(tool: DiscoveredTool, filter?: ToolFilter): boolean {
    if (!filter) return true;

    // If include list is specified, only include tools in the list
    if (filter.include && filter.include.length > 0) {
      return filter.include.includes(tool.name);
    }

    // If exclude list is specified, exclude tools in the list
    if (filter.exclude && filter.exclude.length > 0) {
      return !filter.exclude.includes(tool.name);
    }

    return true;
  }

  /**
   * Register tools and handle name conflicts
   * First registration wins - subsequent registrations get prefixed names
   */
  private registerTools(tools: DiscoveredTool[]): DiscoveredTool[] {
    const registeredTools: DiscoveredTool[] = [];

    for (const tool of tools) {
      const existingTool = this.toolRegistry.get(tool.name);

      if (existingTool && existingTool.serverName !== tool.serverName) {
        // Conflict detected - prefix the tool name with server name
        const prefixedName = `${tool.serverName}__${tool.name}`;
        const prefixedTool: DiscoveredTool = {
          ...tool,
          name: prefixedName,
          prefixed: true,
          originalName: tool.name,
        };

        this.toolRegistry.set(prefixedName, prefixedTool);
        registeredTools.push(prefixedTool);

        this.logger.warn(
          `Tool name conflict: ${tool.name} from ${tool.serverName} registered as ${prefixedName}`
        );
      } else if (!existingTool) {
        // No conflict - register with original name
        this.toolRegistry.set(tool.name, tool);
        registeredTools.push(tool);
      } else {
        // Same server re-registering - update
        this.toolRegistry.set(tool.name, tool);
        registeredTools.push(tool);
      }
    }

    return registeredTools;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): DiscoveredTool[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Get tools from a specific server
   */
  getToolsByServer(serverName: string): DiscoveredTool[] {
    return Array.from(this.toolRegistry.values()).filter(
      (tool) => tool.serverName === serverName
    );
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): DiscoveredTool | undefined {
    return this.toolRegistry.get(name);
  }

  /**
   * Clear all registered tools
   */
  clearRegistry(): void {
    this.toolRegistry.clear();
    this.logger.info("Tool registry cleared");
  }

  /**
   * Remove tools from a specific server
   */
  removeServerTools(serverName: string): void {
    const toolsToRemove = Array.from(this.toolRegistry.entries()).filter(
      ([_, tool]) => tool.serverName === serverName
    );

    for (const [name, _] of toolsToRemove) {
      this.toolRegistry.delete(name);
    }

    this.logger.info(`Removed ${toolsToRemove.length} tools from ${serverName}`);
  }
}
