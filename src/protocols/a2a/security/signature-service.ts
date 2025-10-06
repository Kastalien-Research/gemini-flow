/**
 * Signature Service
 * 
 * Provides cryptographic signature creation and verification for A2A messages
 * Uses Ed25519 for fast, secure signatures
 */

import * as ed25519 from "@noble/ed25519";
import { randomBytes } from "crypto";
import { A2AMessage } from "../../../types/a2a.js";
import {
  SignedA2AMessage,
  SignatureServiceConfig,
  SignatureVerificationResult,
} from "../../../types/signature.js";
import { AgentKeyRegistry } from "./agent-key-registry.js";
import { Logger } from "../../../utils/logger.js";

/**
 * Signature Service Implementation
 */
export class SignatureService {
  private keyRegistry: AgentKeyRegistry;
  private logger: Logger;
  private config: Required<SignatureServiceConfig>;

  constructor(
    keyRegistry: AgentKeyRegistry,
    config: SignatureServiceConfig = {},
  ) {
    this.keyRegistry = keyRegistry;
    this.logger = new Logger("SignatureService");

    // Set default configuration
    this.config = {
      maxSignatureAge: config.maxSignatureAge ?? 5 * 60 * 1000, // 5 minutes
      enableNonceValidation: config.enableNonceValidation ?? true,
      algorithm: config.algorithm ?? "ed25519",
    };

    this.logger.info("Signature Service initialized", {
      maxSignatureAge: this.config.maxSignatureAge,
      algorithm: this.config.algorithm,
    });
  }

  /**
   * Sign a message with agent's private key
   */
  async signMessage(
    message: A2AMessage,
    privateKey: Uint8Array,
    agentId: string,
  ): Promise<SignedA2AMessage> {
    try {
      // Generate canonical JSON for signing
      const canonicalPayload = this.canonicalizeMessage(message);

      // Add timestamp and nonce
      const timestamp = Date.now();
      const nonce = randomBytes(32).toString("base64");

      // Create signing payload
      const signingPayload = JSON.stringify({
        payload: canonicalPayload,
        timestamp,
        nonce,
      });

      // Sign the payload
      const signature = await ed25519.sign(
        Buffer.from(signingPayload, "utf-8"),
        privateKey,
      );

      // Get public key
      const publicKey = await ed25519.getPublicKey(privateKey);

      const signedMessage: SignedA2AMessage = {
        ...message,
        signature: {
          algorithm: "ed25519",
          publicKey: Buffer.from(publicKey).toString("base64"),
          signature: Buffer.from(signature).toString("base64"),
          timestamp,
          nonce,
        },
        signedPayload: canonicalPayload,
      };

      this.logger.debug("Message signed successfully", {
        from: agentId,
        method: message.method,
        timestamp,
      });

      return signedMessage;
    } catch (error) {
      this.logger.error("Failed to sign message", { error, agentId });
      throw new Error(
        `Signature creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify a signed message
   */
  async verifySignature(
    signedMessage: SignedA2AMessage,
  ): Promise<SignatureVerificationResult> {
    try {
      // Extract signature components
      const { signature: sig, signedPayload } = signedMessage;

      // Verify timestamp is recent
      const age = Date.now() - sig.timestamp;
      if (age > this.config.maxSignatureAge) {
        return {
          valid: false,
          error: `Signature expired (age: ${Math.floor(age / 1000)}s)`,
          details: {
            timestamp: sig.timestamp,
            agentId: signedMessage.from,
          },
        };
      }

      // Check if timestamp is not in the future
      if (sig.timestamp > Date.now() + 60000) {
        // Allow 1 minute clock skew
        return {
          valid: false,
          error: "Signature timestamp is in the future",
          details: {
            timestamp: sig.timestamp,
            agentId: signedMessage.from,
          },
        };
      }

      // Check if key is registered and valid
      const registeredKey = await this.keyRegistry.getAgentPublicKey(
        signedMessage.from,
      );

      if (!registeredKey) {
        return {
          valid: false,
          error: `No public key registered for agent ${signedMessage.from}`,
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      if (registeredKey !== sig.publicKey) {
        return {
          valid: false,
          error: "Public key mismatch",
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      // Verify key is not revoked
      const isValid = await this.keyRegistry.isKeyValid(
        signedMessage.from,
        sig.publicKey,
      );

      if (!isValid) {
        return {
          valid: false,
          error: "Key has been revoked",
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      // Reconstruct signing payload
      const signingPayload = JSON.stringify({
        payload: signedPayload,
        timestamp: sig.timestamp,
        nonce: sig.nonce,
      });

      // Verify signature
      const publicKeyBytes = Buffer.from(sig.publicKey, "base64");
      const signatureBytes = Buffer.from(sig.signature, "base64");
      const messageBytes = Buffer.from(signingPayload, "utf-8");

      const isSignatureValid = await ed25519.verify(
        signatureBytes,
        messageBytes,
        publicKeyBytes,
      );

      if (!isSignatureValid) {
        return {
          valid: false,
          error: "Invalid signature",
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      // Verify message integrity (signed payload matches message)
      const currentCanonical = this.canonicalizeMessage(signedMessage);
      if (currentCanonical !== signedPayload) {
        return {
          valid: false,
          error: "Message has been modified after signing",
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      this.logger.debug("Signature verified successfully", {
        from: signedMessage.from,
        method: signedMessage.method,
      });

      return {
        valid: true,
        details: {
          timestamp: sig.timestamp,
          agentId: signedMessage.from,
        },
      };
    } catch (error) {
      this.logger.error("Signature verification failed", {
        error,
        from: signedMessage.from,
      });

      return {
        valid: false,
        error: `Verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: {
          agentId: signedMessage.from,
        },
      };
    }
  }

  /**
   * Verify signature and throw error if invalid
   */
  async verifySignatureOrThrow(signedMessage: SignedA2AMessage): Promise<void> {
    const result = await this.verifySignature(signedMessage);
    if (!result.valid) {
      throw new Error(result.error || "Signature verification failed");
    }
  }

  /**
   * Create canonical JSON representation for signing
   * Ensures deterministic serialization regardless of key order
   */
  private canonicalizeMessage(message: A2AMessage | SignedA2AMessage): string {
    // Create deterministic JSON (sorted keys, no whitespace)
    const canonical: any = {
      type: message.messageType || "request",
      from: message.from,
      to: message.to,
      id: message.id || null,
      timestamp: message.timestamp,
      method: message.method,
    };

    // Only include params if present
    if ("params" in message && message.params !== undefined) {
      canonical.params = this.sortObject(message.params);
    }

    return JSON.stringify(canonical);
  }

  /**
   * Recursively sort object keys for canonical representation
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObject(obj[key]);
      });

    return sorted;
  }

  /**
   * Check if a message is signed
   */
  isSignedMessage(message: any): message is SignedA2AMessage {
    return (
      message &&
      typeof message === "object" &&
      "signature" in message &&
      "signedPayload" in message
    );
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      maxSignatureAge: this.config.maxSignatureAge,
      algorithm: this.config.algorithm,
      keyRegistryStats: this.keyRegistry.getStats(),
    };
  }
}
