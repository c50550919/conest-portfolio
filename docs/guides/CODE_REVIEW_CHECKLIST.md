# Code Review Checklist

> **Security-Focused Review Guide for CoNest**
> For reviewers of PRs - especially AI-generated code.

## Review Priority Order

1. **Security** - Can this be exploited?
2. **Child Safety** - Does this protect children's privacy?
3. **Correctness** - Does it work as intended?
4. **Maintainability** - Can others understand and modify it?
5. **Performance** - Is it efficient enough?

---

## Security Review

### Authentication & Authorization
- [ ] Protected routes have auth middleware applied
- [ ] User ID comes from verified JWT, not request body
- [ ] Role/permission checks present where needed
- [ ] Verification status checked for sensitive operations
- [ ] Session invalidation handled properly

### Input Validation
- [ ] All user input validated with Zod schemas
- [ ] Validation happens at route/controller level
- [ ] File uploads checked for type, size, malicious content
- [ ] Query parameters sanitized
- [ ] No SQL injection vectors (Knex parameterization used)

### Secrets & Credentials
- [ ] No hardcoded secrets, API keys, or tokens
- [ ] No credentials in comments or test files
- [ ] Environment variables used for all secrets
- [ ] `.env.example` updated if new vars needed
- [ ] No secrets logged or included in error messages

### Data Exposure
- [ ] API responses don't leak internal IDs/structure
- [ ] Error messages don't expose system internals
- [ ] Logs don't contain PII (or it's masked)
- [ ] Database queries don't return unnecessary columns

---

## Child Safety Review (CoNest-Specific)

> **These are non-negotiable. Reject PR if any fail.**

- [ ] NO new database fields for child data
- [ ] NO child names, photos, birthdates, or identifiers
- [ ] NO storage of information that could identify children
- [ ] Audit logging present for data access
- [ ] Parent-only profile model maintained

### Red Flags to Reject Immediately
| Pattern | Risk |
|---------|------|
| `child_name`, `child_age`, `child_photo` fields | Direct child data storage |
| `children: []` array with details | Child information collection |
| `minor`, `dependent` with identifiable info | Indirect child data |
| Unencrypted sensitive data | Data breach risk |

---

## Design & Structure Review

### Layer Compliance
- [ ] Controllers only validate, delegate, and respond
- [ ] Services contain business logic
- [ ] Models handle data access only
- [ ] No business logic in routes or middleware

### Code Organization
- [ ] Change isolated to appropriate folder(s)
- [ ] No "god files" accumulating unrelated functions
- [ ] Related changes grouped logically
- [ ] New features follow team's agreed structure

### Dependencies
- [ ] No unnecessary new dependencies added
- [ ] New dependencies vetted for security (npm audit)
- [ ] Dependencies pinned to specific versions
- [ ] License compatibility checked

---

## Quality & Maintainability Review

### Naming & Clarity
- [ ] Names are clear and domain-specific
- [ ] No `doStuff`, `handleData`, `processItem` generic names
- [ ] Abbreviations avoided or well-known
- [ ] Function names describe what they do

### Complexity
- [ ] Functions have single responsibility
- [ ] Cyclomatic complexity reasonable (CC ≤ 10)
- [ ] Nesting depth ≤ 3 levels
- [ ] Long functions broken into smaller units

### Code Smells to Flag
| Smell | Suggestion |
|-------|------------|
| Function > 50 lines | Break into smaller functions |
| > 4 parameters | Use options object |
| Deep nesting | Extract to separate functions |
| Duplicate code blocks | Extract to shared utility |
| `// TODO` without issue link | Create issue or fix now |
| Commented-out code | Delete it (git has history) |

---

## Testing Review

### Coverage
- [ ] New logic has unit tests
- [ ] New endpoints have integration tests
- [ ] Edge cases covered (null, empty, boundary)
- [ ] Error paths tested

### Test Quality
- [ ] Tests are independent (no shared state)
- [ ] Mocks used for external services
- [ ] No real credentials in tests
- [ ] Test names describe behavior being tested

### Existing Tests
- [ ] All existing tests still pass
- [ ] No tests disabled without justification
- [ ] Flaky tests addressed, not ignored

---

## Performance Review

### Database
- [ ] Queries use appropriate indexes
- [ ] No N+1 query patterns
- [ ] Large result sets paginated
- [ ] Transactions used for multi-step operations

### Network & I/O
- [ ] No unbounded loops around network calls
- [ ] Timeouts set for external API calls
- [ ] Retries have exponential backoff
- [ ] Caching used where appropriate

### Memory & CPU
- [ ] No memory leaks (event listeners cleaned up)
- [ ] Large data processed in streams/chunks
- [ ] Expensive operations not in hot paths

---

## Documentation Review

- [ ] Complex logic has explanatory comments
- [ ] Public APIs have JSDoc/TSDoc
- [ ] README updated if behavior changes
- [ ] API documentation updated (Swagger)
- [ ] Breaking changes documented

---

## Final Checklist

Before approving:

```
[ ] All CI checks pass (ESLint, TypeScript, tests, security)
[ ] No new high/critical vulnerabilities
[ ] Child safety rules not violated
[ ] Code follows project patterns
[ ] Changes match PR description
[ ] No obvious performance regressions
```

### Approval Levels

| Change Type | Required Approvals |
|-------------|-------------------|
| Bug fix (small) | 1 reviewer |
| New feature | 1 reviewer + architect review |
| Security-related | 2 reviewers |
| Database migration | 2 reviewers + DBA if available |
| Auth/encryption changes | 2 reviewers |

---

## Review Response Templates

### Requesting Changes
```markdown
### Changes Requested

**Security:**
- [ ] Issue: [description]
  - Location: `file.ts:line`
  - Suggestion: [fix]

**Quality:**
- [ ] Issue: [description]
  - Location: `file.ts:line`
  - Suggestion: [fix]

Please address these before approval.
```

### Approving
```markdown
### Approved

**Reviewed:**
- [x] Security checklist
- [x] Child safety compliance
- [x] Code quality
- [x] Tests adequate

LGTM!
```

---

*Last updated: December 2024*
*Required for all PRs to `main` and `develop` branches*
