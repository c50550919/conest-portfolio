## Summary

<!-- Provide a brief description of what this PR does -->

Closes #<!-- issue number -->

## Changes

<!-- List the main changes in this PR -->

-
-
-

## Type of Change

<!-- Mark the appropriate option with [x] -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 🔧 Refactoring (no functional changes, code improvement)
- [ ] 📝 Documentation (documentation only changes)
- [ ] 🏗️ Infrastructure (CI/CD, deployment, dependencies)
- [ ] 🧪 Tests (adding or updating tests)

## Testing Performed

<!-- Describe the tests you ran to verify your changes -->

### Manual Testing
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Tested API endpoints via curl/Postman
- [ ] N/A - Backend only changes
- [ ] N/A - Frontend only changes

### Automated Tests
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Added new tests for changes
- [ ] Updated existing tests

### Test Evidence
<!-- Include screenshots, API responses, or test output -->

<details>
<summary>Screenshots / Test Output</summary>

<!-- Paste screenshots or test output here -->

</details>

## Code Quality Checklist

<!-- Verify each item before requesting review -->

### General
- [ ] Code follows the project's style guidelines
- [ ] Self-review completed - code is clean and readable
- [ ] Comments added for complex logic
- [ ] No unnecessary console.log or debug statements
- [ ] TypeScript types are properly defined (no `any` abuse)

### Security (Required for all PRs)
- [ ] **No sensitive data (API keys, passwords) committed**
- [ ] **No child data collection or storage** (CoNest safety requirement)
- [ ] Input validation added for user inputs
- [ ] SQL injection / XSS vulnerabilities checked
- [ ] Authentication/authorization verified if applicable

### Performance
- [ ] No obvious N+1 queries or performance issues
- [ ] Large lists use pagination/virtualization
- [ ] Images optimized if added

### Documentation
- [ ] README updated if needed
- [ ] API documentation updated if endpoints changed
- [ ] Inline comments for complex code
- [ ] CHANGELOG updated for user-facing changes

## Database Changes

<!-- If this PR includes database changes -->

- [ ] N/A - No database changes
- [ ] Migration file added
- [ ] Migration tested on fresh database
- [ ] Migration tested on existing data
- [ ] Rollback migration tested

## Dependencies

<!-- If this PR adds/updates dependencies -->

- [ ] N/A - No dependency changes
- [ ] Package.json updated
- [ ] Package-lock.json regenerated
- [ ] Security audit passed (`npm audit`)
- [ ] License compatibility verified

## Deployment Notes

<!-- Any special instructions for deploying this change -->

- [ ] N/A - Standard deployment
- [ ] Environment variables need updating
- [ ] Database migration required
- [ ] Feature flag required
- [ ] Coordination with other services needed

<details>
<summary>Deployment Instructions</summary>

<!-- Add specific deployment steps if needed -->

</details>

## Related Issues / PRs

<!-- Link any related issues or PRs -->

- Related to #
- Depends on #
- Blocks #

---

## Reviewer Guidelines

**For Reviewers:**
1. Check code logic correctness
2. Verify security implications
3. Assess performance impact
4. Ensure adequate test coverage
5. Verify documentation is updated

**Approval Requirements:**
- [ ] At least 1 approval for small changes
- [ ] At least 2 approvals for:
  - [ ] Security-related changes
  - [ ] Database migrations
  - [ ] Breaking changes
  - [ ] Infrastructure changes
