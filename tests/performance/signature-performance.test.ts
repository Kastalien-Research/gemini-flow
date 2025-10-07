/**
 * Performance Tests: Signature Operations
 * 
 * Benchmarks for HMAC-SHA256 signature creation, verification, and throughput
 */

import { describe, test, expect, beforeEach } from "vitest";
import { SignatureService } from "../../src/protocols/a2a/security/signature-service.js";
import { AgentKeyRegistry } from "../../src/protocols/a2a/security/agent-key-registry.js";
import { generateTestKeyPair, generateMultipleKeyPairs } from "../helpers/test-keys.js";
import { createTestMessage, createMultipleMessages } from "../helpers/test-messages.js";

describe("Performance: Signature Operations", () => {
  let signatureService: SignatureService;
  let keyRegistry: AgentKeyRegistry;

  beforeEach(() => {
    keyRegistry = new AgentKeyRegistry();
    signatureService = new SignatureService(keyRegistry);
  });

  test("should sign messages at >50 per second", async () => {
    const agentId = "perf-agent-001";
    const keyPair = await generateTestKeyPair(agentId);
    await keyRegistry.registerAgentKey(agentId, keyPair.privateKey);

    const messages = createMultipleMessages(100, agentId, "target-agent");
    const startTime = Date.now();

    // Sign 100 messages
    for (const message of messages) {
      await signatureService.signMessage(
        message,
        keyPair.privateKey,
        agentId,
      );
    }

    const duration = Date.now() - startTime;
    const signaturesPerSecond = (100 / duration) * 1000;

    expect(signaturesPerSecond).toBeGreaterThan(50);
    console.log(`Signature creation rate: ${signaturesPerSecond.toFixed(2)} sig/s`);
  });

  test("should verify signatures at >1000 per second", async () => {
    const agentId = "perf-agent-002";
    const keyPair = await generateTestKeyPair(agentId);
    await keyRegistry.registerAgentKey(agentId, keyPair.privateKey);

    // Pre-sign 1000 messages
    const messages = createMultipleMessages(1000, agentId, "target-agent");
    const signedMessages = await Promise.all(
      messages.map((msg) =>
        signatureService.signMessage(msg, keyPair.privateKey, agentId),
      ),
    );

    // Measure verification performance
    const startTime = Date.now();

    for (const signedMsg of signedMessages) {
      await signatureService.verifySignature(signedMsg);
    }

    const duration = Date.now() - startTime;
    const verificationsPerSecond = (1000 / duration) * 1000;

    expect(verificationsPerSecond).toBeGreaterThan(1000);
    console.log(`Verification rate: ${verificationsPerSecond.toFixed(2)} verif/s`);
  });

  test("should handle 100 concurrent verifications", async () => {
    const agentId = "perf-agent-003";
    const keyPair = await generateTestKeyPair(agentId);
    await keyRegistry.registerAgentKey(agentId, keyPair.privateKey);

    // Create and sign 100 messages
    const messages = createMultipleMessages(100, agentId, "target-agent");
    const signedMessages = await Promise.all(
      messages.map((msg) =>
        signatureService.signMessage(msg, keyPair.privateKey, agentId),
      ),
    );

    // Verify all concurrently
    const startTime = Date.now();

    const results = await Promise.all(
      signedMessages.map((msg) => signatureService.verifySignature(msg)),
    );

    const duration = Date.now() - startTime;

    // All should be valid
    expect(results.every((r) => r.valid)).toBe(true);

    // Should complete in reasonable time (<1 second for 100)
    expect(duration).toBeLessThan(1000);
    console.log(`100 concurrent verifications: ${duration}ms`);
  });

  test("should maintain performance with 1000 operations (memory test)", async () => {
    const keyPairs = await generateMultipleKeyPairs(10, "perf-agent");

    // Register all secrets
    for (const kp of keyPairs) {
      await keyRegistry.registerAgentKey(kp.agentId, kp.privateKey);
    }

    // Perform 1000 sign+verify operations
    const iterations = 1000;
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const keyPair = keyPairs[i % keyPairs.length];
      const message = createTestMessage({
        from: keyPair.agentId,
        id: `msg-${i}`,
      });

      const signed = await signatureService.signMessage(
        message,
        keyPair.privateKey,
        keyPair.agentId,
      );

      const result = await signatureService.verifySignature(signed);
      expect(result.valid).toBe(true);
    }

    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

    console.log(`1000 operations completed in: ${duration}ms`);
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    // Should not have excessive memory growth (< 50MB for 1000 ops)
    expect(memoryIncrease).toBeLessThan(50);
  });

  test("should have fast key registry lookups (<1ms)", async () => {
    // Register 100 agents
    const keyPairs = await generateMultipleKeyPairs(100, "lookup-agent");
    for (const kp of keyPairs) {
      await keyRegistry.registerAgentKey(kp.agentId, kp.privateKey);
    }

    // Measure lookup performance
    const lookupCount = 1000;
    const startTime = Date.now();

    for (let i = 0; i < lookupCount; i++) {
      const agentId = `lookup-agent-${(i % 100).toString().padStart(3, "0")}`;
      await keyRegistry.getAgentSecret(agentId);
    }

    const duration = Date.now() - startTime;
    const avgLookupTime = duration / lookupCount;

    expect(avgLookupTime).toBeLessThan(1); // <1ms per lookup
    console.log(`Average secret lookup time: ${avgLookupTime.toFixed(4)}ms`);
  });
});
