/**
 * Stdio Transport Implementation for MCP
 *
 * Provides local process communication via stdin/stdout for MCP servers.
 * Handles process lifecycle, environment variables, and working directory configuration.
 */

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "node:child_process";
import { Logger } from "../../utils/logger.js";

export interface StdioTransportConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stderr?: "inherit" | "pipe" | "ignore";
}

export class StdioTransport {
  private transport?: StdioClientTransport;
  private process?: ChildProcess;
  private logger: Logger;
  private config: StdioTransportConfig;

  constructor(config: StdioTransportConfig) {
    this.config = config;
    this.logger = new Logger("StdioTransport");
  }

  /**
   * Create and return the stdio transport
   * Manages process lifecycle and environment configuration
   */
  async create(): Promise<StdioClientTransport> {
    try {
      // Resolve environment variables
      const resolvedEnv = this.resolveEnvironmentVariables(this.config.env || {});

      // Create transport with process configuration
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args || [],
        env: {
          ...process.env,
          ...resolvedEnv,
        },
        stderr: this.config.stderr || "inherit",
        cwd: this.config.cwd,
      });

      this.logger.info("Stdio transport created", {
        command: this.config.command,
        args: this.config.args,
        cwd: this.config.cwd,
      });

      return this.transport;
    } catch (error) {
      this.logger.error("Failed to create stdio transport", error);
      throw new Error(`Stdio transport creation failed: ${error}`);
    }
  }

  /**
   * Resolve environment variables with $VAR and ${VAR} syntax support
   */
  private resolveEnvironmentVariables(env: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      // Replace $VAR and ${VAR} with actual environment variable values
      let resolvedValue = value;

      // Handle ${VAR} syntax
      resolvedValue = resolvedValue.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return process.env[varName] || "";
      });

      // Handle $VAR syntax (word boundary)
      resolvedValue = resolvedValue.replace(/\$(\w+)/g, (_, varName) => {
        return process.env[varName] || "";
      });

      resolved[key] = resolvedValue;
    }

    return resolved;
  }

  /**
   * Get the current transport instance
   */
  getTransport(): StdioClientTransport | undefined {
    return this.transport;
  }

  /**
   * Close the transport and cleanup process
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        // The SDK's StdioClientTransport handles process cleanup internally
        this.logger.info("Stdio transport closed");
        this.transport = undefined;
      } catch (error) {
        this.logger.error("Error closing stdio transport", error);
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
}
