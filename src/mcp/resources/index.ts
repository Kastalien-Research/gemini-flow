/**
 * MCP Resources Module
 * Exports all resource-related functionality
 */

export { ResourceDiscovery, resourceDiscovery } from "./resource-discovery.js";
export type {
  DiscoveredResource,
  ResourceTemplate,
} from "./resource-discovery.js";

export { ResourceReader, resourceReader } from "./resource-reader.js";
export type {
  ReadResourceOptions,
  ResourceContent,
} from "./resource-reader.js";

export {
  ResourceSubscriptionManager,
  resourceSubscriptionManager,
} from "./resource-subscriptions.js";
export type {
  ResourceSubscription,
  ResourceUpdateEvent,
} from "./resource-subscriptions.js";
