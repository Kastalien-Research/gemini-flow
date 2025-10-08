/**
 * Test Key Generation Utilities
 * 
 * Provides utilities for generating shared secrets for HMAC testing
 */

import { randomBytes } from "crypto";

/**
 * Test secret pair (simplified from keypair)
 */
export interface TestKeyPair {
  privateKey: string; // Shared secret (changed from Uint8Array)
  publicKey: string; // Same as privateKey for HMAC (backward compat)
  publicKeyBase64: string; // Same as privateKey for backward compat
  agentId: string;
}

/**
 * Generate a test shared secret for an agent
 */
export async function generateTestKeyPair(
  agentId: string,
): Promise<TestKeyPair> {
  const secret = randomBytes(32).toString("base64");

  return {
    privateKey: secret,
    publicKey: secret, // For HMAC, public and private are the same
    publicKeyBase64: secret,
    agentId,
  };
}

/**
 * Generate multiple test shared secrets
 */
export async function generateMultipleKeyPairs(
  count: number,
  prefix: string = "test-agent",
): Promise<TestKeyPair[]> {
  const keyPairs: TestKeyPair[] = [];

  for (let i = 0; i < count; i++) {
    const agentId = `${prefix}-${i.toString().padStart(3, "0")}`;
    const keyPair = await generateTestKeyPair(agentId);
    keyPairs.push(keyPair);
  }

  return keyPairs;
}

/**
 * Create a deterministic test secret for reproducible tests
 * WARNING: Only use for testing!
 */
export async function createDeterministicKeyPair(
  seed: string,
): Promise<TestKeyPair> {
  // Create deterministic secret from seed (INSECURE - test only!)
  const secret = Buffer.from(seed.padEnd(32, "0").slice(0, 32)).toString(
    "base64",
  );

  return {
    privateKey: secret,
    publicKey: secret,
    publicKeyBase64: secret,
    agentId: `test-${seed}`,
  };
}
