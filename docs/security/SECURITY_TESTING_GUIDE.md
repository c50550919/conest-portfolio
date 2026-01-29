# CoNest Security Testing Guide

**Complete guide for testing the application with flexible security configurations**

## Table of Contents
1. [Security Modes Overview](#security-modes-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Security Feature Flags](#security-feature-flags)
4. [Common Testing Scenarios](#common-testing-scenarios)
5. [Beta Launch Checklist](#beta-launch-checklist)
6. [Security Hardening Verification](#security-hardening-verification)

---

## Security Modes Overview

CoNest uses a **layered security system** with 4 distinct modes:

### 1. Development Mode (`SECURITY_MODE=development`)
**Purpose**: Fast iteration, minimal security enforcement

**Configuration**: `/backend/.env.development`

**Characteristics**:
- ✅ Auto-generates encryption keys
- ✅ Allows mock verification providers
- ✅ Weak secrets permitted
- ✅ All security features can be toggled
- ⚠️ **NEVER use in production**

**Use Cases**:
- Building new features
- Local development
- Rapid prototyping

---

### 2. Testing Mode (`SECURITY_MODE=testing`)
**Purpose**: Selective security for integration tests

**Configuration**: `/backend/.env.testing`

**Characteristics**:
- ✅ Mock providers allowed
- ✅ Individual features can be disabled
- ✅ Fast test execution (relaxed bcrypt rounds)
- ✅ Separate test database

**Use Cases**:
- Running automated tests
- Integration testing
- E2E testing

---

### 3. Staging Mode (`SECURITY_MODE=staging`)
**Purpose**: Production-like security with warnings

**Configuration**: Create `/backend/.env.staging`

**Characteristics**:
- ⚠️ Warns about weak secrets
- ⚠️ Allows mock providers (with warnings)
- ✅ Most security features should be enabled
- ✅ Real verification provider testing

**Use Cases**:
- Pre-production testing
- QA validation
- Integration with real providers

---

### 4. Production Mode (`SECURITY_MODE=production`)
**Purpose**: **FULL security enforcement, ZERO compromises**

**Configuration**: Copy `/backend/.env.production.example` → `/backend/.env.production`

**Characteristics**:
- ❌ NO mock providers allowed
- ❌ NO weak secrets permitted
- ✅ ALL security features MUST be enabled
- ✅ Strong secret requirements (min 32 chars)
- ✅ Real Stripe live keys required
- ✅ Real verification providers required

**Enforcement**:
```bash
# Application will FAIL to start if:
- Using development default secrets
- JWT secrets < 32 characters
- Stripe test keys (must use sk_live_*)
- Mock verification providers
- Any critical security feature disabled
```

---

## Quick Start Guide

### Step 1: Choose Your Security Mode

```bash
# Development (default)
cp backend/.env.development backend/.env

# Testing
cp backend/.env.testing backend/.env

# Production (fill in real secrets first!)
cp backend/.env.production.example backend/.env.production
# Edit .env.production and replace ALL "CHANGE_ME" values
```

### Step 2: Start the Server

```bash
cd backend
npm install
npm run dev
```

### Step 3: Verify Security Configuration

Check the startup logs:

```
✅ Environment variables validated successfully
{
  nodeEnv: 'development',
  securityMode: 'development',
  port: 3000,
  idProvider: 'mock',
  bgCheckProvider: 'mock',
  securityFeatures: {
    rateLimiting: true,
    jwtValidation: true,
    encryption: true,
    accountLockout: false,
    verificationChecks: true
  }
}
```

---

## Security Feature Flags

All security features can be toggled via environment variables:

### Available Flags

| Flag | Default | Description | Can Disable in Prod? |
|------|---------|-------------|---------------------|
| `ENABLE_RATE_LIMITING` | `true` | Rate limit API requests | ❌ NO |
| `ENABLE_JWT_VALIDATION` | `true` | Validate JWT tokens | ❌ NO |
| `ENABLE_ENCRYPTION` | `true` | Encrypt messages (AES-256-GCM) | ❌ NO |
| `ENABLE_CSRF_PROTECTION` | `false` | CSRF token validation | ✅ Optional |
| `ENABLE_ACCOUNT_LOCKOUT` | `false` | Lock accounts after failed logins | ✅ Recommended |
| `ENABLE_VERIFICATION_CHECKS` | `true` | Enforce verification requirements | ❌ NO |
| `ENABLE_PAYMENT_VALIDATION` | `true` | Validate payment requirements | ❌ NO |
| `ENABLE_TOKEN_ROTATION` | `false` | Rotate refresh tokens | ✅ Recommended |
| `ENABLE_SECURITY_ALERTS` | `false` | Send security event webhooks | ✅ Recommended |

---

## Common Testing Scenarios

### Scenario 1: Test Without Rate Limiting

**Use Case**: Load testing, performance benchmarking

```bash
# .env.development or .env.testing
ENABLE_RATE_LIMITING=false
```

**Expected Behavior**:
- No rate limit errors during load tests
- ⚠️ Warning in startup logs: "Rate limiting disabled"

**Re-enable for production**:
```bash
ENABLE_RATE_LIMITING=true
```

---

### Scenario 2: Test Without Authentication

**Use Case**: Testing API endpoints without tokens

```bash
# .env.development
ENABLE_JWT_VALIDATION=false
```

**Expected Behavior**:
- All endpoints accessible without `Authorization` header
- ⚠️ **DANGEROUS**: Only use in isolated development

**Security Impact**: 🚨 **CRITICAL** - Never disable in staging or production

---

### Scenario 3: Test Without Message Encryption

**Use Case**: Debugging message content, viewing raw data

```bash
# .env.development
ENABLE_ENCRYPTION=false
```

**Expected Behavior**:
- Messages stored in plain text in database
- Easier to inspect message content during debugging

**Re-enable before testing**:
```bash
ENABLE_ENCRYPTION=true
```

---

### Scenario 4: Test Account Lockout

**Use Case**: Verify account lockout after failed logins

```bash
# .env.development or .env.testing
ENABLE_ACCOUNT_LOCKOUT=true
MAX_LOGIN_ATTEMPTS=3
LOGIN_LOCKOUT_DURATION_MINUTES=5
```

**Test Steps**:
1. Attempt login with wrong password 3 times
2. Verify account is locked
3. Wait 5 minutes or manually unlock via admin
4. Verify login succeeds after lockout expires

---

### Scenario 5: Test Verification Enforcement

**Use Case**: Test features without completing verification

```bash
# .env.development
ENABLE_VERIFICATION_CHECKS=false
```

**Expected Behavior**:
- Users can send messages without verification
- Connection requests work without background checks
- ⚠️ Useful for feature development, NOT for production

**Re-enable for testing**:
```bash
ENABLE_VERIFICATION_CHECKS=true
VERIFICATION_GRACE_PERIOD_DAYS=7
```

---

### Scenario 6: Test Payment Validation

**Use Case**: Test features without payment processing

```bash
# .env.development
ENABLE_PAYMENT_VALIDATION=false
```

**Expected Behavior**:
- Verification features accessible without payment
- No Stripe payment required

**Re-enable before beta**:
```bash
ENABLE_PAYMENT_VALIDATION=true
```

---

### Scenario 7: Test With Mock Providers

**Use Case**: Test without real Veriff/Certn API calls

```bash
# .env.development or .env.testing
ID_PROVIDER=mock
BG_CHECK_PROVIDER=mock
```

**Expected Behavior**:
- ID verification auto-approves after 2 seconds
- Background checks auto-approve after 2 seconds
- No real API calls to Veriff or Certn

**Switch to real providers**:
```bash
# .env.staging or .env.production
ID_PROVIDER=veriff
VERIFF_API_KEY=your_api_key_here
VERIFF_API_SECRET=your_api_secret_here

BG_CHECK_PROVIDER=certn
CERTN_API_KEY=your_api_key_here
```

---

### Scenario 8: Progressive Security Enablement

**Recommended Approach**: Enable security features incrementally

#### Phase 1: Core Features Working (Development)
```bash
SECURITY_MODE=development
ENABLE_RATE_LIMITING=true
ENABLE_JWT_VALIDATION=true
ENABLE_ENCRYPTION=true
ENABLE_CSRF_PROTECTION=false
ENABLE_ACCOUNT_LOCKOUT=false
ENABLE_VERIFICATION_CHECKS=false  # Enable after verification system complete
ENABLE_PAYMENT_VALIDATION=false   # Enable after payment system complete
```

#### Phase 2: Verification System Complete
```bash
ENABLE_VERIFICATION_CHECKS=true
ID_PROVIDER=mock  # Test with mock first
BG_CHECK_PROVIDER=mock
```

#### Phase 3: Payment System Complete
```bash
ENABLE_PAYMENT_VALIDATION=true
STRIPE_SECRET_KEY=sk_test_your_test_key  # Use test mode
```

#### Phase 4: Enhanced Security (Staging)
```bash
SECURITY_MODE=staging
ENABLE_ACCOUNT_LOCKOUT=true
ENABLE_TOKEN_ROTATION=true
ID_PROVIDER=veriff  # Switch to real provider
BG_CHECK_PROVIDER=certn
```

#### Phase 5: Production Ready
```bash
SECURITY_MODE=production
# All security features enabled automatically
# No mocks allowed
# Strong secrets required
```

---

## Beta Launch Checklist

### Pre-Beta Security Requirements

#### 1. Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Replace ALL "CHANGE_ME" values with real secrets
- [ ] Generate strong JWT secrets (min 32 characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] Generate encryption master key
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

#### 2. Stripe Configuration
- [ ] Create Stripe live account
- [ ] Obtain live API keys (sk_live_*, pk_live_*)
- [ ] Configure webhook endpoint
- [ ] Test payment flow in test mode first
- [ ] Switch to live keys for production

#### 3. Verification Providers
- [ ] Sign up for Veriff production account
- [ ] Obtain Veriff API credentials
- [ ] Sign up for Certn account
- [ ] Obtain Certn API key
- [ ] Test verification flow in staging
- [ ] Configure webhook endpoints for both

#### 4. Security Feature Verification
- [ ] Enable all critical security features
  ```bash
  ENABLE_RATE_LIMITING=true
  ENABLE_JWT_VALIDATION=true
  ENABLE_ENCRYPTION=true
  ENABLE_VERIFICATION_CHECKS=true
  ENABLE_PAYMENT_VALIDATION=true
  ```
- [ ] Enable recommended features
  ```bash
  ENABLE_ACCOUNT_LOCKOUT=true
  ENABLE_TOKEN_ROTATION=true
  ENABLE_SECURITY_ALERTS=true
  ```

#### 5. Infrastructure Security
- [ ] Set up HTTPS/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable database encryption at rest
- [ ] Configure Redis persistence
- [ ] Set up logging and monitoring

#### 6. Testing in Staging
- [ ] Run full test suite: `npm test`
- [ ] Run security tests: `npm run test:security`
- [ ] Test complete user flows:
  - [ ] User registration
  - [ ] Email verification
  - [ ] Phone verification
  - [ ] Payment processing
  - [ ] ID verification (Veriff)
  - [ ] Background check (Certn)
  - [ ] Discovery and matching
  - [ ] Messaging with encryption
  - [ ] Connection requests
- [ ] Load testing with Artillery
- [ ] Security audit: `npm run security:audit`

#### 7. Child Safety Compliance
- [ ] Verify NO child PII in API responses
- [ ] Test profile cards contain only `childrenCount` and `childrenAgeGroups`
- [ ] Verify screenshot notifications work
- [ ] Test report/block functionality
- [ ] Review and test privacy policy compliance

---

## Security Hardening Verification

### Automated Security Checks

Run these commands before beta launch:

```bash
# 1. Run all tests
npm test

# 2. Run security-specific tests
npm run test:security

# 3. Check for vulnerable dependencies
npm audit

# 4. Static code analysis
npm run lint

# 5. Check code complexity
npm run complexity
```

### Manual Security Verification

#### 1. Environment Variables
```bash
# Verify production mode enforces security
SECURITY_MODE=production npm run dev

# Should FAIL with errors if:
# - Using development default secrets
# - Weak JWT secrets
# - Mock providers
# - Disabled critical features
```

#### 2. Rate Limiting
```bash
# Test rate limiting is active
for i in {1..150}; do curl http://localhost:3000/api/profiles/me; done

# Should see "Too many requests" after 100 requests
```

#### 3. JWT Validation
```bash
# Test with invalid token
curl -H "Authorization: Bearer invalid_token" http://localhost:3000/api/profiles/me

# Should return 403 Forbidden
```

#### 4. Message Encryption
```bash
# Check database - messages should be encrypted
psql -U safenest -d safenest_db -c "SELECT content FROM messages LIMIT 1;"

# Should see encrypted blob, NOT plain text
```

#### 5. Verification Enforcement
```bash
# Test messaging without verification (should fail)
# 1. Create new user
# 2. Skip verification payment
# 3. Attempt to send message
# 4. Should receive 402 Payment Required
```

### Security Monitoring

#### Production Monitoring Checklist
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure security event logging
- [ ] Set up webhook for security alerts
- [ ] Monitor failed authentication attempts
- [ ] Track verification failures
- [ ] Monitor payment fraud patterns
- [ ] Set up uptime monitoring

---

## Troubleshooting

### Error: "JWT_SECRET must be at least 32 characters in production"

**Cause**: Using weak JWT secret in production mode

**Fix**:
```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env.production
JWT_SECRET=<generated_secret>
```

---

### Error: "STRIPE_SECRET_KEY must use live key (sk_live_) in production"

**Cause**: Using test Stripe key in production mode

**Fix**:
```bash
# Get live key from Stripe Dashboard
# Add to .env.production
STRIPE_SECRET_KEY=sk_live_your_live_key_here
```

---

### Error: "ID_PROVIDER cannot be 'mock' in production"

**Cause**: Using mock verification provider in production

**Fix**:
```bash
# Switch to real provider
ID_PROVIDER=veriff
VERIFF_API_KEY=your_api_key
VERIFF_API_SECRET=your_api_secret
```

---

### Warning: "Rate limiting disabled (consider enabling for staging)"

**Cause**: Rate limiting disabled in staging mode

**Fix**:
```bash
# Enable rate limiting
ENABLE_RATE_LIMITING=true
```

---

## Security Best Practices

### 1. Secret Management
- ✅ Use different secrets for each environment
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Never commit secrets to version control
- ✅ Use environment variables, not hardcoded values
- ✅ Store production secrets in secure vault (AWS Secrets Manager, etc.)

### 2. Development Workflow
- ✅ Always use `.env.development` for local work
- ✅ Never use `.env.production` locally
- ✅ Test security features before deploying
- ✅ Run security audit before each release

### 3. Deployment
- ✅ Use CI/CD for automated deployment
- ✅ Run tests in staging before production
- ✅ Enable all security features in production
- ✅ Monitor security events and alerts
- ✅ Have rollback plan ready

### 4. Child Safety
- ✅ NEVER store child names, photos, or PII
- ✅ Only store `childrenCount` and `childrenAgeGroups`
- ✅ Test all API endpoints for child data leakage
- ✅ Regular security audits for compliance

---

## Support

For security-related questions or to report vulnerabilities:
- Email: security@conest.com
- Emergency: security-emergency@conest.com

**DO NOT** post security issues publicly on GitHub.

---

## Version History

- **v1.0.0** (2025-01-15): Initial security framework with 4-tier mode system
- Feature flags for flexible testing
- Production security enforcement
- Child safety compliance verification
