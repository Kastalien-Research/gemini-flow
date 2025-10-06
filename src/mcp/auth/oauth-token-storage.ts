/**
 * OAuth Token Storage for MCP Protocol
 * Implements secure token persistence with file-based storage
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { OAuthToken } from "./oauth-provider.js";

export interface OAuthCredentials {
  serverName: string;
  token: OAuthToken;
  clientId?: string;
  tokenUrl?: string;
  mcpServerUrl?: string;
  updatedAt: number;
}

/**
 * OAuth Token Storage Manager
 */
export class MCPOAuthTokenStorage {
  private tokenFilePath: string;

  constructor(storagePath?: string) {
    this.tokenFilePath =
      storagePath ||
      path.join(os.homedir(), ".gemini-flow", "mcp-oauth-tokens.json");
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.tokenFilePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Load all credentials from storage
   */
  async getAllCredentials(): Promise<Map<string, OAuthCredentials>> {
    const credMap = new Map<string, OAuthCredentials>();

    try {
      const data = await fs.readFile(this.tokenFilePath, "utf-8");
      const credentials = JSON.parse(data) as OAuthCredentials[];

      for (const cred of credentials) {
        credMap.set(cred.serverName, cred);
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        console.error("Failed to load OAuth tokens:", error);
      }
    }

    return credMap;
  }

  /**
   * Save credentials to storage
   */
  private async saveAllCredentials(
    credMap: Map<string, OAuthCredentials>
  ): Promise<void> {
    await this.ensureDir();

    const credentials = Array.from(credMap.values());
    await fs.writeFile(
      this.tokenFilePath,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 }
    );
  }

  /**
   * Save a token for a server
   */
  async saveToken(
    serverName: string,
    token: OAuthToken,
    clientId?: string,
    tokenUrl?: string,
    mcpServerUrl?: string
  ): Promise<void> {
    const credentials = await this.getAllCredentials();

    credentials.set(serverName, {
      serverName,
      token,
      clientId,
      tokenUrl,
      mcpServerUrl,
      updatedAt: Date.now(),
    });

    await this.saveAllCredentials(credentials);
  }

  /**
   * Get credentials for a server
   */
  async getCredentials(
    serverName: string
  ): Promise<OAuthCredentials | null> {
    const credentials = await this.getAllCredentials();
    return credentials.get(serverName) || null;
  }

  /**
   * Delete credentials for a server
   */
  async deleteCredentials(serverName: string): Promise<void> {
    const credentials = await this.getAllCredentials();

    if (credentials.delete(serverName)) {
      if (credentials.size === 0) {
        await fs.unlink(this.tokenFilePath).catch(() => {});
      } else {
        await this.saveAllCredentials(credentials);
      }
    }
  }

  /**
   * List all server names with stored credentials
   */
  async listServers(): Promise<string[]> {
    const credentials = await this.getAllCredentials();
    return Array.from(credentials.keys());
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: OAuthToken): boolean {
    if (!token.expiresAt) {
      return false;
    }

    const bufferMs = 5 * 60 * 1000; // 5-minute buffer
    return Date.now() + bufferMs >= token.expiresAt;
  }

  /**
   * Clear all stored credentials
   */
  async clearAll(): Promise<void> {
    try {
      await fs.unlink(this.tokenFilePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        console.error("Failed to clear OAuth tokens:", error);
      }
    }
  }

  /**
   * Get token file path
   */
  getTokenFilePath(): string {
    return this.tokenFilePath;
  }
}

export const tokenStorage = new MCPOAuthTokenStorage();
