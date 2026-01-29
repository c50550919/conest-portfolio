# Feature-Based Architecture Migration Plan

> **CoNest Backend Refactoring Guide**
> Gradual migration from layer-based to feature-based structure

## Executive Summary

| Aspect | Current | Target |
|--------|---------|--------|
| Structure | Layer-based (`controllers/`, `services/`, etc.) | Feature-based (`features/{domain}/`) |
| Timeline | Immediate start | 3-6 months gradual migration |
| Risk | Low (gradual, test-covered) | N/A |
| Team Size | 1 developer | Scaling to 3-4 developers |

---

## Why This Migration?

### Current Pain Points
- 27 services in one folder → hard to find related code
- 16 controllers in one folder → merge conflicts with multiple devs
- Understanding a feature requires opening 4+ folders
- New developer onboarding takes longer than necessary

### Benefits of Feature-Based
- All auth code in `src/features/auth/` → one folder to understand
- Feature ownership clear for team assignments
- Easy to extract to microservice later (just move the folder)
- Merge conflicts isolated to feature folders

---

## Target Architecture

```
backend/src/
├── features/                    # Feature modules
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.model.ts
│   │   ├── auth.validator.ts
│   │   ├── auth.types.ts
│   │   └── __tests__/
│   │       ├── auth.unit.test.ts
│   │       └── auth.integration.test.ts
│   ├── discovery/
│   ├── matching/
│   ├── messaging/
│   ├── moderation/
│   ├── payments/
│   ├── household/
│   ├── verification/
│   ├── connections/
│   ├── saved-profiles/
│   └── admin/
│
├── shared/                      # Cross-cutting concerns
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.ts
│   │   ├── errorHandler.ts
│   │   └── ...
│   ├── utils/
│   ├── types/
│   └── validators/              # Shared validation utilities
│
├── infra/                       # Infrastructure layer
│   ├── database.ts
│   ├── redis.ts
│   ├── socket.ts
│   ├── s3.ts
│   └── logger.ts
│
├── config/                      # Configuration
│   ├── env.ts
│   ├── security.ts
│   ├── stripe.ts
│   └── ...
│
├── migrations/                  # Database migrations
├── seeds/                       # Seed data
├── workers/                     # Background workers
│
├── app.ts                       # Express app setup
└── server.ts                    # Server bootstrap
```

---

## Migration Phases

### Phase 0: Preparation (Week 1)
**Status: IN PROGRESS**

- [x] Create quality documentation (CODE_QUALITY_STANDARDS.md, etc.)
- [x] Update Node.js to v20 in CI
- [x] Tighten ESLint rules
- [ ] Create `src/features/` directory
- [ ] Create `src/shared/` directory
- [ ] Create `src/infra/` directory
- [ ] Update import path aliases in tsconfig.json

### Phase 1: New Features Only (Weeks 2-4)
**Goal: Prove the pattern without touching existing code**

- [ ] All NEW features go in `src/features/{name}/`
- [ ] Document the pattern for future developers
- [ ] Create feature generator script (optional)

**Example: If adding "notifications" feature:**
```
src/features/notifications/
├── notifications.controller.ts
├── notifications.service.ts
├── notifications.routes.ts
├── notifications.model.ts
└── notifications.types.ts
```

### Phase 2: High-Churn Migration (Weeks 4-8)
**Goal: Migrate features you're actively working on**

**Priority Order (based on change frequency and isolation):**

| Priority | Feature | Files to Migrate | Complexity | Owner |
|----------|---------|------------------|------------|-------|
| 1 | `auth` | 4 files | Medium | You |
| 2 | `discovery` | 4 files | Low | New Dev A |
| 3 | `matching` | 3 files | Medium | New Dev B |
| 4 | `messaging` | 5 files | High | You |
| 5 | `verification` | 4 files | Medium | New Dev A |

### Phase 3: Gradual Legacy Migration (Months 2-6)
**Goal: Migrate remaining code as it's touched**

**Rule: When touching old code, migrate it.**

| Feature | Current Location | Migrate When |
|---------|------------------|--------------|
| `payments` | controllers/, services/ | Next payment feature |
| `household` | controllers/, services/ | Next household change |
| `moderation` | controllers/, services/ | Next moderation update |
| `connections` | controllers/, services/ | Next connection feature |
| `saved-profiles` | controllers/, services/ | Next save feature |
| `admin` | controllers/, services/ | Next admin feature |

---

## Migration Checklist Per Feature

### Before Migration
- [ ] Identify all files belonging to the feature
- [ ] Map dependencies (what does it import, what imports it)
- [ ] Ensure test coverage exists
- [ ] Create feature folder structure

### During Migration
```bash
# 1. Create feature folder
mkdir -p src/features/{feature-name}

# 2. Move files
mv src/controllers/{feature}Controller.ts src/features/{feature}/{feature}.controller.ts
mv src/services/{Feature}Service.ts src/features/{feature}/{feature}.service.ts
mv src/routes/{feature}.ts src/features/{feature}/{feature}.routes.ts
mv src/models/{Feature}.ts src/features/{feature}/{feature}.model.ts
mv src/validators/{feature}*.ts src/features/{feature}/{feature}.validator.ts

# 3. Update imports in moved files
# 4. Update imports in files that reference moved files
# 5. Run tests
npm test

# 6. Run lint
npm run lint
```

### After Migration
- [ ] All imports updated
- [ ] Tests pass
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Feature works in dev environment

---

## Detailed Feature Migration Plans

### Auth Feature (Priority 1)

**Files to Migrate:**
| Current Location | New Location |
|------------------|--------------|
| `src/controllers/authController.ts` | `src/features/auth/auth.controller.ts` |
| `src/services/authService.ts` | `src/features/auth/auth.service.ts` |
| `src/routes/auth.ts` | `src/features/auth/auth.routes.ts` |
| `src/models/User.ts` | `src/features/auth/auth.model.ts` |
| `src/validators/auth.validator.ts` | `src/features/auth/auth.validator.ts` |
| `src/validators/authSchemas.ts` | `src/features/auth/auth.schemas.ts` |

**Dependencies to Update:**
- `src/middleware/auth.middleware.ts` → stays in `src/shared/middleware/`
- `src/services/oauthService.ts` → moves to `src/features/auth/oauth.service.ts`
- `src/controllers/oauthController.ts` → moves to `src/features/auth/oauth.controller.ts`

**Estimated Time:** 2-3 hours

### Discovery Feature (Priority 2)

**Files to Migrate:**
| Current Location | New Location |
|------------------|--------------|
| `src/controllers/DiscoveryController.ts` | `src/features/discovery/discovery.controller.ts` |
| `src/services/DiscoveryService.ts` | `src/features/discovery/discovery.service.ts` |
| `src/routes/discovery.ts` | `src/features/discovery/discovery.routes.ts` |
| `src/validators/discoverySchemas.ts` | `src/features/discovery/discovery.schemas.ts` |
| `src/services/cache/DiscoveryCacheService.ts` | `src/features/discovery/discovery-cache.service.ts` |

**Estimated Time:** 1-2 hours

---

## Developer Assignment (When Team Grows)

| Developer | Primary Features | Secondary Features |
|-----------|------------------|-------------------|
| You (Lead) | auth, payments, architecture | All (oversight) |
| Developer A | discovery, verification, matching | connections |
| Developer B | messaging, moderation | saved-profiles |
| Developer C | household, admin | notifications (new) |

**Ground Rules:**
1. Each feature owned by one developer
2. Cross-feature changes require owner review
3. Shared code (middleware, utils) requires lead review
4. New features start in `src/features/` from day one

---

## Rollback Strategy

If migration causes issues:

1. **Per-feature rollback:** Simply move files back and restore imports
2. **Git-based:** Each feature migration is a separate PR, revert if needed
3. **Parallel operation:** Both structures can coexist during transition

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to understand feature | 15-30 min | 5-10 min | Developer survey |
| Merge conflicts/week | N/A (solo) | <2 | Git stats |
| New dev onboarding | 2+ weeks | 1 week | Actual time |
| Files in controllers/ | 16 | 0 | `ls | wc -l` |
| Files in services/ | 27 | <5 (shared only) | `ls | wc -l` |

---

## Timeline Summary

```
Week 1:     [Preparation - Setup folders, update configs] ✅ IN PROGRESS
Week 2-4:   [New features only in feature-based structure]
Week 4-8:   [Migrate auth, discovery, matching]
Month 2-3:  [Migrate messaging, verification, payments]
Month 3-6:  [Migrate remaining as touched]
Month 6+:   [Legacy folders empty, migration complete]
```

---

## Quick Start Commands

```bash
# Create the new structure
mkdir -p src/features src/shared/{middleware,utils,types} src/infra

# Move shared middleware
mv src/middleware/* src/shared/middleware/

# Move infrastructure
mv src/config/database.ts src/infra/
mv src/config/redis.ts src/infra/
mv src/config/socket.ts src/infra/

# Update path aliases in tsconfig.json (optional but recommended)
# Add:
# "paths": {
#   "@features/*": ["src/features/*"],
#   "@shared/*": ["src/shared/*"],
#   "@infra/*": ["src/infra/*"],
#   "@config/*": ["src/config/*"]
# }
```

---

*Created: December 2024*
*Status: Phase 0 - Preparation*
*Next Review: After Phase 1 completion*
