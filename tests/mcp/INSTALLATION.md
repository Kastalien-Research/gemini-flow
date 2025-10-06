# MCP Test Suite Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install Jest and TypeScript testing dependencies
npm install --save-dev \
  jest \
  @jest/globals \
  @jest/types \
  ts-jest \
  @types/jest

# MCP SDK should already be in dependencies
# If not, install it:
npm install @modelcontextprotocol/sdk
```

### 2. Verify Installation

```bash
# Check that test runner is executable
ls -la tests/mcp/run-tests.sh

# If not executable, run:
chmod +x tests/mcp/run-tests.sh
```

### 3. Run Tests

```bash
# Run all MCP conformance tests
npm run test:mcp

# Or run specific suites
npm run test:mcp:protocol
npm run test:mcp:transport
npm run test:mcp:auth
npm run test:mcp:integration
```

## Detailed Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- TypeScript >= 5.2.2
- @modelcontextprotocol/sdk >= 1.18.0

### Package Installation

The following packages are required for running the MCP test suite:

#### Core Testing
- `jest` - JavaScript testing framework
- `@jest/globals` - Jest global APIs
- `@jest/types` - TypeScript types for Jest
- `ts-jest` - TypeScript preprocessor for Jest
- `@types/jest` - Jest type definitions

#### Already Installed (Dependencies)
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

### Installation Command

```bash
npm install --save-dev jest@^29.0.0 @jest/globals@^29.0.0 @jest/types@^29.0.0 ts-jest@^29.0.0 @types/jest@^29.0.0
```

### Configuration Verification

After installation, verify the test configuration:

```bash
# Check Jest config
cat tests/mcp/jest.config.ts

# Check TypeScript config
cat tsconfig.json
```

## Project Structure

After installation, you should have:

```
gemini-flow/
├── package.json               # Updated with test:mcp* scripts
├── node_modules/
│   ├── jest/
│   ├── ts-jest/
│   └── @modelcontextprotocol/sdk/
├── tests/mcp/
│   ├── jest.config.ts         # Jest configuration
│   ├── run-tests.sh          # Test runner script (executable)
│   ├── README.md             # Test documentation
│   ├── TESTING_REPORT.md     # Detailed test report
│   ├── INSTALLATION.md       # This file
│   ├── setup/
│   │   └── test-setup.ts     # Global setup and matchers
│   ├── fixtures/
│   │   ├── mock-mcp-server.ts # Mock server implementation
│   │   └── test-data.ts      # Test data and constants
│   ├── transport/
│   │   └── stdio-transport.test.ts
│   ├── protocol/
│   │   ├── tools.test.ts
│   │   ├── prompts.test.ts
│   │   └── resources.test.ts
│   ├── auth/
│   │   └── oauth.test.ts
│   └── integration/
│       └── end-to-end.test.ts
└── coverage/mcp/              # Created after running tests with coverage
```

## Troubleshooting

### Issue: "Command not found: jest"

**Solution**: Make sure Jest is installed in devDependencies:
```bash
npm install --save-dev jest
```

### Issue: "Cannot find module '@jest/globals'"

**Solution**: Install Jest globals:
```bash
npm install --save-dev @jest/globals
```

### Issue: "ts-jest[config] (WARN) Unable to locate tsconfig"

**Solution**: Ensure tsconfig.json exists in project root and jest.config.ts points to it correctly.

### Issue: "run-tests.sh: Permission denied"

**Solution**: Make the script executable:
```bash
chmod +x tests/mcp/run-tests.sh
```

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution**: The MCP SDK should already be installed. Verify:
```bash
npm ls @modelcontextprotocol/sdk
```

If not found, install it:
```bash
npm install @modelcontextprotocol/sdk
```

### Issue: Tests timeout

**Solution**: Some tests may take longer to execute. The timeout is set to 30 seconds by default in jest.config.ts. You can increase it if needed:

```typescript
// In jest.config.ts
testTimeout: 60000, // Increase to 60 seconds
```

### Issue: Memory coordination warnings

**Solution**: Memory coordination is optional. If you see warnings about Claude Flow hooks, it means the coordination features are not available. Tests will still run successfully without them.

## Running in CI/CD

### GitHub Actions Example

```yaml
name: MCP Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:mcp:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/mcp/lcov.info
```

### GitLab CI Example

```yaml
test:mcp:
  image: node:18
  script:
    - npm ci
    - npm run test:mcp:coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/mcp/cobertura-coverage.xml
```

## Development Workflow

### 1. Watch Mode for TDD

```bash
npm run test:mcp:watch
```

This runs tests in watch mode, re-running them when files change. Perfect for test-driven development.

### 2. Run Specific Test Files

```bash
# Run only transport tests
npm run test:mcp:transport

# Run only tools protocol tests
npx jest tests/mcp/protocol/tools.test.ts
```

### 3. Update Snapshots

If tests use snapshots (not currently implemented):

```bash
npx jest --updateSnapshot
```

### 4. Debug Tests

```bash
# Run with verbose output
npx jest --verbose

# Run with node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/mcp/index.html` (open in browser)
- **LCOV**: `coverage/mcp/lcov.info` (for tools like Codecov)
- **JSON**: `coverage/mcp/coverage-final.json`
- **Text**: Displayed in terminal after test run

### View HTML Coverage Report

```bash
# Generate coverage
npm run test:mcp:coverage

# Open in browser (macOS)
open coverage/mcp/index.html

# Open in browser (Linux)
xdg-open coverage/mcp/index.html

# Open in browser (Windows)
start coverage/mcp/index.html
```

## Environment Variables

The test suite supports these environment variables:

- `NODE_ENV=test` - Set automatically by test runner
- `MCP_TEST_MODE=real` - Use real MCP servers instead of mocks (future feature)
- `MCP_SERVER_PATH=/path/to/server` - Path to MCP server for integration tests

## Next Steps

1. **Run tests**: `npm run test:mcp`
2. **Review coverage**: Open `coverage/mcp/index.html`
3. **Read documentation**: Check `tests/mcp/README.md`
4. **Review test report**: Read `tests/mcp/TESTING_REPORT.md`
5. **Start implementing**: Use failing tests as requirements

## Support

For questions or issues:

1. Check this installation guide
2. Review `tests/mcp/README.md`
3. Check Jest documentation: https://jestjs.io/
4. Check MCP specification: https://modelcontextprotocol.io/

---

**Last Updated**: October 6, 2025
**Test Suite Version**: 1.0.0
**Minimum Node Version**: 18.0.0
