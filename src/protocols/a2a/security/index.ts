/**
 * A2A Security Module
 * 
 * Exports signature validation and key management services
 */

export { AgentKeyRegistry } from "./agent-key-registry.js";
export { SignatureService } from "./signature-service.js";

// Re-export types
export type {
  A2ASignature,
  SignedA2AMessage,
  KeyMetadata,
  RevokedKey,
  IAgentKeyRegistry,
  SignatureServiceConfig,
  SignatureVerificationResult,
  SignatureAlgorithm,
} from "../../../types/signature.js";
