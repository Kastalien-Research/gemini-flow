/**
 * Global Test Setup
 * 
 * Configures ed25519 with SHA-512 for all tests
 */

import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// Configure ed25519 to use SHA-512 synchronously
// Must happen before any ed25519 operations
if (ed25519.etc) {
  (ed25519.etc as any).sha512Sync = (...m: Uint8Array[]) =>
    sha512(ed25519.etc.concatBytes(...m));
  console.log("✓ ed25519 configured with SHA-512");
} else {
  console.error("✗ Failed to configure ed25519: etc not available");
}
