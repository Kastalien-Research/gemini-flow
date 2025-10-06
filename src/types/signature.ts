/**
 * Signature and Key Management Type Definitions
 * 
 * Types for cryptographic signature validation and key registry management
 */

import { AgentId } from "./a2a.js";

/**
 * Signature algorithm types
 */
export type SignatureAlgorithm = 'ed25519' | 'ecdsa-p256' | 'rsa-pss';

/**
 * Cryptographic signature structure
 */
export interface A2ASignature {
  algorithm: SignatureAlgorithm;
  publicKey: string; // Base64 encoded public key
  signature: string; // Base64 encoded signature
  timestamp: number; // Unix timestamp in milliseconds
  nonce: string; // Random nonce to prevent replay attacks
}

/**
 * Extended A2A message with signature
 */
export interface SignedA2AMessage {
  // Base message fields
  jsonrpc: "2.0";
  method: string;
  params?: object | any[];
  id?: string | number | null;
  from: AgentId;
  to: AgentId | AgentId[] | "broadcast";
  timestamp: number;
  messageType: string;
  
  // Signature fields
  signature: A2ASignature;
  signedPayload: string; // Canonical JSON of message body
  
  // Optional fields
  route?: any;
  priority?: any;
  capabilities?: any[];
  context?: any;
  nonce?: string;
}

/**
 * Key metadata for agent key registry
 */
export interface KeyMetadata {
  registeredAt: number;
  expiresAt?: number;
  keyId: string;
  algorithm: SignatureAlgorithm;
}

/**
 * Revoked key information
 */
export interface RevokedKey {
  keyId: string;
  revokedAt: number;
  reason: string;
}

/**
 * Agent key registry interface
 */
export interface IAgentKeyRegistry {
  /**
   * Register an agent's public key
   */
  registerAgentKey(
    agentId: AgentId,
    publicKey: string,
    metadata?: Partial<KeyMetadata>
  ): Promise<void>;

  /**
   * Retrieve an agent's public key
   */
  getAgentPublicKey(agentId: AgentId): Promise<string | null>;

  /**
   * Revoke a compromised key
   */
  revokeKey(agentId: AgentId, keyId: string, reason: string): Promise<void>;

  /**
   * Rotate to a new key
   */
  rotateKey(agentId: AgentId, newPublicKey: string): Promise<void>;

  /**
   * Check if a key is valid (not revoked)
   */
  isKeyValid(agentId: AgentId, publicKey: string): Promise<boolean>;
}

/**
 * Signature service configuration
 */
export interface SignatureServiceConfig {
  maxSignatureAge?: number; // Maximum age of signature in milliseconds (default: 5 minutes)
  enableNonceValidation?: boolean; // Enable nonce-based replay attack prevention
  algorithm?: SignatureAlgorithm; // Default signature algorithm
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
  details?: {
    timestamp?: number;
    agentId?: AgentId;
    keyId?: string;
  };
}
