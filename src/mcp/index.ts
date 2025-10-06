/**
 * MCP (Model Context Protocol) - Main Index
 *
 * Complete MCP implementation with official SDK integration.
 * Phase 1 Critical Features:
 * - Official @modelcontextprotocol/sdk integration
 * - Stdio and Streamable HTTP transports (SSE deprecated, not implemented)
 * - tools/list and tools/call protocol implementation
 * - JSON Schema validation
 * - Multi-part response handling (text, images, audio, resources)
 */

// Enhanced MCP Client (complete implementation)
export {
  EnhancedMCPClient,
  enhancedMCP,
  type MCPServerConfig,
  type MCPClientStatus,
} from "./enhanced-mcp-client.js";

// Legacy client wrapper (backward compatibility)
export { MCPClientWrapper, mcp } from "./mcp-client-wrapper.js";

// Transports
export * from "./transports/index.js";

// Tools
export * from "./tools/index.js";
