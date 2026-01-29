# Code Quality Standards

> **CoNest Platform** - Single Parent Housing Application
> Enforced via CI/CD pipeline. PRs blocked if gates fail.

## Languages & Style

- All backend code MUST be in TypeScript (`.ts`)
- `strict` mode MUST be enabled in `tsconfig.json`
- Formatting enforced by Prettier; no manual style bikeshedding
- Follow existing project patterns for imports, naming, and structure

## Complexity & Size Limits

| Metric | Limit | ESLint Rule | Rationale |
|--------|-------|-------------|-----------|
| Cyclomatic complexity | CC ≤ 10 | `complexity` | Maintainable, testable functions |
| Nesting depth | ≤ 3 | `max-depth` | Readable control flow |
| Lines per function | ≤ 50 | `max-lines-per-function` | Single responsibility |
| Function parameters | ≤ 4 | `max-params` | Clear interfaces |
| Statements per function | ≤ 30 | `max-statements` | Focused logic |

These limits are enforced by:
- ESLint with `@typescript-eslint` plugin
- CI gates that block PRs exceeding thresholds

## Testing Requirements

### Coverage Thresholds
| Test Type | Location | Minimum Coverage |
|-----------|----------|------------------|
| Unit tests | `__tests__/unit/` | 80% lines/branches |
| Integration tests | `__tests__/integration/` | 70% critical paths |
| Security tests | `__tests__/security/` | All auth/encryption flows |
| Compliance tests | `__tests__/compliance/` | All child safety rules |

### Test Mandates
- New code MUST include unit tests for core logic
- All API endpoints MUST have integration tests (happy path + main failure)
- Tests MUST NOT make real calls to external services (mock everything)
- Tests MUST NOT use production credentials

## Static Analysis & Security

The following tools MUST pass on every PR to `main`:

### Required Gates
| Tool | Threshold | Action on Failure |
|------|-----------|-------------------|
| ESLint | No errors | PR blocked |
| TypeScript (`strict`) | No errors | PR blocked |
| npm audit | No high/critical | PR blocked |
| Snyk | No high/critical vulnerabilities | PR blocked |
| SonarQube | No Blocker/Critical issues | PR blocked |
| Prettier | Fully formatted | PR blocked |

### Security Scanning
- Snyk configured via `.snyk` for dependency vulnerabilities
- SonarQube configured via `sonar-project.properties`
- npm audit runs in CI with `--audit-level=moderate`

## Child Safety Compliance (Non-Negotiable)

CoNest is a child-safety-first platform. These rules have ZERO exceptions:

| Rule | Enforcement |
|------|-------------|
| NO child data in database schema | Compliance tests validate |
| NO child names, photos, or details stored | API rejects such submissions |
| Parent-only profiles | Schema constraints |
| End-to-end encryption for messages | `encryptionService.ts` |
| Audit logging for sensitive operations | `auditService.ts` |

## Code Organization

### Current: Layer-Based (Transitioning)
```
src/controllers/  - Request handling
src/services/     - Business logic
src/models/       - Data access
src/routes/       - Route definitions
src/middleware/   - Cross-cutting concerns
src/validators/   - Input validation
```

### Target: Feature-Based (New Code)
```
src/features/{domain}/
  ├── {domain}.controller.ts
  ├── {domain}.service.ts
  ├── {domain}.routes.ts
  ├── {domain}.model.ts
  └── {domain}.validator.ts
```

New features SHOULD use feature-based structure. Existing code migrates gradually.

## AI-Generated Code Rules

All AI-generated code MUST:
- [ ] Be reviewed against `AI_CODE_CHECKLIST.md` before merge
- [ ] Follow existing project patterns
- [ ] Include appropriate tests
- [ ] Be formatted with Prettier immediately
- [ ] Live in correct feature/layer folders (no "misc" dumping grounds)

### Forbidden Patterns (Enforced by ESLint/Semgrep)
| Pattern | Risk | Detection |
|---------|------|-----------|
| Hardcoded API keys/secrets | Security breach | Semgrep, git-secrets |
| Raw user input in SQL/prompts | Injection attacks | ESLint custom rules |
| Unbounded loops around network calls | Resource exhaustion | Code review |
| Direct DB calls from controllers | Bypasses business logic | Code review |
| `// @ts-ignore` without justification | Type safety hole | ESLint |
| `any` type without justification | Type safety hole | ESLint |

## Exception Process

Any deviation from these standards MUST be documented in the PR description:

```markdown
## Standards Exception

**Rule being bypassed:** [e.g., max-lines-per-function]
**Reason:** [Technical justification]
**Risk:** [What could go wrong]
**Cleanup plan:** [How/when this will be fixed]
**Reviewer acknowledgment:** [Requires explicit approval]
```

Exceptions require explicit reviewer approval and should be rare.

---

*Last updated: December 2024*
*Enforced by: GitHub Actions, ESLint, SonarQube, Snyk*
