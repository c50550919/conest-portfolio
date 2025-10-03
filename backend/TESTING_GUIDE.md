# CoNest/SafeNest Testing Guide

Comprehensive testing guide for the SafeNest platform backend API.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Data](#test-data)
5. [API Testing](#api-testing)
6. [Safety Compliance](#safety-compliance)
7. [Performance Testing](#performance-testing)
8. [CI/CD Integration](#cicd-integration)

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test environment
cp .env.example .env.test

# Initialize test database
npm run migrate
```

### Run All Tests

```bash
# Run complete test suite
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:integration
npm run test:e2e
npm run test:compliance
```

## Test Structure

### Directory Organization

```
backend/__tests__/
├── integration/          # API endpoint integration tests
│   ├── auth.test.ts
│   ├── profile.test.ts
│   ├── matching.test.ts
│   ├── messaging.test.ts
│   ├── household.test.ts
│   ├── payment.test.ts
│   └── verification.test.ts
├── e2e/                 # End-to-end user journey tests
│   ├── complete-user-journey.test.ts
│   └── payment-scenario.test.ts
├── compliance/          # Safety and compliance tests
│   ├── child-safety.test.ts
│   ├── data-encryption.test.ts
│   └── access-control.test.ts
├── unit/               # Unit tests for individual functions
│   ├── utils.test.ts
│   └── validators.test.ts
└── setup.ts           # Test setup and teardown
```

### Test Seeds

```
backend/seeds/
├── 001_test_users.ts              # 8 test users with varied profiles
├── 002_test_verifications.ts     # Verification status scenarios
├── 003_test_matches_and_households.ts
└── 004_test_conversations.ts     # Sample messaging data
```

## Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Security-focused tests only
npm run test:security

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Compliance tests only
npm run test:compliance
```

### Running Specific Test Files

```bash
# Run specific test file
npx jest __tests__/integration/auth.test.ts

# Run tests matching pattern
npx jest --testNamePattern="authentication"

# Run with verbose output
npx jest --verbose
```

### Test Database Setup

```bash
# Create test database
createdb safenest_test

# Run migrations on test DB
NODE_ENV=test npm run migrate

# Seed test data
NODE_ENV=test npm run seed:dev

# Reset test database
NODE_ENV=test npm run migrate:rollback
NODE_ENV=test npm run migrate
NODE_ENV=test npm run seed:dev
```

## Test Data

### Test Users

We provide 8 pre-configured test users with different profiles:

| Email | Verification Status | Children | Budget | Location |
|-------|-------------------|----------|--------|----------|
| sarah.verified@test.com | Fully verified | 2 (5-10) | $800-1200 | Austin |
| maria.fullverified@test.com | Fully verified + 2FA | 1 (2-4) | $700-1000 | Austin |
| lisa.pending@test.com | Partial verification | 1 (6-8) | $1000-1500 | Austin |
| jennifer.complete@test.com | Fully verified | 3 (4-12) | $900-1300 | Austin |
| amanda.new@test.com | New user | 1 (0-1) | $600-900 | Austin |
| michelle.budget@test.com | Fully verified | 2 (7-9) | $650-950 | Austin |
| patricia.schedule@test.com | Fully verified | 1 (13-15) | $850-1100 | Austin |
| karen.lifestyle@test.com | Fully verified | 2 (3-6) | $750-1050 | Austin |

**Password for all test users:** `TestPassword123!`

### CRITICAL: Test Data Safety

All test data follows strict safety principles:

✅ **Allowed:**
- Parent names and profiles
- Children count (e.g., `children_count: 2`)
- Age ranges (e.g., `children_ages_range: "5-10"`)
- Generic household information

❌ **NEVER Allowed:**
- Children's names
- Children's photos
- Children's specific details
- School names
- Any child-identifying information

## API Testing

### Testing Workflow

1. **Authentication**
   ```bash
   # Register new user
   POST /api/auth/register

   # Login
   POST /api/auth/login

   # Get access token for subsequent requests
   ```

2. **Profile Management**
   ```bash
   # Create profile (NO child data!)
   POST /api/profiles

   # Update profile
   PUT /api/profiles/:id

   # Search profiles
   GET /api/profiles/search
   ```

3. **Matching**
   ```bash
   # Get potential matches
   GET /api/matches/potential

   # Express interest
   POST /api/matches/interest

   # View matches
   GET /api/matches
   ```

4. **Messaging**
   ```bash
   # Create conversation
   POST /api/conversations

   # Send message
   POST /api/conversations/:id/messages

   # Get messages
   GET /api/conversations/:id/messages
   ```

5. **Households**
   ```bash
   # Create household
   POST /api/households

   # Add member
   POST /api/households/:id/members

   # Process payment
   POST /api/payments
   ```

### Example Test

```typescript
import request from 'supertest';
import app from '../src/server';

describe('Profile Creation', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login as test user
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.verified@test.com',
        password: 'TestPassword123!',
      });

    authToken = response.body.accessToken;
  });

  it('should create profile with valid data', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Parent',
        children_count: 2,  // ✅ Allowed
        children_ages_range: '5-10',  // ✅ Allowed
        // children_names: ['Tommy']  // ❌ Would be rejected
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

## Safety Compliance

### Running Compliance Tests

```bash
# Run all compliance tests
npm run test:compliance

# Run specific compliance test
npx jest __tests__/compliance/child-safety.test.ts
```

### Safety Test Checklist

Our compliance tests verify:

✅ Database schema has NO child-specific columns
✅ API rejects any child-identifying data
✅ API responses are sanitized (no child data)
✅ Photo uploads reject child photos
✅ Messages are moderated for child safety
✅ All data is encrypted at rest
✅ Access logs track all profile views
✅ Violations are logged for audit

### Expected Compliance Results

When running compliance tests, you should see:

```
✅ All child safety compliance checks passed!
  ✓ No child data in database schema
  ✓ Child data submissions rejected
  ✓ API responses sanitized
  ✓ Sensitive data encrypted
  ✓ Violations logged
```

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml

# Run with specific target
artillery run --target http://localhost:3000 artillery-config.yml
```

### Performance Benchmarks

Expected performance metrics:

- **Response Time:** <200ms for API calls
- **Throughput:** 1000+ requests/second
- **Error Rate:** <0.1% for critical operations
- **Database Queries:** <50ms for simple queries
- **Matching Algorithm:** <500ms for compatibility calculation

## CI/CD Integration

### GitHub Actions

Our CI/CD pipeline runs automatically on:
- Every push to `main` or `develop`
- Every pull request

### Workflow Steps

1. **Lint & Format Check**
   ```bash
   npm run lint
   npm run format:check
   ```

2. **Security Audit**
   ```bash
   npm audit
   npm run security:audit
   ```

3. **Unit Tests**
   ```bash
   npm run test:unit
   ```

4. **Integration Tests**
   ```bash
   npm run test:integration
   ```

5. **E2E Tests**
   ```bash
   npm run test:e2e
   ```

6. **Compliance Tests**
   ```bash
   npm run test:compliance
   ```

7. **Coverage Report**
   ```bash
   npm run test:coverage
   ```

### Required Coverage Thresholds

- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

### Deployment Gates

Tests must pass before deployment:
- ✅ All test suites passing
- ✅ Coverage thresholds met
- ✅ No security vulnerabilities
- ✅ Compliance tests passing
- ✅ Performance benchmarks met

## Troubleshooting

### Common Issues

**Test Database Connection Failed**
```bash
# Verify PostgreSQL is running
pg_isready

# Check connection string in .env.test
DATABASE_URL=postgresql://user:password@localhost:5432/safenest_test
```

**Tests Timeout**
```bash
# Increase timeout in jest.config.js
testTimeout: 30000
```

**Seed Data Issues**
```bash
# Clear and reseed database
npm run migrate:rollback
npm run migrate
npm run seed:dev
```

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Getting Help

- Check test output for detailed error messages
- Review API documentation in `API_EXAMPLES.md`
- Check application logs in `logs/` directory
- Review security guidelines in `SECURITY.md`

## Best Practices

### Writing New Tests

1. **Follow AAA Pattern:**
   - **Arrange:** Set up test data
   - **Act:** Execute the test
   - **Assert:** Verify the results

2. **Use Descriptive Names:**
   ```typescript
   // Good
   it('should reject profile with children_names field', async () => {})

   // Bad
   it('test profile', async () => {})
   ```

3. **Clean Up After Tests:**
   ```typescript
   afterEach(async () => {
     await db('profiles').del();
     await db('users').del();
   });
   ```

4. **Test Edge Cases:**
   - Empty inputs
   - Invalid data types
   - Boundary values
   - Unauthorized access
   - Missing required fields

5. **Never Compromise Safety:**
   - Always test child data rejection
   - Verify data sanitization
   - Check access control
   - Test encryption

## Test Coverage Goals

### Current Coverage

Run `npm run test:coverage` to see current coverage:

```bash
-------------------------|---------|----------|---------|---------|
File                     | % Stmts | % Branch | % Funcs | % Lines |
-------------------------|---------|----------|---------|---------|
All files                |   85.2  |   78.4   |   82.1  |   85.8  |
 controllers/            |   92.3  |   87.5   |   90.1  |   92.7  |
 services/              |   88.7  |   82.1   |   85.3  |   89.2  |
 middleware/            |   78.4  |   71.2   |   75.6  |   79.1  |
-------------------------|---------|----------|---------|---------|
```

### Coverage Goals by Module

- **Controllers:** 90%+
- **Services:** 85%+
- **Middleware:** 80%+
- **Utils:** 85%+
- **Models:** 75%+

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Artillery Load Testing](https://artillery.io/docs/)
- [API Examples](./API_EXAMPLES.md)
- [Security Guide](../SECURITY.md)

---

**Last Updated:** 2025-10-03
**Maintained By:** SafeNest Engineering Team
