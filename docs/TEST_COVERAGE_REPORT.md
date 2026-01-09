# API Test Coverage Report

**Generated:** 2025-12-30
**Total Endpoints:** 111
**Existing Tests:** 32 test files
**Coverage Status:** Partial - Key flows covered, gaps identified

---

## Executive Summary

The CoNest backend has **32 test files** covering critical user flows. This report identifies test coverage status for all 111 API endpoints and prioritizes missing tests by risk level.

### Coverage Overview

| Category | Endpoints | Tested | Coverage |
|----------|-----------|--------|----------|
| Authentication | 8 | 6 | 75% |
| Profile | 8 | 0 | 0% |
| Discovery | 2 | 1 | 50% |
| Matching | 6 | 1 | 17% |
| Messages | 15 | 0 | 0% |
| Connections | 10 | 4 | 40% |
| Verification | 9 | 1 | 11% |
| Payments | 13 | 3 | 23% |
| Saved Profiles | 9 | 5 | 56% |
| Household | 7 | 0 | 0% |
| Admin | 19 | 2 | 11% |
| Comparison | 2 | 0 | 0% |

**Overall: ~25% endpoint coverage**

---

## Detailed Coverage by Feature

### Authentication (`/api/auth/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/register` | POST | ✅ Covered | - |
| `/login` | POST | ✅ Covered | - |
| `/logout` | POST | ❌ Missing | Medium |
| `/refresh` | POST | ✅ Covered | - |
| `/google` | POST | ✅ Covered | - |
| `/google/callback` | GET | ✅ Covered | - |
| `/apple` | POST | ✅ Covered | - |
| `/apple/callback` | GET | ✅ Covered | - |

**Existing Tests:**
- oauth-google.contract.test.ts
- oauth-apple.contract.test.ts
- oauth-google-signup.integration.test.ts
- oauth-apple-signup.integration.test.ts
- oauth-returning-user.integration.test.ts
- oauth-account-linking.integration.test.ts
- oauth-invalid-token.security.test.ts
- oauth-rate-limiting.security.test.ts

### Profile (`/api/profiles/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/` | POST | ❌ Missing | HIGH |
| `/me` | GET | ❌ Missing | HIGH |
| `/me` | PUT | ❌ Missing | HIGH |
| `/me` | DELETE | ❌ Missing | Medium |
| `/search` | GET | ❌ Missing | Medium |
| `/:id` | GET | ❌ Missing | Medium |
| `/photo` | POST | ❌ Missing | Medium |
| `/photo` | DELETE | ❌ Missing | Low |

**Recommended Tests:**
```typescript
// profile-create.contract.test.ts
// profile-get-me.contract.test.ts
// profile-update.contract.test.ts
// profile-search.contract.test.ts
// profile-photo-upload.contract.test.ts
```

### Discovery (`/api/discovery/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/profiles` | GET | ✅ Covered | - |
| `/screenshot` | POST | ❌ Missing | Medium |

**Existing Tests:**
- discovery-profiles-get.contract.test.ts

### Matching (`/api/matches/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/find` | GET | ❌ Missing | HIGH |
| `/my-matches` | GET | ❌ Missing | HIGH |
| `/compatibility/:targetUserId` | GET | ❌ Missing | Medium |
| `/:id` | GET | ❌ Missing | Medium |
| `/create` | POST | ✅ Partial | - |
| `/:id/respond` | POST | ❌ Missing | HIGH |

**Existing Tests:**
- matching.integration.test.ts.skip (currently skipped)

### Messages (`/api/messages/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/:matchId/history` | GET | ❌ Missing | HIGH |
| `/` | POST | ❌ Missing | HIGH |
| `/conversations` | GET | ❌ Missing | HIGH |
| `/conversations/:userId` | GET | ❌ Missing | Medium |
| `/unread-count` | GET | ❌ Missing | Medium |
| `/send` | POST | ❌ Missing | HIGH |
| `/:conversationId/mark-read` | POST | ❌ Missing | Medium |
| `/:messageId` | DELETE | ❌ Missing | Medium |
| `/verified` | POST | ❌ Missing | HIGH |
| `/:messageId/report` | POST | ❌ Missing | HIGH |
| `/conversations/:conversationId/block` | POST | ❌ Missing | HIGH |
| `/verification-status/:userId` | GET | ❌ Missing | Medium |
| `/admin/reports/pending` | GET | ❌ Missing | Medium |
| `/admin/moderate/:messageId` | POST | ❌ Missing | HIGH |

**Priority Rationale:** Messaging is core functionality with child safety implications.

### Connection Requests (`/api/connections/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/` | POST | ✅ Covered | - |
| `/` | GET | ✅ Covered | - |
| `/sent` | GET | ❌ Missing | Low |
| `/received` | GET | ❌ Missing | Low |
| `/:id` | GET | ❌ Missing | Low |
| `/:id` | DELETE | ✅ Covered | - |
| `/:id/respond` | POST | ✅ Covered | - |
| `/:id/accept` | POST | ❌ Missing | Medium |
| `/:id/decline` | POST | ❌ Missing | Medium |
| `/stats` | GET | ❌ Missing | Low |

**Existing Tests:**
- connection-requests-post.contract.test.ts
- connection-requests-get.contract.test.ts
- connection-requests-delete.contract.test.ts
- connection-requests-respond.contract.test.ts

### Verification (`/api/verifications/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/status` | GET | ✅ Covered | - |
| `/email/send` | POST | ❌ Missing | HIGH |
| `/email/verify/:userId` | GET | ❌ Missing | HIGH |
| `/id/initiate` | POST | ❌ Missing | HIGH |
| `/id/complete` | POST | ❌ Missing | HIGH |
| `/background/initiate` | POST | ❌ Missing | HIGH |
| `/income/initiate` | POST | ❌ Missing | Medium |
| `/webhook/veriff` | POST | ❌ Missing | HIGH |
| `/webhook/certn` | POST | ❌ Missing | HIGH |

**Existing Tests:**
- verification-status.contract.test.ts

**Priority Rationale:** Verification is critical for trust and safety compliance.

### Payments (`/api/payments/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/create` | POST | ✅ Covered | - |
| `/my-payments` | GET | ❌ Missing | Medium |
| `/household/:householdId` | GET | ❌ Missing | Medium |
| `/overdue` | GET | ❌ Missing | Medium |
| `/:paymentId/refund` | POST | ❌ Missing | HIGH |
| `/household/:householdId/split-rent` | POST | ❌ Missing | Medium |
| `/stripe/create-account` | POST | ❌ Missing | HIGH |
| `/stripe/onboarding/:householdId` | GET | ❌ Missing | Medium |
| `/stripe/webhook` | POST | ✅ Covered | - |
| `/status` | GET | ✅ Covered | - |

**Existing Tests:**
- payments-create-intent.contract.test.ts
- payments-status.contract.test.ts
- payments-webhook-stripe.contract.test.ts

### Saved Profiles (`/api/saved-profiles/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/` | POST | ✅ Covered | - |
| `/` | GET | ✅ Covered | - |
| `/:id` | DELETE | ✅ Covered | - |
| `/:id/folder` | PUT | ✅ Covered | - |
| `/:id/notes` | PUT | ✅ Covered | - |

**Existing Tests:**
- saved-profiles-post.contract.test.ts
- saved-profiles-get.contract.test.ts
- saved-profiles-delete.contract.test.ts
- saved-profiles-move.contract.test.ts
- saved-profiles-update.contract.test.ts

### Household (`/api/households/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/` | POST | ❌ Missing | HIGH |
| `/:id` | GET | ❌ Missing | HIGH |
| `/:id` | PATCH | ❌ Missing | Medium |
| `/:id/members` | GET | ❌ Missing | Medium |
| `/:id/members` | POST | ❌ Missing | HIGH |
| `/:id/expenses` | GET | ❌ Missing | Medium |
| `/:id/expenses` | POST | ❌ Missing | Medium |

### Admin (`/api/admin/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/verifications/queue` | GET | ✅ Covered | - |
| `/verifications/:userId` | GET | ✅ Covered | - |
| `/verifications/:userId/approve` | POST | ✅ Partial | - |
| `/verifications/:userId/reject` | POST | ✅ Partial | - |
| `/verifications/stats/overview` | GET | ❌ Missing | Medium |
| `/verifications/status/:status` | GET | ❌ Missing | Low |
| `/users/search` | GET | ❌ Missing | Medium |
| `/users/:userId/verification-history` | GET | ❌ Missing | Low |
| `/moderation/queue` | GET | ❌ Missing | HIGH |
| `/moderation/queue/urgent` | GET | ❌ Missing | HIGH |
| `/moderation/stats` | GET | ❌ Missing | Medium |
| `/moderation/:messageId/context` | GET | ❌ Missing | HIGH |
| `/moderation/:messageId/approve` | POST | ❌ Missing | HIGH |
| `/moderation/:messageId/confirm-violation` | POST | ❌ Missing | HIGH |
| `/moderation/:messageId/false-positive` | POST | ❌ Missing | HIGH |
| `/moderation/patterns/:userId` | GET | ❌ Missing | Medium |
| `/users/:userId/warn` | POST | ❌ Missing | HIGH |
| `/users/:userId/suspend` | POST | ❌ Missing | HIGH |
| `/users/:userId/ban` | POST | ❌ Missing | HIGH |

**Existing Tests:**
- admin-verification-queue.contract.test.ts
- admin-verification-review.contract.test.ts

### Comparison (`/api/comparison/`)
| Endpoint | Method | Test Status | Priority |
|----------|--------|-------------|----------|
| `/compare` | POST | ❌ Missing | Medium |
| `/calculate` | POST | ❌ Missing | Medium |

---

## Priority Test Recommendations

### CRITICAL (Child Safety Compliance)
1. **Moderation endpoints** - All admin moderation actions
2. **Message reporting** - `/messages/:messageId/report`
3. **User sanctions** - `/admin/users/:userId/warn|suspend|ban`

### HIGH (Core Functionality)
1. **Profile CRUD** - All profile endpoints
2. **Matching flow** - `/matches/find`, `/matches/my-matches`, `/:id/respond`
3. **Messaging** - Send, history, conversations
4. **Verification flow** - Email, ID, background check initiation
5. **Household creation** - `/households/` POST

### MEDIUM (Business Logic)
1. **Payment refunds** - `/:paymentId/refund`
2. **Connection accept/decline** - `/:id/accept`, `/:id/decline`
3. **Search endpoints** - Profile search, user search

### LOW (Nice to Have)
1. **Stats endpoints** - Various overview and statistics
2. **Photo deletion** - Profile photo management

---

## Test Infrastructure Status

### Current Test Setup
- **Framework:** Jest
- **Test Types:** Contract tests, Integration tests, Security tests, Unit tests
- **Mocking:** Auth middleware mocked for authenticated endpoints
- **Database:** Test database with migrations

### Recommended Improvements
1. Add test coverage reporting to CI/CD
2. Create shared test utilities for common patterns
3. Add performance benchmarks for critical paths
4. Implement visual regression testing for admin dashboard

---

## Next Steps

1. **Immediate:** Write tests for moderation endpoints (child safety critical)
2. **Short-term:** Cover all profile and matching endpoints
3. **Medium-term:** Complete messaging test suite
4. **Long-term:** Achieve 80%+ endpoint coverage

---

*Report generated by compliance-test-generator skill*
