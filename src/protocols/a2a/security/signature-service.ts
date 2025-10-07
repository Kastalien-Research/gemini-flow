/**
 * Signature Service
 * 
 * Provides HMAC-SHA256 signature creation and verification for A2A messages
 * Simplified approach for faster development iteration
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { A2AMessage } from "../../../types/a2a.js";
import {
  SignedA2AMessage,
  SignatureServiceConfig,
  SignatureVerificationResult,
} from "../../../types/signature.js";
import { AgentKeyRegistry } from "./agent-key-registry.js";
import { Logger } from "../../../utils/logger.js";

/**
 * Signature Service Implementation (HMAC-based)
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
      algorithm: config.algorithm ?? "hmac-sha256",
    };

    this.logger.info("Signature Service initialized (HMAC mode)", {
      maxSignatureAge: this.config.maxSignatureAge,
      algorithm: this.config.algorithm,
    });
  }

  /**
   * Sign a message with agent's shared secret
   */
  async signMessage(
    message: A2AMessage,
    secret: string,
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

      // Generate HMAC signature
      const signature = createHmac("sha256", secret)
        .update(signingPayload)
        .digest("hex");

      // Generate key ID from secret
      const keyId = this.generateKeyId(secret);

      const signedMessage: SignedA2AMessage = {
        ...message,
        signature: {
          algorithm: "hmac-sha256",
          keyId,
          signature,
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

      // Get agent's shared secret
      const secret = await this.keyRegistry.getAgentSecret(signedMessage.from);

      if (!secret) {
        return {
          valid: false,
          error: `No secret registered for agent ${signedMessage.from}`,
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      // Verify key ID matches
      const expectedKeyId = this.generateKeyId(secret);
      if (expectedKeyId !== sig.keyId) {
        return {
          valid: false,
          error: "Key ID mismatch",
          details: {
            agentId: signedMessage.from,
            keyId: sig.keyId,
          },
        };
      }

      // Verify key is not revoked
      const isValid = await this.keyRegistry.isKeyValid(
        signedMessage.from,
        sig.keyId,
      );

      if (!isValid) {
        return {
          valid: false,
          error: "Key has been revoked",
          details: {
            agentId: signedMessage.from,
            keyId: sig.keyId,
          },
        };
      }

      // Reconstruct signing payload
      const signingPayload = JSON.stringify({
        payload: signedPayload,
        timestamp: sig.timestamp,
        nonce: sig.nonce,
      });

      // Compute expected HMAC
      const expectedSignature = createHmac("sha256", secret)
        .update(signingPayload)
        .digest("hex");

      // Timing-safe comparison
      const signatureBuffer = Buffer.from(sig.signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (signatureBuffer.length !== expectedBuffer.length) {
        return {
          valid: false,
          error: "Invalid signature",
          details: {
            agentId: signedMessage.from,
          },
        };
      }

      const isSignatureValid = timingSafeEqual(signatureBuffer, expectedBuffer);

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
          keyId: sig.keyId,
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
   * Generate key ID from secret
   */
  private generateKeyId(secret: string): string {
    return createHmac("sha256", "keyid-salt")
      .update(secret)
      .digest("hex")
      .slice(0, 16);
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
