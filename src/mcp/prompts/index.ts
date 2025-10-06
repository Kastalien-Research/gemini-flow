/**
 * MCP Prompts Module
 * Exports all prompt-related functionality
 */

export { PromptDiscovery, promptDiscovery } from "./prompt-discovery.js";
export type { DiscoveredPrompt } from "./prompt-discovery.js";

export { PromptRetrieval, promptRetrieval } from "./prompt-retrieval.js";
export type {
  PromptArgument,
  RetrievedPrompt,
} from "./prompt-retrieval.js";

export { PromptRegistry, promptRegistry } from "./prompt-registry.js";
export type { PromptMetadata } from "./prompt-registry.js";
