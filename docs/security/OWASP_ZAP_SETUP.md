# OWASP ZAP Security Scanning Setup for CoNest

**Application**: CoNest - Single Parent Housing Platform
**Tech Stack**: Node.js/Express Backend + React Native Mobile App
**Date**: 2025-11-10

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [ZAP Scanning Modes](#zap-scanning-modes)
3. [Backend API Scanning](#backend-api-scanning)
4. [Mobile App Scanning](#mobile-app-scanning)
5. [Automation & CI/CD](#automation--cicd)
6. [Configuration Files](#configuration-files)
7. [Interpreting Results](#interpreting-results)

---

## Quick Start

### Prerequisites
- ✅ OWASP ZAP installed (you confirmed this)
- ✅ Backend running locally (`docker-compose up` or `npm run dev`)
- ✅ Mobile app simulator/emulator for mobile testing

### 3-Minute Backend Scan (Manual)

```bash
# 1. Start backend
cd backend && npm run dev
# Backend now running on http://localhost:3001

# 2. Open ZAP GUI
# File → Quick Start → Automated Scan
# URL: http://localhost:3001
# Click "Attack"

# 3. Wait 5-15 minutes
# Results appear in Alerts tab
```

---

## ZAP Scanning Modes

### 1. **Passive Scan** (Safe, No Attacks)
- Analyzes HTTP traffic without modifying requests
- Safe to run on production
- Limited detection (only finds obvious issues)
- **Use for**: Initial assessment, production monitoring

### 2. **Active Scan** (Attacks, Use on Dev/Test Only)
- Sends attack payloads (SQL injection, XSS, etc.)
- Can trigger rate limits, create test data
- **NEVER run on production**
- **Use for**: Comprehensive testing in dev/staging

### 3. **API Scan** (Recommended for CoNest Backend)
- Import OpenAPI/Swagger spec
- Tests all endpoints automatically
- Better coverage than manual spidering
- **Use for**: REST API testing

---

## Backend API Scanning

### Method 1: Manual Exploration (Quick & Easy)

#### Step 1: Start ZAP in Proxy Mode
```bash
# Start ZAP with default proxy (localhost:8080)
zap.sh -daemon -port 8080 -config api.disablekey=true
```

#### Step 2: Configure Browser/Postman to Use ZAP Proxy
```bash
# Option A: Use curl with ZAP proxy
curl -x http://localhost:8080 http://localhost:3001/api/health

# Option B: Configure Postman
# Settings → Proxy → Use System Proxy
# Set HTTP Proxy: localhost:8080
```

#### Step 3: Make API Requests
```bash
# Test authentication endpoints
curl -x http://localhost:8080 -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPassword123!"}'

# Test discovery endpoints
curl -x http://localhost:8080 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/discovery/profiles

# Test saved profiles
curl -x http://localhost:8080 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/saved-profiles
```

#### Step 4: Run Active Scan
```bash
# In ZAP GUI:
# Right-click on http://localhost:3001 in Sites tree
# Attack → Active Scan
# Select policy: "Default Policy"
# Click "Start Scan"
```

---

### Method 2: OpenAPI/Swagger Import (Best for APIs)

#### Step 1: Create OpenAPI Spec
```bash
# If you don't have an OpenAPI spec yet, create one
cd backend
npm install --save-dev swagger-jsdoc swagger-ui-express

# backend/src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoNest API',
      version: '1.0.0',
      description: 'Single Parent Housing Platform API',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
```

#### Step 2: Export OpenAPI JSON
```bash
# Add to backend/src/server.ts
import { swaggerSpec } from './swagger';
import fs from 'fs';

// Export OpenAPI spec to file
fs.writeFileSync('./openapi.json', JSON.stringify(swaggerSpec, null, 2));
```

#### Step 3: Import into ZAP
```bash
# In ZAP GUI:
# Import → Import an OpenAPI definition from a URL or File
# Select: backend/openapi.json
# Target URL: http://localhost:3001

# ZAP will automatically:
# - Create all endpoint requests
# - Set correct HTTP methods
# - Add authentication headers
```

#### Step 4: Configure Authentication
```bash
# ZAP GUI: Tools → Options → Authentication

# 1. Add Authentication Method
# Type: Script-based Authentication
# Script: JWT Token Authentication

# 2. Add Test User
# Username: test@test.com
# Password: TestPassword123!
# Authentication Script:
#   POST http://localhost:3001/api/auth/login
#   Extract token from response.data.tokens.accessToken
#   Add to headers: Authorization: Bearer {token}
```

---

### Method 3: Automated Script (Recommended for CI/CD)

Create `backend/scripts/zap-scan.sh`:

```bash
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
until curl -s "http://localhost:$ZAP_PORT" > /dev/null 2>&1; do
  echo "Waiting for ZAP..."
  sleep 2
done
echo -e "${GREEN}✅ ZAP is ready${NC}"

# Step 4: Spider the API (discover endpoints)
echo -e "\n${YELLOW}[4/6] Spidering API to discover endpoints...${NC}"
SPIDER_SCAN_ID=$(curl -s "http://localhost:$ZAP_PORT/JSON/spider/action/scan/?apikey=$ZAP_API_KEY&url=$API_URL&maxChildren=10" | jq -r '.scan')
echo "Spider scan ID: $SPIDER_SCAN_ID"

# Wait for spider to complete
while [ $(curl -s "http://localhost:$ZAP_PORT/JSON/spider/view/status/?apikey=$ZAP_API_KEY&scanId=$SPIDER_SCAN_ID" | jq -r '.status') != "100" ]; do
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
while [ $(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/?apikey=$ZAP_API_KEY&scanId=$ACTIVE_SCAN_ID" | jq -r '.status') != "100" ]; do
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
echo -e "${GREEN}✅ ZAP stopped${NC}"

# Exit with error if high-risk alerts found
if [ "${HIGH_COUNT:-0}" -gt 0 ]; then
  echo -e "\n${RED}❌ FAIL: High-risk vulnerabilities found!${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ PASS: No high-risk vulnerabilities${NC}"
  exit 0
fi
```

Make it executable:
```bash
chmod +x backend/scripts/zap-scan.sh
```

Run it:
```bash
cd backend
./scripts/zap-scan.sh
```

---

## Mobile App Scanning

### Method: Proxy Mobile Traffic Through ZAP

Mobile apps make HTTP requests to your backend API. By routing those requests through ZAP, you can scan the mobile app's actual API usage.

### iOS Simulator Setup

#### Step 1: Start ZAP Proxy
```bash
zap.sh -daemon -port 8080 -config api.disablekey=true
```

#### Step 2: Configure iOS Simulator Proxy
```bash
# 1. Open iOS Simulator
# 2. Settings → Wi-Fi → (your network) → Configure Proxy
# 3. Select "Manual"
# 4. Server: localhost
# 5. Port: 8080
```

#### Step 3: Install ZAP Certificate on iOS
```bash
# 1. In ZAP: Tools → Options → Dynamic SSL Certificates
# 2. Click "Save" to export certificate (owasp_zap_root_ca.cer)
# 3. Drag certificate to iOS Simulator
# 4. Settings → General → VPN & Device Management → Install Profile
# 5. Settings → General → About → Certificate Trust Settings
# 6. Enable "OWASP ZAP Root CA"
```

#### Step 4: Run Mobile App
```bash
cd mobile
npm run ios

# All API requests now go through ZAP
# Use the app normally (login, browse, save profiles)
```

#### Step 5: Review Traffic in ZAP
```bash
# In ZAP GUI:
# Sites tab shows all captured requests
# Right-click on http://localhost:3001
# Attack → Active Scan
```

---

### Android Emulator Setup

#### Step 1: Configure Android Emulator Proxy
```bash
# Before starting emulator, set proxy:
emulator -avd Pixel_5_API_30 -http-proxy http://127.0.0.1:8080

# Or in running emulator:
# Settings → Network & internet → Wi-Fi
# Long press "AndroidWifi" → Modify network
# Advanced → Proxy → Manual
# Hostname: 10.0.2.2 (special alias for host machine)
# Port: 8080
```

#### Step 2: Install ZAP Certificate
```bash
# 1. Export ZAP certificate (Tools → Options → SSL Certificates → Save)
# 2. Push to emulator:
adb push owasp_zap_root_ca.cer /sdcard/

# 3. Install on Android:
# Settings → Security → Encryption & credentials
# → Install from storage → Select owasp_zap_root_ca.cer
```

#### Step 3: Run Mobile App
```bash
cd mobile
npm run android

# Traffic now flows through ZAP
```

---

## Automation & CI/CD

### GitHub Actions Integration

Create `.github/workflows/zap-scan.yml`:

```yaml
name: OWASP ZAP Security Scan

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2am

jobs:
  zap-scan:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: safenest_test
          POSTGRES_USER: safenest_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run database migrations
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: safenest_test
          DB_USER: safenest_user
          DB_PASSWORD: test_password
        run: npm run migrate:latest

      - name: Start backend server
        working-directory: ./backend
        env:
          NODE_ENV: test
          PORT: 3001
          DB_HOST: localhost
          JWT_SECRET: test-secret-minimum-32-characters-long
          JWT_REFRESH_SECRET: test-refresh-secret-32-characters
        run: |
          npm run dev &
          sleep 10
          curl http://localhost:3001/api/health

      - name: Run OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3001'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: zap-report
          path: |
            report_html.html
            report_json.json
            report_md.md

      - name: Fail on High Risk Alerts
        run: |
          HIGH_COUNT=$(jq '[.site[].alerts[] | select(.riskdesc | startswith("High"))] | length' report_json.json)
          if [ "$HIGH_COUNT" -gt 0 ]; then
            echo "❌ $HIGH_COUNT high-risk vulnerabilities found"
            exit 1
          fi
```

---

### ZAP Configuration Files

#### `.zap/rules.tsv` (Suppress False Positives)

Create `.zap/rules.tsv`:
```tsv
10202	IGNORE	(X-Frame-Options Header Not Set - We use CSP frame-ancestors)
10096	IGNORE	(Timestamp Disclosure - Not a security risk for our API)
10109	IGNORE	(Modern Web Application - We're an API, not a web app)
```

#### `.zap/context.xml` (Authentication Context)

Create `.zap/context.xml`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<configuration>
  <context>
    <name>CoNest API</name>
    <desc>CoNest Backend API Security Testing Context</desc>
    <inscope>true</inscope>
    <incregexes>http://localhost:3001/.*</incregexes>
    <tech>
      <include>Db.PostgreSQL</include>
      <include>Language.JavaScript</include>
      <include>OS.Linux</include>
      <include>WS.Node.js</include>
    </tech>
    <authentication>
      <type>1</type>
      <strategy>EACH_RESP</strategy>
      <pollurl>http://localhost:3001/api/auth/login</pollurl>
      <polldata>{"email":"test@test.com","password":"TestPassword123!"}</polldata>
      <pollheaders>Content-Type: application/json</pollheaders>
      <pollfreq>60</pollfreq>
      <pollunits>REQUESTS</pollunits>
    </authentication>
    <users>
      <user>1;true;test@test.com</user>
    </users>
  </context>
</configuration>
```

---

## Interpreting Results

### Alert Severity Levels

| Risk Level | Action Required | Example Issues |
|-----------|----------------|----------------|
| **High** 🔴 | Fix immediately | SQL Injection, XSS, Authentication Bypass |
| **Medium** 🟡 | Fix within 1 week | CSRF missing, Weak SSL, Cookie without HttpOnly |
| **Low** 🟢 | Fix within 1 month | Missing headers, Verbose errors |
| **Informational** ℹ️ | Review and document | Information disclosure (non-sensitive) |

### Common False Positives in CoNest

1. **"X-Frame-Options Header Not Set"**
   - **False Positive**: You use CSP `frame-ancestors` instead
   - **Action**: Suppress in rules.tsv

2. **"Timestamp Disclosure"**
   - **False Positive**: API responses include timestamps (expected)
   - **Action**: Suppress if no sensitive data leaked

3. **"Application Error Disclosure"**
   - **False Positive**: You return generic errors in production
   - **Action**: Verify production config, suppress if correct

### Validating Alerts

For each alert:
1. **Reproduce Manually**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -d "email=admin' OR '1'='1&password=anything"
   ```

2. **Check Source Code**
   - Review the file/line mentioned in alert
   - Verify if protection exists (e.g., parameterized queries)

3. **Test Fix**
   - Apply fix
   - Re-run ZAP scan
   - Verify alert disappears

---

## Best Practices

### Do's ✅
- Run ZAP scans on every PR (baseline scan)
- Run full active scans weekly on staging
- Fix high-risk alerts before merging
- Update ZAP regularly (`zap.sh -cmd -updateall`)
- Use authenticated scans (login before scanning)

### Don'ts ❌
- **Never** run active scans on production
- Don't ignore medium/high alerts without investigation
- Don't expose ZAP API without authentication
- Don't scan third-party APIs without permission

---

## Quick Reference Commands

```bash
# Start ZAP GUI
zap.sh

# Start ZAP daemon (headless)
zap.sh -daemon -port 8080 -config api.disablekey=true

# Quick baseline scan (passive only)
zap-baseline.py -t http://localhost:3001 -r baseline-report.html

# Full active scan (attacks)
zap-full-scan.py -t http://localhost:3001 -r full-scan-report.html

# API scan with OpenAPI spec
zap-api-scan.py -t http://localhost:3001 -f openapi -r api-scan-report.html

# Update ZAP
zap.sh -cmd -updateall

# Stop ZAP daemon
curl "http://localhost:8080/JSON/core/action/shutdown/"
```

---

## Troubleshooting

### Issue: ZAP Can't Connect to Backend

**Solution**:
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check ZAP proxy
curl -x http://localhost:8080 http://localhost:3001/api/health

# Check firewall
sudo ufw allow 8080  # Ubuntu
sudo firewall-cmd --add-port=8080/tcp  # CentOS
```

### Issue: ZAP Certificate Not Trusted

**Solution**:
```bash
# Re-export ZAP certificate
# Tools → Options → Dynamic SSL Certificates → Save

# iOS: Install via Settings → General → VPN & Device Management
# Android: Settings → Security → Install from storage
```

### Issue: Rate Limiting Blocks ZAP Scan

**Solution**:
```bash
# Temporarily increase rate limits for testing
# backend/src/config/security.ts
rateLimit: {
  maxRequests: 10000,  // During scan only!
  windowMs: 15 * 60 * 1000,
}

# Or whitelist ZAP IP
# backend/src/middleware/rateLimit.ts
skip: (req) => req.ip === '127.0.0.1'
```

---

## Summary

### Recommended Scanning Strategy for CoNest

| Frequency | Scan Type | Target | Duration |
|----------|-----------|--------|----------|
| **Every PR** | Baseline (passive) | Backend API | 2-5 min |
| **Weekly** | Active + API | Staging backend | 15-30 min |
| **Monthly** | Full + Mobile | Staging (backend + mobile) | 1-2 hours |
| **Before Release** | Comprehensive | Production clone | 2-4 hours |

### Next Steps

1. ✅ **Run your first scan** (5 minutes)
   ```bash
   cd backend
   npm run dev
   zap-baseline.py -t http://localhost:3001
   ```

2. ✅ **Set up automation** (30 minutes)
   ```bash
   chmod +x backend/scripts/zap-scan.sh
   ./backend/scripts/zap-scan.sh
   ```

3. ✅ **Add to CI/CD** (1 hour)
   - Copy `.github/workflows/zap-scan.yml`
   - Create `.zap/rules.tsv` for false positive suppression

4. ✅ **Review and fix alerts** (ongoing)
   - Start with high-risk alerts
   - Work through medium/low over time

---

**Created**: 2025-11-10
**Maintained By**: CoNest Security Team
**Next Review**: 2025-12-10
