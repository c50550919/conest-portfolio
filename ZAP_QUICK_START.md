# OWASP ZAP Quick Start for CoNest

**Get scanning in 5 minutes!**

---

## Option 1: Quick GUI Scan (Easiest - 2 minutes)

```bash
# 1. Start your backend
cd backend
npm run dev

# 2. Open ZAP
zap.sh

# 3. In ZAP GUI:
# - Click "Automated Scan" button
# - URL: http://localhost:3001
# - Click "Attack"

# 4. Wait 5-10 minutes, review "Alerts" tab
```

---

## Option 2: Automated Script (Best for Regular Use - 5 minutes)

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Run the scan script
./scripts/zap-scan.sh

# 3. Review HTML report
open security-reports/zap-report-*.html
```

**What it does**:
- Discovers all API endpoints (spider scan)
- Tests for vulnerabilities (active scan)
- Generates HTML, JSON, and XML reports
- Fails if high-risk vulnerabilities found
- Takes 10-20 minutes

---

## Option 3: CI/CD Integration (Production Ready - 30 minutes)

Already set up! Just commit the files:

```bash
git add .github/workflows/zap-scan.yml
git add .zap/rules.tsv
git commit -m "Add OWASP ZAP security scanning"
git push

# ZAP will automatically scan:
# - Every pull request
# - Weekly on Monday at 2am
```

View results in GitHub Actions → "OWASP ZAP Security Scan"

---

## Understanding Results

### Alert Risk Levels

| Icon | Risk | Action |
|------|------|--------|
| 🔴 | **High** | **Fix immediately** - SQL Injection, XSS, Auth Bypass |
| 🟡 | **Medium** | Fix within 1 week - CSRF, weak SSL, insecure cookies |
| 🟢 | **Low** | Fix within 1 month - Missing headers, verbose errors |
| ℹ️ | **Info** | Review - Non-sensitive information disclosure |

### Common Issues You'll See

✅ **False Positives** (Safe to Ignore):
- "X-Frame-Options Header Not Set" - You use CSP instead
- "Timestamp Disclosure" - API timestamps are expected
- "Application Error Disclosure" - You use generic errors

❌ **Real Issues** (Must Fix):
- SQL Injection - Check parameterized queries
- XSS - Check input sanitization
- Missing Authentication - Check auth middleware

---

## Mobile App Scanning (iOS/Android)

### iOS Simulator

```bash
# 1. Start ZAP proxy
zap.sh -daemon -port 8080

# 2. Configure iOS Simulator proxy
# Settings → Wi-Fi → Configure Proxy
# Server: localhost, Port: 8080

# 3. Install ZAP certificate
# Tools → Options → SSL Certificates → Save
# Drag .cer file to simulator
# Settings → General → About → Certificate Trust

# 4. Run your app
cd mobile && npm run ios

# 5. Use the app normally
# All API calls now flow through ZAP!
```

### Android Emulator

```bash
# 1. Start emulator with proxy
emulator -avd Pixel_5_API_30 -http-proxy http://127.0.0.1:8080

# 2. Install ZAP certificate
adb push owasp_zap_root_ca.cer /sdcard/
# Settings → Security → Install from storage

# 3. Run app
cd mobile && npm run android
```

---

## Troubleshooting

### "Backend not running"
```bash
# Check backend health
curl http://localhost:3001/api/health

# If not running:
cd backend && npm run dev
```

### "ZAP can't connect"
```bash
# Test ZAP proxy
curl -x http://localhost:8080 http://localhost:3001/api/health

# If fails, restart ZAP
pkill -f zap
zap.sh -daemon -port 8080
```

### "Rate limiting blocks scan"
```bash
# Temporarily disable in backend/src/middleware/rateLimit.ts
# During testing only!
max: 10000,  // Increase limit
```

---

## Files Created

| File | Purpose |
|------|---------|
| `OWASP_ZAP_SETUP.md` | **Complete setup guide** (29 KB) |
| `backend/scripts/zap-scan.sh` | **Automated scan script** |
| `.zap/rules.tsv` | False positive suppression |
| `.github/workflows/zap-scan.yml` | CI/CD integration |

---

## Next Steps

### Week 1: Manual Scanning
1. Run Option 1 (GUI scan) - 5 minutes
2. Review and understand alerts
3. Fix any high-risk issues

### Week 2: Automation
1. Run Option 2 (automated script) weekly
2. Track alerts in security-reports/
3. Set up regular scan schedule

### Week 3: CI/CD
1. Push Option 3 (GitHub Actions)
2. Scans run automatically on every PR
3. Block PRs with high-risk vulnerabilities

---

## Help & Resources

**Full Documentation**: [OWASP_ZAP_SETUP.md](OWASP_ZAP_SETUP.md)

**Common Commands**:
```bash
# Start ZAP GUI
zap.sh

# Start ZAP daemon (headless)
zap.sh -daemon -port 8080

# Run scan script
./backend/scripts/zap-scan.sh

# View latest report
open backend/security-reports/zap-report-*.html
```

**Questions?**
- ZAP Docs: https://www.zaproxy.org/docs/
- CoNest Security: [SECURITY_AND_COMPLEXITY_ANALYSIS.md](SECURITY_AND_COMPLEXITY_ANALYSIS.md)

---

**Created**: 2025-11-10
**Updated**: 2025-11-10
