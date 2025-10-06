/**
 * Prompt Registry for MCP Protocol
 * Manages discovered prompts and provides lookup capabilities
 */

import type { DiscoveredPrompt } from "./prompt-discovery.js";

export interface PromptMetadata {
  name: string;
  serverName: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export class PromptRegistry {
  private prompts: Map<string, DiscoveredPrompt> = new Map();
  private serverPrompts: Map<string, Set<string>> = new Map();

  /**
   * Register a discovered prompt
   * @param prompt The prompt to register
   */
  registerPrompt(prompt: DiscoveredPrompt): void {
    const key = this.generateKey(prompt.serverName, prompt.name);

    // Handle name conflicts by prefixing with server name
    if (this.prompts.has(prompt.name) && !this.prompts.has(key)) {
      console.warn(
        `Prompt "${prompt.name}" already registered. Using prefixed name: ${key}`
      );
      this.prompts.set(key, prompt);
    } else {
      this.prompts.set(prompt.name, prompt);
    }

    // Track prompts by server
    if (!this.serverPrompts.has(prompt.serverName)) {
      this.serverPrompts.set(prompt.serverName, new Set());
    }
    this.serverPrompts.get(prompt.serverName)!.add(prompt.name);
  }

  /**
   * Register multiple prompts
   * @param prompts Array of prompts to register
   */
  registerMultiple(prompts: DiscoveredPrompt[]): void {
    prompts.forEach((prompt) => this.registerPrompt(prompt));
  }

  /**
   * Get a prompt by name
   * @param name Prompt name (with or without server prefix)
   * @returns The discovered prompt or undefined
   */
  getPrompt(name: string): DiscoveredPrompt | undefined {
    return this.prompts.get(name);
  }

  /**
   * Get all registered prompts
   * @returns Array of all discovered prompts
   */
  getAllPrompts(): DiscoveredPrompt[] {
    return Array.from(this.prompts.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Get prompts from a specific server
   * @param serverName Server name to filter by
   * @returns Array of prompts from the specified server
   */
  getPromptsByServer(serverName: string): DiscoveredPrompt[] {
    const promptNames = this.serverPrompts.get(serverName);
    if (!promptNames) return [];

    return Array.from(promptNames)
      .map((name) => this.getPrompt(name))
      .filter((p): p is DiscoveredPrompt => p !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get prompt metadata for display
   * @returns Array of prompt metadata for UI/CLI display
   */
  getPromptMetadata(): PromptMetadata[] {
    return this.getAllPrompts().map((prompt) => ({
      name: prompt.name,
      serverName: prompt.serverName,
      description: prompt.description,
      arguments: prompt.arguments,
    }));
  }

  /**
   * Search prompts by name or description
   * @param query Search query
   * @returns Matching prompts
   */
  search(query: string): DiscoveredPrompt[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPrompts().filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(lowerQuery) ||
        prompt.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Remove all prompts from a specific server
   * @param serverName Server name
   */
  removeByServer(serverName: string): void {
    const promptNames = this.serverPrompts.get(serverName);
    if (!promptNames) return;

    promptNames.forEach((name) => {
      this.prompts.delete(name);
      this.prompts.delete(this.generateKey(serverName, name));
    });

    this.serverPrompts.delete(serverName);
  }

  /**
   * Clear all registered prompts
   */
  clear(): void {
    this.prompts.clear();
    this.serverPrompts.clear();
  }

  /**
   * Generate a unique key for prompt storage
   * @param serverName Server name
   * @param promptName Prompt name
   * @returns Unique key
   */
  private generateKey(serverName: string, promptName: string): string {
    return `${serverName}__${promptName}`;
  }

  /**
   * Get count of registered prompts
   * @returns Number of prompts
   */
  getCount(): number {
    return this.prompts.size;
  }

  /**
   * Get count of servers with prompts
   * @returns Number of servers
   */
  getServerCount(): number {
    return this.serverPrompts.size;
  }
}

export const promptRegistry = new PromptRegistry();
