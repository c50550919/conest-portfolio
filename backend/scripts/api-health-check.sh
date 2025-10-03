#!/bin/bash

# CoNest/SafeNest API Health Check Script
# Verifies all endpoints are accessible and responding

set -e

echo "🏥 CoNest/SafeNest API Health Check"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TIMEOUT=5

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Check if server is running
echo -e "\n${YELLOW}Checking if server is running...${NC}"
if ! curl -s -f -m $TIMEOUT "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not responding at ${API_URL}${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

# Function to check endpoint
check_endpoint() {
    local method=$1
    local path=$2
    local expected_status=$3
    local description=$4

    TOTAL=$((TOTAL + 1))

    # Make request
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" -X $method -m $TIMEOUT "${API_URL}${path}")

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅${NC} $method $path (${status_code}) - $description"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌${NC} $method $path (Expected: ${expected_status}, Got: ${status_code}) - $description"
        FAILED=$((FAILED + 1))
    fi
}

# Public Endpoints (No Auth Required)
echo -e "\n${YELLOW}Public Endpoints:${NC}"
check_endpoint "GET" "/health" "200" "Health check"
check_endpoint "POST" "/api/auth/register" "400" "Register (without body)"
check_endpoint "POST" "/api/auth/login" "400" "Login (without credentials)"
check_endpoint "POST" "/api/auth/refresh" "400" "Refresh token (without token)"

# Protected Endpoints (Auth Required - Should return 401)
echo -e "\n${YELLOW}Protected Endpoints (Auth Required):${NC}"
check_endpoint "GET" "/api/profiles" "401" "Get profiles"
check_endpoint "POST" "/api/profiles" "401" "Create profile"
check_endpoint "GET" "/api/matches/potential" "401" "Get potential matches"
check_endpoint "GET" "/api/matches" "401" "Get my matches"
check_endpoint "POST" "/api/matches/interest" "401" "Express interest"
check_endpoint "GET" "/api/conversations" "401" "Get conversations"
check_endpoint "POST" "/api/conversations" "401" "Create conversation"
check_endpoint "GET" "/api/households" "401" "Get households"
check_endpoint "POST" "/api/households" "401" "Create household"
check_endpoint "GET" "/api/verifications" "401" "Get verifications"
check_endpoint "GET" "/api/payments" "401" "Get payments"

# Non-existent Endpoints (Should return 404)
echo -e "\n${YELLOW}Non-existent Endpoints (404):${NC}"
check_endpoint "GET" "/api/children" "404" "Children endpoint (should not exist)"
check_endpoint "GET" "/api/child-profiles" "404" "Child profiles (should not exist)"
check_endpoint "GET" "/api/kids" "404" "Kids endpoint (should not exist)"

# Test with authentication (if test user credentials available)
if [ ! -z "$TEST_EMAIL" ] && [ ! -z "$TEST_PASSWORD" ]; then
    echo -e "\n${YELLOW}Authenticated Endpoints:${NC}"

    # Login to get token
    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

    if [ ! -z "$ACCESS_TOKEN" ]; then
        echo -e "${GREEN}✅ Authentication successful${NC}"

        # Test authenticated endpoints
        AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

        TOTAL=$((TOTAL + 1))
        profile_status=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/api/profiles" -H "$AUTH_HEADER")
        if [ "$profile_status" = "200" ]; then
            echo -e "${GREEN}✅${NC} GET /api/profiles (${profile_status}) - Get profiles (authenticated)"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌${NC} GET /api/profiles (${profile_status}) - Get profiles (authenticated)"
            FAILED=$((FAILED + 1))
        fi

        TOTAL=$((TOTAL + 1))
        matches_status=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_URL}/api/matches/potential" -H "$AUTH_HEADER")
        if [ "$matches_status" = "200" ]; then
            echo -e "${GREEN}✅${NC} GET /api/matches/potential (${matches_status}) - Get potential matches (authenticated)"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌${NC} GET /api/matches/potential (${matches_status}) - Get potential matches (authenticated)"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Could not authenticate with test credentials${NC}"
    fi
else
    echo -e "\n${YELLOW}⚠️  Set TEST_EMAIL and TEST_PASSWORD to test authenticated endpoints${NC}"
fi

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Health Check Summary:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "Total Endpoints Checked: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

# Calculate success rate
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: ${SUCCESS_RATE}%"

    if [ $SUCCESS_RATE -ge 95 ]; then
        echo -e "\n${GREEN}✅ All systems operational!${NC}"
        exit 0
    elif [ $SUCCESS_RATE -ge 80 ]; then
        echo -e "\n${YELLOW}⚠️  Some issues detected${NC}"
        exit 1
    else
        echo -e "\n${RED}❌ Critical issues detected${NC}"
        exit 1
    fi
fi

exit 0
