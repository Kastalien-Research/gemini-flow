/**
 * Unit Tests: AgentKeyRegistry
 * 
 * Tests for agent public key management, registration, rotation, and revocation
 */

import { describe, test, expect, beforeEach } from "vitest";
import { AgentKeyRegistry } from "../../src/protocols/a2a/security/agent-key-registry.js";
import { generateTestKeyPair } from "../helpers/test-keys.js";

describe("AgentKeyRegistry", () => {
  let registry: AgentKeyRegistry;
  let testAgentId: string;
  let testPublicKey: string;

  beforeEach(async () => {
    registry = new AgentKeyRegistry();
    testAgentId = "test-agent-001";
    const keyPair = await generateTestKeyPair(testAgentId);
    testPublicKey = keyPair.publicKeyBase64;
  });

  test("should register new agent key successfully", async () => {
    await registry.registerAgentKey(testAgentId, testPublicKey);

    const retrievedKey = await registry.getAgentPublicKey(testAgentId);
    expect(retrievedKey).toBe(testPublicKey);
  });

  test("should retrieve registered public key", async () => {
    await registry.registerAgentKey(testAgentId, testPublicKey);

    const key = await registry.getAgentPublicKey(testAgentId);
    expect(key).toBe(testPublicKey);
  });

  test("should return null for non-existent agent", async () => {
    const key = await registry.getAgentPublicKey("non-existent-agent");
    expect(key).toBeNull();
  });

  test("should reject registration of already-revoked key", async () => {
    // Register and then revoke
    await registry.registerAgentKey(testAgentId, testPublicKey);
    const metadata = await registry.getKeyMetadata(testAgentId);
    await registry.revokeKey(testAgentId, metadata!.keyId, "Test revocation");

    // Attempt to re-register the same key
    await expect(
      registry.registerAgentKey(testAgentId, testPublicKey),
    ).rejects.toThrow("Cannot register revoked key");
  });

  test("should revoke a key successfully", async () => {
    await registry.registerAgentKey(testAgentId, testPublicKey);
    const metadata = await registry.getKeyMetadata(testAgentId);

    await registry.revokeKey(testAgentId, metadata!.keyId, "Test revocation");

    const key = await registry.getAgentPublicKey(testAgentId);
    expect(key).toBeNull();

    const revokedKeys = await registry.getRevokedKeys(testAgentId);
    expect(revokedKeys).toHaveLength(1);
    expect(revokedKeys[0].reason).toBe("Test revocation");
  });

  test("should fail to revoke non-existent key", async () => {
    await expect(
      registry.revokeKey(testAgentId, "non-existent-key-id", "Test"),
    ).rejects.toThrow("No key registered");
  });

  test("should rotate key successfully", async () => {
    // Register initial key
    await registry.registerAgentKey(testAgentId, testPublicKey);

    // Generate new key
    const newKeyPair = await generateTestKeyPair(testAgentId);
    const newPublicKey = newKeyPair.publicKeyBase64;

    // Rotate to new key
    await registry.rotateKey(testAgentId, newPublicKey);

    // Verify new key is active
    const currentKey = await registry.getAgentPublicKey(testAgentId);
    expect(currentKey).toBe(newPublicKey);
    expect(currentKey).not.toBe(testPublicKey);

    // Verify old key was revoked
    const isOldKeyValid = await registry.isKeyValid(testAgentId, testPublicKey);
    expect(isOldKeyValid).toBe(false);
  });

  test("should validate non-revoked key returns true", async () => {
    await registry.registerAgentKey(testAgentId, testPublicKey);

    const isValid = await registry.isKeyValid(testAgentId, testPublicKey);
    expect(isValid).toBe(true);
  });

  test("should validate revoked key returns false", async () => {
    await registry.registerAgentKey(testAgentId, testPublicKey);
    const metadata = await registry.getKeyMetadata(testAgentId);
    await registry.revokeKey(testAgentId, metadata!.keyId, "Test");

    const isValid = await registry.isKeyValid(testAgentId, testPublicKey);
    expect(isValid).toBe(false);
  });

  test("should generate deterministic key IDs", async () => {
    const keyPair1 = await generateTestKeyPair("agent-1");
    const keyPair2 = await generateTestKeyPair("agent-2");

    await registry.registerAgentKey("agent-1", keyPair1.publicKeyBase64);
    await registry.registerAgentKey("agent-2", keyPair2.publicKeyBase64);

    const metadata1 = await registry.getKeyMetadata("agent-1");
    const metadata2 = await registry.getKeyMetadata("agent-2");

    // Different public keys should have different key IDs
    expect(metadata1!.keyId).not.toBe(metadata2!.keyId);

    // Same public key should always generate same key ID
    await registry.clearAll();
    await registry.registerAgentKey("agent-1", keyPair1.publicKeyBase64);
    const metadata1Again = await registry.getKeyMetadata("agent-1");
    expect(metadata1Again!.keyId).toBe(metadata1!.keyId);
  });

  test("should get registry statistics", async () => {
    const keyPair1 = await generateTestKeyPair("agent-1");
    const keyPair2 = await generateTestKeyPair("agent-2");

    await registry.registerAgentKey("agent-1", keyPair1.publicKeyBase64);
    await registry.registerAgentKey("agent-2", keyPair2.publicKeyBase64);

    // Revoke one key
    const metadata1 = await registry.getKeyMetadata("agent-1");
    await registry.revokeKey("agent-1", metadata1!.keyId, "Test");

    const stats = registry.getStats();
    expect(stats.registeredKeys).toBe(1); // Only agent-2 remains
    expect(stats.revokedKeys).toBe(1);
    expect(stats.agentsWithRevokedKeys).toBe(1);
  });
});
