#!/usr/bin/env bash

# MCP Conformance Test Runner
# Runs MCP protocol tests with coverage and memory coordination

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="${PROJECT_ROOT}/tests/mcp"
COVERAGE_DIR="${PROJECT_ROOT}/coverage/mcp"
RESULTS_FILE="${PROJECT_ROOT}/test-results-mcp.json"

# Test suites
TRANSPORT_TESTS="${TEST_DIR}/transport/**/*.test.ts"
PROTOCOL_TESTS="${TEST_DIR}/protocol/**/*.test.ts"
AUTH_TESTS="${TEST_DIR}/auth/**/*.test.ts"
INTEGRATION_TESTS="${TEST_DIR}/integration/**/*.test.ts"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    MCP Conformance Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Function to store results in memory
store_results() {
    local category=$1
    local results=$2

    if command -v npx &> /dev/null && [ -f "${PROJECT_ROOT}/node_modules/.bin/claude-flow" ]; then
        echo -e "${YELLOW}Storing results in coordination memory...${NC}"
        npx claude-flow@alpha hooks post-task \
            --task-id "mcp-test-${category}" \
            --memory-key "testing/conformance/${category}" \
            --data "${results}" || true
    fi
}

# Function to run test suite
run_suite() {
    local name=$1
    local pattern=$2
    local category=$3

    echo -e "${BLUE}Running ${name} tests...${NC}"

    if npx jest --config="${TEST_DIR}/jest.config.ts" \
        --testMatch="${pattern}" \
        --coverage \
        --coverageDirectory="${COVERAGE_DIR}/${category}" \
        --json --outputFile="${COVERAGE_DIR}/${category}/results.json" \
        --passWithNoTests; then

        echo -e "${GREEN}✓ ${name} tests passed${NC}"

        # Store results in memory
        if [ -f "${COVERAGE_DIR}/${category}/results.json" ]; then
            store_results "${category}" "$(cat "${COVERAGE_DIR}/${category}/results.json")"
        fi

        return 0
    else
        echo -e "${RED}✗ ${name} tests failed${NC}"
        return 1
    fi
}

# Parse arguments
SUITE=${1:-all}
WATCH_MODE=${2:-}

case "$SUITE" in
    all)
        echo -e "${YELLOW}Running all MCP conformance tests...${NC}"
        echo ""

        # Create coverage directory
        mkdir -p "${COVERAGE_DIR}"

        # Run all test suites
        FAILED=0

        run_suite "Transport" "${TRANSPORT_TESTS}" "transports" || FAILED=$((FAILED + 1))
        echo ""

        run_suite "Protocol" "${PROTOCOL_TESTS}" "tools,prompts,resources" || FAILED=$((FAILED + 1))
        echo ""

        run_suite "Authentication" "${AUTH_TESTS}" "oauth" || FAILED=$((FAILED + 1))
        echo ""

        run_suite "Integration" "${INTEGRATION_TESTS}" "integration" || FAILED=$((FAILED + 1))
        echo ""

        # Generate combined coverage report
        echo -e "${BLUE}Generating coverage report...${NC}"
        npx jest --config="${TEST_DIR}/jest.config.ts" \
            --coverage \
            --coverageDirectory="${COVERAGE_DIR}" \
            --testMatch="${TEST_DIR}/**/*.test.ts" \
            --passWithNoTests || true

        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

        if [ $FAILED -eq 0 ]; then
            echo -e "${GREEN}All test suites passed!${NC}"
            echo -e "${GREEN}Coverage report: ${COVERAGE_DIR}/index.html${NC}"
            exit 0
        else
            echo -e "${RED}${FAILED} test suite(s) failed${NC}"
            exit 1
        fi
        ;;

    transport)
        run_suite "Transport" "${TRANSPORT_TESTS}" "transports"
        ;;

    protocol)
        run_suite "Protocol" "${PROTOCOL_TESTS}" "tools,prompts,resources"
        ;;

    auth)
        run_suite "Authentication" "${AUTH_TESTS}" "oauth"
        ;;

    integration)
        run_suite "Integration" "${INTEGRATION_TESTS}" "integration"
        ;;

    watch)
        echo -e "${YELLOW}Running tests in watch mode...${NC}"
        npx jest --config="${TEST_DIR}/jest.config.ts" \
            --watch \
            --coverage=false \
            --verbose
        ;;

    coverage)
        echo -e "${YELLOW}Running all tests with detailed coverage...${NC}"
        npx jest --config="${TEST_DIR}/jest.config.ts" \
            --coverage \
            --coverageDirectory="${COVERAGE_DIR}" \
            --verbose

        echo ""
        echo -e "${GREEN}Coverage report: ${COVERAGE_DIR}/index.html${NC}"

        # Open coverage report if on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "${COVERAGE_DIR}/index.html"
        fi
        ;;

    *)
        echo -e "${RED}Unknown test suite: $SUITE${NC}"
        echo ""
        echo "Usage: $0 [suite] [options]"
        echo ""
        echo "Suites:"
        echo "  all         - Run all test suites (default)"
        echo "  transport   - Run transport layer tests"
        echo "  protocol    - Run protocol tests (tools, prompts, resources)"
        echo "  auth        - Run authentication tests"
        echo "  integration - Run integration tests"
        echo "  watch       - Run tests in watch mode"
        echo "  coverage    - Generate detailed coverage report"
        echo ""
        echo "Examples:"
        echo "  $0 all"
        echo "  $0 protocol"
        echo "  $0 watch"
        exit 1
        ;;
esac
