/**
 * Transport Factory for MCP
 *
 * Creates appropriate transport instances based on server configuration.
 * Supports stdio (local) and HTTP (remote) transports.
 */

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StdioTransport, StdioTransportConfig } from "./stdio-transport.js";
import { HttpTransport, HttpTransportConfig } from "./http-transport.js";
import { Logger } from "../../utils/logger.js";

export type TransportType = "stdio" | "http";

export interface TransportFactoryConfig {
  type: TransportType;
  stdio?: StdioTransportConfig;
  http?: HttpTransportConfig;
}

export class TransportFactory {
  private static logger = new Logger("TransportFactory");

  /**
   * Create appropriate transport based on configuration
   */
  static async createTransport(config: TransportFactoryConfig): Promise<Transport> {
    switch (config.type) {
      case "stdio":
        if (!config.stdio) {
          throw new Error("Stdio configuration required for stdio transport");
        }
        return this.createStdioTransport(config.stdio);

      case "http":
        if (!config.http) {
          throw new Error("HTTP configuration required for HTTP transport");
        }
        return this.createHttpTransport(config.http);

      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }

  /**
   * Create stdio transport for local MCP servers
   */
  private static async createStdioTransport(
    config: StdioTransportConfig
  ): Promise<Transport> {
    this.logger.info("Creating stdio transport", { command: config.command });
    const transport = new StdioTransport(config);
    return transport.create();
  }

  /**
   * Create HTTP transport for remote MCP servers
   */
  private static async createHttpTransport(
    config: HttpTransportConfig
  ): Promise<Transport> {
    this.logger.info("Creating HTTP transport", { url: config.url });
    const transport = new HttpTransport(config);
    return transport.create();
  }

  /**
   * Detect transport type from configuration
   */
  static detectTransportType(config: any): TransportType {
    // If URL is present and starts with http/https, use HTTP transport
    if (config.url && /^https?:\/\//i.test(config.url)) {
      return "http";
    }

    // If command is present, use stdio transport
    if (config.command) {
      return "stdio";
    }

    throw new Error("Cannot detect transport type from configuration");
  }

  /**
   * Create transport from server configuration
   * Auto-detects transport type based on config properties
   */
  static async createFromServerConfig(config: any): Promise<Transport> {
    const type = this.detectTransportType(config);

    if (type === "stdio") {
      return this.createStdioTransport({
        command: config.command,
        args: config.args,
        env: config.env,
        cwd: config.cwd,
        stderr: config.stderr,
      });
    } else {
      return this.createHttpTransport({
        url: config.url,
        headers: config.headers,
        timeout: config.timeout,
      });
    }
  }
}
