/**
 * Test Key Generation Utilities
 * 
 * Provides utilities for generating test key pairs and managing test keys
 */

import * as ed25519Module from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// Configure ed25519 IMMEDIATELY with SHA-512
const ed25519 = ed25519Module;
(ed25519.etc as any).sha512Sync = (...m: Uint8Array[]) =>
  sha512(ed25519.etc.concatBytes(...m));

/**
 * Test key pair
 */
export interface TestKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyBase64: string;
  agentId: string;
}

/**
 * Generate a test key pair for an agent
 */
export async function generateTestKeyPair(
  agentId: string,
): Promise<TestKeyPair> {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
    publicKeyBase64: Buffer.from(publicKey).toString("base64"),
    agentId,
  };
}

/**
 * Generate multiple test key pairs
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
 * Create a deterministic test key pair for reproducible tests
 * WARNING: Only use for testing!
 */
export async function createDeterministicKeyPair(
  seed: string,
): Promise<TestKeyPair> {
  // Create deterministic private key from seed (INSECURE - test only!)
  const seedBuffer = Buffer.from(seed.padEnd(32, "0").slice(0, 32));
  const privateKey = new Uint8Array(seedBuffer);
  const publicKey = await ed25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
    publicKeyBase64: Buffer.from(publicKey).toString("base64"),
    agentId: `test-${seed}`,
  };
}
