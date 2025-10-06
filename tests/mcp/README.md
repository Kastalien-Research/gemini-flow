# MCP Conformance Test Suite

Comprehensive test suite for validating Model Context Protocol (MCP) compliance in Gemini Flow.

## Overview

This test suite validates MCP protocol implementation across all core primitives and features:

- **Transport Layer**: stdio and HTTP transports, connection lifecycle, error handling
- **Tools Protocol**: tools/list, tools/call, schema validation, multi-part responses
- **Prompts Protocol**: prompts/list, prompts/get, template arguments
- **Resources Protocol**: resources/list, resources/read, subscriptions, MIME types
- **Authentication**: OAuth 2.0, token management, discovery
- **Integration**: End-to-end workflows, multi-server coordination

## Test Structure

```
tests/mcp/
├── jest.config.ts              # Jest configuration
├── setup/
│   └── test-setup.ts           # Global test setup and custom matchers
├── fixtures/
│   ├── mock-mcp-server.ts      # Mock MCP server implementation
│   └── test-data.ts            # Test data and constants
├── transport/
│   └── stdio-transport.test.ts # Stdio transport tests
├── protocol/
│   ├── tools.test.ts           # Tools protocol tests
│   ├── prompts.test.ts         # Prompts protocol tests
│   └── resources.test.ts       # Resources protocol tests
├── auth/
│   └── oauth.test.ts           # OAuth authentication tests
└── integration/
    └── end-to-end.test.ts      # End-to-end workflow tests
```

## Running Tests

### Run All MCP Tests

```bash
npm run test:mcp
```

### Run Specific Test Suites

```bash
# Transport tests only
npm run test:mcp:transport

# Protocol tests only
npm run test:mcp:protocol

# Authentication tests only
npm run test:mcp:auth

# Integration tests only
npm run test:mcp:integration
```

### Run with Coverage

```bash
npm run test:mcp:coverage
```

### Watch Mode

```bash
npm run test:mcp:watch
```

## Test Coverage Goals

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

## Custom Matchers

The test suite includes custom Jest matchers for MCP-specific assertions:

```typescript
// Validate MCP response structure
expect(response).toBeValidMCPResponse();

// Check for MCP error format
expect(errorResponse).toHaveMCPError();

// Match JSON schema structure
expect(toolSchema).toMatchMCPSchema(expectedSchema);
```

## Test Data

All test data and fixtures are centralized in `fixtures/test-data.ts`:

- `MOCK_TOOLS`: Sample tool definitions
- `MOCK_PROMPTS`: Sample prompt configurations
- `MOCK_RESOURCES`: Sample resource definitions
- `MOCK_SERVER_CONFIGS`: Server connection configurations
- `MOCK_OAUTH_CONFIG`: OAuth authentication settings
- `MOCK_TOKENS`: Sample OAuth tokens
- `MCP_ERROR_CODES`: Standard JSON-RPC error codes

## Mock Server

The test suite includes a fully-functional mock MCP server (`fixtures/mock-mcp-server.ts`) that can be configured for different test scenarios:

```typescript
import { MockMCPServer } from './fixtures/mock-mcp-server';

// Create server with tools
const server = new MockMCPServer({
  tools: [
    {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: { type: 'object', properties: {} },
      handler: async (args) => 'result',
    },
  ],
});

await server.connect();
```

## Test Categories

### 1. Transport Tests

**File**: `transport/stdio-transport.test.ts`

Tests for stdio transport including:
- Connection lifecycle
- Process management
- Environment variable substitution
- Error handling
- Graceful shutdown

**Current Status**: ⚠️ Partial - Tests framework in place, needs integration with actual mock servers

### 2. Tools Protocol Tests

**File**: `protocol/tools.test.ts`

Tests for tools protocol including:
- Tool discovery (tools/list)
- Tool invocation (tools/call)
- JSON Schema validation
- Multi-part responses (text, images, resources)
- Error handling
- Tool filtering and conflict resolution

**Current Status**: ✅ Complete - All test cases implemented

### 3. Prompts Protocol Tests

**File**: `protocol/prompts.test.ts`

Tests for prompts protocol including:
- Prompt discovery (prompts/list)
- Prompt retrieval (prompts/get)
- Template argument handling
- Slash command integration
- Server-side substitution

**Current Status**: ✅ Complete - All test cases implemented

### 4. Resources Protocol Tests

**File**: `protocol/resources.test.ts`

Tests for resources protocol including:
- Resource discovery (resources/list)
- Resource reading (resources/read)
- URI templates
- Resource subscriptions
- MIME type handling
- Text and binary resources

**Current Status**: ✅ Complete - All test cases implemented

### 5. Authentication Tests

**File**: `auth/oauth.test.ts`

Tests for OAuth 2.0 authentication including:
- OAuth discovery
- Authorization code flow
- Token management
- Token refresh
- Security best practices

**Current Status**: ✅ Complete - All test cases implemented

### 6. Integration Tests

**File**: `integration/end-to-end.test.ts`

Tests for complete workflows including:
- Multi-server coordination
- Tool chaining
- Resource and tool integration
- Error recovery
- Performance under load
- Real-world scenarios

**Current Status**: ✅ Complete - All test cases implemented

## Known Gaps and Future Work

Based on the MCP Feature Gap Analysis, the following areas need implementation:

### High Priority

1. **Resources Protocol** ❌
   - Not implemented in Gemini Flow
   - Tests are complete but need actual implementation
   - Recommendation: Implement resources/list and resources/read

2. **HTTP Transport** ❌
   - Streamable HTTP not implemented
   - Tests need to be added once implementation exists
   - Note: Skip deprecated SSE transport

3. **Sampling Protocol** ❌
   - Not implemented in Gemini Flow or Gemini CLI
   - Tests not yet created
   - Lower priority for most use cases

### Medium Priority

4. **Roots Protocol** ⚠️
   - Partially referenced but not implemented
   - Tests not yet created
   - Important for security boundaries

5. **Elicitation Protocol** ❌
   - Not implemented
   - Tests not yet created
   - Useful for interactive workflows

## Running Against Real MCP Servers

To test against real MCP servers instead of mocks:

1. Install reference MCP servers:
```bash
npm install -D @modelcontextprotocol/server-filesystem
npm install -D @modelcontextprotocol/server-memory
```

2. Configure test environment:
```bash
export MCP_TEST_MODE=real
export MCP_SERVER_PATH=/path/to/server
```

3. Run tests:
```bash
npm run test:mcp:real
```

## Contributing

When adding new tests:

1. Follow existing test structure and naming conventions
2. Add test data to `fixtures/test-data.ts`
3. Use custom matchers for MCP-specific assertions
4. Include both positive and negative test cases
5. Test error handling and edge cases
6. Update this README with new test categories

## References

- [MCP Specification](https://modelcontextprotocol.io/docs/)
- [MCP Feature Gap Analysis](../../MCP_FEATURE_GAP_ANALYSIS.md)
- [Gemini Flow MCP Implementation](../../src/mcp/)
- [Jest Documentation](https://jestjs.io/)

## Test Results

Test results are stored in coordination memory for multi-agent workflows:

- `testing/conformance/transports` - Transport test results
- `testing/conformance/tools` - Tools protocol results
- `testing/conformance/prompts` - Prompts protocol results
- `testing/conformance/resources` - Resources protocol results
- `testing/conformance/oauth` - OAuth authentication results

## Support

For issues or questions about the test suite:

1. Check the [MCP Feature Gap Analysis](../../MCP_FEATURE_GAP_ANALYSIS.md)
2. Review test output and coverage reports
3. File an issue on GitHub

---

**Last Updated**: October 6, 2025
**Test Suite Version**: 1.0.0
**MCP SDK Version**: 1.18.0
