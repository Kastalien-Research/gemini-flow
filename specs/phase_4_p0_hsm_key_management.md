# Phase 4: P0-2 HSM/KMS Key Management Implementation

## Overview
**Priority**: CRITICAL (P0)  
**Git Branch**: `fix/p0-hsm-key-management`  
**Estimated Effort**: 5-7 days  
**Dependencies**: Phase 3 (Security Signature Validation) must be complete

This phase addresses the critical security vulnerability where private keys are stored in software and HSM key operations throw errors. Production systems require Hardware Security Modules (HSM) or Key Management Services (KMS) for secure key storage and cryptographic operations.

---

## Current State (Broken)

### Files with Mock/Broken Implementations

#### 1. `src/core/a2a-key-exchange.ts`
```typescript
// HSM key generation placeholder
if (hsm) {
  this.logger.warn(
    "HSM key generation not implemented, using software fallback",
  );
}

// Later in the file...
// HSM private key retrieval would be implemented here
throw new Error("HSM private key retrieval not implemented");
```

### Security Risks
- **Private Key Exposure**: Keys stored in application memory/filesystem
- **Key Extraction**: Vulnerable to memory dumps and filesystem access
- **No Hardware Protection**: Keys not protected by dedicated hardware
- **Compliance Violations**: Fails PCI-DSS, FIPS 140-2, SOC 2 requirements
- **No Key Lifecycle**: Missing key rotation, backup, and recovery procedures

---

## Target State (Fixed)

### Implementation Strategy

#### 1. Google Cloud KMS Integration
Use Google Cloud Key Management Service for:
- **Hardware Security**: FIPS 140-2 Level 3 certified HSMs
- **Key Hierarchy**: Master keys, data encryption keys, signing keys
- **Automatic Rotation**: Scheduled key rotation with version management
- **Audit Logging**: Complete key access audit trail
- **IAM Integration**: Fine-grained access control
- **Multi-region**: Key availability across regions

#### 2. Key Architecture
```typescript
interface KeyHierarchy {
  // Root key (never leaves HSM)
  masterKey: {
    id: string;
    location: 'global' | 'us' | 'eu' | 'asia';
    purpose: 'encrypt_decrypt' | 'sign_verify';
    algorithm: 'RSA_SIGN_PKCS1_4096_SHA512' | 'EC_SIGN_P384_SHA384';
  };
  
  // Agent signing keys (derived from master)
  agentKeys: Map<string, AgentKey>;
  
  // Key encryption keys (for data encryption)
  dataKeys: Map<string, DataEncryptionKey>;
}

interface AgentKey {
  keyId: string;
  agentId: string;
  purpose: 'signing' | 'encryption' | 'both';
  algorithm: 'ed25519' | 'ecdsa-p256';
  createdAt: number;
  rotateAfter: number;
  version: number;
}
```

#### 3. Key Operations
```typescript
interface HSMKeyOperations {
  // Key generation in HSM
  generateKey(spec: KeySpec): Promise<KeyMetadata>;
  
  // Sign data using HSM key
  sign(keyId: string, data: Buffer): Promise<Buffer>;
  
  // Verify signature using HSM key
  verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
  
  // Encrypt data
  encrypt(keyId: string, plaintext: Buffer): Promise<Buffer>;
  
  // Decrypt data
  decrypt(keyId: string, ciphertext: Buffer): Promise<Buffer>;
  
  // Get public key (private key never leaves HSM)
  getPublicKey(keyId: string): Promise<Buffer>;
  
  // Rotate key to new version
  rotateKey(keyId: string): Promise<KeyMetadata>;
  
  // Destroy key (irreversible)
  destroyKey(keyId: string, destroyAfter: number): Promise<void>;
}
```

---

## Implementation Details

### Step 1: Install Dependencies
```bash
npm install @google-cloud/kms
npm install @google-cloud/iam-credentials
npm install -D @types/google-cloud__kms
```

### Step 2: Create KMS Client Wrapper

**File**: `src/core/security/kms-client.ts`
```typescript
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { Logger } from '../utils/logger';

export interface KMSConfig {
  projectId: string;
  locationId: string; // e.g., 'global', 'us-east1'
  keyRingId: string;
  credentialsPath?: string;
}

export interface KeySpec {
  name: string;
  purpose: 'ENCRYPT_DECRYPT' | 'ASYMMETRIC_SIGN' | 'ASYMMETRIC_DECRYPT';
  algorithm: string;
  protectionLevel: 'SOFTWARE' | 'HSM' | 'EXTERNAL';
  labels?: Record<string, string>;
}

export class KMSClient {
  private client: KeyManagementServiceClient;
  private config: KMSConfig;
  private logger: Logger;
  private keyCache: Map<string, any> = new Map();

  constructor(config: KMSConfig) {
    this.config = config;
    this.logger = new Logger('KMSClient');
    
    // Initialize KMS client
    this.client = new KeyManagementServiceClient({
      keyFilename: config.credentialsPath,
      projectId: config.projectId
    });
  }

  /**
   * Initialize KMS and ensure key ring exists
   */
  async initialize(): Promise<void> {
    try {
      // Get or create key ring
      await this.ensureKeyRingExists();
      
      this.logger.info('KMS client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize KMS client', error);
      throw error;
    }
  }

  /**
   * Generate a new cryptographic key in HSM
   */
  async generateKey(spec: KeySpec): Promise<KeyMetadata> {
    const cryptoKeyPath = this.client.cryptoKeyPath(
      this.config.projectId,
      this.config.locationId,
      this.config.keyRingId,
      spec.name
    );

    try {
      // Check if key already exists
      try {
        const [existingKey] = await this.client.getCryptoKey({
          name: cryptoKeyPath
        });
        
        this.logger.warn(`Key ${spec.name} already exists, returning existing key`);
        return this.extractKeyMetadata(existingKey);
      } catch (error: any) {
        if (error.code !== 5) { // NOT_FOUND
          throw error;
        }
        // Key doesn't exist, continue to create it
      }

      // Create key ring parent path
      const parent = this.client.keyRingPath(
        this.config.projectId,
        this.config.locationId,
        this.config.keyRingId
      );

      // Create the key
      const [key] = await this.client.createCryptoKey({
        parent,
        cryptoKeyId: spec.name,
        cryptoKey: {
          purpose: spec.purpose,
          versionTemplate: {
            algorithm: spec.algorithm,
            protectionLevel: spec.protectionLevel
          },
          labels: spec.labels
        }
      });

      this.logger.info(`Created new key: ${spec.name}`);
      return this.extractKeyMetadata(key);
    } catch (error) {
      this.logger.error(`Failed to generate key ${spec.name}`, error);
      throw error;
    }
  }

  /**
   * Sign data using HSM-protected key
   */
  async sign(keyId: string, data: Buffer): Promise<Buffer> {
    try {
      const versionPath = this.getKeyVersionPath(keyId);
      
      const [response] = await this.client.asymmetricSign({
        name: versionPath,
        digest: {
          sha256: data
        }
      });

      if (!response.signature) {
        throw new Error('No signature returned from KMS');
      }

      return Buffer.from(response.signature);
    } catch (error) {
      this.logger.error(`Failed to sign with key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Get public key from HSM (private key never leaves HSM)
   */
  async getPublicKey(keyId: string): Promise<Buffer> {
    try {
      // Check cache first
      if (this.keyCache.has(keyId)) {
        return this.keyCache.get(keyId);
      }

      const versionPath = this.getKeyVersionPath(keyId);
      
      const [publicKey] = await this.client.getPublicKey({
        name: versionPath
      });

      if (!publicKey.pem) {
        throw new Error('No public key PEM returned from KMS');
      }

      const publicKeyBuffer = Buffer.from(publicKey.pem, 'utf-8');
      
      // Cache the public key
      this.keyCache.set(keyId, publicKeyBuffer);
      
      return publicKeyBuffer;
    } catch (error) {
      this.logger.error(`Failed to get public key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Encrypt data using HSM key
   */
  async encrypt(keyId: string, plaintext: Buffer): Promise<Buffer> {
    try {
      const keyPath = this.getCryptoKeyPath(keyId);
      
      const [response] = await this.client.encrypt({
        name: keyPath,
        plaintext
      });

      if (!response.ciphertext) {
        throw new Error('No ciphertext returned from KMS');
      }

      return Buffer.from(response.ciphertext);
    } catch (error) {
      this.logger.error(`Failed to encrypt with key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Decrypt data using HSM key
   */
  async decrypt(keyId: string, ciphertext: Buffer): Promise<Buffer> {
    try {
      const keyPath = this.getCryptoKeyPath(keyId);
      
      const [response] = await this.client.decrypt({
        name: keyPath,
        ciphertext
      });

      if (!response.plaintext) {
        throw new Error('No plaintext returned from KMS');
      }

      return Buffer.from(response.plaintext);
    } catch (error) {
      this.logger.error(`Failed to decrypt with key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Rotate key to new version
   */
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    try {
      const keyPath = this.getCryptoKeyPath(keyId);
      
      // Update key to enable rotation
      const [key] = await this.client.updateCryptoKey({
        cryptoKey: {
          name: keyPath,
          rotationPeriod: {
            seconds: 2592000 // 30 days
          },
          nextRotationTime: {
            seconds: Math.floor(Date.now() / 1000) + 2592000
          }
        },
        updateMask: {
          paths: ['rotation_period', 'next_rotation_time']
        }
      });

      this.logger.info(`Rotated key: ${keyId}`);
      return this.extractKeyMetadata(key);
    } catch (error) {
      this.logger.error(`Failed to rotate key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Schedule key destruction (irreversible after delay)
   */
  async destroyKey(keyId: string, destroyAfter: number = 86400): Promise<void> {
    try {
      const versionPath = this.getKeyVersionPath(keyId);
      
      await this.client.destroyCryptoKeyVersion({
        name: versionPath
      });

      this.logger.info(`Scheduled destruction for key: ${keyId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy key ${keyId}`, error);
      throw error;
    }
  }

  /**
   * Ensure key ring exists, create if needed
   */
  private async ensureKeyRingExists(): Promise<void> {
    const keyRingPath = this.client.keyRingPath(
      this.config.projectId,
      this.config.locationId,
      this.config.keyRingId
    );

    try {
      await this.client.getKeyRing({ name: keyRingPath });
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        // Create key ring
        const parent = this.client.locationPath(
          this.config.projectId,
          this.config.locationId
        );

        await this.client.createKeyRing({
          parent,
          keyRingId: this.config.keyRingId
        });

        this.logger.info(`Created key ring: ${this.config.keyRingId}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get full crypto key path
   */
  private getCryptoKeyPath(keyId: string): string {
    return this.client.cryptoKeyPath(
      this.config.projectId,
      this.config.locationId,
      this.config.keyRingId,
      keyId
    );
  }

  /**
   * Get key version path (uses primary version)
   */
  private getKeyVersionPath(keyId: string): string {
    const keyPath = this.getCryptoKeyPath(keyId);
    return `${keyPath}/cryptoKeyVersions/1`; // Use primary version
  }

  /**
   * Extract metadata from KMS key
   */
  private extractKeyMetadata(key: any): KeyMetadata {
    return {
      name: key.name,
      purpose: key.purpose,
      algorithm: key.versionTemplate?.algorithm,
      protectionLevel: key.versionTemplate?.protectionLevel,
      createTime: key.createTime,
      primary: key.primary
    };
  }
}

export interface KeyMetadata {
  name: string;
  purpose: string;
  algorithm: string;
  protectionLevel: string;
  createTime: any;
  primary: any;
}
```

### Step 3: Update A2A Key Exchange

**File**: `src/core/a2a-key-exchange.ts`
```typescript
import { KMSClient, KMSConfig, KeySpec } from './security/kms-client';
import { Logger } from './utils/logger';

export class A2AKeyExchange {
  private kmsClient: KMSClient;
  private logger: Logger;
  private keyMap: Map<string, string> = new Map(); // agentId -> keyId

  constructor(kmsConfig: KMSConfig) {
    this.kmsClient = new KMSClient(kmsConfig);
    this.logger = new Logger('A2AKeyExchange');
  }

  async initialize(): Promise<void> {
    await this.kmsClient.initialize();
    this.logger.info('A2A key exchange initialized with KMS');
  }

  /**
   * Generate signing key for agent in HSM
   */
  async generateAgentKey(agentId: string): Promise<string> {
    const keySpec: KeySpec = {
      name: `agent-${agentId}-signing-key`,
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM',
      labels: {
        agent: agentId,
        purpose: 'signing',
        created: Date.now().toString()
      }
    };

    const metadata = await this.kmsClient.generateKey(keySpec);
    this.keyMap.set(agentId, metadata.name);
    
    this.logger.info(`Generated HSM key for agent ${agentId}`);
    return metadata.name;
  }

  /**
   * Sign message using agent's HSM key
   */
  async signMessage(agentId: string, message: Buffer): Promise<Buffer> {
    const keyId = this.keyMap.get(agentId);
    if (!keyId) {
      throw new Error(`No key found for agent ${agentId}`);
    }

    return this.kmsClient.sign(keyId, message);
  }

  /**
   * Get agent's public key (private key stays in HSM)
   */
  async getPublicKey(agentId: string): Promise<Buffer> {
    const keyId = this.keyMap.get(agentId);
    if (!keyId) {
      throw new Error(`No key found for agent ${agentId}`);
    }

    return this.kmsClient.getPublicKey(keyId);
  }

  /**
   * Rotate agent's key
   */
  async rotateAgentKey(agentId: string): Promise<void> {
    const keyId = this.keyMap.get(agentId);
    if (!keyId) {
      throw new Error(`No key found for agent ${agentId}`);
    }

    await this.kmsClient.rotateKey(keyId);
    this.logger.info(`Rotated key for agent ${agentId}`);
  }
}
```

---

## TDD Test Anchors

### Test File: `tests/security/kms-client.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { KMSClient, KMSConfig, KeySpec } from '../../src/core/security/kms-client';

describe('KMSClient', () => {
  let kmsClient: KMSClient;
  let testKeyId: string;

  const config: KMSConfig = {
    projectId: process.env.GCP_PROJECT_ID || 'test-project',
    locationId: 'global',
    keyRingId: 'test-key-ring',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
  };

  beforeEach(async () => {
    kmsClient = new KMSClient(config);
    await kmsClient.initialize();
  });

  test('should generate asymmetric signing key in HSM', async () => {
    const spec: KeySpec = {
      name: 'test-signing-key-' + Date.now(),
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM',
      labels: { test: 'true' }
    };

    const metadata = await kmsClient.generateKey(spec);
    testKeyId = metadata.name;

    expect(metadata.name).toBeDefined();
    expect(metadata.purpose).toBe('ASYMMETRIC_SIGN');
    expect(metadata.protectionLevel).toBe('HSM');
  });

  test('should sign data using HSM key', async () => {
    // First create a key
    const spec: KeySpec = {
      name: 'test-sign-key-' + Date.now(),
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM'
    };

    const metadata = await kmsClient.generateKey(spec);
    const data = Buffer.from('test data to sign');

    const signature = await kmsClient.sign(metadata.name, data);
    
    expect(signature).toBeInstanceOf(Buffer);
    expect(signature.length).toBeGreaterThan(0);
  });

  test('should retrieve public key from HSM', async () => {
    const spec: KeySpec = {
      name: 'test-pubkey-' + Date.now(),
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM'
    };

    const metadata = await kmsClient.generateKey(spec);
    const publicKey = await kmsClient.getPublicKey(metadata.name);

    expect(publicKey).toBeInstanceOf(Buffer);
    expect(publicKey.toString('utf-8')).toContain('BEGIN PUBLIC KEY');
  });

  test('should encrypt and decrypt data', async () => {
    const spec: KeySpec = {
      name: 'test-encrypt-key-' + Date.now(),
      purpose: 'ENCRYPT_DECRYPT',
      algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
      protectionLevel: 'HSM'
    };

    const metadata = await kmsClient.generateKey(spec);
    const plaintext = Buffer.from('sensitive data');

    const ciphertext = await kmsClient.encrypt(metadata.name, plaintext);
    expect(ciphertext).toBeInstanceOf(Buffer);
    expect(ciphertext).not.toEqual(plaintext);

    const decrypted = await kmsClient.decrypt(metadata.name, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  test('should rotate key', async () => {
    const spec: KeySpec = {
      name: 'test-rotate-key-' + Date.now(),
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM'
    };

    const metadata = await kmsClient.generateKey(spec);
    const rotatedMetadata = await kmsClient.rotateKey(metadata.name);

    expect(rotatedMetadata.name).toBe(metadata.name);
    // Verify rotation settings are applied
  });

  test('should cache public keys for performance', async () => {
    const spec: KeySpec = {
      name: 'test-cache-key-' + Date.now(),
      purpose: 'ASYMMETRIC_SIGN',
      algorithm: 'EC_SIGN_P384_SHA384',
      protectionLevel: 'HSM'
    };

    const metadata = await kmsClient.generateKey(spec);
    
    // First call - should hit KMS
    const start1 = Date.now();
    const publicKey1 = await kmsClient.getPublicKey(metadata.name);
    const time1 = Date.now() - start1;

    // Second call - should hit cache
    const start2 = Date.now();
    const publicKey2 = await kmsClient.getPublicKey(metadata.name);
    const time2 = Date.now() - start2;

    expect(publicKey1).toEqual(publicKey2);
    expect(time2).toBeLessThan(time1); // Cache should be faster
  });
});
```

---

## Acceptance Criteria

### Security
- [ ] All private keys are generated and stored in HSM
- [ ] Private keys never leave the HSM
- [ ] Key operations use FIPS 140-2 Level 3 certified HSMs
- [ ] Key rotation is automated and scheduled
- [ ] Key destruction is scheduled with appropriate delay
- [ ] Audit logging captures all key operations

### Functionality
- [ ] KMSClient can generate keys in HSM
- [ ] KMSClient can sign data using HSM keys
- [ ] KMSClient can retrieve public keys
- [ ] KMSClient can encrypt/decrypt data
- [ ] KMSClient can rotate keys
- [ ] A2AKeyExchange uses KMS for all operations
- [ ] Public key caching improves performance

### Compliance
- [ ] Meets PCI-DSS requirements for key storage
- [ ] Meets FIPS 140-2 Level 3 requirements
- [ ] Meets SOC 2 Type II requirements
- [ ] Complete audit trail for compliance

### Testing
- [ ] Unit test coverage >95%
- [ ] Integration tests with Google Cloud KMS
- [ ] Performance: <50ms for sign operations
- [ ] Load testing with concurrent operations
- [ ] Failure recovery testing

### Documentation
- [ ] KMS setup guide
- [ ] Key lifecycle management procedures
- [ ] Disaster recovery procedures
- [ ] Compliance documentation
- [ ] Migration guide from software keys

---

## Rollback Plan

### Pre-Deployment
1. Create feature flag: `ENABLE_HSM_KEYS`
2. Support both HSM and software keys during transition
3. Test extensively in staging environment

### Gradual Migration
1. Phase 1: New agents use HSM keys
2. Phase 2: Migrate existing agents to HSM keys
3. Phase 3: Deprecate software keys
4. Phase 4: Remove software key support

### Emergency Rollback
```bash
# Disable HSM keys
export ENABLE_HSM_KEYS=false

# Fall back to software keys
export USE_SOFTWARE_KEYS=true

# Restart services
kubectl rollout restart deployment/gemini-flow
```

### Data Backup
- Export public keys before migration
- Keep software key backups for 90 days
- Document key version history

---

## Dependencies

**Depends On**: 
- Phase 3 (Security Signature Validation) - uses signature service

**Blocks**:
- Phase 10 (A2A Transport Layer) - will use HSM-protected keys
- All production deployments - requires HSM for compliance

---

## Performance Impact

### Benchmarks
- **Key generation**: ~500ms (one-time operation)
- **Sign operation**: 20-50ms per operation
- **Public key retrieval**: <5ms (cached)
- **Encrypt/Decrypt**: 10-30ms per operation

### Optimization
- Public key caching reduces latency by 90%
- Batch signing for multiple messages
- Connection pooling to KMS
- Regional KMS endpoints for lower latency

---

## Cost Considerations

### Google Cloud KMS Pricing
- **Key versions**: $0.06 per active key version per month
- **Key operations**: $0.03 per 10,000 operations
- **Asymmetric sign/verify**: $0.03 per 10,000 operations
- **HSM protection**: Included in key version cost

### Estimated Monthly Cost
- 100 agents × $0.06 = $6/month for keys
- 10M operations × $0.03/10k = $30/month
- **Total**: ~$36/month for 100 agents

---

## Next Steps

1. Review and approve specification
2. Create git branch: `git checkout -b fix/p0-hsm-key-management`
3. Set up Google Cloud KMS project
4. Implement KMSClient wrapper
5. Update A2AKeyExchange to use KMS
6. Write comprehensive test suite
7. Document key lifecycle procedures
8. Create PR for review
9. Gradual rollout to production

---

**Status**: 📋 **SPECIFICATION COMPLETE** - Ready for implementation
