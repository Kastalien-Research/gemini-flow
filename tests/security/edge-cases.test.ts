/**
 * Edge Case Tests: Signature Validation
 * 
 * Tests for unusual scenarios, race conditions, and boundary cases
 */

import { describe, test, expect, beforeEach } from "vitest";
import { SignatureService } from "../../src/protocols/a2a/security/signature-service.js";
import { AgentKeyRegistry } from "../../src/protocols/a2a/security/agent-key-registry.js";
import { generateTestKeyPair } from "../helpers/test-keys.js";
import { createTestMessage, createExpiredMessage } from "../helpers/test-messages.js";

describe("Edge Cases: Signature Validation", () => {
  let signatureService: SignatureService;
  let keyRegistry: AgentKeyRegistry;
  let agentPrivateKey: Uint8Array;
  let agentPublicKey: string;
  const agentId = "test-agent-001";

  beforeEach(async () => {
    keyRegistry = new AgentKeyRegistry();
    signatureService = new SignatureService(keyRegistry);

    const keyPair = await generateTestKeyPair(agentId);
    agentPrivateKey = keyPair.privateKey;
    agentPublicKey = keyPair.publicKeyBase64;

    await keyRegistry.registerAgentKey(agentId, agentPublicKey);
  });

  test("should handle null/empty message gracefully", async () => {
    await expect(
      signatureService.signMessage(null as any, agentPrivateKey, agentId),
    ).rejects.toThrow();

    await expect(
      signatureService.signMessage({} as any, agentPrivateKey, agentId),
    ).rejects.toThrow();
  });

  test("should handle malformed signature structure", async () => {
    const message = createTestMessage({ from: agentId });
    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Remove required signature fields
    // @ts-expect-error - Testing malformed data
    delete signedMessage.signature.nonce;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
  });

  test("should handle key registry race conditions", async () => {
    const message = createTestMessage({ from: agentId });

    // Sign message
    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Simultaneously verify and revoke key
    const verifyPromise = signatureService.verifySignature(signedMessage);
    const metadata = await keyRegistry.getKeyMetadata(agentId);
    const revokePromise = keyRegistry.revokeKey(
      agentId,
      metadata!.keyId,
      "Concurrent revocation",
    );

    const [verifyResult] = await Promise.all([verifyPromise, revokePromise]);

    // Either valid (verified before revocation) or invalid (after revocation)
    expect(typeof verifyResult.valid).toBe("boolean");
  });

  test("should prevent replay attacks with extremely old timestamps", async () => {
    const message = createExpiredMessage(1000); // 1000 minutes old

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Force old timestamp in signature too
    signedMessage.signature.timestamp = message.timestamp;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  test("should handle signature with missing nonce", async () => {
    const message = createTestMessage({ from: agentId });
    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Remove nonce
    // @ts-expect-error - Testing invalid state
    delete signedMessage.signature.nonce;

    const result = await signatureService.verifySignature(signedMessage);
    expect(result.valid).toBe(false);
  });

  test("should handle canonical JSON with special characters", async () => {
    const message = createTestMessage({
      from: agentId,
      params: {
        text: "Hello\nWorld\t!",
        unicode: "🔐🚀",
        quotes: 'Test "quotes" here',
        backslash: "C:\\path\\to\\file",
      },
    });

    const signed1 = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Verify special characters don't break canonical JSON
    const result = await signatureService.verifySignature(signed1);
    expect(result.valid).toBe(true);
  });

  test("should handle key rotation during active verification", async () => {
    const message = createTestMessage({ from: agentId });

    // Sign with original key
    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId,
    );

    // Start verification
    const verifyPromise = signatureService.verifySignature(signedMessage);

    // Rotate key while verification is in progress
    const newKeyPair = await generateTestKeyPair(agentId);
    const rotatePromise = keyRegistry.rotateKey(
      agentId,
      newKeyPair.publicKeyBase64,
    );

    const [verifyResult] = await Promise.all([verifyPromise, rotatePromise]);

    // Should either succeed (before rotation) or fail (after rotation)
    expect(typeof verifyResult.valid).toBe("boolean");
  });

  test("should handle multiple revocations of same key gracefully", async () => {
    await keyRegistry.registerAgentKey(agentId, agentPublicKey);
    const metadata = await keyRegistry.getKeyMetadata(agentId);

    // First revocation
    await keyRegistry.revokeKey(agentId, metadata!.keyId, "First revocation");

    // Second revocation attempt should fail
    await expect(
      keyRegistry.revokeKey(agentId, metadata!.keyId, "Second revocation"),
    ).rejects.toThrow();
  });
});
