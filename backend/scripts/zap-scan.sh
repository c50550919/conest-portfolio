#!/bin/bash

# OWASP ZAP Automated API Scan for CoNest Backend
# Usage: ./scripts/zap-scan.sh

set -e

# Configuration
ZAP_PORT=8090
API_URL="http://localhost:3001"
ZAP_API_KEY="change-me-in-production"
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CoNest Security Scan with OWASP ZAP${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 1: Check if backend is running
echo -e "\n${YELLOW}[1/6] Checking if backend is running...${NC}"
if ! curl -s http://localhost:3001/api/health > /dev/null; then
  echo -e "${RED}❌ Backend not running. Start with: npm run dev${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Step 2: Start ZAP daemon
echo -e "\n${YELLOW}[2/6] Starting OWASP ZAP daemon...${NC}"
zap.sh -daemon -port $ZAP_PORT -config api.key=$ZAP_API_KEY &
ZAP_PID=$!
sleep 15  # Wait for ZAP to start
echo -e "${GREEN}✅ ZAP daemon started (PID: $ZAP_PID)${NC}"

# Step 3: Wait for ZAP to be ready
echo -e "\n${YELLOW}[3/6] Waiting for ZAP to be ready...${NC}"
RETRY_COUNT=0
MAX_RETRIES=30
until curl -s "http://localhost:$ZAP_PORT" > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}❌ ZAP failed to start after ${MAX_RETRIES} attempts${NC}"
    exit 1
  fi
  echo "Waiting for ZAP... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done
echo -e "${GREEN}✅ ZAP is ready${NC}"

# Step 4: Spider the API (discover endpoints)
echo -e "\n${YELLOW}[4/6] Spidering API to discover endpoints...${NC}"
SPIDER_SCAN_ID=$(curl -s "http://localhost:$ZAP_PORT/JSON/spider/action/scan/?apikey=$ZAP_API_KEY&url=$API_URL&maxChildren=10" | jq -r '.scan')
echo "Spider scan ID: $SPIDER_SCAN_ID"

# Wait for spider to complete
while [ "$(curl -s "http://localhost:$ZAP_PORT/JSON/spider/view/status/?apikey=$ZAP_API_KEY&scanId=$SPIDER_SCAN_ID" | jq -r '.status')" != "100" ]; do
  PROGRESS=$(curl -s "http://localhost:$ZAP_PORT/JSON/spider/view/status/?apikey=$ZAP_API_KEY&scanId=$SPIDER_SCAN_ID" | jq -r '.status')
  echo "Spider progress: $PROGRESS%"
  sleep 2
done
echo -e "${GREEN}✅ Spider scan complete${NC}"

# Step 5: Run active scan (attack)
echo -e "\n${YELLOW}[5/6] Running active security scan...${NC}"
echo -e "${RED}⚠️  This will send attack payloads. Use only on dev/test!${NC}"
ACTIVE_SCAN_ID=$(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/action/scan/?apikey=$ZAP_API_KEY&url=$API_URL&recurse=true&inScopeOnly=false&scanPolicyName=Default%20Policy" | jq -r '.scan')
echo "Active scan ID: $ACTIVE_SCAN_ID"

# Wait for active scan to complete
while [ "$(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/?apikey=$ZAP_API_KEY&scanId=$ACTIVE_SCAN_ID" | jq -r '.status')" != "100" ]; do
  PROGRESS=$(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/?apikey=$ZAP_API_KEY&scanId=$ACTIVE_SCAN_ID" | jq -r '.status')
  echo "Active scan progress: $PROGRESS%"
  sleep 5
done
echo -e "${GREEN}✅ Active scan complete${NC}"

# Step 6: Generate reports
echo -e "\n${YELLOW}[6/6] Generating security reports...${NC}"
mkdir -p $REPORT_DIR

# HTML Report
curl -s "http://localhost:$ZAP_PORT/OTHER/core/other/htmlreport/?apikey=$ZAP_API_KEY" > "$REPORT_DIR/zap-report-$TIMESTAMP.html"
echo -e "${GREEN}✅ HTML report: $REPORT_DIR/zap-report-$TIMESTAMP.html${NC}"

# JSON Report
curl -s "http://localhost:$ZAP_PORT/JSON/core/view/alerts/?apikey=$ZAP_API_KEY&baseurl=$API_URL" > "$REPORT_DIR/zap-alerts-$TIMESTAMP.json"
echo -e "${GREEN}✅ JSON report: $REPORT_DIR/zap-alerts-$TIMESTAMP.json${NC}"

# XML Report (for CI/CD tools)
curl -s "http://localhost:$ZAP_PORT/OTHER/core/other/xmlreport/?apikey=$ZAP_API_KEY" > "$REPORT_DIR/zap-report-$TIMESTAMP.xml"
echo -e "${GREEN}✅ XML report: $REPORT_DIR/zap-report-$TIMESTAMP.xml${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Scan Summary${NC}"
echo -e "${GREEN}========================================${NC}"
ALERT_COUNT=$(curl -s "http://localhost:$ZAP_PORT/JSON/core/view/numberOfAlerts/?apikey=$ZAP_API_KEY&baseurl=$API_URL" | jq -r '.numberOfAlerts')
HIGH_COUNT=$(curl -s "http://localhost:$ZAP_PORT/JSON/core/view/alertsSummary/?apikey=$ZAP_API_KEY&baseurl=$API_URL" | jq -r '.alertsSummary[] | select(.risk=="High") | .count // 0' | awk '{s+=$1} END {print s}')
MEDIUM_COUNT=$(curl -s "http://localhost:$ZAP_PORT/JSON/core/view/alertsSummary/?apikey=$ZAP_API_KEY&baseurl=$API_URL" | jq -r '.alertsSummary[] | select(.risk=="Medium") | .count // 0' | awk '{s+=$1} END {print s}')

echo "Total Alerts: $ALERT_COUNT"
echo -e "${RED}High Risk: ${HIGH_COUNT:-0}${NC}"
echo -e "${YELLOW}Medium Risk: ${MEDIUM_COUNT:-0}${NC}"

# Stop ZAP
echo -e "\n${YELLOW}Stopping ZAP daemon...${NC}"
curl -s "http://localhost:$ZAP_PORT/JSON/core/action/shutdown/?apikey=$ZAP_API_KEY" > /dev/null
wait $ZAP_PID 2>/dev/null || true
echo -e "${GREEN}✅ ZAP stopped${NC}"

# Exit with error if high-risk alerts found
if [ "${HIGH_COUNT:-0}" -gt 0 ]; then
  echo -e "\n${RED}❌ FAIL: High-risk vulnerabilities found!${NC}"
  echo -e "${YELLOW}Review report: $REPORT_DIR/zap-report-$TIMESTAMP.html${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ PASS: No high-risk vulnerabilities${NC}"
  exit 0
fi
