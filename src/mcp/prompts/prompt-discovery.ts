/**
 * Prompt Discovery for MCP Protocol
 * Implements prompts/list primitive for discovering available prompts from MCP servers
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Prompt, ListPromptsResult } from "@modelcontextprotocol/sdk/types.js";

export interface DiscoveredPrompt extends Prompt {
  serverName: string;
  discovered: boolean;
}

export class PromptDiscovery {
  /**
   * Discover all prompts from an MCP server
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @returns Array of discovered prompts
   */
  async discoverPrompts(
    serverName: string,
    client: Client
  ): Promise<DiscoveredPrompt[]> {
    try {
      const result = await client.listPrompts() as ListPromptsResult;

      return result.prompts.map((prompt) => ({
        ...prompt,
        serverName,
        discovered: true,
      }));
    } catch (error) {
      console.error(`Failed to discover prompts from ${serverName}:`, error);
      return [];
    }
  }

  /**
   * Discover prompts from multiple MCP servers
   * @param servers Map of server name to MCP client
   * @returns Combined array of discovered prompts from all servers
   */
  async discoverFromMultipleServers(
    servers: Map<string, Client>
  ): Promise<DiscoveredPrompt[]> {
    const allPrompts: DiscoveredPrompt[] = [];

    for (const [serverName, client] of servers.entries()) {
      const prompts = await this.discoverPrompts(serverName, client);
      allPrompts.push(...prompts);
    }

    return allPrompts;
  }

  /**
   * Filter prompts by server name
   * @param prompts Array of discovered prompts
   * @param serverName Server name to filter by
   * @returns Filtered prompts from specific server
   */
  filterByServer(
    prompts: DiscoveredPrompt[],
    serverName: string
  ): DiscoveredPrompt[] {
    return prompts.filter((prompt) => prompt.serverName === serverName);
  }
}

export const promptDiscovery = new PromptDiscovery();
