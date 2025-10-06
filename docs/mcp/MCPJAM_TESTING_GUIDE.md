# MCPJam Testing Guide for Gemini Flow

This guide explains how to use **MCPJam Inspector** and **evals-cli** to validate Gemini Flow's MCP (Model Context Protocol) implementation.

## 📋 Overview

MCPJam provides two key testing tools:

1. **MCPJam Inspector** - Interactive MCP server introspection and debugging
2. **evals-cli** - Automated conformance testing and benchmarking

## 🚀 Quick Start

### Prerequisites

```bash
# Install MCPJam CLI globally
npm install -g @mcpjam/cli

# Install evals-cli (optional - can use npx)
npm install -g @mcpjam/evals-cli

# Verify installation
mcpjam --version
```

### Run All MCPJam Tests

```bash
# Comprehensive test suite (inspector + conformance + benchmarks)
npm run test:mcpjam

# Individual test suites
npm run test:mcpjam:inspector      # MCPJam inspector integration tests
npm run test:mcpjam:conformance    # Protocol conformance tests
npm run test:mcpjam:benchmark      # Performance benchmarks
```

## 🔍 MCPJam Inspector

The Inspector provides real-time introspection of MCP servers.

### Interactive Usage

```bash
# Start inspector with Gemini Flow
mcpjam inspect --command "node" --args "dist/mcp/index.js"

# Inspect via stdio
mcpjam inspect --stdio

# Inspect remote server via HTTP
mcpjam inspect --url "http://localhost:3000/mcp"
```

### Programmatic Usage

```typescript
import { StdioTransport } from './src/mcp/transports/stdio-transport';
import { EnhancedMCPClient } from './src/mcp/enhanced-mcp-client';

const transport = new StdioTransport({
  command: 'mcpjam',
  args: ['inspect', '--stdio'],
});

const client = new EnhancedMCPClient('inspector', transport);
await client.connect();

// Introspect server capabilities
const serverInfo = await client.getClient().getServerVersion();
console.log('Server capabilities:', serverInfo.capabilities);

// Discover all primitives
const tools = await client.discoverTools();
const prompts = await client.discoverPrompts();
const resources = await client.discoverResources();
```

## ✅ Conformance Testing with evals-cli

Automated testing against MCP specification.

### Configuration

Configuration file: `tests/mcp/config/eval-config.json`

```json
{
  "server": {
    "command": "node",
    "args": ["dist/mcp/index.js"]
  },
  "suites": {
    "tools": { "enabled": true },
    "prompts": { "enabled": true },
    "resources": { "enabled": true },
    "transports": { "enabled": true }
  },
  "coverage": {
    "minimum": 80,
    "targets": {
      "tools": 100,
      "prompts": 90,
      "resources": 90,
      "transports": 95
    }
  }
}
```

### Running Tests

```bash
# Run all conformance tests
npx @mcpjam/evals-cli test --config tests/mcp/config/eval-config.json

# Run specific test suite
npx @mcpjam/evals-cli test --suite tools
npx @mcpjam/evals-cli test --suite prompts
npx @mcpjam/evals-cli test --suite resources
npx @mcpjam/evals-cli test --suite transports

# Generate detailed report
npx @mcpjam/evals-cli test --report html
```

### Test Suites

#### 1. Tools Protocol Tests

Validates:
- `tools/list` - Tool discovery
- `tools/call` - Tool execution
- Schema validation (JSON Schema compliance)
- Error handling
- Multi-part responses (text, images, audio, resources)

#### 2. Prompts Protocol Tests

Validates:
- `prompts/list` - Prompt discovery
- `prompts/get` - Prompt retrieval
- Template argument substitution
- Named and positional parameters

#### 3. Resources Protocol Tests

Validates:
- `resources/list` - Resource discovery
- `resources/read` - Resource reading (text & binary)
- Resource templates with URI parameters
- Resource subscriptions for updates
- MIME type handling

#### 4. Transport Tests

Validates:
- stdio connection and lifecycle
- HTTP streaming connection
- Environment variable substitution
- Error handling and reconnection

## ⚡ Performance Benchmarking

### Running Benchmarks

```bash
# Run all benchmarks
npm run test:mcpjam:benchmark

# Specific metrics
npx @mcpjam/evals-cli benchmark --metric latency
npx @mcpjam/evals-cli benchmark --metric throughput
npx @mcpjam/evals-cli benchmark --metric memory
```

### Benchmark Metrics

**Latency Benchmarks:**
- Tool discovery time (`tools/list`)
- Tool execution time (`tools/call`)
- Prompt retrieval time (`prompts/get`)
- Resource read time (`resources/read`)

**Throughput Benchmarks:**
- Requests per second (RPS)
- Concurrent request handling
- Batch operation performance

**Memory Benchmarks:**
- Memory usage under load
- Connection pool efficiency
- Resource cleanup

### Sample Benchmark Output

```
Performance Benchmarks
======================

Latency (ms):
  tools/list:       12.3 ±  2.1
  tools/call:       45.2 ±  8.4
  prompts/get:      18.7 ±  3.2
  resources/read:   28.4 ±  5.1

Throughput:
  Requests/sec:     1,247
  Concurrent:       100 connections

Memory:
  Baseline:         45 MB
  Under load:       78 MB
  Peak:             92 MB
```

## 🧪 Integration Tests

The test suite includes integration tests with real MCP servers.

### Testing with Reference Servers

```typescript
// Weather Server
const weatherClient = new EnhancedMCPClient('weather', new StdioTransport({
  command: 'npx',
  args: ['@modelcontextprotocol/server-weather']
}));

await weatherClient.connect();
const tools = await weatherClient.discoverTools();
// Should include: get_forecast, get_current_weather, etc.

// Memory Server
const memoryClient = new EnhancedMCPClient('memory', new StdioTransport({
  command: 'npx',
  args: ['@modelcontextprotocol/server-memory']
}));

await memoryClient.connect();
// Test store/retrieve operations

// Filesystem Server
const fsClient = new EnhancedMCPClient('filesystem', new StdioTransport({
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '/tmp']
}));

await fsClient.connect();
const resources = await fsClient.discoverResources();
// Should list files in /tmp
```

### Run Integration Tests

```bash
# All integration tests (includes MCPJam)
npm run test:mcp:integration

# Just MCPJam integration
npm run test:mcpjam:inspector
```

## 📊 Test Results

### Viewing Results

```bash
# Console output
npm run test:mcpjam

# Detailed logs (after running tests)
cat /tmp/mcpjam-tools.log
cat /tmp/mcpjam-prompts.log
cat /tmp/mcpjam-resources.log
cat /tmp/mcpjam-transports.log
cat /tmp/mcpjam-bench.log

# HTML report
npx @mcpjam/evals-cli test --report html
open test-results/index.html
```

### Expected Results

✅ **Full Conformance (Target):**

```
Test Suites:
  Jest Integration:      PASS ✓
  Tools Protocol:        PASS ✓
  Prompts Protocol:      PASS ✓
  Resources Protocol:    PASS ✓
  Transports:            PASS ✓

Total: 5/5 suites passed

Coverage: 95%+
```

## 🐛 Debugging Failed Tests

### Common Issues

**1. Server Connection Failed**
```bash
# Check if server binary exists
node dist/mcp/index.js

# Check transport configuration
mcpjam inspect --command "node" --args "dist/mcp/index.js" --debug
```

**2. Protocol Violations**
```bash
# Run with verbose logging
npx @mcpjam/evals-cli test --suite tools --verbose

# Check MCP SDK version compatibility
npm list @modelcontextprotocol/sdk
```

**3. Timeout Issues**
```bash
# Increase timeout in config
{
  "timeout": 30000,  // 30 seconds
  "retries": 3
}
```

## 📚 Additional Resources

- **MCPJam Documentation:** https://mcpjam.dev/docs
- **MCP Specification:** https://modelcontextprotocol.io/docs
- **Gemini Flow MCP Docs:** [../MCP_PHASE1_IMPLEMENTATION.md](./MCP_PHASE1_IMPLEMENTATION.md)

## 🤝 Contributing

When adding new MCP features:

1. Add test cases to `eval-config.json`
2. Create integration tests in `tests/mcp/integration/`
3. Run full test suite: `npm run test:mcpjam`
4. Ensure 90%+ conformance before merging

## 📝 Next Steps

- [ ] Implement Sampling primitive (server-to-client LLM requests)
- [ ] Implement Elicitation primitive (interactive workflows)
- [ ] Add Roots primitive (filesystem boundaries)
- [ ] Achieve 100% MCP specification conformance

---

**Status:** MCPJam testing infrastructure complete and validated ✅
