/**
 * Unit Tests: SignatureService
 * 
 * Comprehensive tests for signature creation, verification, and security validation
 */

import { describe, test, expect, beforeEach } from "vitest";
import { SignatureService } from "../../src/protocols/a2a/security/signature-service.js";
import { AgentKeyRegistry } from "../../src/protocols/a2a/security/agent-key-registry.js";
import { generateTestKeyPair } from "../helpers/test-keys.js";
import { createTestMessage } from "../helpers/test-messages.js";
import { A2AMessage } from "../../src/types/a2a.js";

describe("SignatureService", () => {
  let signatureService: SignatureService;
  let keyRegistry: AgentKeyRegistry;
  let agentPrivateKey: Uint8Array;
  let agentPublicKey: string;
  const agentId = "test-agent-001";

  beforeEach(async () => {
    keyRegistry = new AgentKeyRegistry();
    signatureService = new SignatureService(keyRegistry);

    // Generate test key pair
    const keyPair = await generateTestKeyPair(agentId);
    agentPrivateKey = keyPair.privateKey;
    agentPublicKey = keyPair.publicKeyBase64;

    // Register agent's public key
    await keyRegistry.registerAgentKey(agentId, agentPublicKey);
  });

  test("should sign and verify valid message", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    expect(signedMessage.signature).toBeDefined();
    expect(signedMessage.signedPayload).toBeDefined();
    expect(signedMessage.signature.algorithm).toBe("ed25519");

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("should reject message with invalid signature", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Tamper with signature
    signedMessage.signature.signature = "invalid-signature-data";

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid signature");
  });

  test("should reject message with modified payload", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Tamper with message content
    signedMessage.params = { malicious: "data" };

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("modified after signing");
  });

  test("should reject expired signatures (>5 min)", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Make signature appear old (10 minutes)
    signedMessage.signature.timestamp = Date.now() - 10 * 60 * 1000;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  test("should reject message from unregistered agent", async () => {
    const unknownKeyPair = await generateTestKeyPair("unknown-agent");
    const message = createTestMessage({ from: "unknown-agent" });

    const signedMessage = await signatureService.signMessage(
      message,
      unknownKeyPair.privateKey,
      "unknown-agent",
    );

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No public key registered");
  });

  test("should reject message with revoked key", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Revoke the key
    const metadata = await keyRegistry.getKeyMetadata(agentId);
    await keyRegistry.revokeKey(agentId, metadata!.keyId, "Test revocation");

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("revoked");
  });

  test("should create canonical JSON consistently", async () => {
    const message1: A2AMessage = createTestMessage({
      from: agentId,
      params: { b: 2, a: 1, c: { z: 3, x: 1 } },
    });

    const message2: A2AMessage = createTestMessage({
      from: agentId,
      params: { c: { x: 1, z: 3 }, a: 1, b: 2 },
    });

    const signed1 = await signatureService.signMessage(
      message1,
      agentPrivateKey,
      agentId,
    );
    const signed2 = await signatureService.signMessage(
      message2,
      agentPrivateKey,
      agentId,
    );

    // Canonical payloads should match despite different key order
    expect(signed1.signedPayload).toBe(signed2.signedPayload);
  });

  test("should reject timestamp in the future", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Set timestamp 10 minutes in future
    signedMessage.signature.timestamp = Date.now() + 10 * 60 * 1000;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("future");
  });

  test("should generate unique nonces for each signature", async () => {
    const message = createTestMessage({ from: agentId });

    const signed1 = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );
    const signed2 = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    expect(signed1.signature.nonce).not.toBe(signed2.signature.nonce);
  });

  test("should allow 1 minute clock skew tolerance", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Set timestamp 30 seconds in future (within tolerance)
    signedMessage.signature.timestamp = Date.now() + 30 * 1000;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(true);
  });

  test("should reject public key mismatch", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Replace public key with different one
    const otherKeyPair = await generateTestKeyPair("other-agent");
    signedMessage.signature.publicKey = otherKeyPair.publicKeyBase64;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mismatch");
  });

  test("should correctly identify signed messages", () => {
    const unsignedMessage = createTestMessage();
    expect(signatureService.isSignedMessage(unsignedMessage)).toBe(false);

    const signedLikeMessage = {
      ...createTestMessage(),
      signature: {},
      signedPayload: "test",
    };
    expect(signatureService.isSignedMessage(signedLikeMessage)).toBe(true);
  });

  test("should handle malformed signature data gracefully", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Corrupt signature with invalid base64
    signedMessage.signature.signature = "not-valid-base64!!!";

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("should provide detailed verification results", async () => {
    const message = createTestMessage({ from: agentId });

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    const result = await signatureService.verifySignature(signedMessage);

    expect(result.valid).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.agentId).toBe(agentId);
    expect(result.details?.timestamp).toBeDefined();
  });

  test("should handle concurrent signature operations", async () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      createTestMessage({
        from: agentId,
        id: `msg-${i}`,
      }),
    );

    // Sign all messages concurrently
    const signPromises = messages.map((msg) =>
      signatureService.signMessage(msg, agentPrivateKey, agentId),
    );

    const signedMessages = await Promise.all(signPromises);

    // Verify all messages concurrently
    const verifyPromises = signedMessages.map((msg) =>
      signatureService.verifySignature(msg),
    );

    const results = await Promise.all(verifyPromises);

    // All should be valid
    results.forEach((result) => {
      expect(result.valid).toBe(true);
    });

    // All nonces should be unique
    const nonces = signedMessages.map((m) => m.signature.nonce);
    const uniqueNonces = new Set(nonces);
    expect(uniqueNonces.size).toBe(nonces.length);
  });

  test("should track service statistics", () => {
    const stats = signatureService.getStats();

    expect(stats.maxSignatureAge).toBe(5 * 60 * 1000);
    expect(stats.algorithm).toBe("ed25519");
    expect(stats.keyRegistryStats).toBeDefined();
  });
});
