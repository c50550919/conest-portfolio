# Task Completion Protocol

## When a Development Task is Complete

### 1. Code Quality Checks
```bash
# Backend
cd backend
npm run lint                 # Must pass
npm run format:check         # Must pass
npm run complexity           # Check warnings

# Mobile
cd mobile
npm run lint                 # Must pass
```

### 2. Testing Requirements
```bash
# Backend - Unit & Integration Tests
cd backend
npm test                     # All tests must pass
npm run test:coverage        # Check coverage thresholds

# Mobile - Unit Tests
cd mobile
npm test                     # All tests must pass
```

### 3. Security Validation
```bash
# Backend Security Checks
cd backend
npm run security:audit       # Review any vulnerabilities
npm run test:security        # Security-specific tests must pass
```

### 4. Infrastructure Health
```bash
# Verify Docker services
docker-compose ps            # All should show "Up" and "healthy"

# Check Backend Health
curl http://localhost:3000/health

# Check Database Connection
docker exec safenest-postgres psql -U safenest -d safenest_db -c "SELECT 1;"
```

### 5. Build Verification
```bash
# Backend - TypeScript Compilation
cd backend
npm run build                # Must compile without errors

# Mobile - iOS Build Test (optional for minor changes)
cd mobile
npx react-native run-ios --simulator="iPhone 17 Pro"
```

### 6. Git Preparation
```bash
git status                   # Review all changes
git diff                     # Review actual code changes
git add -p                   # Stage changes selectively
git commit -m "Type: Brief description

Detailed explanation of changes and why they were made.

- Bullet point list of key changes
- Related to issue #X (if applicable)
"
```

### 7. Documentation Updates
- Update CLAUDE.md if feature specifications changed
- Update relevant .md files in project root if architecture changed
- Add JSDoc comments to new public functions
- Update API endpoint documentation if routes changed

### 8. Child Safety Compliance Check (Critical)
For any changes involving:
- User data models
- Profile information
- Verification systems
- Messaging features

**Verify**:
- ✅ NO child personal information is stored
- ✅ NO children's names, photos, or identifying details
- ✅ Parent-only authentication and access
- ✅ Encryption for sensitive parent data
- ✅ Proper verification badges and security indicators

## Minimum Requirements for Task Completion

### All Tasks
- [ ] Code compiles/runs without errors
- [ ] Linting passes
- [ ] No console.log statements (use proper logging)
- [ ] Git status clean (no unexpected files)

### Backend Tasks
- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No security vulnerabilities introduced
- [ ] API endpoints documented
- [ ] Database migrations applied (if needed)

### Mobile Tasks
- [ ] App builds successfully on iOS
- [ ] No TypeScript errors
- [ ] Navigation works correctly
- [ ] No layout/styling issues on iPhone 17 Pro simulator
- [ ] State management properly implemented

### Database Tasks
- [ ] Migration tested (up and down)
- [ ] Seed data works
- [ ] Queries optimized
- [ ] Indexes added where needed
- [ ] Foreign keys and constraints proper

## CI/CD Checklist (Future)
- [ ] All automated tests pass
- [ ] Docker image builds successfully
- [ ] No breaking API changes (or properly versioned)
- [ ] Environment variables documented
- [ ] Deployment scripts updated (if applicable)
