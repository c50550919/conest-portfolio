# AI Code Checklist

> **For Claude, Copilot, and Human Reviewers**
> Use this checklist when generating or reviewing AI-assisted code for CoNest.

## Pre-Generation: Context Gathering

Before generating code, AI assistants MUST:

- [ ] Read the relevant existing files to understand patterns
- [ ] Check `CODE_QUALITY_STANDARDS.md` for project rules
- [ ] Understand the feature domain and its boundaries
- [ ] Identify related tests that need updating

## Structure & Boundaries

### File Placement
- [ ] Code placed in correct folder (`src/controllers/`, `src/services/`, etc.)
- [ ] New features use feature-based structure when applicable
- [ ] No "misc", "utils-new", or dumping-ground files created
- [ ] Related files co-located appropriately

### Layer Responsibilities

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| **Controllers** | Validate input, call services, map to HTTP responses | Direct DB calls, business logic |
| **Services** | Business logic, orchestration, external API calls | Direct HTTP response handling |
| **Models** | Data access, schema definitions, DB queries | Business logic, HTTP concerns |
| **Middleware** | Cross-cutting concerns (auth, logging, rate limiting) | Feature-specific logic |
| **Validators** | Input validation schemas (Zod) | Business validation rules |

## Type Safety

- [ ] No implicit `any` - all parameters and returns typed
- [ ] No `// @ts-ignore` without documented justification
- [ ] Null/undefined handled explicitly (no unchecked optional chaining)
- [ ] External APIs have typed request/response interfaces
- [ ] Zod schemas used for runtime validation at boundaries

### Type Patterns to Use
```typescript
// Good: Explicit types
async function getUser(id: string): Promise<User | null> { }

// Good: Zod for external input
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// Bad: Implicit any
async function processData(data) { }  // Never do this
```

## Security for CoNest (Child Safety Platform)

### Secrets Management
- [ ] No secrets in code, tests, or comments
- [ ] All credentials from `process.env` or secret manager
- [ ] No API keys, tokens, or passwords hardcoded
- [ ] `.env.example` updated if new env vars added

### Input Handling
- [ ] All user input validated with Zod schemas
- [ ] SQL queries use parameterized statements (Knex handles this)
- [ ] No raw string concatenation for queries or commands
- [ ] File uploads validated for type, size, and content

### Authentication & Authorization
- [ ] Auth middleware applied to protected routes
- [ ] User ID extracted from verified JWT, never from request body
- [ ] Role/permission checks in controllers or middleware
- [ ] Verification status checked for sensitive operations

### Child Safety (Non-Negotiable)
- [ ] NO child data fields added to any schema
- [ ] NO child names, photos, birthdates, or identifiable info
- [ ] Parent profiles only - children are protected by design
- [ ] Audit logging for any data access patterns

## Observability & Errors

### Logging
- [ ] Use structured logger (`src/config/logger.ts`), not `console.log`
- [ ] Log messages are JSON-formatted for parsing
- [ ] PII redacted from logs (emails, names masked)
- [ ] No secrets, tokens, or full error stacks in logs

### Error Handling
```typescript
// Good: Structured error with context
throw new AppError('User not found', {
  code: 'USER_NOT_FOUND',
  userId: id,  // Safe context
  statusCode: 404,
});

// Bad: Exposing internals
throw new Error(`DB query failed: ${query}`);  // Never expose query
```

- [ ] Errors include context tags for debugging
- [ ] No raw secrets or tokens in error messages
- [ ] Appropriate HTTP status codes returned
- [ ] Error responses don't leak internal structure

## Testing Requirements

### For New Code
- [ ] Unit tests for all business logic functions
- [ ] Integration tests for new API endpoints
- [ ] Edge cases covered (null, empty, invalid input)
- [ ] Existing tests still pass

### Test Quality
- [ ] Tests use mocks for external services
- [ ] No real network calls in tests
- [ ] No production credentials in test files
- [ ] Test file naming: `*.test.ts` or `*.spec.ts`

### Coverage Expectations
| Code Type | Unit Test | Integration Test |
|-----------|-----------|------------------|
| Service method | Required | If public API |
| Controller | Optional | Required |
| Utility function | Required | Optional |
| Validator | Required | Optional |

## Performance Considerations

- [ ] Database queries use appropriate indexes
- [ ] N+1 query patterns avoided (use eager loading)
- [ ] Large result sets paginated
- [ ] Expensive operations cached when appropriate
- [ ] No unbounded loops around network/DB calls

## Code Style

- [ ] Follows existing project patterns
- [ ] Formatted with Prettier before commit
- [ ] Imports organized (external, then internal)
- [ ] No commented-out code blocks
- [ ] Clear, domain-specific naming (no `doStuff`, `handleData`)

## Pre-Commit Checklist

Before marking code as complete:

```bash
# Run these locally
npm run lint          # ESLint passes
npm run format:check  # Prettier formatted
npm run test          # All tests pass
npm run build         # TypeScript compiles
```

- [ ] All four commands pass
- [ ] No new ESLint warnings introduced
- [ ] PR description explains changes clearly
- [ ] Related tests added or updated

---

## Quick Reference: Common Mistakes

| Mistake | Fix |
|---------|-----|
| `any` type | Define proper interface |
| `console.log` | Use `logger.info()` |
| Hardcoded secret | Use `process.env.SECRET_NAME` |
| Direct DB in controller | Move to service layer |
| Missing error handling | Add try/catch with proper error |
| No input validation | Add Zod schema |
| Missing test | Add unit/integration test |

---

*This checklist is enforced by code review. AI-generated PRs without checklist compliance will be rejected.*
