# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Gemini-Flow is a production-ready AI orchestration platform coordinating up to 66 specialized agents with A2A/MCP dual protocol support, Google AI Services integration, and enterprise-grade performance (396,610 SQLite ops/sec, <100ms agent spawn times).

**Tech Stack:**
- TypeScript/Node.js 18-24 with ESNext modules
- SQLite for high-performance persistence (12 specialized tables)
- Google Cloud Platform (Vertex AI, Gemini API, 8 AI services)
- MCP (Model Context Protocol) + A2A (Agent-to-Agent) protocols
- WebSocket/Socket.io for real-time streaming
- Redis for distributed coordination
- React Flow + Zustand (frontend), Express (backend)
- Vitest for testing

## Essential Development Commands

### Build & Development
```bash
# Install dependencies
npm install

# Build CLI only (fastest, recommended for most work)
npm run build:cli

# Full build (includes consensus & benchmarks)
npm run build:full

# Development with auto-reload
npm run dev

# Type checking
npm run typecheck        # CLI only
npm run typecheck:full   # Full project

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests (security, performance)
npm run test:integration    # Integration tests
npm run test:security       # Security tests
npm run test:performance    # Performance benchmarks
npm run test:mcp           # MCP protocol tests
npm run test:mcpjam        # MCPJam evaluation tests

# Coverage and debugging
npm run test:coverage      # With coverage report (95% threshold)
npm run test:watch        # Watch mode
npm run test:ui           # Visual test runner UI

# Run single test file
npx vitest tests/security/a2a-security.test.ts --run
npx vitest --grep "should validate signatures"
```

### Full-Stack Development
```bash
# Frontend (React Flow, port 5173)
npm run frontend:install
npm run frontend:dev
npm run frontend:build
npm run frontend:preview

# Backend (Express API, port 3000)
npm run backend:install
npm run backend:dev
npm run backend:start

# Run both concurrently
npm run dev:full
```

### Performance & Benchmarking
```bash
# Google Services benchmarks
npm run benchmark:google-services   # Comprehensive
npm run benchmark:quick             # Quick validation
npm run benchmark:soak              # Long-running stability
npm run benchmark:spike             # Load spike testing

# Load testing
npm run load-test:1k       # 1K concurrent operations
npm run load-test:10k      # 10K concurrent operations
npm run load-test:100k     # 100K concurrent operations
npm run load-test:sustained # 24-hour sustained load

# Monitoring
npm run monitoring:start
npm run health-check
```

### CLI Usage
```bash
# Primary CLI commands (via bin/gemini-flow)
gemini-flow chat              # Interactive Gemini chat
gemini-flow generate <prompt> # Generate content
gemini-flow list-models       # List available models
gemini-flow auth              # Authentication setup

# Agent orchestration
gemini-flow agents spawn --count 20
gemini-flow hive-mind spawn --objective "task description"
gemini-flow swarm:init

# MCP operations
gemini-flow mcp evals init    # Initialize MCPJam
gemini-flow mcp evals run     # Run evaluation tests
gemini-flow mcp evals config  # Configure LLM providers

# Development utilities
gemini-flow init              # Initialize project
gemini-flow stats             # Show statistics
```

## High-Level Architecture

### Directory Structure
```
src/
├── cli/                    # CLI interface (gemini-cli.ts + flow-cli.ts)
│   ├── commands/          # All CLI command implementations
│   └── config/           # Configuration management
├── core/                  # Core infrastructure
│   ├── auth/             # Authentication (Vertex AI, service accounts)
│   ├── a2a-*.ts          # A2A protocol components
│   ├── dgm/              # Dynamic Genetic Memory
│   ├── hive-mind/        # Hive mind coordination
│   └── quantum/          # Quantum processing integration
├── agents/               # Agent implementations
│   ├── agent-definitions.ts  # 66 specialized agent types
│   └── agent-factory.ts      # Agent spawning & lifecycle
├── agentspace/          # Agent coordination & spatial reasoning
│   ├── core/            # Byzantine consensus, memory architecture
│   ├── orchestration/   # Task coordination (TaskOrchestrator)
│   └── integrations/    # MCP bridge, security, streaming
├── protocols/           # Protocol implementations
│   ├── a2a/            # Agent-to-Agent protocol
│   ├── a2p/            # Agent Payments protocol
│   └── bridge/         # Universal protocol bridge (<100ms translation)
├── memory/             # Persistent storage
│   └── sqlite-adapter.ts   # High-performance (396K ops/sec)
├── mcp/               # Model Context Protocol integration
├── services/          # External service integrations
│   └── google-services/ # Veo3, Imagen4, Lyria, Chirp, etc.
├── streaming/         # Real-time streaming infrastructure
└── types/            # TypeScript type definitions
```

### Key Architectural Patterns

#### 1. Protocol Bridge Architecture
- **Location**: `src/protocols/bridge/protocol-bridge.ts`
- Enables seamless A2A ↔ MCP ↔ A2P protocol translation
- Target: <100ms translation latency
- Features: Intelligent caching (LRU), quantum optimization

#### 2. Byzantine Fault-Tolerant Consensus
- **Location**: `src/agentspace/core/ByzantineSpatialConsensus.ts`
- Minimum 4 nodes (3f+1), supports 33% Byzantine fault tolerance
- Super-majority voting (2f+1 = 67%)
- Weighted by agent expertise with cryptographic verification
- **Orchestration**: `src/agentspace/orchestration/TaskOrchestrator.ts`

#### 3. High-Performance SQLite
- **Location**: `src/memory/sqlite-adapter.ts`
- Schema: `schema.sql` (12 specialized tables)
- Performance: 396,610 ops/sec via connection pooling, prepared statements, batch operations
- WAL mode, memory-mapped I/O for large databases

#### 4. A2A Protocol Security
- **Location**: `src/core/a2a-message-security.ts`, `src/core/a2a-security-manager.ts`
- HMAC-SHA256 signatures on all messages
- Timestamp validation (5-minute window)
- Zero-trust architecture: `src/core/a2a-zero-trust.ts`
- Audit logging: `src/core/a2a-audit-logger.ts`

#### 5. Google AI Services Integration
- **Location**: `src/services/google-services/`
- 8 services: Veo3 (video), Imagen4 (images), Lyria (music), Chirp (speech), Co-Scientist, Mariner, AgentSpace, Streaming
- **Auth**: `src/core/auth/vertex-ai-provider.ts`
- Unified orchestrator with intelligent routing and failover

### Database Schema (SQLite)
12 core tables with spatial indexing:
- `agents`, `swarms`, `tasks` - Entity management
- `memory_store` - High-performance KV store with namespaces
- `metrics` - Performance tracking
- `sessions` - Session management
- `consensus_decisions` - Byzantine consensus records
- `neural_patterns` - ML pattern storage
- `workflows`, `hooks`, `configuration` - System configuration
- `audit_log` - Security audit trail

## Important Development Patterns

### Agent Spawning
```typescript
import { AgentFactory } from '@/agents/agent-factory';

const factory = new AgentFactory();
const agent = await factory.createAgent({
  type: 'backend-dev',
  capabilities: ['api-design', 'database'],
  coordination: 'byzantine-consensus'
});

// Always clean up
await agent.shutdown();
```

### Protocol Translation
```typescript
import { UniversalProtocolBridge } from '@/protocols/bridge/protocol-bridge';

const bridge = new UniversalProtocolBridge({
  enableQuantumOptimization: true,
  performanceTargets: { maxTranslationLatency: 100 }
});

await bridge.initialize();
const result = await bridge.translateMCPToA2A(mcpRequest);
```

### A2A Message Security
```typescript
import { A2AMessageSecurity } from '@/core/a2a-message-security';

const security = new A2AMessageSecurity(secretKey);

// Sign outgoing messages
const signed = await security.signMessage(message);

// Validate incoming with constant-time comparison
const isValid = await security.validateSignature(receivedMessage);
if (!isValid) throw new Error('Invalid signature');
```

### Memory Operations
```typescript
import { SQLiteAdapter } from '@/memory/sqlite-adapter';

const adapter = new SQLiteAdapter();
await adapter.initialize();

// Batch operations for optimal performance
await adapter.batchWrite([
  { key: 'agent:state', value: state },
  { key: 'swarm:metrics', value: metrics }
]);
```

### Test Structure
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('ComponentName', () => {
  beforeAll(async () => {
    await initializeTestDb();
  });
  
  afterAll(async () => {
    await cleanupTestDb();
  });
  
  it('should handle expected behavior', async () => {
    const result = await myFunction();
    expect(result).toBe(expectedValue);
  });
  
  it('should handle error cases', async () => {
    await expect(myFunction('invalid')).rejects.toThrow();
  });
});
```

## Environment Setup

### Required Environment Variables
```bash
# Google Cloud (primary authentication)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Optional: Direct Gemini API
GEMINI_API_KEY=your-api-key

# Redis (distributed coordination)
REDIS_HOST=localhost
REDIS_PORT=6379

# Database
DATABASE_URL=.hive-mind/gemini-flow.db

# Node environment
NODE_ENV=development|production
```

### Google Cloud Authentication
```bash
# Using gcloud CLI
gcloud auth application-default login

# Or set service account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Verify
npx gemini-flow auth verify --provider google
```

## Critical Implementation Details

### A2A Signature Validation
HMAC-SHA256 validation requires:
1. Check signature format (hex string)
2. Validate timestamp (within 5-minute window)
3. Recompute signature: hash(payload + timestamp + secret)
4. Constant-time comparison (prevent timing attacks)

**Location**: `src/core/a2a-message-security.ts:validateSignature()`

### SQLite Performance
Achieves 396K+ ops/sec through:
- Connection pooling (10 connections)
- Prepared statement caching
- Batch operations with transactions
- WAL mode, synchronous=NORMAL
- Memory-mapped I/O

### Test Coverage Requirements
From `vitest.config.ts`:
- Lines: 95%
- Functions: 95%
- Branches: 90%
- Statements: 95%
- Timeout: 10 seconds per test

### MCPJam Evaluation Workflow
```bash
# 1. Initialize
gemini-flow mcp evals init

# 2. Configure LLM providers (encrypted storage)
gemini-flow mcp evals config llm anthropic <api-key>
gemini-flow mcp evals config llm openai <api-key>

# 3. Add MCP servers to environment.json
gemini-flow mcp evals config server add <name> --command <cmd>

# 4. Define tests in .mcpjam/tests.json

# 5. Run evaluations
gemini-flow mcp evals run
gemini-flow mcp evals run --json  # JSON output for CI/CD

# 6. Export for standalone CLI
gemini-flow mcp evals export --output .mcpjam-export
```

## Common Workflows

### Adding a New Agent Type
1. Define in `src/agents/agent-definitions.ts`
2. Update `AgentType` in `src/types/agent.ts`
3. Implement logic in `src/agents/` if custom behavior needed
4. Add tests in `tests/agents/`
5. Update `docs/api/agent-types-reference.md`

### Adding a New CLI Command
1. Create `src/cli/commands/your-command.ts`
2. Export from `src/cli/commands/index.ts`
3. Register in `src/cli/gemini-cli.ts` or `src/cli/flow-cli.ts`
4. Add tests in `tests/cli/`
5. Update `docs/api/gemini-cli-commands.md`

### Implementing a New Protocol
1. Define interface in `src/types/protocols.ts`
2. Implement in `src/protocols/your-protocol/`
3. Add bridge translation in `src/protocols/bridge/`
4. Add security layer
5. Write comprehensive tests
6. Update protocol documentation

## Troubleshooting

### Build Errors
```bash
# Ensure Node.js 18-24
node --version

# Clean rebuild
npm run clean && npm install

# Try CLI-only build
npm run build:cli
```

### Test Failures
- Database permissions: `.hive-mind/` must be writable
- Google credentials: Verify `GOOGLE_APPLICATION_CREDENTIALS`
- Run individually: `npx vitest <file> --run`
- Check timeouts (default: 10s)

### MCP Connection Issues
- Verify server: `ps aux | grep mcp`
- Enable debug: `DEBUG=mcp:* npm test`
- Check transport configuration

### Google API Errors
- Check GCP quota limits
- Verify service account permissions
- Test: `gcloud auth application-default login`
- Review logs: `.hive-mind/logs/`

## Performance Targets

Based on production benchmarks:
- **SQLite Operations**: 396,610 ops/sec
- **Agent Spawn Time**: <100ms
- **A2A Message Latency**: <25ms
- **Protocol Translation**: <100ms
- **Consensus Time**: 2.4s for 1000 nodes
- **Memory per Agent**: ~4.2MB

## Key Principles from CLAUDE.md

1. **Performance First**: Target <100ms operations, use batching
2. **Security by Default**: Validate all inputs, sign all messages
3. **Modular Design**: Keep components loosely coupled
4. **Comprehensive Testing**: Maintain >95% coverage
5. **Byzantine Resilient**: Design for 33% fault tolerance
6. **Type Safety**: Use TypeScript strictly, avoid `any`
7. **Graceful Degradation**: Handle errors without cascading failures

## Additional Resources

- **Architecture**: `docs/architecture/ARCHITECTURE.md`
- **A2A Protocol**: `docs/a2a-a2p-protocol-bridge.md`
- **API Reference**: `docs/api/gemini-cli-commands.md`
- **MCP Integration**: `docs/mcp-api-setup-guide.md`
- **Deployment**: `docs/deployment/COMPREHENSIVE-DEPLOYMENT-STRATEGY.md`
- **CLAUDE.md**: Comprehensive development guidance
- **README.md**: Feature overview and quick start
