# Database Migration Audit Report

**Generated:** 2025-12-30
**Scope:** /Users/ghostmac/Development/conest/backend/src/migrations/
**Total Migrations:** 18

---

## Executive Summary

This audit identified **3 CRITICAL compliance violations** and **5 warnings** across 18 database migrations. The most severe issue is that multiple source files still reference the old column names (`number_of_children`, `ages_of_children`) that were renamed in migration 20250101000008 for child safety compliance.

### Severity Overview

| Severity | Count | Status | Description |
|----------|-------|--------|-------------|
| CRITICAL | 3 | ✅ FIXED | Compliance violations, breaking changes |
| WARNING | 5 | ⚠️ PENDING | Potential issues, missing functionality |
| INFO | 10 | ℹ️ NOTED | Observations, recommendations |

### Remediation Summary (2025-12-30)

**All 3 CRITICAL issues have been resolved:**
- ✅ CRITICAL-001: Profile.ts updated to use `children_count` and `children_age_groups`
- ✅ CRITICAL-002: validation.ts updated to use compliant column names
- ✅ CRITICAL-003: profile.controller.ts updated to use compliant column names
- ✅ Documentation: profile/README.md updated with FHA-compliant naming

---

## Migration Summary

### Migration 001: 20250101000000_create_users_table.ts
**Purpose:** Creates core `users` table with authentication fields
**Tables Created:** `users`
**Rollback Safety:** SAFE - Simple `dropTable`
**Indexes:** email, phone, status
**Notes:** Clean implementation with proper constraints

### Migration 002: 20250101000001_create_profiles_table.ts
**Purpose:** Creates user profiles with location, housing, and parenting info
**Tables Created:** `profiles`
**Rollback Safety:** SAFE - Simple `dropTable`
**Indexes:** city, state, zip_code, verified, budget range
**Notes:** Original column names `number_of_children` and `ages_of_children` (renamed in migration 008)

### Migration 003: 20250101000002_create_verifications_table.ts
**Purpose:** Creates verification tracking for ID, background, income, phone, email
**Tables Created:** `verifications`
**Rollback Safety:** SAFE - Simple `dropTable`
**Indexes:** fully_verified, verification_score

### Migration 004: 20250101000003_create_matches_table.ts
**Purpose:** Creates matches table with compatibility scoring
**Tables Created:** `matches`
**Rollback Safety:** SAFE - Simple `dropTable`
**Indexes:** user_id_1, user_id_2, status, compatibility_score

### Migration 005: 20250101000004_create_conversations_and_messages_tables.ts
**Purpose:** Creates messaging infrastructure
**Tables Created:** `conversations`, `messages`
**Rollback Safety:** SAFE - Drops in correct order (messages first, then conversations)
**Indexes:** Multiple indexes on both tables

### Migration 006: 20250101000005_create_households_and_payments_tables.ts
**Purpose:** Creates household and payment tracking
**Tables Created:** `households`, `household_members`, `payments`
**Rollback Safety:** SAFE - Drops in correct order
**Indexes:** Comprehensive indexing on all tables

### Migration 007: 20250101000006_create_swipes_table.ts
**Purpose:** Creates swipe tracking for discovery
**Tables Created:** `swipes`
**Rollback Safety:** WARNING - Uses `dropTableIfExists` but relies on `update_updated_at_column()` trigger function
**Notes:** Creates trigger but does not create the trigger function - assumes it exists

### Migration 008: 20250101000008_rename_children_fields_for_compliance.ts
**Purpose:** CHILD SAFETY COMPLIANCE - Renames columns for constitutional standards
**Tables Modified:** `profiles`
**Changes:**
- `number_of_children` -> `children_count`
- `ages_of_children` -> `children_age_groups`
**Rollback Safety:** SAFE - Reversible rename operations
**CRITICAL:** This is a compliance migration - see violations below

### Migration 009: 20250101000007_add_jwt_auth_fields.ts
**Purpose:** Adds JWT refresh token support to users
**Tables Modified:** `users`
**Added Columns:** `refresh_token`, `refresh_token_expires_at`, `refresh_token_issued_at`
**Rollback Safety:** SAFE - Drops index before columns

### Migration 010: 20251013000000_add_oauth_fields.ts
**Purpose:** Adds OAuth (Google, Apple) authentication support
**Tables Modified:** `users`
**Added Columns:** `oauth_provider`, `oauth_provider_id`, `oauth_profile_picture`
**Rollback Safety:** WARNING - Makes `password_hash` nullable for OAuth users; rollback makes it NOT NULL again which will fail if OAuth users exist
**Constraints:** Validates OAuth provider consistency

### Migration 011: 20251013000001_create_saved_profiles.ts
**Purpose:** Creates bookmarked/saved profiles feature
**Tables Created:** `saved_profiles`
**Rollback Safety:** SAFE - Simple `dropTableIfExists`
**Constraints:** Folder validation, self-save prevention

### Migration 012: 20251013000002_create_connection_requests.ts
**Purpose:** Creates connection request flow with encrypted messages
**Tables Created:** `connection_requests`
**Rollback Safety:** SAFE - Simple `dropTableIfExists`
**Security:** AES-256-GCM encryption for messages

### Migration 013: 20251013000003_add_verification_expiration.ts
**Purpose:** Adds 1-year expiration cycle for verifications
**Tables Modified:** `verifications`
**Rollback Safety:** SAFE - Drops indexes before columns

### Migration 014: 20251030000001_add_payment_first_architecture.ts
**Purpose:** Major feature - Payment-first verification flow
**Tables Created:** `verification_payments`, `pre_qualification_responses`
**Tables Modified:** `connection_requests`, `verifications`
**Rollback Safety:** SAFE - Comprehensive rollback with proper ordering
**Notes:** Adds dual-provider support (Veriff, Certn), admin review workflow

### Migration 015: 20251103000001_create_success_fees_tables.ts
**Purpose:** Tiered success fee system with fraud prevention
**Tables Created:** `housing_documents`, `success_fees`, `admin_audit_log`
**Tables Modified:** `parents`
**Rollback Safety:** SAFE - Comprehensive rollback
**WARNING:** References `parents` table but no migration creates this table

### Migration 016: 20251107000001_add_enhanced_preferences.ts
**Purpose:** FHA-compliant preference-based scoring (8 factors)
**Tables Modified:** `profiles`
**Added Columns:** 50+ preference columns for compatibility scoring
**Rollback Safety:** SAFE - All columns can be dropped
**Notes:** Extensive preference fields for location, lifestyle, communication, etc.

### Migration 017: 20251114000001_enhance_messaging_system.ts
**Purpose:** Enhanced messaging with encryption and moderation
**Tables Created:** `message_reports`, `encryption_keys`, `admin_actions`
**Tables Modified:** `messages`, `conversations`
**Rollback Safety:** WARNING - Adds `encryption_iv` as NOT NULL without default; rollback may fail on populated table
**Notes:** Comprehensive moderation and audit trail

### Migration 018: 20251205000001_add_ai_moderation.ts
**Purpose:** AI-powered content moderation for child safety
**Tables Created:** `moderation_patterns`, `ai_moderation_logs`
**Tables Modified:** `messages`, `users`, `message_reports`, `admin_actions`
**Rollback Safety:** SAFE - Comprehensive rollback

---

## CRITICAL ISSUES

### CRITICAL-001: Compliance Violation - Old Column Names in Profile Model

**File:** `/Users/ghostmac/Development/conest/backend/src/models/Profile.ts`
**Lines:** 27-28, 49-50

The Profile model still uses the old column names that were renamed for child safety compliance:
```typescript
// Lines 27-28
number_of_children?: number; // OPTIONAL - not used in scoring
ages_of_children?: string; // OPTIONAL - not used in scoring

// Lines 49-50
number_of_children: number;
ages_of_children: string;
```

**Impact:** Database queries will fail after migration 008 is applied.
**Fix Required:** Update to use `children_count` and `children_age_groups`.

---

### CRITICAL-002: Compliance Violation - Old Column Names in Validation Middleware

**File:** `/Users/ghostmac/Development/conest/backend/src/middleware/validation.ts`
**Lines:** 63-64

```typescript
number_of_children: z.number().int().min(0).optional(),
ages_of_children: z.string().optional(),
```

**Impact:** API validation references non-existent columns.
**Fix Required:** Update schema to use `children_count` and `children_age_groups`.

---

### CRITICAL-003: Compliance Violation - Old Column Names in Profile Controller

**File:** `/Users/ghostmac/Development/conest/backend/src/features/profile/profile.controller.ts`
**Lines:** 74-75

```typescript
number_of_children: profile.number_of_children,
ages_of_children: profile.ages_of_children,
```

**Impact:** Public profile endpoint returns undefined values.
**Fix Required:** Update to use `children_count` and `children_age_groups`.

---

## Additional Files with Old Column References

| File | Lines | Status |
|------|-------|--------|
| `/backend/src/seeds/001_test_discovery_profiles.ts` | 46-47, 61-62, etc. | Uses old names but maps to new names at lines 372-373 |
| `/backend/src/features/profile/README.md` | 52-53, 73-74, 94-95 | Documentation outdated |

---

## WARNINGS

### WARNING-001: Missing `parents` Table Migration

**Issue:** Migration 015 (`20251103000001_create_success_fees_tables.ts`) modifies a `parents` table that is never created by any migration.

**Lines:** 29-34
```typescript
await knex.schema.alterTable('parents', (table) => {
  table.text('current_address').nullable();
  table.timestamp('address_updated_at').nullable();
  ...
});
```

**Impact:** Migration will fail if run against a fresh database.
**Recommendation:** Add migration to create `parents` table or verify if this is an alias for `profiles`.

---

### WARNING-002: Trigger Function Dependency

**File:** `20250101000006_create_swipes_table.ts`
**Lines:** 57-62

Migration creates a trigger that calls `update_updated_at_column()` function but does not create this function.

```typescript
await knex.raw(`
  CREATE TRIGGER update_swipes_updated_at
  BEFORE UPDATE ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`);
```

**Impact:** Migration will fail if function does not exist.
**Recommendation:** Create the function or add a migration for it.

---

### WARNING-003: OAuth Rollback Data Loss Risk

**File:** `20251013000000_add_oauth_fields.ts`
**Lines:** 85-87

Rollback makes `password_hash` NOT NULL again:
```typescript
await knex.raw(`
  ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
`);
```

**Impact:** Rollback will fail if OAuth-only users exist (they have NULL password_hash).
**Recommendation:** Add data migration or prevent rollback if OAuth users exist.

---

### WARNING-004: NOT NULL Column Without Default

**File:** `20251114000001_enhance_messaging_system.ts`
**Line:** 7

```typescript
table.string('encryption_iv', 32).notNullable();
```

**Impact:** If existing messages exist, migration will fail without a default value.
**Recommendation:** Add default or handle existing rows.

---

### WARNING-005: Missing Index on Foreign Key

**File:** `20250101000003_create_matches_table.ts`

The `initiated_by` column references `users.id` but has no index.

**Impact:** Performance degradation on queries filtering by initiator.
**Recommendation:** Add index on `initiated_by`.

---

## Schema Consistency Analysis

### Model vs Migration Comparison

| Model Field | Migration Column | Status |
|-------------|------------------|--------|
| User.password_hash | users.password_hash | MISMATCH - Model says required, migration allows NULL |
| User.mfa_enabled | Not in migration 001 | MISSING - User model expects this |
| User.mfa_secret | Not in migration 001 | MISSING - User model expects this |
| User.account_status | users.status | MISMATCH - Different column name |
| User.last_login | users.last_login_at | MISMATCH - Different column name |
| User.refresh_token_hash | users.refresh_token | MISMATCH - Different column name |
| Profile.number_of_children | profiles.children_count | CRITICAL MISMATCH |
| Profile.ages_of_children | profiles.children_age_groups | CRITICAL MISMATCH |
| Verification fields | verifications table | ALIGNED (after migration 014) |

---

## Recommendations

### Immediate Actions (CRITICAL)

1. **Update Profile Model** - Change `number_of_children` to `children_count` and `ages_of_children` to `children_age_groups` in `/backend/src/models/Profile.ts`

2. **Update Validation Schema** - Fix column names in `/backend/src/middleware/validation.ts`

3. **Update Profile Controller** - Fix column names in `/backend/src/features/profile/profile.controller.ts`

4. **Update Documentation** - Fix column names in `/backend/src/features/profile/README.md`

### Short-term Actions (WARNING)

5. **Create Parents Table Migration** - Either create a migration for `parents` table or clarify relationship with `profiles`

6. **Add Trigger Function** - Create migration for `update_updated_at_column()` function

7. **Add Missing Index** - Add index on `matches.initiated_by`

8. **Review OAuth Rollback** - Add safeguards to prevent data loss on rollback

### Long-term Actions (INFO)

9. **Standardize Naming** - Align model property names with database column names

10. **Add Migration Tests** - Create integration tests for migration up/down cycles

11. **Document Dependencies** - Create diagram of migration dependencies and table relationships

---

## Appendix: Full File Reference for Compliance Violations

### Files Still Using Old Column Names

```
/Users/ghostmac/Development/conest/backend/src/models/Profile.ts
  Line 27: number_of_children?: number;
  Line 28: ages_of_children?: string;
  Line 49: number_of_children: number;
  Line 50: ages_of_children: string;

/Users/ghostmac/Development/conest/backend/src/middleware/validation.ts
  Line 63: number_of_children: z.number().int().min(0).optional(),
  Line 64: ages_of_children: z.string().optional(),

/Users/ghostmac/Development/conest/backend/src/features/profile/profile.controller.ts
  Line 74: number_of_children: profile.number_of_children,
  Line 75: ages_of_children: profile.ages_of_children,

/Users/ghostmac/Development/conest/backend/src/features/profile/README.md
  Line 52: number_of_children: number;
  Line 53: ages_of_children: string[];
  Line 73: number_of_children: number;
  Line 74: ages_of_children: string[];
  Line 94: number_of_children: number;
  Line 95: ages_of_children: string[];

/Users/ghostmac/Development/conest/backend/src/seeds/001_test_discovery_profiles.ts
  Lines 46-47, 61-62, 76-77, 91-92, 106-107, 121-122, 136-137, 151-152,
  166-167, 181-182, 196-197, 211-212, 226-227, 241-242, 256-257, 271-272,
  286-287, 301-302, 316-317, 331-332
  (Note: This file maps to correct names at lines 372-373)
```

### Files Using Correct Column Names

```
/Users/ghostmac/Development/conest/backend/src/models/Parent.ts
  Line 23-24: children_count, children_age_groups (CORRECT)

/Users/ghostmac/Development/conest/backend/src/types/entities/parent.entity.ts
  Line 37-38, 103-104: children_count, children_age_groups (CORRECT)

/Users/ghostmac/Development/conest/backend/src/types/entities/transformers.ts
  Lines 258-259, 319-320, 610-611, 623-624 (CORRECT)

/Users/ghostmac/Development/conest/backend/src/features/discovery/discovery.service.ts
  Lines 81-82, 115: children_count, children_age_groups (CORRECT)

/Users/ghostmac/Development/conest/backend/src/features/comparison/comparison.service.ts
  Lines 161, 189, 227, 255: children_count (CORRECT)

/Users/ghostmac/Development/conest/backend/src/features/auth/oauth.service.ts
  Lines 255-256: children_count, children_age_groups (CORRECT)

/Users/ghostmac/Development/conest/backend/src/utils/compatibilityCalculator.ts
  Line 33: children_age_groups (CORRECT)

All test files in /backend/src/tests/ (CORRECT)
```

---

*Report generated by migration audit tool*
