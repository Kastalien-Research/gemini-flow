/**
 * Agent Key Registry
 * 
 * Manages agent public keys for signature verification
 * Handles key registration, rotation, and revocation
 */

import { createHash } from "crypto";
import { AgentId } from "../../../types/a2a.js";
import {
  KeyMetadata,
  RevokedKey,
  IAgentKeyRegistry,
  SignatureAlgorithm,
} from "../../../types/signature.js";
import { Logger } from "../../../utils/logger.js";

/**
 * Agent Key Registry Implementation
 */
export class AgentKeyRegistry implements IAgentKeyRegistry {
  private keys: Map<AgentId, string> = new Map(); // agentId -> publicKey
  private metadata: Map<AgentId, KeyMetadata> = new Map(); // agentId -> metadata
  private revokedKeys: Map<AgentId, RevokedKey[]> = new Map(); // agentId -> revoked keys
  private logger: Logger;

  constructor() {
    this.logger = new Logger("AgentKeyRegistry");
    this.logger.info("Agent Key Registry initialized");
  }

  /**
   * Register an agent's public key
   */
  async registerAgentKey(
    agentId: AgentId,
    publicKey: string,
    metadata: Partial<KeyMetadata> = {},
  ): Promise<void> {
    // Generate key ID from public key
    const keyId = this.generateKeyId(publicKey);

    // Check if key is already revoked
    const revoked = this.revokedKeys.get(agentId) || [];
    if (revoked.some((r) => r.keyId === keyId)) {
      throw new Error("Cannot register revoked key");
    }

    // Store key and metadata
    this.keys.set(agentId, publicKey);
    this.metadata.set(agentId, {
      registeredAt: Date.now(),
      keyId,
      algorithm: "ed25519" as SignatureAlgorithm,
      ...metadata,
    });

    this.logger.info(`Registered key for agent ${agentId}`, { keyId });
  }

  /**
   * Retrieve an agent's public key
   */
  async getAgentPublicKey(agentId: AgentId): Promise<string | null> {
    return this.keys.get(agentId) || null;
  }

  /**
   * Get key metadata for an agent
   */
  async getKeyMetadata(agentId: AgentId): Promise<KeyMetadata | null> {
    return this.metadata.get(agentId) || null;
  }

  /**
   * Revoke a compromised key
   */
  async revokeKey(
    agentId: AgentId,
    keyId: string,
    reason: string,
  ): Promise<void> {
    const currentKey = this.keys.get(agentId);
    if (!currentKey) {
      throw new Error(`No key registered for agent ${agentId}`);
    }

    const currentKeyId = this.generateKeyId(currentKey);
    if (currentKeyId !== keyId) {
      throw new Error("Key ID mismatch");
    }

    // Add to revoked list
    const revoked = this.revokedKeys.get(agentId) || [];
    revoked.push({
      keyId,
      revokedAt: Date.now(),
      reason,
    });
    this.revokedKeys.set(agentId, revoked);

    // Remove from active keys
    this.keys.delete(agentId);
    this.metadata.delete(agentId);

    this.logger.warn(`Revoked key ${keyId} for agent ${agentId}`, { reason });
  }

  /**
   * Rotate to a new key
   */
  async rotateKey(agentId: AgentId, newPublicKey: string): Promise<void> {
    const oldKey = this.keys.get(agentId);

    if (oldKey) {
      // Revoke old key
      const oldKeyId = this.generateKeyId(oldKey);
      await this.revokeKey(agentId, oldKeyId, "Key rotation");
    }

    // Register new key
    await this.registerAgentKey(agentId, newPublicKey);

    this.logger.info(`Rotated key for agent ${agentId}`);
  }

  /**
   * Check if a key is valid (not revoked)
   */
  async isKeyValid(agentId: AgentId, publicKey: string): Promise<boolean> {
    const keyId = this.generateKeyId(publicKey);
    const revoked = this.revokedKeys.get(agentId) || [];

    const isRevoked = revoked.some((r) => r.keyId === keyId);
    return !isRevoked;
  }

  /**
   * Get all revoked keys for an agent
   */
  async getRevokedKeys(agentId: AgentId): Promise<RevokedKey[]> {
    return this.revokedKeys.get(agentId) || [];
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentId[] {
    return Array.from(this.keys.keys());
  }

  /**
   * Check if an agent has a registered key
   */
  hasRegisteredKey(agentId: AgentId): boolean {
    return this.keys.has(agentId);
  }

  /**
   * Clear all keys (for testing purposes)
   */
  clearAll(): void {
    this.keys.clear();
    this.metadata.clear();
    this.revokedKeys.clear();
    this.logger.warn("All keys cleared from registry");
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const totalRevoked = Array.from(this.revokedKeys.values()).reduce(
      (sum, keys) => sum + keys.length,
      0,
    );

    return {
      registeredKeys: this.keys.size,
      revokedKeys: totalRevoked,
      agentsWithRevokedKeys: this.revokedKeys.size,
    };
  }

  /**
   * Generate a unique key ID from public key
   */
  private generateKeyId(publicKey: string): string {
    return createHash("sha256").update(publicKey).digest("hex").slice(0, 16);
  }
}
