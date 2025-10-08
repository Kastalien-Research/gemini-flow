# MCPJam Test Specification

**Document Version:** 1.0.0
**Last Updated:** 2025-10-07
**Target Coverage:** >95% (per CLAUDE.md requirements)
**Total Test Cases:** 220+
**Testing Framework:** Vitest

---

## 1. Executive Summary

This specification defines comprehensive test coverage for MCPJam integration within Gemini Flow, covering:
- MCPJamConfigManager (80+ test cases)
- MCPJamTestOrchestrator (70+ test cases)
- CLI command integration (50+ test cases)
- Security and error handling (20+ test cases)

### 1.1 Testing Philosophy

Following Gemini Flow's testing patterns established in `tests/security/` and `tests/performance/`:
- **Comprehensive Coverage**: Target >95% code coverage per vitest.config.ts
- **Performance Benchmarks**: Define clear performance targets
- **Security First**: Validate encryption, authentication, and input sanitization
- **Edge Case Coverage**: Test failure modes, race conditions, and boundary cases
- **Integration Testing**: Validate end-to-end workflows with real MCP servers

### 1.2 Integration with Existing Test Infrastructure

**Existing Test Patterns to Follow:**
- `tests/security/signature-service.test.ts` - Security validation patterns
- `tests/security/agent-key-registry.test.ts` - Registry management patterns
- `tests/performance/signature-performance.test.ts` - Performance benchmarking patterns

**Test Helper Reuse:**
- `tests/helpers/test-keys.ts` - Key generation utilities
- `tests/helpers/test-messages.ts` - Message factory patterns

---

## 2. MCPJamConfigManager Tests (80+ Cases)

**File:** `tests/mcp/mcpjam-config-manager.test.ts`

### 2.1 Initialization and Directory Management (10 cases)

```typescript
describe('MCPJamConfigManager - Initialization', () => {
  test('should create default .mcpjam directory if not specified')
  test('should use custom directory when provided')
  test('should create directory structure on initialize()')
  test('should handle permission errors when creating directory')
  test('should create directory recursively for nested paths')
  test('should handle existing directory gracefully')
  test('should validate directory path format')
  test('should reject invalid directory paths')
  test('should set correct file paths for all configs')
  test('should derive encryption key from environment or default')
})
```

**Coverage Target:** 100% of initialization code
**Performance Target:** <10ms for initialization

### 2.2 Environment Configuration (20 cases)

```typescript
describe('MCPJamConfigManager - Environment Config', () => {
  // Read operations
  test('should read environment configuration from file')
  test('should return empty config when file does not exist')
  test('should parse JSON correctly')
  test('should validate config structure')
  test('should reject invalid JSON')
  test('should handle file read errors gracefully')

  // Write operations
  test('should write environment config to file')
  test('should create directory before writing')
  test('should format JSON with 2-space indentation')
  test('should handle write errors')
  test('should validate config before writing')

  // Server management
  test('should add server configuration')
  test('should update existing server configuration')
  test('should remove server from configuration')
  test('should handle removal of non-existent server')

  // Validation
  test('should reject config without servers object')
  test('should reject server without command or url')
  test('should validate command-based server config')
  test('should validate url-based server config')
  test('should validate env variables in server config')
  test('should reject invalid args array')
})
```

**Coverage Target:** 100% of environment config methods
**Performance Target:** <50ms for read/write operations

### 2.3 Tests Configuration (15 cases)

```typescript
describe('MCPJamConfigManager - Tests Config', () => {
  // Read operations
  test('should read tests configuration from file')
  test('should return empty array when file does not exist')
  test('should parse test array correctly')

  // Write operations
  test('should write tests configuration to file')
  test('should validate test structure before writing')

  // Test management
  test('should add test to configuration')
  test('should append test to existing array')

  // Validation
  test('should reject non-array tests config')
  test('should validate required test fields (title, query, model, provider)')
  test('should validate optional fields (runs, temperature, maxTokens)')
  test('should reject test with missing title')
  test('should reject test with missing query')
  test('should reject test with invalid runs value')
  test('should validate expectedToolCalls array')
  test('should handle tests with no expectedToolCalls')
})
```

**Coverage Target:** 100% of tests config methods
**Performance Target:** <50ms for read/write operations

### 2.4 LLM Configuration and Encryption (25 cases)

```typescript
describe('MCPJamConfigManager - LLM Config', () => {
  // Basic operations
  test('should read encrypted LLM configuration')
  test('should return empty config when file does not exist')
  test('should write encrypted LLM configuration')
  test('should set LLM API key for provider')
  test('should get LLM API key for provider')
  test('should return undefined for non-existent provider')

  // Encryption/Decryption
  test('should encrypt plaintext with AES-256-GCM')
  test('should decrypt ciphertext correctly')
  test('should generate unique IV for each encryption')
  test('should include auth tag in encrypted data')
  test('should reject tampered ciphertext')
  test('should reject ciphertext with invalid format')
  test('should reject ciphertext with invalid IV')
  test('should reject ciphertext with invalid auth tag')
  test('should use consistent encryption key')

  // Provider management
  test('should handle anthropic provider')
  test('should handle openai provider')
  test('should handle openrouter provider')
  test('should handle gemini provider')
  test('should handle deepseek provider')
  test('should handle ollama configuration object')
  test('should validate ollama url when provided')

  // Security
  test('should reject invalid provider configuration')
  test('should handle encryption key from environment')
  test('should use default key when env var not set')
})
```

**Coverage Target:** 100% of encryption/decryption code
**Performance Target:** <100ms for encryption operations
**Security Requirement:** Must validate AES-256-GCM implementation

### 2.5 Export Functionality (10 cases)

```typescript
describe('MCPJamConfigManager - Export', () => {
  test('should export configuration for MCPJam CLI')
  test('should create export directory')
  test('should export environment.json')
  test('should export tests.json')
  test('should export decrypted llms.json')
  test('should use custom output directory when provided')
  test('should handle export errors gracefully')
  test('should return exported file paths')
  test('should create properly formatted MCPJam files')
  test('should validate exported files are readable')
})
```

**Coverage Target:** 100% of export functionality
**Performance Target:** <200ms for export operations

---

## 3. MCPJamTestOrchestrator Tests (70+ Cases)

**File:** `tests/mcp/mcpjam-test-orchestrator.test.ts`

### 3.1 Initialization and Setup (12 cases)

```typescript
describe('MCPJamTestOrchestrator - Initialization', () => {
  test('should initialize with default config manager')
  test('should initialize with custom config manager')
  test('should create MCP client wrapper on initialization')
  test('should connect to all configured MCP servers')
  test('should handle connection failures gracefully')
  test('should initialize LLM providers from config')
  test('should handle missing LLM config')
  test('should track connected servers')
  test('should throw error when no servers can connect')
  test('should throw error when no LLM providers configured')
  test('should cleanup on initialization failure')
  test('should initialize in correct order (config -> servers -> providers)')
})
```

**Coverage Target:** 100% of initialization code
**Performance Target:** <5s for initialization

### 3.2 MCP Server Connection (10 cases)

```typescript
describe('MCPJamTestOrchestrator - Server Connection', () => {
  test('should connect to STDIO-based MCP server')
  test('should connect with command and args')
  test('should pass environment variables to server')
  test('should throw error for HTTP/SSE servers (not yet implemented)')
  test('should track successfully connected servers')
  test('should warn on individual server connection failure')
  test('should continue connecting to other servers on failure')
  test('should handle timeout on server connection')
  test('should validate server configuration before connecting')
  test('should cleanup on connection failure')
})
```

**Coverage Target:** 100% of connection code
**Performance Target:** <20s per server connection

### 3.3 LLM Provider Initialization (20 cases)

```typescript
describe('MCPJamTestOrchestrator - LLM Providers', () => {
  // Anthropic
  test('should initialize Anthropic provider with API key')
  test('should create Anthropic client correctly')
  test('should handle Anthropic API errors')
  test('should validate Anthropic response format')
  test('should extract tool calls from Anthropic response')

  // OpenAI
  test('should initialize OpenAI provider with API key')
  test('should create OpenAI client correctly')
  test('should handle OpenAI API errors')
  test('should validate OpenAI response format')
  test('should extract tool calls from OpenAI response')

  // OpenRouter
  test('should initialize OpenRouter provider with API key')
  test('should use correct OpenRouter base URL')
  test('should handle OpenRouter API errors')

  // Gemini
  test('should initialize Gemini provider with API key')
  test('should create Gemini client correctly')
  test('should handle Gemini API errors')
  test('should validate Gemini response format')

  // General
  test('should map tools correctly for each provider')
  test('should handle missing optional dependencies')
  test('should validate provider interface implementation')
})
```

**Coverage Target:** 100% of provider initialization
**Performance Target:** <1s per provider initialization

### 3.4 Test Execution (15 cases)

```typescript
describe('MCPJamTestOrchestrator - Test Execution', () => {
  test('should run all configured tests')
  test('should execute multiple runs for a single test')
  test('should collect results for all test runs')
  test('should handle test execution errors')
  test('should continue executing tests on individual failures')
  test('should calculate summary statistics correctly')
  test('should track passed and failed tests')
  test('should calculate success rate correctly')
  test('should calculate average duration')
  test('should include all results in summary')
  test('should timestamp test results')
  test('should validate test configuration before running')
  test('should throw error when no tests configured')
  test('should handle concurrent test execution')
  test('should cleanup resources after test run')
})
```

**Coverage Target:** 100% of test execution code
**Performance Target:** Variable based on test count

### 3.5 Tool Discovery and Execution (10 cases)

```typescript
describe('MCPJamTestOrchestrator - Tool Discovery', () => {
  test('should list tools from connected servers')
  test('should aggregate tools from multiple servers')
  test('should handle tool listing errors')
  test('should warn on server tool listing failure')
  test('should format tools for LLM provider')
  test('should map MCP tool schema to provider format')
  test('should validate tool calls against expected calls')
  test('should match all expected tool calls')
  test('should pass test when no expected calls specified')
  test('should fail test when expected calls not made')
})
```

**Coverage Target:** 100% of tool discovery code
**Performance Target:** <2s for tool discovery

### 3.6 Resource Cleanup (3 cases)

```typescript
describe('MCPJamTestOrchestrator - Cleanup', () => {
  test('should close all MCP connections on cleanup')
  test('should clear connected servers set')
  test('should clear LLM providers map')
})
```

**Coverage Target:** 100% of cleanup code
**Performance Target:** <1s for cleanup

---

## 4. CLI Command Tests (50+ Cases)

**File:** `tests/mcp/mcpjam-cli-commands.test.ts`

### 4.1 `mcp evals init` Command (12 cases)

```typescript
describe('CLI - mcp evals init', () => {
  test('should initialize MCPJam configuration directory')
  test('should create .mcpjam directory by default')
  test('should use custom directory with --dir option')
  test('should create sample environment.json')
  test('should create sample tests.json')
  test('should include sequential-thinking server in sample')
  test('should display success message')
  test('should show next steps after initialization')
  test('should handle directory creation errors')
  test('should handle file write errors')
  test('should show spinner during initialization')
  test('should exit with error code on failure')
})
```

**Coverage Target:** 100% of init command
**Performance Target:** <500ms for initialization

### 4.2 `mcp evals run` Command (15 cases)

```typescript
describe('CLI - mcp evals run', () => {
  test('should run MCPJam tests')
  test('should use default configuration files')
  test('should accept custom file paths via options')
  test('should initialize orchestrator')
  test('should connect to MCP servers')
  test('should execute all tests')
  test('should display progress spinner')
  test('should show pretty-printed results by default')
  test('should output JSON when --json flag provided')
  test('should display summary statistics')
  test('should display individual test results')
  test('should exit with code 0 on success')
  test('should exit with code 1 on test failures')
  test('should cleanup orchestrator on completion')
  test('should cleanup orchestrator on errors')
})
```

**Coverage Target:** 100% of run command
**Performance Target:** Variable based on test count

### 4.3 `mcp evals config` Commands (15 cases)

```typescript
describe('CLI - mcp evals config', () => {
  // Server management
  test('should add server configuration')
  test('should accept --command option')
  test('should accept --args option')
  test('should accept --url option')
  test('should accept --env option')
  test('should parse environment variables correctly')
  test('should require either command or url')
  test('should list configured servers')
  test('should display server details')

  // LLM configuration
  test('should set LLM API key')
  test('should encrypt API key before storing')
  test('should display success message')
  test('should show encryption notice')
  test('should handle configuration errors')
  test('should exit with error code on failure')
})
```

**Coverage Target:** 100% of config commands
**Performance Target:** <200ms per command

### 4.4 `mcp evals export` Command (8 cases)

```typescript
describe('CLI - mcp evals export', () => {
  test('should export MCPJam configuration')
  test('should use default directories')
  test('should accept custom --dir option')
  test('should accept custom --output option')
  test('should display exported file paths')
  test('should show usage instructions')
  test('should handle export errors')
  test('should exit with error code on failure')
})
```

**Coverage Target:** 100% of export command
**Performance Target:** <300ms for export

---

## 5. Security and Error Handling Tests (20+ Cases)

**File:** `tests/mcp/mcpjam-security.test.ts`

### 5.1 Encryption Validation (8 cases)

```typescript
describe('MCPJamSecurity - Encryption', () => {
  test('should use AES-256-GCM algorithm')
  test('should generate unique IV for each encryption')
  test('should produce different ciphertext for same plaintext')
  test('should include authentication tag')
  test('should reject tampered ciphertext')
  test('should reject corrupted IV')
  test('should reject corrupted auth tag')
  test('should validate encrypted data format (iv:tag:data)')
})
```

**Coverage Target:** 100% of encryption code
**Security Requirement:** Must validate AES-256-GCM compliance

### 5.2 API Key Handling (6 cases)

```typescript
describe('MCPJamSecurity - API Keys', () => {
  test('should never log API keys')
  test('should encrypt API keys before storage')
  test('should not expose keys in error messages')
  test('should handle environment variables securely')
  test('should validate API key format')
  test('should sanitize API keys in debug output')
})
```

**Coverage Target:** 100% of API key handling
**Security Requirement:** Zero API key exposure

### 5.3 Input Validation (6 cases)

```typescript
describe('MCPJamSecurity - Input Validation', () => {
  test('should validate MCP server command injection')
  test('should sanitize server arguments')
  test('should validate environment variable keys')
  test('should validate environment variable values')
  test('should validate test query content')
  test('should sanitize file paths')
})
```

**Coverage Target:** 100% of input validation
**Security Requirement:** Prevent command injection

---

## 6. Performance and Integration Tests

**File:** `tests/mcp/mcpjam-performance.test.ts`

### 6.1 Performance Benchmarks (10 cases)

```typescript
describe('MCPJamPerformance', () => {
  test('should initialize config manager in <10ms')
  test('should read configuration files in <50ms')
  test('should write configuration files in <50ms')
  test('should encrypt API keys in <100ms')
  test('should decrypt API keys in <100ms')
  test('should connect to MCP server in <20s')
  test('should list tools from server in <2s')
  test('should execute single test in <30s')
  test('should export configuration in <200ms')
  test('should cleanup resources in <1s')
})
```

**Coverage Target:** 100% of performance-critical paths
**Performance Target:** As specified in each test

### 6.2 Integration Tests (10 cases)

**File:** `tests/mcp/mcpjam-integration.test.ts`

```typescript
describe('MCPJamIntegration - End-to-End', () => {
  test('should complete full init-config-run workflow')
  test('should initialize with sequential-thinking server')
  test('should execute sample test successfully')
  test('should validate tool calls correctly')
  test('should export and re-import configuration')
  test('should handle multiple concurrent tests')
  test('should integrate with existing MCP client wrapper')
  test('should work with multiple LLM providers')
  test('should handle server connection failures gracefully')
  test('should produce valid test summary')
})
```

**Coverage Target:** 100% of integration points
**Performance Target:** <60s for full workflow

---

## 7. Edge Cases and Error Scenarios

**File:** `tests/mcp/mcpjam-edge-cases.test.ts`

### 7.1 Edge Cases (15 cases)

```typescript
describe('MCPJamEdgeCases', () => {
  // File system edge cases
  test('should handle missing parent directory')
  test('should handle permission denied on directory')
  test('should handle permission denied on file read')
  test('should handle permission denied on file write')
  test('should handle disk full error')

  // Configuration edge cases
  test('should handle empty configuration files')
  test('should handle malformed JSON')
  test('should handle missing required fields')
  test('should handle extremely large configuration files')

  // Runtime edge cases
  test('should handle MCP server crash during test')
  test('should handle LLM provider API timeout')
  test('should handle network errors')
  test('should handle rate limiting from LLM provider')
  test('should handle concurrent access to config files')
  test('should handle rapid test execution')
})
```

**Coverage Target:** 100% of error handling paths
**Requirement:** Graceful degradation on all errors

---

## 8. Test Infrastructure and Helpers

### 8.1 Test Helpers to Create

**File:** `tests/helpers/mcpjam-test-helpers.ts`

```typescript
// Configuration factories
export function createTestEnvironmentConfig(overrides?: Partial<MCPJamEnvironmentConfig>)
export function createTestServerConfig(type: 'stdio' | 'http', overrides?: any)
export function createTestTestsConfig(count: number)
export function createTestLLMConfig(providers: string[])

// Mock MCP server
export class MockMCPServer {
  async start()
  async stop()
  setTools(tools: any[])
  setResponses(responses: any[])
}

// Mock LLM provider
export class MockLLMProvider implements LLMProvider {
  async generateCompletion(prompt, model, options)
}

// Temporary directory management
export async function createTempConfigDir()
export async function cleanupTempConfigDir(dir: string)

// File system helpers
export async function writeTestConfig(dir: string, config: any)
export async function readTestConfig(dir: string)
```

### 8.2 Test Fixtures

**Directory:** `tests/fixtures/mcpjam/`

```
tests/fixtures/mcpjam/
├── valid-environment.json       # Valid environment config
├── valid-tests.json             # Valid tests config
├── valid-llms.json              # Valid LLM config
├── invalid-environment.json     # Missing required fields
├── invalid-tests.json           # Malformed test structure
├── invalid-llms.json            # Invalid provider format
├── sample-responses/            # Mock LLM responses
│   ├── anthropic-response.json
│   ├── openai-response.json
│   └── gemini-response.json
└── sample-tools/                # Mock MCP tools
    ├── sequential-thinking.json
    └── filesystem.json
```

---

## 9. Coverage and Quality Targets

### 9.1 Coverage Requirements

Per `vitest.config.ts` and CLAUDE.md:

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Lines | 95% | 90% |
| Functions | 95% | 90% |
| Branches | 90% | 85% |
| Statements | 95% | 90% |

### 9.2 Performance Targets

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Config Manager Init | <10ms | <50ms |
| File Read/Write | <50ms | <100ms |
| Encryption/Decryption | <100ms | <200ms |
| MCP Server Connection | <20s | <30s |
| Tool Discovery | <2s | <5s |
| Single Test Execution | <30s | <60s |
| Full Workflow | <60s | <120s |

### 9.3 Security Requirements

- ✅ AES-256-GCM encryption validation
- ✅ Zero API key exposure in logs/errors
- ✅ Command injection prevention
- ✅ Input sanitization on all user inputs
- ✅ Secure file permission handling
- ✅ Environment variable protection

---

## 10. Test Execution Strategy

### 10.1 Test Organization

```bash
# Run all MCPJam tests
npm run test tests/mcp/

# Run specific test suites
npx vitest tests/mcp/mcpjam-config-manager.test.ts
npx vitest tests/mcp/mcpjam-test-orchestrator.test.ts
npx vitest tests/mcp/mcpjam-cli-commands.test.ts
npx vitest tests/mcp/mcpjam-security.test.ts

# Run with coverage
npx vitest tests/mcp/ --coverage

# Run in watch mode
npx vitest tests/mcp/ --watch
```

### 10.2 CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Test MCPJam Integration
  run: |
    npm run test tests/mcp/
    npm run test:coverage -- tests/mcp/
```

### 10.3 Test Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.0.0",
    "@google/generative-ai": "^0.1.0"
  }
}
```

---

## 11. Documentation and Maintenance

### 11.1 Test Documentation Requirements

Each test file must include:
- File header with purpose and scope
- Test case descriptions in plain English
- Coverage and performance targets
- Integration points with other systems
- Known limitations or assumptions

### 11.2 Maintenance Schedule

- **Weekly:** Review test failures and flaky tests
- **Monthly:** Update performance benchmarks
- **Quarterly:** Review and update test coverage
- **Per Release:** Validate all integration tests pass

### 11.3 Test Quality Metrics

Track and report:
- Test execution time trends
- Flaky test frequency
- Coverage percentage over time
- Performance benchmark results
- Security test pass rate

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Create test specification document
- [ ] Set up test helpers and fixtures
- [ ] Implement MCPJamConfigManager unit tests
- [ ] Target: 80+ tests, 95% coverage

### Phase 2: Orchestrator (Week 2)
- [ ] Implement MCPJamTestOrchestrator unit tests
- [ ] Create mock MCP servers for testing
- [ ] Create mock LLM providers
- [ ] Target: 70+ tests, 95% coverage

### Phase 3: CLI Integration (Week 3)
- [ ] Implement CLI command tests
- [ ] Create integration test suite
- [ ] Validate end-to-end workflows
- [ ] Target: 50+ tests, 95% coverage

### Phase 4: Security and Performance (Week 4)
- [ ] Implement security tests
- [ ] Implement performance benchmarks
- [ ] Implement edge case tests
- [ ] Target: 20+ tests, 100% security coverage

### Phase 5: CI/CD and Documentation (Week 5)
- [ ] Integrate tests into CI/CD pipeline
- [ ] Generate coverage reports
- [ ] Document test failures and resolutions
- [ ] Validate all targets met

---

## 13. Success Criteria

The MCPJam testing implementation is considered complete when:

- ✅ All 220+ test cases implemented
- ✅ Coverage targets met (>95% lines, functions, statements; >90% branches)
- ✅ All performance benchmarks pass
- ✅ All security tests pass
- ✅ Integration tests validate end-to-end workflows
- ✅ CI/CD pipeline includes MCPJam tests
- ✅ Documentation complete and accurate
- ✅ Zero critical bugs or security vulnerabilities
- ✅ Test suite runs in <5 minutes total
- ✅ All tests pass consistently (no flaky tests)

---

## 14. References

### 14.1 Internal Documentation
- `/Users/b.c.nims/gemini-flow/CLAUDE.md` - Project guidelines
- `/Users/b.c.nims/gemini-flow/vitest.config.ts` - Vitest configuration
- `/Users/b.c.nims/gemini-flow/specs/mcpjam-cli-integration-specification.md` - Integration spec
- `/Users/b.c.nims/gemini-flow/specs/mcpjam-documentation-scraped.md` - MCPJam documentation

### 14.2 Implementation Files
- `/Users/b.c.nims/gemini-flow/src/core/mcpjam-config-manager.ts` - Config manager
- `/Users/b.c.nims/gemini-flow/src/core/mcpjam-test-orchestrator.ts` - Test orchestrator
- `/Users/b.c.nims/gemini-flow/src/cli/commands/mcp.ts` - CLI commands
- `/Users/b.c.nims/gemini-flow/src/types/mcp-config.ts` - Type definitions

### 14.3 Test Pattern References
- `/Users/b.c.nims/gemini-flow/tests/security/signature-service.test.ts`
- `/Users/b.c.nims/gemini-flow/tests/security/agent-key-registry.test.ts`
- `/Users/b.c.nims/gemini-flow/tests/performance/signature-performance.test.ts`

### 14.4 External Resources
- MCPJam Documentation: https://docs.mcpjam.com/
- MCP Specification: https://modelcontextprotocol.io/
- Vitest Documentation: https://vitest.dev/

---

**END OF SPECIFICATION**
