#!/bin/bash

# MCPJam Integration Test Runner
# Runs conformance tests using MCPJam inspector and cli

set -e

echo "🧪 MCPJam MCP Conformance Testing Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MCPJam is installed
if ! command -v mcpjam &> /dev/null; then
    echo -e "${RED}❌ MCPJam CLI not found${NC}"
    echo "Install with: npm install -g @mcpjam/cli"
    exit 1
fi

echo -e "${GREEN}✓${NC} MCPJam CLI found"

# Check if cli is available
if ! npm list -g @mcpjam/cli &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  @mcpjam/cli not found globally, will use npx"
fi

echo ""
echo "📋 Test Plan:"
echo "  1. MCPJam Inspector Integration"
echo "  2. Protocol Conformance Tests (cli)"
echo "  3. Real MCP Server Integration"
echo "  4. Performance Benchmarks"
echo ""

# Build the project first
echo "🔨 Building Gemini Flow..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Build complete"
echo ""

# Run Jest integration tests
echo "🧪 Running MCPJam Integration Tests..."
npm run test:mcp:integration -- --testPathPattern=mcpjam

# Store exit code
JEST_EXIT=$?

if [ $JEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Jest integration tests passed"
else
    echo -e "${RED}✗${NC} Jest integration tests failed"
fi

echo ""

# Run MCPJam conformance tests
echo "🔍 Running MCPJam Conformance Tests..."

# Test 1: Tools Protocol
echo "  Testing tools protocol..."
npx @mcpjam/cli test --suite tools --config tests/mcp/config/eval-config.json 2>&1 | tee /tmp/mcpjam-tools.log
TOOLS_EXIT=${PIPESTATUS[0]}

if [ $TOOLS_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Tools protocol conformance passed"
else
    echo -e "  ${RED}✗${NC} Tools protocol conformance failed"
fi

# Test 2: Prompts Protocol
echo "  Testing prompts protocol..."
npx @mcpjam/cli test --suite prompts --config tests/mcp/config/eval-config.json 2>&1 | tee /tmp/mcpjam-prompts.log
PROMPTS_EXIT=${PIPESTATUS[0]}

if [ $PROMPTS_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Prompts protocol conformance passed"
else
    echo -e "  ${RED}✗${NC} Prompts protocol conformance failed"
fi

# Test 3: Resources Protocol
echo "  Testing resources protocol..."
npx @mcpjam/cli test --suite resources --config tests/mcp/config/eval-config.json 2>&1 | tee /tmp/mcpjam-resources.log
RESOURCES_EXIT=${PIPESTATUS[0]}

if [ $RESOURCES_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Resources protocol conformance passed"
else
    echo -e "  ${RED}✗${NC} Resources protocol conformance failed"
fi

# Test 4: Transports
echo "  Testing transports..."
npx @mcpjam/cli test --suite transports --config tests/mcp/config/eval-config.json 2>&1 | tee /tmp/mcpjam-transports.log
TRANSPORTS_EXIT=${PIPESTATUS[0]}

if [ $TRANSPORTS_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Transports conformance passed"
else
    echo -e "  ${RED}✗${NC} Transports conformance failed"
fi

echo ""

# Run Performance Benchmarks
echo "⚡ Running Performance Benchmarks..."
npx @mcpjam/cli benchmark --config tests/mcp/config/eval-config.json 2>&1 | tee /tmp/mcpjam-bench.log
BENCH_EXIT=${PIPESTATUS[0]}

if [ $BENCH_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Performance benchmarks complete"
else
    echo -e "${YELLOW}⚠${NC}  Performance benchmarks had warnings"
fi

echo ""
echo "========================================"
echo "📊 Test Results Summary"
echo "========================================"
echo ""

# Calculate total
TOTAL=0
PASSED=0

# Jest tests
TOTAL=$((TOTAL + 1))
[ $JEST_EXIT -eq 0 ] && PASSED=$((PASSED + 1))

# Conformance tests
TOTAL=$((TOTAL + 4))
[ $TOOLS_EXIT -eq 0 ] && PASSED=$((PASSED + 1))
[ $PROMPTS_EXIT -eq 0 ] && PASSED=$((PASSED + 1))
[ $RESOURCES_EXIT -eq 0 ] && PASSED=$((PASSED + 1))
[ $TRANSPORTS_EXIT -eq 0 ] && PASSED=$((PASSED + 1))

echo "Test Suites:"
echo "  Jest Integration:      $([ $JEST_EXIT -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo "  Tools Protocol:        $([ $TOOLS_EXIT -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo "  Prompts Protocol:      $([ $PROMPTS_EXIT -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo "  Resources Protocol:    $([ $RESOURCES_EXIT -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo "  Transports:            $([ $TRANSPORTS_EXIT -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo ""
echo "Total: $PASSED/$TOTAL suites passed"
echo ""

# Detailed logs
echo "📄 Detailed logs available at:"
echo "  - /tmp/mcpjam-tools.log"
echo "  - /tmp/mcpjam-prompts.log"
echo "  - /tmp/mcpjam-resources.log"
echo "  - /tmp/mcpjam-transports.log"
echo "  - /tmp/mcpjam-bench.log"
echo ""

# Exit with failure if any tests failed
if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}✅ All conformance tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some conformance tests failed${NC}"
    exit 1
fi
