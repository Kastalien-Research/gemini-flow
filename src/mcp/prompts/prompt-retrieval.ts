/**
 * Prompt Retrieval for MCP Protocol
 * Implements prompts/get primitive for retrieving and rendering prompt templates
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { GetPromptResult, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface RetrievedPrompt {
  serverName: string;
  promptName: string;
  description?: string;
  messages: PromptMessage[];
  arguments?: Record<string, string>;
}

export class PromptRetrieval {
  /**
   * Retrieve a specific prompt from an MCP server
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @param promptName The name of the prompt to retrieve
   * @param args Optional arguments for the prompt template
   * @returns Retrieved prompt with rendered messages
   */
  async getPrompt(
    serverName: string,
    client: Client,
    promptName: string,
    args?: Record<string, string>
  ): Promise<RetrievedPrompt> {
    try {
      const result = await client.getPrompt({
        name: promptName,
        arguments: args,
      }) as GetPromptResult;

      return {
        serverName,
        promptName,
        description: result.description,
        messages: result.messages,
        arguments: args,
      };
    } catch (error) {
      console.error(
        `Failed to retrieve prompt "${promptName}" from ${serverName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Parse prompt arguments from string format
   * Supports both positional and named arguments:
   * - Positional: "value1" "value2"
   * - Named: --arg1="value1" --arg2="value2"
   * @param argString String containing arguments
   * @param schema Prompt argument schema
   * @returns Parsed arguments object
   */
  parseArguments(
    argString: string,
    schema?: PromptArgument[]
  ): Record<string, string> {
    const args: Record<string, string> = {};

    // Match named arguments: --name="value" or --name=value
    const namedRegex = /--(\w+)=(?:"([^"]*)"|(\S+))/g;
    let match;

    while ((match = namedRegex.exec(argString)) !== null) {
      const [, name, quotedValue, unquotedValue] = match;
      args[name] = quotedValue || unquotedValue;
    }

    // If no named arguments found, try positional
    if (Object.keys(args).length === 0 && schema) {
      const positionalRegex = /"([^"]*)"|(\S+)/g;
      const values: string[] = [];

      while ((match = positionalRegex.exec(argString)) !== null) {
        const [, quotedValue, unquotedValue] = match;
        values.push(quotedValue || unquotedValue);
      }

      // Map positional values to schema
      schema.forEach((arg, index) => {
        if (index < values.length) {
          args[arg.name] = values[index];
        }
      });
    }

    return args;
  }

  /**
   * Validate required arguments are present
   * @param args Provided arguments
   * @param schema Prompt argument schema
   * @throws Error if required arguments are missing
   */
  validateArguments(
    args: Record<string, string>,
    schema?: PromptArgument[]
  ): void {
    if (!schema) return;

    const missing = schema
      .filter((arg) => arg.required && !args[arg.name])
      .map((arg) => arg.name);

    if (missing.length > 0) {
      throw new Error(
        `Missing required arguments: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Extract text content from prompt messages
   * @param prompt Retrieved prompt
   * @returns Combined text content from all messages
   */
  extractTextContent(prompt: RetrievedPrompt): string {
    return prompt.messages
      .map((msg) => {
        if (msg.content.type === "text") {
          return msg.content.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
}

export const promptRetrieval = new PromptRetrieval();
