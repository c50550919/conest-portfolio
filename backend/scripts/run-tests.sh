#!/bin/bash

# CoNest/SafeNest Test Runner Script
# Runs all test suites with coverage and generates reports

set -e

echo "🧪 CoNest/SafeNest Test Runner"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
COVERAGE=false
WATCH=false
SUITE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --suite)
            SUITE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: ./run-tests.sh [--coverage] [--watch] [--suite <suite-name>]"
            echo "Suites: all, unit, integration, e2e, compliance, security"
            exit 1
            ;;
    esac
done

# Start time
START_TIME=$(date +%s)

echo -e "\n${BLUE}Test Configuration:${NC}"
echo "  Suite: $SUITE"
echo "  Coverage: $COVERAGE"
echo "  Watch: $WATCH"

# Run linting first
echo -e "\n${YELLOW}1. Running Linter...${NC}"
npm run lint || {
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Linting passed${NC}"

# Run format check
echo -e "\n${YELLOW}2. Checking Code Format...${NC}"
npm run format:check || {
    echo -e "${RED}❌ Format check failed${NC}"
    echo -e "${YELLOW}Run 'npm run format' to fix formatting issues${NC}"
    exit 1
}
echo -e "${GREEN}✅ Format check passed${NC}"

# Determine test command
TEST_CMD="npm test"

if [ "$WATCH" = true ]; then
    TEST_CMD="npm run test:watch"
elif [ "$COVERAGE" = true ]; then
    TEST_CMD="npm run test:coverage"
fi

# Add suite-specific filter
case $SUITE in
    "unit")
        TEST_CMD="$TEST_CMD -- __tests__/unit"
        ;;
    "integration")
        TEST_CMD="$TEST_CMD -- __tests__/integration"
        ;;
    "e2e")
        TEST_CMD="$TEST_CMD -- __tests__/e2e"
        ;;
    "compliance")
        TEST_CMD="$TEST_CMD -- __tests__/compliance"
        ;;
    "security")
        TEST_CMD="npm run test:security"
        ;;
    "all")
        # Run all suites
        ;;
    *)
        echo -e "${RED}Unknown test suite: $SUITE${NC}"
        exit 1
        ;;
esac

# Run tests
echo -e "\n${YELLOW}3. Running Tests ($SUITE)...${NC}"
eval $TEST_CMD || {
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Tests passed${NC}"

# Run security audit if not in watch mode
if [ "$WATCH" = false ]; then
    echo -e "\n${YELLOW}4. Running Security Audit...${NC}"
    npm audit --audit-level=moderate || {
        echo -e "${YELLOW}⚠️  Security vulnerabilities found${NC}"
        echo -e "${YELLOW}Run 'npm audit fix' to resolve${NC}"
    }
fi

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All checks completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}Duration: ${DURATION}s${NC}"

# Show coverage report location if coverage was run
if [ "$COVERAGE" = true ]; then
    echo -e "\n${YELLOW}Coverage Report:${NC}"
    echo "  HTML: coverage/lcov-report/index.html"
    echo "  JSON: coverage/coverage-final.json"
    echo -e "\n${YELLOW}Open coverage report:${NC}"
    echo "  open coverage/lcov-report/index.html"
fi

echo -e "\n${YELLOW}Test Results Summary:${NC}"
if [ "$COVERAGE" = true ]; then
    echo "  View detailed coverage in coverage/lcov-report/index.html"
fi

exit 0
