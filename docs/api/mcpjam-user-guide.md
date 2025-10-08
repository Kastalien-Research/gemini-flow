# MCPJam User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Configuration Files](#configuration-files)
4. [CLI Command Reference](#cli-command-reference)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Integration with Gemini Flow](#integration-with-gemini-flow)

---

## Introduction

MCPJam is an integrated evaluation framework within Gemini Flow that enables comprehensive testing of MCP (Model Context Protocol) tool usage across multiple LLM providers. It provides a systematic approach to validate that LLMs correctly utilize MCP tools in response to natural language queries.

### What is MCPJam?

MCPJam allows you to:
- **Test MCP tool integration** across multiple LLM providers (Anthropic, OpenAI, Gemini, OpenRouter)
- **Validate tool call accuracy** by comparing expected vs. actual tool invocations
- **Benchmark performance** with multiple test runs for consistency
- **Secure API key storage** using AES-256-GCM encryption
- **Export configurations** for use with standalone MCPJam CLI

### Quick Start (5 minutes)

```bash
# 1. Initialize MCPJam configuration
gemini-flow mcp evals init

# 2. Add your LLM API key (encrypted)
gemini-flow mcp evals config llm anthropic YOUR_API_KEY

# 3. Run sample test
gemini-flow mcp evals run

# 4. View results
✓ Sample test (Run 1)
  Model: claude-3-5-sonnet-latest (anthropic)
  Duration: 1234ms
  Expected Tools: none
  Actual Tools: none
  Tool Calls Match: Yes
```

---

## Installation and Setup

### Prerequisites

- Node.js 18+ installed
- Gemini Flow installed (`npm install -g gemini-flow` or local installation)
- At least one LLM provider API key (Anthropic, OpenAI, etc.)
- MCP server(s) you want to test

### Initial Setup

#### Step 1: Initialize Configuration Directory

```bash
gemini-flow mcp evals init [--dir .mcpjam]
```

This creates:
- `.mcpjam/` directory (or custom directory)
- `environment.json` with sample MCP server configuration
- `tests.json` with sample test
- `.mcpjam/.gitignore` to exclude encrypted credentials

**Output:**
```
✓ MCPJam configuration initialized successfully!

Configuration directory: .mcpjam

Next steps:
1. Add your LLM API keys: gemini-flow mcp evals config llm <provider> <api-key>
2. Configure your MCP servers in environment.json
3. Add your tests to tests.json
4. Run tests: gemini-flow mcp evals run
```

#### Step 2: Configure LLM Provider API Keys

```bash
# Add Anthropic API key
gemini-flow mcp evals config llm anthropic sk-ant-api03-...

# Add OpenAI API key
gemini-flow mcp evals config llm openai sk-proj-...

# Add Gemini API key
gemini-flow mcp evals config llm gemini AIza...

# Add OpenRouter API key
gemini-flow mcp evals config llm openrouter sk-or-v1-...
```

**Security Note:** API keys are stored in `llms.encrypted.json` using AES-256-GCM encryption. The encryption key can be customized via the `MCPJAM_ENCRYPTION_KEY` environment variable.

#### Step 3: Configure MCP Servers

Add MCP servers to test against:

```bash
# Add filesystem server
gemini-flow mcp evals config server add filesystem \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /workspace

# Add sequential thinking server
gemini-flow mcp evals config server add sequential-thinking \
  --command npx \
  --args -y @modelcontextprotocol/server-sequential-thinking

# Add custom server with environment variables
gemini-flow mcp evals config server add custom-server \
  --command node \
  --args server.js \
  --env DATABASE_URL=postgres://... API_KEY=abc123
```

#### Step 4: Verify Configuration

```bash
# List configured servers
gemini-flow mcp evals config server list

# Output:
# Configured MCP Servers:
#
# filesystem:
#   Command: npx -y @modelcontextprotocol/server-filesystem /workspace
#
# sequential-thinking:
#   Command: npx -y @modelcontextprotocol/server-sequential-thinking
```

---

## Configuration Files

MCPJam uses three main configuration files stored in the `.mcpjam/` directory:

### 1. environment.json

Defines MCP server connection configurations.

**Schema:**
```json
{
  "servers": {
    "server-name": {
      "command": "string",      // Command to execute (STDIO)
      "args": ["string"],       // Command arguments
      "env": {                  // Environment variables
        "KEY": "value"
      },
      "url": "string"           // Alternative: HTTP/SSE URL
    }
  }
}
```

**Example:**
```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "database": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### 2. tests.json

Defines test cases with queries and expected tool calls.

**Schema:**
```json
[
  {
    "title": "string",           // Test description
    "query": "string",            // Natural language query
    "runs": number,               // Number of test iterations (default: 1)
    "model": "string",            // Model identifier
    "provider": "string",         // LLM provider (anthropic, openai, etc.)
    "expectedToolCalls": ["string"], // Expected tool names (optional)
    "temperature": number,        // Optional: temperature (0-1)
    "maxTokens": number          // Optional: max output tokens
  }
]
```

**Example:**
```json
[
  {
    "title": "File search and read",
    "query": "Find all TypeScript files in src/ containing 'MCPJam' and show me the first one",
    "runs": 3,
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["search_files", "read_file"],
    "temperature": 0,
    "maxTokens": 4096
  },
  {
    "title": "Sequential reasoning task",
    "query": "What is the best approach to optimize database queries for high concurrency?",
    "runs": 1,
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["sequentialthinking"],
    "temperature": 0.7
  },
  {
    "title": "Multi-step file analysis",
    "query": "Analyze the architecture of this codebase and create a summary",
    "runs": 2,
    "model": "gemini-2.0-flash-exp",
    "provider": "gemini",
    "expectedToolCalls": ["list_directory", "read_file", "search_files"]
  }
]
```

### 3. llms.encrypted.json (Auto-Generated)

Stores encrypted LLM provider API keys. **Do not edit manually.**

**Format (encrypted):**
```json
{
  "anthropic": "iv:authTag:encryptedData",
  "openai": "iv:authTag:encryptedData"
}
```

**Decrypted structure:**
```json
{
  "anthropic": "sk-ant-api03-...",
  "openai": "sk-proj-...",
  "gemini": "AIza...",
  "openrouter": "sk-or-v1-...",
  "ollama": {
    "url": "http://localhost:11434",
    "models": ["llama2", "mistral"]
  }
}
```

---

## CLI Command Reference

### `gemini-flow mcp evals init`

Initialize MCPJam configuration directory with sample files.

**Syntax:**
```bash
gemini-flow mcp evals init [--dir <directory>]
```

**Options:**
- `--dir <directory>` - Configuration directory (default: `.mcpjam`)

**Example:**
```bash
gemini-flow mcp evals init --dir ./my-tests
```

---

### `gemini-flow mcp evals run`

Run MCPJam evaluation tests.

**Syntax:**
```bash
gemini-flow mcp evals run [options]
```

**Options:**
- `--dir <directory>` - Configuration directory (default: `.mcpjam`)
- `--json` - Output results as JSON
- `-t, --tests <file>` - Tests configuration file (default: `tests.json`)
- `-e, --environment <file>` - Environment configuration file (default: `environment.json`)

**Examples:**
```bash
# Run all tests with pretty output
gemini-flow mcp evals run

# JSON output for CI/CD
gemini-flow mcp evals run --json > results.json

# Custom configuration directory
gemini-flow mcp evals run --dir ./custom-config

# Specific test file
gemini-flow mcp evals run -t advanced-tests.json
```

**Output (Pretty):**
```
✓ Initializing MCPJam test orchestrator...
✓ Connecting to MCP servers...
✓ Running tests...
✓ Tests completed!

============================================================
MCPJam Test Results
============================================================

Total Tests: 3
Total Runs: 6
Passed: 5
Failed: 1
Success Rate: 83.33%
Average Duration: 1456ms

------------------------------------------------------------
Individual Results
------------------------------------------------------------

✓ PASS File search and read (Run 1)
  Model: claude-3-5-sonnet-latest (anthropic)
  Duration: 1234ms
  Expected Tools: search_files, read_file
  Actual Tools: search_files, read_file
  Tool Calls Match: Yes

✗ FAIL Sequential reasoning task (Run 1)
  Model: gpt-4-turbo (openai)
  Duration: 2341ms
  Expected Tools: sequentialthinking
  Actual Tools: none
  Tool Calls Match: No
  Error: Model did not invoke expected tools

============================================================
```

**Output (JSON):**
```json
{
  "totalTests": 3,
  "totalRuns": 6,
  "passed": 5,
  "failed": 1,
  "successRate": 83.33,
  "averageDuration": 1456,
  "results": [
    {
      "testTitle": "File search and read",
      "query": "Find all TypeScript files...",
      "model": "claude-3-5-sonnet-latest",
      "provider": "anthropic",
      "runNumber": 1,
      "success": true,
      "actualToolCalls": ["search_files", "read_file"],
      "expectedToolCalls": ["search_files", "read_file"],
      "toolCallsMatch": true,
      "response": "I found 5 TypeScript files...",
      "duration": 1234,
      "timestamp": 1704067200000
    }
  ],
  "timestamp": 1704067200000
}
```

---

### `gemini-flow mcp evals config`

Manage MCPJam configuration.

**Subcommands:**
- `server add <name>` - Add MCP server configuration
- `server list` - List configured servers
- `llm <provider> <api-key>` - Set LLM provider API key

**Examples:**
```bash
# Add server
gemini-flow mcp evals config server add my-server \
  --command npx \
  --args -y @my/mcp-server

# List servers
gemini-flow mcp evals config server list

# Set API key
gemini-flow mcp evals config llm anthropic sk-ant-...
```

---

### `gemini-flow mcp evals export`

Export configuration for use with standalone MCPJam CLI.

**Syntax:**
```bash
gemini-flow mcp evals export [options]
```

**Options:**
- `--dir <directory>` - Source configuration directory (default: `.mcpjam`)
- `--output <directory>` - Output directory (default: `.mcpjam-export`)

**Example:**
```bash
gemini-flow mcp evals export --output ./export

# Output:
# ✓ Configuration exported successfully!
#
# Exported files:
#   Environment: ./export/environment.json
#   Tests: ./export/tests.json
#   LLMs: ./export/llms.json
#
# You can now use these files with the standalone MCPJam CLI:
#   mcpjam evals run -t ./export/tests.json -e ./export/environment.json -l ./export/llms.json
```

---

## Writing Tests

### Test Structure Best Practices

1. **Descriptive Titles**: Use clear, action-oriented titles
   ```json
   {
     "title": "Search TypeScript files and extract imports",
     // Better than: "Test 1"
   }
   ```

2. **Specific Queries**: Write natural language queries that clearly indicate intent
   ```json
   {
     "query": "Find all files in src/core/ that import 'MCPJamConfigManager' and show me their dependencies"
   }
   ```

3. **Appropriate Run Counts**: Use multiple runs for consistency checking
   ```json
   {
     "runs": 3,  // Good for testing consistency
     "runs": 1   // Acceptable for expensive operations
   }
   ```

4. **Expected Tool Calls**: Define expected tools when validating specific behavior
   ```json
   {
     "expectedToolCalls": ["search_files", "read_file"],
     // Leave empty [] if you're just testing general response quality
   }
   ```

5. **Model Selection**: Choose appropriate models for your test
   ```json
   {
     "model": "claude-3-5-sonnet-latest",    // Best tool-use accuracy
     "model": "gpt-4-turbo",                 // Good for OpenAI testing
     "model": "gemini-2.0-flash-exp"         // Fast, cost-effective
   }
   ```

### Test Examples

#### Example 1: Filesystem Operations
```json
{
  "title": "Find and read configuration files",
  "query": "Show me all JSON configuration files in the root directory and display the contents of package.json",
  "runs": 2,
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "expectedToolCalls": ["list_directory", "read_file"],
  "temperature": 0
}
```

#### Example 2: Code Analysis
```json
{
  "title": "Analyze TypeScript code structure",
  "query": "Analyze the src/core/mcpjam-config-manager.ts file and explain its security features",
  "runs": 1,
  "model": "gpt-4-turbo",
  "provider": "openai",
  "expectedToolCalls": ["read_file"],
  "temperature": 0.3,
  "maxTokens": 2048
}
```

#### Example 3: Multi-Step Reasoning
```json
{
  "title": "Complex debugging workflow",
  "query": "Find all test files that import MCPJamTestOrchestrator, check if they have proper cleanup in afterAll hooks, and suggest improvements",
  "runs": 1,
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "expectedToolCalls": ["search_files", "read_file"],
  "temperature": 0.5
}
```

#### Example 4: Performance Testing
```json
{
  "title": "Concurrent file operations",
  "query": "List all files in src/ and count the total lines of TypeScript code",
  "runs": 5,
  "model": "gemini-2.0-flash-exp",
  "provider": "gemini",
  "expectedToolCalls": ["list_directory", "read_file"]
}
```

### Advanced Test Patterns

#### Pattern 1: Consistency Testing
Run the same test multiple times to verify consistent tool usage:
```json
{
  "title": "Consistency check: file search",
  "query": "Find all files containing 'export class'",
  "runs": 10,
  "model": "claude-3-5-sonnet-latest",
  "provider": "anthropic",
  "expectedToolCalls": ["search_files"]
}
```

#### Pattern 2: Cross-Provider Comparison
Test the same query across multiple providers:
```json
[
  {
    "title": "File search - Claude",
    "query": "Find all TypeScript interface definitions",
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "File search - GPT-4",
    "query": "Find all TypeScript interface definitions",
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["search_files"]
  }
]
```

#### Pattern 3: Gradual Complexity
Start simple and increase complexity:
```json
[
  {
    "title": "Basic: List files",
    "query": "List all files in src/",
    "expectedToolCalls": ["list_directory"]
  },
  {
    "title": "Intermediate: Search files",
    "query": "Find all files in src/ containing 'MCPJam'",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "Advanced: Multi-step analysis",
    "query": "Find files with 'MCPJam', read them, and create a dependency graph",
    "expectedToolCalls": ["search_files", "read_file"]
  }
]
```

---

## Best Practices

### Security

1. **Never Commit API Keys**
   ```bash
   # Add to .gitignore
   echo ".mcpjam/llms.encrypted.json" >> .gitignore
   echo ".mcpjam-export/" >> .gitignore
   ```

2. **Use Environment Variables for Encryption Key**
   ```bash
   export MCPJAM_ENCRYPTION_KEY="your-strong-passphrase-here"
   gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
   ```

3. **Rotate API Keys Regularly**
   ```bash
   # Update API key
   gemini-flow mcp evals config llm anthropic $NEW_API_KEY
   ```

### Performance

1. **Batch Similar Tests**
   Group tests by provider and model to minimize initialization overhead.

2. **Use Appropriate Run Counts**
   - Single runs (runs: 1) for expensive models
   - Multiple runs (runs: 3-5) for consistency validation
   - Many runs (runs: 10+) for statistical analysis

3. **Optimize Temperature**
   - temperature: 0 for deterministic tests
   - temperature: 0.3-0.7 for creative tasks
   - temperature: 1.0 for maximum diversity

### Testing Strategy

1. **Start with Sample Tests**
   Use the generated sample test to verify setup before creating custom tests.

2. **Test Tool Availability First**
   Verify MCP servers are providing expected tools:
   ```bash
   gemini-flow mcp list  # List available tools
   ```

3. **Incremental Test Development**
   - Write one test at a time
   - Verify it passes before adding more
   - Use `--json` output for automated analysis

4. **Monitor Costs**
   Track API usage across providers:
   ```bash
   gemini-flow mcp evals run --json | jq '.results[].provider' | sort | uniq -c
   ```

### CI/CD Integration

```yaml
# .github/workflows/mcpjam.yml
name: MCPJam Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Initialize MCPJam
        run: npx gemini-flow mcp evals init

      - name: Configure API keys
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npx gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
          npx gemini-flow mcp evals config llm openai $OPENAI_API_KEY

      - name: Run tests
        run: npx gemini-flow mcp evals run --json > results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: mcpjam-results
          path: results.json
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "No MCP servers could be connected"

**Cause:** MCP server command failed to start or timed out.

**Solution:**
```bash
# Test server manually
npx -y @modelcontextprotocol/server-filesystem /workspace

# Check logs
DEBUG=mcp:* gemini-flow mcp evals run

# Verify server configuration
gemini-flow mcp evals config server list
```

#### Issue 2: "No LLM providers configured"

**Cause:** API keys not set or decryption failed.

**Solution:**
```bash
# Set API key
gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY

# Verify encryption key
export MCPJAM_ENCRYPTION_KEY="your-passphrase"

# Reinitialize if needed
gemini-flow mcp evals init
```

#### Issue 3: "Invalid encrypted data format"

**Cause:** Corruption of `llms.encrypted.json` or wrong encryption key.

**Solution:**
```bash
# Remove corrupted file
rm .mcpjam/llms.encrypted.json

# Re-add API keys
gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
```

#### Issue 4: Tests failing with "Model did not invoke expected tools"

**Cause:** Query doesn't clearly indicate need for tools, or model doesn't support tool calling.

**Solution:**
- Make query more explicit about needing file system access
- Verify model supports tool calling (e.g., claude-3-5-sonnet, gpt-4-turbo)
- Check if MCP server is actually connected
- Review actual tool calls in output to see what was invoked

#### Issue 5: "HTTP/SSE transport not yet implemented"

**Cause:** Using `url` field instead of `command` in server configuration.

**Solution:**
Currently, only STDIO transport is supported. Use `command` and `args` fields:
```json
{
  "servers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

### Debug Mode

Enable detailed logging:
```bash
DEBUG=mcp:*,mcpjam:* gemini-flow mcp evals run
```

### Validation Commands

```bash
# Validate environment.json
cat .mcpjam/environment.json | jq .

# Validate tests.json
cat .mcpjam/tests.json | jq .

# Test MCP server manually
npx gemini-flow mcp status

# Check API key encryption
gemini-flow mcp evals config llm anthropic test-key
cat .mcpjam/llms.encrypted.json  # Should show encrypted format
```

---

## Integration with Gemini Flow

MCPJam is deeply integrated with Gemini Flow's agent orchestration system, enabling advanced testing scenarios.

### Agent-Assisted Testing

Use Gemini Flow agents to generate and run tests:

```typescript
import { AgentFactory } from '@/agents/agent-factory';
import { MCPJamTestOrchestrator } from '@/core/mcpjam-test-orchestrator';

const factory = new AgentFactory();
const tester = await factory.createAgent({
  type: 'tester',
  capabilities: ['mcpjam-orchestration', 'test-generation']
});

// Agent generates tests based on codebase analysis
const tests = await tester.generateMCPJamTests({
  targetServers: ['filesystem', 'sequential-thinking'],
  coverage: 'comprehensive'
});

// Run generated tests
const orchestrator = new MCPJamTestOrchestrator();
await orchestrator.initialize();
const results = await orchestrator.runTests();
```

### A2A Protocol Integration

MCPJam test results can be shared between agents using A2A protocol:

```typescript
import { A2AMessageSecurity } from '@/core/a2a-message-security';

const security = new A2AMessageSecurity(secretKey);

// Share test results with analyst agent
const message = {
  type: 'mcpjam-results',
  payload: testSummary,
  timestamp: Date.now()
};

const signed = await security.signMessage(message);
await agentBridge.sendToAgent('analyst', signed);
```

### Swarm Coordination

Distribute test execution across agent swarms:

```typescript
import { SwarmCoordinator } from '@/agentspace/orchestration/TaskOrchestrator';

const coordinator = new SwarmCoordinator();

// Distribute tests across swarm
await coordinator.orchestrateTask({
  type: 'mcpjam-parallel-testing',
  tests: testsConfig,
  strategy: 'parallel',
  maxAgents: 5
});
```

### Performance Monitoring

MCPJam integrates with Gemini Flow's SQLite performance monitoring:

```typescript
import { SQLiteAdapter } from '@/memory/sqlite-adapter';

const adapter = new SQLiteAdapter();

// Store test results in high-performance SQLite
await adapter.batchWrite([
  { key: 'mcpjam:results:latest', value: testSummary },
  { key: 'mcpjam:metrics:success-rate', value: successRate }
]);
```

### Export to Gemini Flow Workflows

```bash
# Export test results for workflow processing
gemini-flow mcp evals run --json > .hive-mind/mcpjam-results.json

# Process with Gemini Flow agents
gemini-flow agent spawn analyst --input .hive-mind/mcpjam-results.json
```

---

## Appendix: Configuration Schemas

### Environment Configuration Schema

```typescript
interface MCPJamEnvironmentConfig {
  servers: Record<string, MCPJamServerConfig>;
}

interface MCPJamServerConfig {
  command?: string;           // STDIO: Command to execute
  args?: string[];            // STDIO: Command arguments
  env?: Record<string, string>; // Environment variables
  url?: string;               // SSE/HTTP: Server URL (not yet supported)
  requestInit?: {             // SSE/HTTP: Request configuration
    headers?: Record<string, string>;
    [key: string]: any;
  };
}
```

### Test Configuration Schema

```typescript
type MCPJamTestsConfig = MCPJamTestConfig[];

interface MCPJamTestConfig {
  title: string;              // Test description
  query: string;              // Natural language query
  runs?: number;              // Number of iterations (default: 1)
  model: string;              // Model identifier
  provider: string;           // LLM provider
  expectedToolCalls?: string[]; // Expected tool names
  temperature?: number;       // Temperature (0-1)
  maxTokens?: number;        // Max output tokens
}
```

### LLM Configuration Schema

```typescript
interface MCPJamLLMConfig {
  anthropic?: string;
  openai?: string;
  openrouter?: string;
  gemini?: string;
  deepseek?: string;
  ollama?: {
    url: string;
    models?: string[];
  };
  [provider: string]: string | { url: string; models?: string[] } | undefined;
}
```

### Test Result Schema

```typescript
interface MCPJamTestResult {
  testTitle: string;
  query: string;
  model: string;
  provider: string;
  runNumber: number;
  success: boolean;
  actualToolCalls?: string[];
  expectedToolCalls?: string[];
  toolCallsMatch: boolean;
  response?: string;
  error?: string;
  duration: number;
  timestamp: number;
}

interface MCPJamTestSummary {
  totalTests: number;
  totalRuns: number;
  passed: number;
  failed: number;
  successRate: number;
  averageDuration: number;
  results: MCPJamTestResult[];
  timestamp: number;
}
```

---

## Additional Resources

- **MCPJam Integration Documentation**: See `docs/mcp-mcpjam-integration.md`
- **MCP Setup Guide**: See `docs/mcp-api-setup-guide.md`
- **Gemini CLI Commands**: See `docs/api/gemini-cli-commands.md`
- **Example Configurations**: See `examples/mcpjam/`
- **GitHub Issues**: https://github.com/clduab11/gemini-flow/issues

---

**Last Updated:** 2025-10-07
**Version:** 1.0.0
**Gemini Flow Version:** 1.3.3
