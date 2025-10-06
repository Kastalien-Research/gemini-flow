/**
 * Streamable HTTP Transport Implementation for MCP
 *
 * Provides HTTP POST requests and bidirectional streaming for remote MCP servers.
 * Supports custom headers for authentication and configuration.
 *
 * Note: SSE (Server-Sent Events) transport is deprecated and not implemented.
 * Use Streamable HTTP for all remote server connections.
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Logger } from "../../utils/logger.js";

export interface HttpTransportConfig {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class HttpTransport {
  private transport?: StreamableHTTPClientTransport;
  private logger: Logger;
  private config: HttpTransportConfig;

  constructor(config: HttpTransportConfig) {
    this.config = config;
    this.logger = new Logger("HttpTransport");
  }

  /**
   * Create and return the HTTP transport
   * Supports custom headers for authentication (OAuth, API keys, etc.)
   */
  async create(): Promise<StreamableHTTPClientTransport> {
    try {
      // Prepare headers with defaults
      const headers = {
        "Content-Type": "application/json",
        ...this.config.headers,
      };

      // Create Streamable HTTP transport
      this.transport = new StreamableHTTPClientTransport({
        url: this.config.url,
        headers,
        // Optional timeout can be added if SDK supports it
      });

      this.logger.info("HTTP transport created", {
        url: this.config.url,
        headers: Object.keys(headers),
      });

      return this.transport;
    } catch (error) {
      this.logger.error("Failed to create HTTP transport", error);
      throw new Error(`HTTP transport creation failed: ${error}`);
    }
  }

  /**
   * Update transport headers (useful for token refresh)
   */
  updateHeaders(headers: Record<string, string>): void {
    if (this.transport) {
      this.config.headers = {
        ...this.config.headers,
        ...headers,
      };
      this.logger.info("HTTP transport headers updated");
    } else {
      this.logger.warn("Cannot update headers - transport not created");
    }
  }

  /**
   * Get the current transport instance
   */
  getTransport(): StreamableHTTPClientTransport | undefined {
    return this.transport;
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        // The SDK's StreamableHTTPClientTransport handles cleanup internally
        this.logger.info("HTTP transport closed");
        this.transport = undefined;
      } catch (error) {
        this.logger.error("Error closing HTTP transport", error);
        throw error;
      }
    }
  }

  /**
   * Check if transport is active
   */
  isActive(): boolean {
    return this.transport !== undefined;
  }

  /**
   * Get current configuration
   */
  getConfig(): HttpTransportConfig {
    return { ...this.config };
  }
}
