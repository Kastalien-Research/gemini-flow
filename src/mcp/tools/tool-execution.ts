/**
 * MCP Tool Execution Implementation
 *
 * Implements the tools/call protocol for executing tools on MCP servers.
 * Handles JSON Schema validation, multi-part responses, and error handling.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResult, TextContent, ImageContent, EmbeddedResource } from "@modelcontextprotocol/sdk/types.js";
import { z, ZodSchema } from "zod";
import { Logger } from "../../utils/logger.js";

export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface ToolCallResponse {
  content: ContentPart[];
  isError?: boolean;
  _meta?: Record<string, any>;
}

export type ContentPart =
  | TextContentPart
  | ImageContentPart
  | AudioContentPart
  | ResourceContentPart;

export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageContentPart {
  type: "image";
  data: string;  // base64 encoded
  mimeType: string;
}

export interface AudioContentPart {
  type: "audio";
  data: string;  // base64 encoded
  mimeType: string;
}

export interface ResourceContentPart {
  type: "resource";
  resource: {
    uri?: string;
    text?: string;
    blob?: string;  // base64 encoded
    mimeType?: string;
  };
}

export class ToolExecution {
  private logger: Logger;
  private validationEnabled: boolean;

  constructor(options?: { enableValidation?: boolean }) {
    this.logger = new Logger("ToolExecution");
    this.validationEnabled = options?.enableValidation ?? true;
  }

  /**
   * Execute a tool using the tools/call protocol
   */
  async executeTool(
    serverName: string,
    client: Client,
    request: ToolCallRequest,
    schema?: ZodSchema
  ): Promise<ToolCallResponse> {
    try {
      this.logger.info(`Executing tool ${request.name} on ${serverName}`);

      // Validate arguments if schema is provided
      if (this.validationEnabled && schema) {
        this.validateArguments(request.arguments || {}, schema);
      }

      // Call the tools/call protocol method
      const result = await client.callTool({
        name: request.name,
        arguments: request.arguments || {},
      });

      // Transform the result to our response format
      const response = this.transformResult(result);

      this.logger.info(
        `Tool ${request.name} executed successfully with ${response.content.length} content parts`
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to execute tool ${request.name}`, error);

      // Return error response
      return {
        content: [
          {
            type: "text",
            text: `Tool execution failed: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Validate tool arguments against JSON Schema using Zod
   */
  private validateArguments(args: Record<string, any>, schema: ZodSchema): void {
    try {
      schema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        throw new Error(`Validation failed: ${errors.join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * Transform MCP tool result to our response format
   * Handles multi-part responses (text, images, audio, resources)
   */
  private transformResult(result: CallToolResult): ToolCallResponse {
    const content: ContentPart[] = [];

    // Process each content item in the result
    for (const item of result.content) {
      if (item.type === "text") {
        content.push({
          type: "text",
          text: (item as TextContent).text,
        });
      } else if (item.type === "image") {
        const imageItem = item as ImageContent;
        content.push({
          type: "image",
          data: imageItem.data,
          mimeType: imageItem.mimeType || "image/png",
        });
      } else if (item.type === "resource") {
        const resourceItem = item as EmbeddedResource;
        content.push({
          type: "resource",
          resource: {
            uri: resourceItem.resource?.uri,
            text: resourceItem.resource?.text,
            blob: resourceItem.resource?.blob,
            mimeType: resourceItem.resource?.mimeType,
          },
        });
      }
      // Add more content type handling as needed (audio, etc.)
    }

    return {
      content,
      isError: result.isError,
      _meta: result._meta,
    };
  }

  /**
   * Extract text content from response
   */
  extractText(response: ToolCallResponse): string {
    return response.content
      .filter((part) => part.type === "text")
      .map((part) => (part as TextContentPart).text)
      .join("\n");
  }

  /**
   * Extract images from response
   */
  extractImages(response: ToolCallResponse): ImageContentPart[] {
    return response.content.filter((part) => part.type === "image") as ImageContentPart[];
  }

  /**
   * Extract resources from response
   */
  extractResources(response: ToolCallResponse): ResourceContentPart[] {
    return response.content.filter((part) => part.type === "resource") as ResourceContentPart[];
  }

  /**
   * Check if response contains errors
   */
  hasErrors(response: ToolCallResponse): boolean {
    return response.isError === true;
  }
}
