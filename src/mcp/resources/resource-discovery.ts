/**
 * Resource Discovery for MCP Protocol
 * Implements resources/list primitive for discovering available resources from MCP servers
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Resource, ListResourcesResult } from "@modelcontextprotocol/sdk/types.js";

export interface DiscoveredResource extends Resource {
  serverName: string;
  discovered: boolean;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverName: string;
}

export class ResourceDiscovery {
  /**
   * Discover all resources from an MCP server
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @returns Array of discovered resources
   */
  async discoverResources(
    serverName: string,
    client: Client
  ): Promise<DiscoveredResource[]> {
    try {
      const result = await client.listResources() as ListResourcesResult;

      return result.resources.map((resource) => ({
        ...resource,
        serverName,
        discovered: true,
      }));
    } catch (error) {
      console.error(`Failed to discover resources from ${serverName}:`, error);
      return [];
    }
  }

  /**
   * Discover resources from multiple MCP servers
   * @param servers Map of server name to MCP client
   * @returns Combined array of discovered resources from all servers
   */
  async discoverFromMultipleServers(
    servers: Map<string, Client>
  ): Promise<DiscoveredResource[]> {
    const allResources: DiscoveredResource[] = [];

    for (const [serverName, client] of servers.entries()) {
      const resources = await this.discoverResources(serverName, client);
      allResources.push(...resources);
    }

    return allResources;
  }

  /**
   * Filter resources by server name
   * @param resources Array of discovered resources
   * @param serverName Server name to filter by
   * @returns Filtered resources from specific server
   */
  filterByServer(
    resources: DiscoveredResource[],
    serverName: string
  ): DiscoveredResource[] {
    return resources.filter((resource) => resource.serverName === serverName);
  }

  /**
   * Filter resources by MIME type
   * @param resources Array of discovered resources
   * @param mimeType MIME type to filter by
   * @returns Filtered resources matching MIME type
   */
  filterByMimeType(
    resources: DiscoveredResource[],
    mimeType: string
  ): DiscoveredResource[] {
    return resources.filter((resource) => resource.mimeType === mimeType);
  }

  /**
   * Extract resource templates from discovered resources
   * Templates are resources with URI parameters (e.g., {param})
   * @param resources Array of discovered resources
   * @returns Array of resource templates
   */
  extractTemplates(resources: DiscoveredResource[]): ResourceTemplate[] {
    return resources
      .filter((resource) => this.isTemplate(resource.uri))
      .map((resource) => ({
        uriTemplate: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverName: resource.serverName,
      }));
  }

  /**
   * Check if a URI is a template (contains parameters)
   * @param uri Resource URI
   * @returns True if URI contains template parameters
   */
  isTemplate(uri: string): boolean {
    return /{[^}]+}/.test(uri);
  }

  /**
   * Extract parameter names from a URI template
   * @param uriTemplate Resource URI template
   * @returns Array of parameter names
   */
  extractTemplateParameters(uriTemplate: string): string[] {
    const matches = uriTemplate.match(/{([^}]+)}/g);
    if (!matches) return [];

    return matches.map((match) => match.slice(1, -1));
  }

  /**
   * Resolve a URI template with parameters
   * @param uriTemplate Resource URI template
   * @param params Parameter values
   * @returns Resolved URI
   */
  resolveTemplate(
    uriTemplate: string,
    params: Record<string, string>
  ): string {
    let resolved = uriTemplate;

    for (const [key, value] of Object.entries(params)) {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(value));
    }

    return resolved;
  }

  /**
   * Group resources by URI scheme (file://, http://, custom://)
   * @param resources Array of discovered resources
   * @returns Map of scheme to resources
   */
  groupByScheme(
    resources: DiscoveredResource[]
  ): Map<string, DiscoveredResource[]> {
    const groups = new Map<string, DiscoveredResource[]>();

    for (const resource of resources) {
      const scheme = this.extractScheme(resource.uri);
      if (!groups.has(scheme)) {
        groups.set(scheme, []);
      }
      groups.get(scheme)!.push(resource);
    }

    return groups;
  }

  /**
   * Extract URI scheme from a URI
   * @param uri Resource URI
   * @returns URI scheme
   */
  private extractScheme(uri: string): string {
    const match = uri.match(/^([^:]+):/);
    return match ? match[1] : "unknown";
  }
}

export const resourceDiscovery = new ResourceDiscovery();
