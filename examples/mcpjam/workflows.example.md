# MCPJam Example Workflows

This document provides example workflows for common MCPJam testing scenarios.

## Workflow 1: Initial Setup and Validation

**Objective**: Set up MCPJam and validate it works correctly.

### Steps

```bash
# 1. Initialize MCPJam configuration
gemini-flow mcp evals init

# 2. Add Anthropic API key (for Claude)
gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY

# 3. Verify configuration
gemini-flow mcp evals config server list

# Expected output:
# Configured MCP Servers:
#
# sequential-thinking:
#   Command: npx -y @modelcontextprotocol/server-sequential-thinking

# 4. Run sample test
gemini-flow mcp evals run

# Expected output:
# ✓ Tests completed!
# Total Tests: 1
# Passed: 1
# Success Rate: 100.00%
```

**Success Criteria**:
- Configuration directory created
- Sample test passes
- No errors in output

---

## Workflow 2: Testing Filesystem Operations

**Objective**: Validate that LLMs correctly use filesystem MCP tools.

### Setup

```bash
# 1. Add filesystem server
gemini-flow mcp evals config server add filesystem \
  --command npx \
  --args -y @modelcontextprotocol/server-filesystem /workspace

# 2. Create test file
cat > .mcpjam/filesystem-tests.json << 'EOF'
[
  {
    "title": "List files",
    "query": "List all files in the current directory",
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["list_directory"]
  },
  {
    "title": "Search files",
    "query": "Find all TypeScript files",
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "Read file",
    "query": "Show me the contents of package.json",
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["read_file"]
  }
]
EOF

# 3. Run tests
gemini-flow mcp evals run -t filesystem-tests.json
```

**Expected Results**:
- All tests pass (3/3)
- Each test invokes expected filesystem tools
- No errors in file access

---

## Workflow 3: Cross-Provider Comparison

**Objective**: Compare how different LLM providers handle the same tasks.

### Setup

```bash
# 1. Configure multiple providers
gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
gemini-flow mcp evals config llm openai $OPENAI_API_KEY
gemini-flow mcp evals config llm gemini $GEMINI_API_KEY

# 2. Create comparison test suite
cat > .mcpjam/comparison-tests.json << 'EOF'
[
  {
    "title": "File search - Claude",
    "query": "Find all files containing 'export class'",
    "runs": 5,
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "File search - GPT-4",
    "query": "Find all files containing 'export class'",
    "runs": 5,
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["search_files"]
  },
  {
    "title": "File search - Gemini",
    "query": "Find all files containing 'export class'",
    "runs": 5,
    "model": "gemini-2.0-flash-exp",
    "provider": "gemini",
    "expectedToolCalls": ["search_files"]
  }
]
EOF

# 3. Run comparison
gemini-flow mcp evals run -t comparison-tests.json --json > comparison-results.json

# 4. Analyze results
cat comparison-results.json | jq '.results | group_by(.provider) | map({
  provider: .[0].provider,
  success_rate: (map(select(.success)) | length) / length * 100,
  avg_duration: (map(.duration) | add) / length
})'
```

**Expected Output**:
```json
[
  {
    "provider": "anthropic",
    "success_rate": 100,
    "avg_duration": 1234
  },
  {
    "provider": "openai",
    "success_rate": 100,
    "avg_duration": 1567
  },
  {
    "provider": "gemini",
    "success_rate": 100,
    "avg_duration": 456
  }
]
```

**Analysis**:
- Compare success rates across providers
- Identify fastest provider (likely Gemini Flash)
- Check consistency (runs with same provider)

---

## Workflow 4: CI/CD Integration

**Objective**: Run MCPJam tests in GitHub Actions.

### Setup

```yaml
# .github/workflows/mcpjam-tests.yml
name: MCPJam Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Gemini Flow
        run: npm install -g gemini-flow

      - name: Initialize MCPJam
        run: gemini-flow mcp evals init

      - name: Configure LLM providers
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          gemini-flow mcp evals config llm anthropic $ANTHROPIC_API_KEY
          gemini-flow mcp evals config llm openai $OPENAI_API_KEY

      - name: Add MCP servers
        run: |
          gemini-flow mcp evals config server add filesystem \
            --command npx \
            --args -y @modelcontextprotocol/server-filesystem ${{ github.workspace }}

      - name: Copy test configuration
        run: cp tests/mcpjam-ci.json .mcpjam/tests.json

      - name: Run tests
        run: gemini-flow mcp evals run --json > test-results.json

      - name: Check test results
        run: |
          PASS_RATE=$(cat test-results.json | jq '.successRate')
          if (( $(echo "$PASS_RATE < 80" | bc -l) )); then
            echo "Test pass rate $PASS_RATE% is below 80% threshold"
            exit 1
          fi

      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: mcpjam-results
          path: test-results.json

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            const body = `## MCPJam Test Results

            - **Total Tests**: ${results.totalTests}
            - **Total Runs**: ${results.totalRuns}
            - **Passed**: ${results.passed}
            - **Failed**: ${results.failed}
            - **Success Rate**: ${results.successRate.toFixed(2)}%
            - **Average Duration**: ${results.averageDuration.toFixed(0)}ms

            ${results.failed > 0 ? '⚠️ Some tests failed. Please review the results.' : '✅ All tests passed!'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

**Success Criteria**:
- Tests run on every push/PR
- Results commented on PR
- CI fails if pass rate < 80%

---

## Workflow 5: Performance Benchmarking

**Objective**: Measure and optimize LLM tool-use performance.

### Setup

```bash
# 1. Create benchmark test suite
cat > .mcpjam/benchmark-tests.json << 'EOF'
[
  {
    "title": "Benchmark: List directory (Claude)",
    "query": "List all files in src/",
    "runs": 10,
    "model": "claude-3-5-sonnet-latest",
    "provider": "anthropic",
    "expectedToolCalls": ["list_directory"],
    "temperature": 0
  },
  {
    "title": "Benchmark: List directory (GPT-4)",
    "query": "List all files in src/",
    "runs": 10,
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["list_directory"],
    "temperature": 0
  },
  {
    "title": "Benchmark: List directory (Gemini)",
    "query": "List all files in src/",
    "runs": 10,
    "model": "gemini-2.0-flash-exp",
    "provider": "gemini",
    "expectedToolCalls": ["list_directory"],
    "temperature": 0
  }
]
EOF

# 2. Run benchmarks
gemini-flow mcp evals run -t benchmark-tests.json --json > benchmark-results.json

# 3. Generate performance report
cat > analyze-benchmark.js << 'EOF'
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('benchmark-results.json'));

const grouped = results.results.reduce((acc, r) => {
  if (!acc[r.provider]) acc[r.provider] = [];
  acc[r.provider].push(r);
  return acc;
}, {});

console.log('Performance Benchmark Report');
console.log('============================\n');

for (const [provider, tests] of Object.entries(grouped)) {
  const durations = tests.map(t => t.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const stdDev = Math.sqrt(
    durations.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / durations.length
  );

  console.log(`${provider.toUpperCase()}:`);
  console.log(`  Average: ${avg.toFixed(0)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);
  console.log(`  Std Dev: ${stdDev.toFixed(0)}ms`);
  console.log(`  Success Rate: ${(tests.filter(t => t.success).length / tests.length * 100).toFixed(1)}%`);
  console.log('');
}
EOF

node analyze-benchmark.js
```

**Expected Output**:
```
Performance Benchmark Report
============================

ANTHROPIC:
  Average: 1234ms
  Min: 1050ms
  Max: 1450ms
  Std Dev: 120ms
  Success Rate: 100.0%

OPENAI:
  Average: 1567ms
  Min: 1320ms
  Max: 1890ms
  Std Dev: 180ms
  Success Rate: 100.0%

GEMINI:
  Average: 456ms
  Min: 380ms
  Max: 550ms
  Std Dev: 50ms
  Success Rate: 100.0%
```

**Analysis**:
- Identify fastest provider (Gemini Flash in this example)
- Check consistency via standard deviation
- Optimize test suite based on cost/performance tradeoff

---

## Workflow 6: Agent-Assisted Test Generation

**Objective**: Use Gemini Flow agents to generate MCPJam tests.

### Setup

```typescript
// scripts/generate-mcpjam-tests.ts
import { AgentFactory } from '../src/agents/agent-factory';
import { MCPJamConfigManager } from '../src/core/mcpjam-config-manager';

async function main() {
  const factory = new AgentFactory();
  const configManager = new MCPJamConfigManager();

  // Spawn tester agent
  const tester = await factory.createAgent({
    type: 'tester',
    capabilities: ['test-generation', 'code-analysis']
  });

  // Generate tests based on codebase analysis
  const tests = await tester.execute({
    task: 'analyze-and-generate-tests',
    context: {
      targetDirectory: 'src/core',
      targetServers: ['filesystem', 'sequential-thinking'],
      coverage: 'comprehensive',
      providers: ['anthropic', 'openai', 'gemini']
    }
  });

  // Save generated tests
  await configManager.writeTestsConfig(tests);

  console.log(`Generated ${tests.length} tests`);
  console.log('Run with: gemini-flow mcp evals run');

  await tester.shutdown();
}

main().catch(console.error);
```

```bash
# Run test generation
npx tsx scripts/generate-mcpjam-tests.ts

# Output:
# Generated 25 tests
# Run with: gemini-flow mcp evals run

# Run generated tests
gemini-flow mcp evals run
```

**Benefits**:
- Automated test creation
- Comprehensive coverage
- Agent analyzes codebase for test ideas

---

## Workflow 7: Debugging Failed Tests

**Objective**: Investigate and fix failing MCPJam tests.

### Steps

```bash
# 1. Run tests with JSON output
gemini-flow mcp evals run --json > results.json

# 2. Extract failed tests
cat results.json | jq '.results[] | select(.success == false) | {
  title: .testTitle,
  provider: .provider,
  model: .model,
  expected: .expectedToolCalls,
  actual: .actualToolCalls,
  error: .error
}'

# Output:
# {
#   "title": "Search files by content",
#   "provider": "openai",
#   "model": "gpt-4-turbo",
#   "expected": ["search_files"],
#   "actual": [],
#   "error": null
# }

# 3. Analyze the failure
# Issue: Model didn't invoke search_files tool

# 4. Test query manually with more explicit instruction
cat > .mcpjam/debug-test.json << 'EOF'
[
  {
    "title": "Search files (explicit)",
    "query": "Use the search_files tool to find all TypeScript files containing 'MCPJam'",
    "model": "gpt-4-turbo",
    "provider": "openai",
    "expectedToolCalls": ["search_files"],
    "temperature": 0
  }
]
EOF

gemini-flow mcp evals run -t debug-test.json

# 5. If still fails, verify MCP server provides tool
gemini-flow mcp list

# 6. Check server logs
DEBUG=mcp:* gemini-flow mcp evals run -t debug-test.json
```

**Common Issues**:
- Query not explicit enough about needing tools
- MCP server not providing expected tool
- Model doesn't support tool calling
- Tool name mismatch between expected and actual

---

## Workflow 8: Cost Optimization

**Objective**: Minimize API costs while maintaining test coverage.

### Analysis

```bash
# 1. Run tests with multiple providers
gemini-flow mcp evals run --json > full-results.json

# 2. Calculate costs (approximate)
cat > calculate-costs.js << 'EOF'
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('full-results.json'));

// Approximate costs per 1M tokens (as of Jan 2025)
const costs = {
  'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 }
};

let totalCost = 0;
const costByProvider = {};

results.results.forEach(r => {
  // Estimate tokens (very rough)
  const inputTokens = r.query.split(' ').length * 1.3;
  const outputTokens = (r.response?.split(' ').length || 100) * 1.3;

  const modelCosts = costs[r.model] || { input: 1, output: 3 };
  const testCost = (inputTokens / 1000000 * modelCosts.input) +
                   (outputTokens / 1000000 * modelCosts.output);

  totalCost += testCost;
  costByProvider[r.provider] = (costByProvider[r.provider] || 0) + testCost;
});

console.log('Cost Analysis');
console.log('=============\n');
console.log(`Total Cost: $${totalCost.toFixed(4)}`);
console.log('\nBy Provider:');
for (const [provider, cost] of Object.entries(costByProvider)) {
  const pct = (cost / totalCost * 100).toFixed(1);
  console.log(`  ${provider}: $${cost.toFixed(4)} (${pct}%)`);
}
EOF

node calculate-costs.js

# Output:
# Cost Analysis
# =============
#
# Total Cost: $0.1234
#
# By Provider:
#   anthropic: $0.0567 (45.9%)
#   openai: $0.0621 (50.3%)
#   gemini: $0.0046 (3.7%)
```

**Optimization Strategy**:
1. Use Gemini Flash for simple, repetitive tests (97% cost savings)
2. Use Claude Sonnet for complex reasoning (best accuracy)
3. Use GPT-4 Turbo only when necessary (highest cost)
4. Reduce `runs` for expensive models
5. Optimize `maxTokens` to minimum required

---

## Additional Resources

- **MCPJam User Guide**: `docs/api/mcpjam-user-guide.md`
- **MCPJam Integration**: `docs/mcp-mcpjam-integration.md`
- **Example Configurations**: `examples/mcpjam/`
- **GitHub Issues**: https://github.com/clduab11/gemini-flow/issues

---

**Last Updated**: 2025-10-07
