# Phase 3: P0-1 Security Signature Validation Implementation

## Overview
**Priority**: CRITICAL (P0)  
**Git Branch**: `fix/p0-security-signature-validation`  
**Estimated Effort**: 3-5 days  
**Dependencies**: None (can start immediately)

This phase addresses the critical security vulnerability where cryptographic signature validation is mocked or simplified, allowing potential message tampering and agent impersonation in the A2A protocol.

---

## Current State (Broken)

### Files with Mock Implementations

#### 1. `src/protocols/a2a/core/a2a-protocol-manager.ts`
```typescript
private async validateSignature(message: A2AMessage): Promise<boolean> {
  // In a real implementation, this would verify the cryptographic signature
  // using the agent's public key
  return true; // MOCK - Always returns true!
}
```

#### 2. `src/protocols/a2a/consensus/byzantine-consensus.ts`
```typescript
// Validate signature (simplified - in real implementation, use proper crypto)
const expectedSignature = this.signMessage(message.digest || message.type);
return message.signature === expectedSignature; // Weak comparison
```

#### 3. `src/core/auth/a2a-auth-service.ts`
```typescript
private async validateSignature(message: A2AMessage): Promise<boolean> {
  // In real implementation, this would verify the cryptographic signature
  // using the agent's public key
  return true; // MOCK - No actual verification!
}
```

### Security Risks
- **Message Tampering**: Any agent can modify messages without detection
- **Agent Impersonation**: No proof of identity, agents can impersonate others
- **Byzantine Attacks**: Malicious agents can forge consensus messages
- **Replay Attacks**: No protection against message replay
- **Man-in-the-Middle**: No integrity verification

---

## Target State (Fixed)

### Implementation Strategy

#### 1. Cryptographic Library Selection
Use `@noble/ed25519` for EdDSA signatures:
- FIPS 186-5 compliant
- Widely adopted (used by Signal, Ethereum)
- Fast verification (>10k signatures/second)
- Small signature size (64 bytes)
- Deterministic signatures

#### 2. Signature Format
```typescript
interface A2ASignature {
  algorithm: 'ed25519' | 'ecdsa-p256' | 'rsa-pss';
  publicKey: string; // Base64 encoded public key
  signature: string; // Base64 encoded signature
  timestamp: number; // Unix timestamp in milliseconds
  nonce: string; // Random nonce to prevent replay attacks
}

interface SignedA2AMessage extends A2AMessage {
  signature: A2ASignature;
  signedPayload: string; // Canonical JSON of message body
}
```

#### 3. Agent Key Registry
```typescript
interface AgentKeyRegistry {
  // Register agent's public key
  registerAgentKey(agentId: string, publicKey: string, metadata: KeyMetadata): Promise<void>;
  
  // Retrieve agent's public key
  getAgentPublicKey(agentId: string): Promise<string | null>;
  
  // Revoke compromised keys
  revokeKey(agentId: string, keyId: string, reason: string): Promise<void>;
  
  // Rotate keys
  rotateKey(agentId: string, newPublicKey: string): Promise<void>;
  
  // Verify key is not revoked
  isKeyValid(agentId: string, publicKey: string): Promise<boolean>;
}
```

---

## Implementation Details

### Step 1: Install Dependencies
```bash
npm install @noble/ed25519 @noble/hashes
npm install -D @types/node
```

### Step 2: Create Signature Service

**File**: `src/protocols/a2a/security/signature-service.ts`
```typescript
import { ed25519 } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes } from 'crypto';

export class SignatureService {
  private keyRegistry: AgentKeyRegistry;
  
  constructor(keyRegistry: AgentKeyRegistry) {
    this.keyRegistry = keyRegistry;
    ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));
  }

  /**
   * Sign a message with agent's private key
   */
  async signMessage(
    message: A2AMessage,
    privateKey: Uint8Array,
    agentId: string
  ): Promise<SignedA2AMessage> {
    // Generate canonical JSON for signing
    const canonicalPayload = this.canonicalizeMessage(message);
    
    // Add timestamp and nonce
    const timestamp = Date.now();
    const nonce = randomBytes(32).toString('base64');
    
    // Create signing payload
    const signingPayload = JSON.stringify({
      payload: canonicalPayload,
      timestamp,
      nonce
    });
    
    // Sign the payload
    const signature = await ed25519.sign(
      Buffer.from(signingPayload, 'utf-8'),
      privateKey
    );
    
    // Get public key
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    return {
      ...message,
      signature: {
        algorithm: 'ed25519',
        publicKey: Buffer.from(publicKey).toString('base64'),
        signature: Buffer.from(signature).toString('base64'),
        timestamp,
        nonce
      },
      signedPayload: canonicalPayload
    };
  }

  /**
   * Verify a signed message
   */
  async verifySignature(signedMessage: SignedA2AMessage): Promise<boolean> {
    try {
      // Extract signature components
      const { signature: sig, signedPayload } = signedMessage;
      
      // Verify timestamp is recent (within 5 minutes)
      const age = Date.now() - sig.timestamp;
      if (age > 5 * 60 * 1000) {
        throw new Error('Signature expired');
      }
      
      // Check if key is registered and valid
      const registeredKey = await this.keyRegistry.getAgentPublicKey(
        signedMessage.from
      );
      
      if (!registeredKey) {
        throw new Error(`No public key registered for agent ${signedMessage.from}`);
      }
      
      if (registeredKey !== sig.publicKey) {
        throw new Error('Public key mismatch');
      }
      
      // Verify key is not revoked
      const isValid = await this.keyRegistry.isKeyValid(
        signedMessage.from,
        sig.publicKey
      );
      
      if (!isValid) {
        throw new Error('Key has been revoked');
      }
      
      // Reconstruct signing payload
      const signingPayload = JSON.stringify({
        payload: signedPayload,
        timestamp: sig.timestamp,
        nonce: sig.nonce
      });
      
      // Verify signature
      const publicKeyBytes = Buffer.from(sig.publicKey, 'base64');
      const signatureBytes = Buffer.from(sig.signature, 'base64');
      const messageBytes = Buffer.from(signingPayload, 'utf-8');
      
      const isSignatureValid = await ed25519.verify(
        signatureBytes,
        messageBytes,
        publicKeyBytes
      );
      
      if (!isSignatureValid) {
        throw new Error('Invalid signature');
      }
      
      // Verify message integrity (signed payload matches message)
      const currentCanonical = this.canonicalizeMessage(signedMessage);
      if (currentCanonical !== signedPayload) {
        throw new Error('Message has been modified after signing');
      }
      
      return true;
      
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Create canonical JSON representation for signing
   */
  private canonicalizeMessage(message: A2AMessage): string {
    // Create deterministic JSON (sorted keys, no whitespace)
    const canonical = {
      type: message.type,
      from: message.from,
      to: message.to,
      id: message.id,
      timestamp: message.timestamp,
      payload: this.sortObject(message.payload || {})
    };
    
    return JSON.stringify(canonical);
  }

  /**
   * Recursively sort object keys for canonical representation
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }
    
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });
    
    return sorted;
  }
}
```

### Step 3: Create Agent Key Registry

**File**: `src/protocols/a2a/security/agent-key-registry.ts`
```typescript
import { createHash } from 'crypto';

interface KeyMetadata {
  registeredAt: number;
  expiresAt?: number;
  keyId: string;
  algorithm: string;
}

interface RevokedKey {
  keyId: string;
  revokedAt: number;
  reason: string;
}

export class AgentKeyRegistry {
  private keys: Map<string, string> = new Map(); // agentId -> publicKey
  private metadata: Map<string, KeyMetadata> = new Map(); // agentId -> metadata
  private revokedKeys: Map<string, RevokedKey[]> = new Map(); // agentId -> revoked keys
  
  /**
   * Register an agent's public key
   */
  async registerAgentKey(
    agentId: string,
    publicKey: string,
    metadata: Partial<KeyMetadata> = {}
  ): Promise<void> {
    // Generate key ID from public key
    const keyId = this.generateKeyId(publicKey);
    
    // Check if key is already revoked
    const revoked = this.revokedKeys.get(agentId) || [];
    if (revoked.some(r => r.keyId === keyId)) {
      throw new Error('Cannot register revoked key');
    }
    
    // Store key and metadata
    this.keys.set(agentId, publicKey);
    this.metadata.set(agentId, {
      registeredAt: Date.now(),
      keyId,
      algorithm: 'ed25519',
      ...metadata
    });
    
    console.log(`Registered key for agent ${agentId}: ${keyId}`);
  }
  
  /**
   * Retrieve an agent's public key
   */
  async getAgentPublicKey(agentId: string): Promise<string | null> {
    return this.keys.get(agentId) || null;
  }
  
  /**
   * Revoke a compromised key
   */
  async revokeKey(agentId: string, keyId: string, reason: string): Promise<void> {
    const currentKey = this.keys.get(agentId);
    if (!currentKey) {
      throw new Error(`No key registered for agent ${agentId}`);
    }
    
    const currentKeyId = this.generateKeyId(currentKey);
    if (currentKeyId !== keyId) {
      throw new Error('Key ID mismatch');
    }
    
    // Add to revoked list
    const revoked = this.revokedKeys.get(agentId) || [];
    revoked.push({
      keyId,
      revokedAt: Date.now(),
      reason
    });
    this.revokedKeys.set(agentId, revoked);
    
    // Remove from active keys
    this.keys.delete(agentId);
    this.metadata.delete(agentId);
    
    console.log(`Revoked key ${keyId} for agent ${agentId}: ${reason}`);
  }
  
  /**
   * Rotate to a new key
   */
  async rotateKey(agentId: string, newPublicKey: string): Promise<void> {
    const oldKey = this.keys.get(agentId);
    
    if (oldKey) {
      // Revoke old key
      const oldKeyId = this.generateKeyId(oldKey);
      await this.revokeKey(agentId, oldKeyId, 'Key rotation');
    }
    
    // Register new key
    await this.registerAgentKey(agentId, newPublicKey);
  }
  
  /**
   * Check if a key is valid (not revoked)
   */
  async isKeyValid(agentId: string, publicKey: string): Promise<boolean> {
    const keyId = this.generateKeyId(publicKey);
    const revoked = this.revokedKeys.get(agentId) || [];
    
    return !revoked.some(r => r.keyId === keyId);
  }
  
  /**
   * Generate a unique key ID from public key
   */
  private generateKeyId(publicKey: string): string {
    return createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
  }
}
```

### Step 4: Update Protocol Manager

**File**: `src/protocols/a2a/core/a2a-protocol-manager.ts`
```typescript
// Replace mock implementation
import { SignatureService } from '../security/signature-service';
import { AgentKeyRegistry } from '../security/agent-key-registry';

export class A2AProtocolManager {
  private signatureService: SignatureService;
  private keyRegistry: AgentKeyRegistry;
  
  constructor() {
    this.keyRegistry = new AgentKeyRegistry();
    this.signatureService = new SignatureService(this.keyRegistry);
  }
  
  /**
   * Validate message signature using cryptographic verification
   */
  private async validateSignature(message: A2AMessage): Promise<boolean> {
    if (!this.isSignedMessage(message)) {
      throw new Error('Message is not signed');
    }
    
    return this.signatureService.verifySignature(message as SignedA2AMessage);
  }
  
  /**
   * Type guard for signed messages
   */
  private isSignedMessage(message: A2AMessage): message is SignedA2AMessage {
    return 'signature' in message && 'signedPayload' in message;
  }
}
```

---

## TDD Test Anchors

### Test File: `tests/security/signature-service.test.ts`

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { SignatureService } from '../../src/protocols/a2a/security/signature-service';
import { AgentKeyRegistry } from '../../src/protocols/a2a/security/agent-key-registry';
import { ed25519 } from '@noble/ed25519';

describe('SignatureService', () => {
  let signatureService: SignatureService;
  let keyRegistry: AgentKeyRegistry;
  let agentPrivateKey: Uint8Array;
  let agentPublicKey: Uint8Array;
  const agentId = 'test-agent-001';

  beforeEach(async () => {
    keyRegistry = new AgentKeyRegistry();
    signatureService = new SignatureService(keyRegistry);
    
    // Generate test key pair
    agentPrivateKey = ed25519.utils.randomPrivateKey();
    agentPublicKey = await ed25519.getPublicKey(agentPrivateKey);
    
    // Register agent's public key
    await keyRegistry.registerAgentKey(
      agentId,
      Buffer.from(agentPublicKey).toString('base64')
    );
  });

  test('should sign and verify valid message', async () => {
    const message: A2AMessage = {
      type: 'task_request',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId
    );

    expect(signedMessage.signature).toBeDefined();
    expect(signedMessage.signedPayload).toBeDefined();

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(true);
  });

  test('should reject message with invalid signature', async () => {
    const message: A2AMessage = {
      type: 'task_request',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId
    );

    // Tamper with signature
    signedMessage.signature.signature = 'invalid-signature';

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(false);
  });

  test('should reject message with modified payload', async () => {
    const message: A2AMessage = {
      type: 'task_request',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId
    );

    // Tamper with message content
    signedMessage.payload = { task: 'malicious' };

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(false);
  });

  test('should reject expired signatures', async () => {
    const message: A2AMessage = {
      type: 'task_request',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId
    );

    // Make signature appear old
    signedMessage.signature.timestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(false);
  });

  test('should reject message from unregistered agent', async () => {
    const unknownPrivateKey = ed25519.utils.randomPrivateKey();
    const message: A2AMessage = {
      type: 'task_request',
      from: 'unknown-agent',
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      unknownPrivateKey,
      'unknown-agent'
    );

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(false);
  });

  test('should reject message with revoked key', async () => {
    const message: A2AMessage = {
      type: 'task_request',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: Date.now(),
      payload: { task: 'test' }
    };

    const signedMessage = await signatureService.signMessage(
      message,
      agentPrivateKey,
      agentId
    );

    // Revoke the key
    const metadata = await keyRegistry.getAgentPublicKey(agentId);
    const keyId = signedMessage.signature.publicKey;
    await keyRegistry.revokeKey(agentId, keyId, 'Test revocation');

    const isValid = await signatureService.verifySignature(signedMessage);
    expect(isValid).toBe(false);
  });

  test('should create canonical JSON consistently', async () => {
    const message1: A2AMessage = {
      type: 'test',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: 12345,
      payload: { b: 2, a: 1, c: { z: 3, x: 1 } }
    };

    const message2: A2AMessage = {
      type: 'test',
      from: agentId,
      to: 'agent-002',
      id: 'msg-001',
      timestamp: 12345,
      payload: { c: { x: 1, z: 3 }, a: 1, b: 2 }
    };

    const signed1 = await signatureService.signMessage(message1, agentPrivateKey, agentId);
    const signed2 = await signatureService.signMessage(message2, agentPrivateKey, agentId);

    // Canonical payloads should match despite different key order
    expect(signed1.signedPayload).toBe(signed2.signedPayload);
  });
});
```

---

## Acceptance Criteria

### Security
- [ ] All A2A messages must be cryptographically signed
- [ ] Signatures use industry-standard ed25519 algorithm
- [ ] Message tampering is detected and rejected
- [ ] Agent impersonation is prevented through key verification
- [ ] Replay attacks are prevented with timestamp and nonce
- [ ] Revoked keys are rejected

### Functionality
- [ ] SignatureService can sign messages with private keys
- [ ] SignatureService can verify signatures with public keys
- [ ] AgentKeyRegistry manages key lifecycle (register, revoke, rotate)
- [ ] Canonical JSON ensures consistent signing
- [ ] Integration with A2AProtocolManager is complete

### Testing
- [ ] Unit test coverage >95%
- [ ] All edge cases tested (expired, revoked, tampered)
- [ ] Performance: >1000 verifications/second
- [ ] Integration tests with Byzantine consensus
- [ ] Load testing with concurrent verifications

### Documentation
- [ ] API documentation for SignatureService
- [ ] Key management procedures documented
- [ ] Security audit report completed
- [ ] Migration guide for existing deployments

---

## Rollback Plan

### Pre-Deployment
1. Create feature flag: `ENABLE_SIGNATURE_VERIFICATION`
2. Default to `false` in production
3. Enable in staging/dev environments first

### Gradual Rollout
1. Phase 1: Verification logging only (no rejection)
2. Phase 2: Verification with soft-fail (log + allow)
3. Phase 3: Verification with hard-fail (reject invalid)

### Emergency Rollback
```bash
# Disable signature verification
export ENABLE_SIGNATURE_VERIFICATION=false

# Revert to previous commit
git revert HEAD --no-commit

# Deploy hotfix
npm run deploy:hotfix
```

### Monitoring
- Alert on signature verification failures >1%
- Dashboard for verification success rate
- Performance impact monitoring

---

## Dependencies

**Depends On**: None (can start immediately)

**Blocks**:
- Phase 4 (HSM Key Management) - will use this signature service
- Phase 5 (Protocol Bridge) - will require signed messages
- Phase 10 (A2A Transport Layer) - will verify all transport messages

---

## Performance Impact

### Benchmarks
- **Sign operation**: ~50-100μs per message
- **Verify operation**: ~100-200μs per message
- **Key lookup**: <1μs (in-memory cache)
- **Throughput**: >5000 messages/second per core

### Optimization
- Batch verification for multiple messages
- Signature caching for frequently verified messages
- Parallel verification using Worker threads
- Pre-computed public key tables

---

## Next Steps

1. Review and approve specification
2. Create git branch: `git checkout -b fix/p0-security-signature-validation`
3. Implement SignatureService and AgentKeyRegistry
4. Write comprehensive test suite
5. Integrate with A2AProtocolManager
6. Perform security audit
7. Create PR for review
8. Merge to main after approval

---

**Status**: 📋 **SPECIFICATION COMPLETE** - Ready for implementation
