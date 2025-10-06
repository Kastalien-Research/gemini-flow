/**
 * Enhanced MCP Client with Phase 2 Features
 * Extends the basic MCP client with Prompts, Resources, and OAuth support
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPClientWrapper } from "./mcp-client-wrapper.js";
import { promptDiscovery, promptRegistry, promptRetrieval } from "./prompts/index.js";
import { resourceDiscovery, resourceReader, resourceSubscriptionManager } from "./resources/index.js";
import { oauthProvider, tokenStorage } from "./auth/index.js";
import type { MCPOAuthConfig, OAuthToken } from "./auth/index.js";
import type { DiscoveredPrompt } from "./prompts/index.js";
import type { DiscoveredResource } from "./resources/index.js";

/**
 * Enhanced MCP Client with full Phase 2 support
 */
export class EnhancedMCPClient extends MCPClientWrapper {
  private promptsEnabled = true;
  private resourcesEnabled = true;
  private oauthConfigs = new Map<string, MCPOAuthConfig>();

  /**
   * Connect to an MCP server with OAuth support
   */
  async connectWithOAuth(
    name: string,
    spec: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
      oauth?: MCPOAuthConfig;
    }
  ): Promise<Client> {
    // Store OAuth config if provided
    if (spec.oauth) {
      this.oauthConfigs.set(name, spec.oauth);
    }

    // Check if we have stored credentials
    const credentials = await tokenStorage.getCredentials(name);
    let token: OAuthToken | undefined;

    if (credentials) {
      // Check if token is expired
      if (tokenStorage.isTokenExpired(credentials.token)) {
        // Try to refresh
        if (credentials.token.refreshToken && spec.oauth) {
          try {
            const refreshed = await oauthProvider.refreshAccessToken(
              spec.oauth,
              credentials.token.refreshToken
            );

            token = {
              accessToken: refreshed.access_token,
              tokenType: refreshed.token_type,
              refreshToken: refreshed.refresh_token,
              scope: refreshed.scope,
            };

            if (refreshed.expires_in) {
              token.expiresAt = Date.now() + refreshed.expires_in * 1000;
            }

            // Save refreshed token
            await tokenStorage.saveToken(
              name,
              token,
              credentials.clientId,
              credentials.tokenUrl,
              credentials.mcpServerUrl
            );
          } catch (error) {
            console.error(`Failed to refresh token for ${name}:`, error);
            token = undefined;
          }
        }
      } else {
        token = credentials.token;
      }
    }

    // If no valid token and OAuth is configured, authenticate
    if (!token && spec.oauth && spec.oauth.enabled !== false) {
      token = await oauthProvider.authenticate(name, spec.oauth);
      await tokenStorage.saveToken(
        name,
        token,
        spec.oauth.clientId,
        spec.oauth.tokenUrl
      );
    }

    // Add OAuth token to environment if available
    if (token) {
      spec.env = {
        ...spec.env,
        OAUTH_ACCESS_TOKEN: token.accessToken,
      };
    }

    // Connect using base client
    return this.connect(name, spec);
  }

  /**
   * Discover prompts from a connected server
   */
  async discoverPrompts(serverName: string): Promise<DiscoveredPrompt[]> {
    if (!this.promptsEnabled) {
      return [];
    }

    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    const prompts = await promptDiscovery.discoverPrompts(serverName, client);
    promptRegistry.registerMultiple(prompts);

    return prompts;
  }

  /**
   * Get a prompt from a server
   */
  async getPrompt(
    serverName: string,
    promptName: string,
    args?: Record<string, string>
  ) {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return promptRetrieval.getPrompt(serverName, client, promptName, args);
  }

  /**
   * Discover resources from a connected server
   */
  async discoverResources(serverName: string): Promise<DiscoveredResource[]> {
    if (!this.resourcesEnabled) {
      return [];
    }

    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return resourceDiscovery.discoverResources(serverName, client);
  }

  /**
   * Read a resource from a server
   */
  async readResource(serverName: string, uri: string) {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return resourceReader.readResource(serverName, client, uri);
  }

  /**
   * Subscribe to resource updates
   */
  async subscribeToResource(
    serverName: string,
    uri: string,
    pollInterval?: number
  ) {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    return resourceSubscriptionManager.subscribe(
      serverName,
      client,
      uri,
      pollInterval
    );
  }

  /**
   * Discover all features from a server (prompts + resources + tools)
   */
  async discoverAll(serverName: string) {
    const [tools, prompts, resources] = await Promise.all([
      this.listTools(serverName),
      this.discoverPrompts(serverName),
      this.discoverResources(serverName),
    ]);

    return {
      serverName,
      tools,
      prompts,
      resources,
      discovered: true,
    };
  }

  /**
   * Enable/disable prompts discovery
   */
  setPromptsEnabled(enabled: boolean): void {
    this.promptsEnabled = enabled;
  }

  /**
   * Enable/disable resources discovery
   */
  setResourcesEnabled(enabled: boolean): void {
    this.resourcesEnabled = enabled;
  }

  /**
   * Get prompt registry
   */
  getPromptRegistry() {
    return promptRegistry;
  }

  /**
   * Get resource subscription manager
   */
  getResourceSubscriptionManager() {
    return resourceSubscriptionManager;
  }

  /**
   * Cleanup all connections and subscriptions
   */
  async cleanup(): Promise<void> {
    await this.closeAll();
    resourceSubscriptionManager.cleanup();
    promptRegistry.clear();
  }
}

export const enhancedMCP = new EnhancedMCPClient();
