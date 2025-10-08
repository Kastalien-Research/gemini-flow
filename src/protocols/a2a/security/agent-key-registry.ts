/**
 * Agent Key Registry
 * 
 * Manages agent shared secrets for HMAC signature verification
 * Handles secret registration, rotation, and revocation
 */

import { createHmac, randomBytes } from "crypto";
import { AgentId } from "../../../types/a2a.js";
import {
  KeyMetadata,
  RevokedKey,
  IAgentKeyRegistry,
  SignatureAlgorithm,
} from "../../../types/signature.js";
import { Logger } from "../../../utils/logger.js";

/**
 * Agent Key Registry Implementation (HMAC-based)
 */
export class AgentKeyRegistry implements IAgentKeyRegistry {
  private secrets: Map<AgentId, string> = new Map(); // agentId -> shared secret
  private metadata: Map<AgentId, KeyMetadata> = new Map(); // agentId -> metadata
  private revokedKeys: Map<AgentId, RevokedKey[]> = new Map(); // agentId -> revoked keys
  private logger: Logger;

  constructor() {
    this.logger = new Logger("AgentKeyRegistry");
    this.logger.info("Agent Key Registry initialized (HMAC mode)");
  }

  /**
   * Register an agent's shared secret
   */
  async registerAgentKey(
    agentId: AgentId,
    secret: string,
    metadata: Partial<KeyMetadata> = {},
  ): Promise<void> {
    // Generate key ID from secret
    const keyId = this.generateKeyId(secret);

    // Check if key is already revoked
    const revoked = this.revokedKeys.get(agentId) || [];
    if (revoked.some((r) => r.keyId === keyId)) {
      throw new Error("Cannot register revoked key");
    }

    // Store secret and metadata
    this.secrets.set(agentId, secret);
    this.metadata.set(agentId, {
      registeredAt: Date.now(),
      keyId,
      algorithm: "hmac-sha256" as SignatureAlgorithm,
      ...metadata,
    });

    this.logger.info(`Registered secret for agent ${agentId}`, { keyId });
  }

  /**
   * Retrieve an agent's shared secret
   */
  async getAgentSecret(agentId: AgentId): Promise<string | null> {
    return this.secrets.get(agentId) || null;
  }

  /**
   * Backward compatibility: alias for getAgentSecret
   * @deprecated Use getAgentSecret instead
   */
  async getAgentPublicKey(agentId: AgentId): Promise<string | null> {
    return this.getAgentSecret(agentId);
  }

  /**
   * Get key metadata for an agent
   */
  async getKeyMetadata(agentId: AgentId): Promise<KeyMetadata | null> {
    return this.metadata.get(agentId) || null;
  }

  /**
   * Revoke a compromised secret
   */
  async revokeKey(
    agentId: AgentId,
    keyId: string,
    reason: string,
  ): Promise<void> {
    const currentSecret = this.secrets.get(agentId);
    if (!currentSecret) {
      throw new Error(`No secret registered for agent ${agentId}`);
    }

    const currentKeyId = this.generateKeyId(currentSecret);
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

    // Remove from active secrets
    this.secrets.delete(agentId);
    this.metadata.delete(agentId);

    this.logger.warn(`Revoked secret ${keyId} for agent ${agentId}`, { reason });
  }

  /**
   * Rotate to a new secret
   */
  async rotateKey(agentId: AgentId, newSecret: string): Promise<void> {
    const oldSecret = this.secrets.get(agentId);

    if (oldSecret) {
      // Revoke old secret
      const oldKeyId = this.generateKeyId(oldSecret);
      await this.revokeKey(agentId, oldKeyId, "Key rotation");
    }

    // Register new secret
    await this.registerAgentKey(agentId, newSecret);

    this.logger.info(`Rotated secret for agent ${agentId}`);
  }

  /**
   * Check if a key is valid (not revoked)
   */
  async isKeyValid(agentId: AgentId, keyId: string): Promise<boolean> {
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
    return Array.from(this.secrets.keys());
  }

  /**
   * Check if an agent has a registered secret
   */
  hasRegisteredKey(agentId: AgentId): boolean {
    return this.secrets.has(agentId);
  }

  /**
   * Clear all secrets (for testing purposes)
   */
  clearAll(): void {
    this.secrets.clear();
    this.metadata.clear();
    this.revokedKeys.clear();
    this.logger.warn("All secrets cleared from registry");
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
      registeredKeys: this.secrets.size,
      revokedKeys: totalRevoked,
      agentsWithRevokedKeys: this.revokedKeys.size,
    };
  }

  /**
   * Generate a unique key ID from secret
   */
  private generateKeyId(secret: string): string {
    return createHmac("sha256", "keyid-salt")
      .update(secret)
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Generate a random shared secret
   */
  static generateSecret(): string {
    return randomBytes(32).toString("base64");
  }
}
