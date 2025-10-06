/**
 * Resource Subscriptions for MCP Protocol
 * Implements resource subscription mechanism for real-time updates
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import EventEmitter from "node:events";

export interface ResourceSubscription {
  uri: string;
  serverName: string;
  active: boolean;
  createdAt: number;
  lastUpdate?: number;
}

export interface ResourceUpdateEvent {
  uri: string;
  serverName: string;
  timestamp: number;
  content?: any;
}

/**
 * Resource Subscription Manager
 * Manages subscriptions to MCP resources for real-time updates
 */
export class ResourceSubscriptionManager extends EventEmitter {
  private subscriptions: Map<string, ResourceSubscription> = new Map();
  private clients: Map<string, Client> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to a resource for updates
   * @param serverName The name of the MCP server
   * @param client The connected MCP client
   * @param uri The URI of the resource to subscribe to
   * @param pollInterval Optional polling interval in ms (default: 5000)
   * @returns Subscription ID
   */
  async subscribe(
    serverName: string,
    client: Client,
    uri: string,
    pollInterval = 5000
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId(serverName, uri);

    // Check if already subscribed
    if (this.subscriptions.has(subscriptionId)) {
      console.warn(`Already subscribed to ${uri} on ${serverName}`);
      return subscriptionId;
    }

    // Create subscription
    const subscription: ResourceSubscription = {
      uri,
      serverName,
      active: true,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.clients.set(subscriptionId, client);

    // Set up polling for resource updates
    const interval = setInterval(async () => {
      await this.checkForUpdates(subscriptionId);
    }, pollInterval);

    this.pollingIntervals.set(subscriptionId, interval);

    // Emit subscription event
    this.emit("subscribed", { uri, serverName, subscriptionId });

    return subscriptionId;
  }

  /**
   * Unsubscribe from a resource
   * @param subscriptionId The subscription ID to cancel
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      console.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    // Clear polling interval
    const interval = this.pollingIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionId);
    }

    // Mark as inactive
    subscription.active = false;

    // Cleanup
    this.subscriptions.delete(subscriptionId);
    this.clients.delete(subscriptionId);

    // Emit unsubscribe event
    this.emit("unsubscribed", {
      uri: subscription.uri,
      serverName: subscription.serverName,
      subscriptionId,
    });
  }

  /**
   * Unsubscribe from all resources for a server
   * @param serverName The name of the MCP server
   */
  unsubscribeByServer(serverName: string): void {
    const toUnsubscribe: string[] = [];

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.serverName === serverName) {
        toUnsubscribe.push(id);
      }
    }

    toUnsubscribe.forEach((id) => this.unsubscribe(id));
  }

  /**
   * Get all active subscriptions
   * @returns Array of active subscriptions
   */
  getActiveSubscriptions(): ResourceSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.active
    );
  }

  /**
   * Get subscriptions for a specific server
   * @param serverName The name of the MCP server
   * @returns Array of subscriptions for the server
   */
  getSubscriptionsByServer(serverName: string): ResourceSubscription[] {
    return this.getActiveSubscriptions().filter(
      (sub) => sub.serverName === serverName
    );
  }

  /**
   * Check for resource updates (polling implementation)
   * @param subscriptionId The subscription ID to check
   */
  private async checkForUpdates(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    const client = this.clients.get(subscriptionId);

    if (!subscription || !client || !subscription.active) {
      return;
    }

    try {
      // Read resource to check for updates
      const result = await client.readResource({ uri: subscription.uri });

      // Update timestamp
      subscription.lastUpdate = Date.now();

      // Emit update event
      const updateEvent: ResourceUpdateEvent = {
        uri: subscription.uri,
        serverName: subscription.serverName,
        timestamp: subscription.lastUpdate,
        content: result.contents[0],
      };

      this.emit("update", updateEvent);
    } catch (error) {
      console.error(
        `Failed to check updates for ${subscription.uri}:`,
        error
      );
      this.emit("error", {
        subscriptionId,
        uri: subscription.uri,
        serverName: subscription.serverName,
        error,
      });
    }
  }

  /**
   * Generate a unique subscription ID
   * @param serverName Server name
   * @param uri Resource URI
   * @returns Subscription ID
   */
  private generateSubscriptionId(serverName: string, uri: string): string {
    return `${serverName}::${uri}`;
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    for (const id of this.subscriptions.keys()) {
      this.unsubscribe(id);
    }
  }

  /**
   * Get subscription count
   * @returns Number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

export const resourceSubscriptionManager = new ResourceSubscriptionManager();
