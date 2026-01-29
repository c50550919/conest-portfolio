# Feature Migration Task List

> **CoNest Backend** - Systematic migration from layer-based to feature-based structure
>
> **Instructions:** Work through each feature one at a time. Complete all checkboxes for a feature before moving to the next. Run build + tests after each migration.

---

## Migration Status Overview

| # | Feature | Files | Status | Notes |
|---|---------|-------|--------|-------|
| 1 | auth | 4 | COMPLETE | Migrated with oauth dependency |
| 2 | oauth | 2 | PENDING | Extends auth feature |
| 3 | profile | 2 | PENDING | Simple, standalone |
| 4 | verification | 4 | PENDING | Includes review controller |
| 5 | household | 4 | PENDING | Standalone |
| 6 | discovery | 5 | PENDING | Includes cache service |
| 7 | saved-profiles | 4 | PENDING | Related to discovery |
| 8 | connections | 4 | PENDING | Related to saved-profiles |
| 9 | comparison | 4 | PENDING | Depends on discovery + saved |
| 10 | matching | 3 | PENDING | Core feature |
| 11 | messages | 7 | PENDING | Complex, includes socket |
| 12 | moderation | 2 | PENDING | Depends on messages |
| 13 | payments | 7 | PENDING | Includes webhooks, subscriptions |
| 14 | admin | 2 | PENDING | Depends on many features |
| 15 | shared/infra | ~8 | PENDING | Final cleanup |

---

## Task 1: OAuth Feature
**Complexity:** Low | **Dependencies:** auth (complete)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/services/oauthService.ts` | `src/features/auth/oauth.service.ts` |
| `src/controllers/oauthController.ts` | `src/features/auth/oauth.controller.ts` |

### Steps
- [ ] Create `oauth.service.ts` in `src/features/auth/`
- [ ] Create `oauth.controller.ts` in `src/features/auth/`
- [ ] Update imports in new files (use relative `./` paths within feature)
- [ ] Add exports to `src/features/auth/index.ts`
- [ ] Update `src/routes/oauth.ts` to import from `../features/auth`
- [ ] Search for any other files importing from old location
- [ ] Run `npm run build` - must pass
- [ ] Run `npm test -- --testPathPattern="oauth"` - check for regressions
- [ ] Delete old files from `src/services/` and `src/controllers/`
- [ ] Final build verification

---

## Task 2: Profile Feature
**Complexity:** Low | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/profileController.ts` | `src/features/profile/profile.controller.ts` |
| `src/routes/profile.ts` | `src/features/profile/profile.routes.ts` |

### Steps
- [ ] Create `src/features/profile/` directory
- [ ] Create `profile.controller.ts` with updated imports
- [ ] Create `profile.routes.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/profile`
- [ ] Search for any other files importing from old location
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to profile
- [ ] Delete old files
- [ ] Final build verification

---

## Task 3: Verification Feature
**Complexity:** Medium | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/verificationController.ts` | `src/features/verification/verification.controller.ts` |
| `src/controllers/verificationReviewController.ts` | `src/features/verification/verification-review.controller.ts` |
| `src/services/verificationService.ts` | `src/features/verification/verification.service.ts` |
| `src/routes/verification.ts` | `src/features/verification/verification.routes.ts` |

### Steps
- [ ] Create `src/features/verification/` directory
- [ ] Create `verification.service.ts` with updated imports
- [ ] Create `verification.controller.ts` with updated imports
- [ ] Create `verification-review.controller.ts` with updated imports
- [ ] Create `verification.routes.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/verification`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to verification
- [ ] Delete old files
- [ ] Final build verification

---

## Task 4: Household Feature
**Complexity:** Low | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/HouseholdController.ts` | `src/features/household/household.controller.ts` |
| `src/services/HouseholdService.ts` | `src/features/household/household.service.ts` |
| `src/routes/household.ts` | `src/features/household/household.routes.ts` |
| `src/validators/householdSchemas.ts` | `src/features/household/household.schemas.ts` |

### Steps
- [ ] Create `src/features/household/` directory
- [ ] Create `household.service.ts` with updated imports
- [ ] Create `household.controller.ts` with updated imports
- [ ] Create `household.routes.ts` with updated imports
- [ ] Create `household.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/household`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to household
- [ ] Delete old files
- [ ] Final build verification

---

## Task 5: Discovery Feature
**Complexity:** Medium | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/DiscoveryController.ts` | `src/features/discovery/discovery.controller.ts` |
| `src/services/DiscoveryService.ts` | `src/features/discovery/discovery.service.ts` |
| `src/services/cache/DiscoveryCacheService.ts` | `src/features/discovery/discovery-cache.service.ts` |
| `src/routes/discovery.ts` | `src/features/discovery/discovery.routes.ts` |
| `src/validators/discoverySchemas.ts` | `src/features/discovery/discovery.schemas.ts` |

### Steps
- [ ] Create `src/features/discovery/` directory
- [ ] Create `discovery.service.ts` with updated imports
- [ ] Create `discovery-cache.service.ts` with updated imports
- [ ] Create `discovery.controller.ts` with updated imports
- [ ] Create `discovery.routes.ts` with updated imports
- [ ] Create `discovery.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/discovery`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to discovery
- [ ] Delete old files (including `src/services/cache/` if empty)
- [ ] Final build verification

---

## Task 6: Saved Profiles Feature
**Complexity:** Low | **Dependencies:** None (conceptually related to discovery)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/savedProfileController.ts` | `src/features/saved-profiles/saved-profiles.controller.ts` |
| `src/services/SavedProfileService.ts` | `src/features/saved-profiles/saved-profiles.service.ts` |
| `src/routes/savedProfiles.ts` | `src/features/saved-profiles/saved-profiles.routes.ts` |
| `src/validators/savedProfileValidator.ts` | `src/features/saved-profiles/saved-profiles.schemas.ts` |

### Steps
- [ ] Create `src/features/saved-profiles/` directory
- [ ] Create `saved-profiles.service.ts` with updated imports
- [ ] Create `saved-profiles.controller.ts` with updated imports
- [ ] Create `saved-profiles.routes.ts` with updated imports
- [ ] Create `saved-profiles.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/saved-profiles`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to saved-profiles
- [ ] Delete old files
- [ ] Final build verification

---

## Task 7: Connections Feature
**Complexity:** Low | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/connectionRequestController.ts` | `src/features/connections/connections.controller.ts` |
| `src/services/ConnectionRequestService.ts` | `src/features/connections/connections.service.ts` |
| `src/routes/connectionRequests.ts` | `src/features/connections/connections.routes.ts` |
| `src/validators/connectionRequestValidator.ts` | `src/features/connections/connections.schemas.ts` |

### Steps
- [ ] Create `src/features/connections/` directory
- [ ] Create `connections.service.ts` with updated imports
- [ ] Create `connections.controller.ts` with updated imports
- [ ] Create `connections.routes.ts` with updated imports
- [ ] Create `connections.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/connections`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to connections
- [ ] Delete old files
- [ ] Final build verification

---

## Task 8: Comparison Feature
**Complexity:** Low | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/comparisonController.ts` | `src/features/comparison/comparison.controller.ts` |
| `src/services/ProfileComparisonService.ts` | `src/features/comparison/comparison.service.ts` |
| `src/routes/comparison.ts` | `src/features/comparison/comparison.routes.ts` |
| `src/validators/comparisonValidator.ts` | `src/features/comparison/comparison.schemas.ts` |

### Steps
- [ ] Create `src/features/comparison/` directory
- [ ] Create `comparison.service.ts` with updated imports
- [ ] Create `comparison.controller.ts` with updated imports
- [ ] Create `comparison.routes.ts` with updated imports
- [ ] Create `comparison.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/comparison`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to comparison
- [ ] Delete old files
- [ ] Final build verification

---

## Task 9: Matching Feature
**Complexity:** Medium | **Dependencies:** None

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/matchController.ts` | `src/features/matching/matching.controller.ts` |
| `src/services/matchingService.ts` | `src/features/matching/matching.service.ts` |
| `src/services/EnhancedPairingService.ts` | `src/features/matching/enhanced-pairing.service.ts` |
| `src/routes/matches.ts` | `src/features/matching/matching.routes.ts` |

### Steps
- [ ] Create `src/features/matching/` directory
- [ ] Create `matching.service.ts` with updated imports
- [ ] Create `enhanced-pairing.service.ts` with updated imports
- [ ] Create `matching.controller.ts` with updated imports
- [ ] Create `matching.routes.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/matching`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to matching
- [ ] Delete old files
- [ ] Final build verification

---

## Task 10: Messages Feature
**Complexity:** High | **Dependencies:** None (but complex)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/messageController.ts` | `src/features/messages/messages.controller.ts` |
| `src/services/MessagesService.ts` | `src/features/messages/messages.service.ts` |
| `src/services/messagingService.ts` | `src/features/messages/messaging.service.ts` |
| `src/services/EnhancedMessagingService.ts` | `src/features/messages/enhanced-messaging.service.ts` |
| `src/services/SocketService.ts` | `src/features/messages/socket.service.ts` |
| `src/routes/messages.ts` | `src/features/messages/messages.routes.ts` |
| `src/routes/enhancedMessages.ts` | `src/features/messages/enhanced-messages.routes.ts` |
| `src/validators/messageSchemas.ts` | `src/features/messages/messages.schemas.ts` |

### Steps
- [ ] Create `src/features/messages/` directory
- [ ] Create `messages.service.ts` with updated imports
- [ ] Create `messaging.service.ts` with updated imports
- [ ] Create `enhanced-messaging.service.ts` with updated imports
- [ ] Create `socket.service.ts` with updated imports
- [ ] Create `messages.controller.ts` with updated imports
- [ ] Create `messages.routes.ts` with updated imports
- [ ] Create `enhanced-messages.routes.ts` with updated imports
- [ ] Create `messages.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/messages`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to messages
- [ ] Delete old files
- [ ] Final build verification

---

## Task 11: Moderation Feature
**Complexity:** Low | **Dependencies:** messages (ideally done after)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/moderationController.ts` | `src/features/moderation/moderation.controller.ts` |
| `src/services/ContentModerationService.ts` | `src/features/moderation/moderation.service.ts` |

### Steps
- [ ] Create `src/features/moderation/` directory
- [ ] Create `moderation.service.ts` with updated imports
- [ ] Create `moderation.controller.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Check if moderation has routes (add if needed)
- [ ] Update any imports in other files
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to moderation
- [ ] Delete old files
- [ ] Final build verification

---

## Task 12: Payments Feature
**Complexity:** High | **Dependencies:** None (but complex external integrations)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/paymentController.ts` | `src/features/payments/payments.controller.ts` |
| `src/controllers/webhookController.ts` | `src/features/payments/webhooks.controller.ts` |
| `src/services/paymentService.ts` | `src/features/payments/payments.service.ts` |
| `src/services/SubscriptionService.ts` | `src/features/payments/subscription.service.ts` |
| `src/services/GooglePlayValidationService.ts` | `src/features/payments/google-play.service.ts` |
| `src/routes/payments.ts` | `src/features/payments/payments.routes.ts` |
| `src/routes/webhooks.ts` | `src/features/payments/webhooks.routes.ts` |
| `src/validators/paymentSchemas.ts` | `src/features/payments/payments.schemas.ts` |

### Steps
- [ ] Create `src/features/payments/` directory
- [ ] Create `payments.service.ts` with updated imports
- [ ] Create `subscription.service.ts` with updated imports
- [ ] Create `google-play.service.ts` with updated imports
- [ ] Create `payments.controller.ts` with updated imports
- [ ] Create `webhooks.controller.ts` with updated imports
- [ ] Create `payments.routes.ts` with updated imports
- [ ] Create `webhooks.routes.ts` with updated imports
- [ ] Create `payments.schemas.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/payments`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to payments
- [ ] Delete old files
- [ ] Final build verification

---

## Task 13: Admin Feature
**Complexity:** Low | **Dependencies:** Many (do last)

### Files to Migrate
| Current | Target |
|---------|--------|
| `src/controllers/adminController.ts` | `src/features/admin/admin.controller.ts` |
| `src/routes/admin.ts` | `src/features/admin/admin.routes.ts` |

### Steps
- [ ] Create `src/features/admin/` directory
- [ ] Create `admin.controller.ts` with updated imports
- [ ] Create `admin.routes.ts` with updated imports
- [ ] Create `index.ts` barrel file
- [ ] Update `src/app.ts` to import from `./features/admin`
- [ ] Search for any other files importing from old locations
- [ ] Run `npm run build` - must pass
- [ ] Run tests related to admin
- [ ] Delete old files
- [ ] Final build verification

---

## Task 14: Shared & Infrastructure Cleanup
**Complexity:** Medium | **Dependencies:** All features migrated

### Files to Move to `src/shared/`
| Current | Target |
|---------|--------|
| `src/services/encryptionService.ts` | `src/shared/encryption/encryption.service.ts` |
| `src/services/auditService.ts` | `src/shared/audit/audit.service.ts` |
| `src/services/sessionService.ts` | `src/shared/session/session.service.ts` |

### Files to Move to `src/infra/`
| Current | Target |
|---------|--------|
| `src/services/s3Service.ts` | `src/infra/storage/s3.service.ts` |
| `src/config/database.ts` | `src/infra/database.ts` |
| `src/config/redis.ts` | `src/infra/redis.ts` |

### Steps
- [ ] Create `src/shared/encryption/`, `src/shared/audit/`, `src/shared/session/`
- [ ] Create `src/infra/storage/`
- [ ] Move and update shared services
- [ ] Move and update infrastructure files
- [ ] Update all imports across codebase
- [ ] Run `npm run build` - must pass
- [ ] Run full test suite
- [ ] Delete empty old directories

---

## Final Cleanup

### After All Migrations Complete
- [ ] Verify `src/controllers/` is empty → delete folder
- [ ] Verify `src/services/` is empty (or only non-feature services) → delete or rename
- [ ] Verify `src/routes/` only has `dev.ts` or is empty
- [ ] Verify `src/validators/` is empty → delete folder
- [ ] Update `REFACTOR_MIGRATION_PLAN.md` status to COMPLETE
- [ ] Run full test suite one final time
- [ ] Commit with message: `refactor: complete feature-based migration`

---

## Quick Reference: Migration Commands

```bash
# Per-feature workflow
mkdir -p src/features/{feature-name}
# ... create files with updated imports ...
npm run build
npm test -- --testPathPattern="{feature}"
rm src/controllers/{old}.ts src/services/{Old}.ts src/routes/{old}.ts
npm run build  # final verification
```

---

*Last Updated: December 2024*
*Auth Feature: COMPLETE*
