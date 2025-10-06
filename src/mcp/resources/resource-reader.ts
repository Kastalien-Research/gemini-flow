/**
 * Resource Reader for MCP Protocol
 * Implements resources/read primitive for reading resource content
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ReadResourceResult, ResourceContents } from "@modelcontextprotocol/sdk/types.js";

export interface ReadResourceOptions {
  uri: string;
  serverName?: string;
}

export interface ResourceContent {
  uri: string;
  serverName: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export class ResourceReader {
  /**
   * Read a resource from an MCP server
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @param uri The URI of the resource to read
   * @returns Resource content
   */
  async readResource(
    serverName: string,
    client: Client,
    uri: string
  ): Promise<ResourceContent> {
    try {
      const result = await client.readResource({ uri }) as ReadResourceResult;

      // Extract content from the first content block
      const content = result.contents[0];

      return {
        uri,
        serverName,
        mimeType: content.mimeType,
        text: content.text,
        blob: content.blob,
      };
    } catch (error) {
      console.error(
        `Failed to read resource "${uri}" from ${serverName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read multiple resources in parallel
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @param uris Array of resource URIs to read
   * @returns Array of resource contents
   */
  async readMultiple(
    serverName: string,
    client: Client,
    uris: string[]
  ): Promise<ResourceContent[]> {
    const promises = uris.map((uri) =>
      this.readResource(serverName, client, uri)
    );

    return Promise.all(promises);
  }

  /**
   * Check if resource is text-based
   * @param mimeType Resource MIME type
   * @returns True if text-based
   */
  isTextResource(mimeType?: string): boolean {
    if (!mimeType) return false;

    return (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType === "application/javascript" ||
      mimeType.includes("+xml") ||
      mimeType.includes("+json")
    );
  }

  /**
   * Check if resource is binary
   * @param mimeType Resource MIME type
   * @returns True if binary
   */
  isBinaryResource(mimeType?: string): boolean {
    if (!mimeType) return false;

    return (
      mimeType.startsWith("image/") ||
      mimeType.startsWith("audio/") ||
      mimeType.startsWith("video/") ||
      mimeType === "application/octet-stream" ||
      mimeType === "application/pdf" ||
      mimeType === "application/zip"
    );
  }

  /**
   * Decode base64 blob to string (for text content)
   * @param blob Base64-encoded blob
   * @returns Decoded string
   */
  decodeBlob(blob: string): string {
    try {
      return Buffer.from(blob, "base64").toString("utf-8");
    } catch (error) {
      console.error("Failed to decode blob:", error);
      throw new Error("Invalid base64 blob");
    }
  }

  /**
   * Get resource content as text
   * @param resource Resource content
   * @returns Text content
   */
  getTextContent(resource: ResourceContent): string {
    if (resource.text) {
      return resource.text;
    }

    if (resource.blob && this.isTextResource(resource.mimeType)) {
      return this.decodeBlob(resource.blob);
    }

    throw new Error("Resource does not contain text content");
  }

  /**
   * Get resource content as binary buffer
   * @param resource Resource content
   * @returns Binary buffer
   */
  getBinaryContent(resource: ResourceContent): Buffer {
    if (resource.blob) {
      return Buffer.from(resource.blob, "base64");
    }

    if (resource.text) {
      return Buffer.from(resource.text, "utf-8");
    }

    throw new Error("Resource does not contain binary content");
  }

  /**
   * Get human-readable size of resource
   * @param resource Resource content
   * @returns Formatted size string
   */
  getSize(resource: ResourceContent): string {
    let bytes: number;

    if (resource.blob) {
      bytes = Buffer.from(resource.blob, "base64").length;
    } else if (resource.text) {
      bytes = Buffer.byteLength(resource.text, "utf-8");
    } else {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Extract file extension from URI
   * @param uri Resource URI
   * @returns File extension (without dot)
   */
  extractExtension(uri: string): string {
    const match = uri.match(/\.([^./?#]+)(?:[?#]|$)/);
    return match ? match[1] : "";
  }

  /**
   * Validate resource URI format
   * @param uri Resource URI
   * @returns True if valid
   */
  isValidUri(uri: string): boolean {
    try {
      // Check for valid URI scheme
      const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(uri);

      if (!hasScheme) {
        return false;
      }

      // Try to parse as URL (may fail for custom schemes)
      try {
        new URL(uri);
      } catch {
        // Custom schemes are ok, as long as they have the scheme:path format
        const customScheme = /^[a-z][a-z0-9+.-]*:.+/i.test(uri);
        return customScheme;
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const resourceReader = new ResourceReader();
