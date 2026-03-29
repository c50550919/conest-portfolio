# CoNest - Shared Housing Platform for Single Parents

A full-stack production-grade application that matches single parents with compatible, verified roommates for shared housing. Built with child safety compliance, real-time messaging, identity verification, payment processing, and a weighted matching algorithm — all designed around regulatory constraints (FHA, FCRA, COPPA, VAWA).

**179,000+ lines of TypeScript** across backend API, React Native mobile app, and infrastructure. **179 test files** spanning unit, integration, contract, security, compliance, and performance tiers with an enforced **85% coverage threshold**.

---

## Architecture Overview

```
                         ┌─────────────────┐
                         │  React Native    │
                         │  Mobile App      │
                         │  (TypeScript)    │
                         └────────┬─────── ┘
                                  │ REST + WebSocket
                                  ▼
┌──────────┐    ┌──────────────────────────────────┐    ┌──────────┐
│  Veriff   │◄──│       Express.js API Server       │──►│  Stripe  │
│  (ID)     │   │                                    │   │ Connect  │
├──────────┤   │  JWT Auth · RBAC · Rate Limiting   │   ├──────────┤
│  Certn    │◄──│  AES-256-GCM Encryption            │──►│  Telnyx  │
│  (BGC)    │   │  Feature-based Route Architecture  │   │  (SMS)   │
└──────────┘   └──────────┬───────────┬─────────────┘   └──────────┘
                           │           │
                    ┌──────▼──┐   ┌────▼─────┐
                    │PostgreSQL│   │  Redis 7  │
                    │15+PostGIS│   │           │
                    │30 tables │   │ Sessions  │
                    │35 migr.  │   │ CSRF Tkns │
                    └─────────┘   │ Socket.io │
                                  │ Rate Lmts │
                                  └───────────┘
```

### Backend (Node.js + Express + TypeScript)
- **137 API endpoints** across 20 feature-based route files
- **23 database models** using Knex query builder
- **12 middleware layers** (auth, CSRF, rate limiting, sanitization, CORS, Helmet, permissions, etc.)
- **35 database migrations** tracking schema evolution over 6 months
- Feature-based directory structure: each domain has its own controller, service, routes, and validator

### Mobile (React Native + TypeScript)
- **304 source files** with Redux Toolkit state management
- React Navigation routing, custom hooks, theming system
- iOS (CocoaPods) and Android build configurations

### Infrastructure
- **Docker Compose** orchestration (PostgreSQL 15 + PostGIS, Redis 7)
- **9 GitHub Actions workflows** (backend tests, mobile CI, schema drift detection, OWASP ZAP scanning, PR validation)
- Separate Jest projects per test tier with isolated setup files

---

## Technical Decisions Worth Discussing

### 1. Matching Algorithm (FHA-Compliant)

The core matching engine scores parent compatibility on 6 weighted factors:

| Factor | Weight | Why This Weight |
|--------|--------|-----------------|
| Schedule compatibility | 30% | Shared housing fails when schedules conflict — highest practical impact |
| Parenting philosophy | 20% | Discipline style mismatches cause household friction |
| House rules alignment | 20% | Cleanliness, noise, guest policies — daily cohabitation |
| Location/schools | 15% | Must serve both parents' school districts |
| Budget match | 10% | Income disparity creates resentment — but less than behavioral factors |
| Lifestyle factors | 5% | Smoking, pets, diet — important but not dealbreakers |

**Key constraint**: Family composition (number of children) is intentionally excluded from the discovery algorithm. Under the Fair Housing Act, `childrenCount` cannot influence who sees whom. This field exists in the database for household logistics (bedroom planning) but is never exposed in the matching or discovery layer. The compliance test suite enforces this at 100% coverage.

### 2. Verification Pipeline (FCRA-Compliant)

Identity verification and background checks run through a multi-stage pipeline:

```
Phone Verify (Telnyx) → Email Verify → ID Verify (Veriff) → Background Check (Certn)
                                                                      │
                                                           ┌──────────┼──────────┐
                                                           ▼          ▼          ▼
                                                     Sex Offender  Violent    Non-Violent
                                                     Auto-Reject   Review     Approve
```

FCRA requires a two-step adverse action process: pre-adverse notice, 5-day waiting period, then final decision. Criminal record data is encrypted at rest with AES-256-GCM. The webhook handler validates provider signatures and uses an idempotency table to prevent duplicate processing.

### 3. Encryption Strategy

Sensitive fields use AES-256-GCM with per-record random IVs and PBKDF2 key derivation:

```typescript
// Encrypted fields: addresses, messages, government IDs, background check results
// Each record gets its own IV and salt — no two ciphertexts share parameters
encrypt(plaintext) → { iv, salt, authTag, ciphertext, keyVersion }
```

Key versioning supports rotation without re-encrypting existing records. The `keyVersion` field tells the decrypt function which key to use.

### 4. Real-Time Messaging (Socket.io + Redis)

WebSocket connections authenticate via JWT. Redis pub/sub enables horizontal scaling — any backend instance can deliver messages to any connected user:

- **Rooms**: `user:{id}`, `conversation:{id}`, `household:{id}`
- **Events**: typing indicators, new messages, connection requests, match notifications, household expense alerts
- **Target**: <100ms message delivery

### 5. Payment Processing (Stripe Connect)

Household expense splitting uses Stripe Connect to handle multi-party payments:
- Rent splitting among 2+ household members
- Per-member payment tracking with audit logs
- Refund processing with compensation tracking
- Webhook signature validation for payment events

### 6. Multi-Tenant Architecture (Latest Addition)

Organizations table supports B2B pivot — housing nonprofits manage their own client rosters, housing inventory, and placement pipelines. Org-scoped queries enforce tenant isolation at the database layer:

```
Organization → Org Members (RBAC roles) → Clients → Housing Units → Placements
```

Roles: `case_manager`, `program_director`, `org_admin`, `super_admin`

---

## Security Implementation

### Middleware Chain (order matters)
```
Request → Helmet (CSP/HSTS) → CORS → Rate Limit → Body Parser → CSRF → Auth (JWT)
       → Permissions (RBAC) → Validation (Zod/express-validator) → Sanitization → Handler
```

### What's Enforced
| Layer | Implementation |
|-------|---------------|
| Authentication | JWT with 15-min access tokens, 7-day refresh rotation, bcrypt cost factor 12 |
| Authorization | Fine-grained RBAC (`payment:read`, `payment:write`, `admin:*`) |
| Rate Limiting | Redis-backed, 100 req/15min general, 5 req/15min for auth, 10 req/hr for payments |
| CSRF | Redis-backed tokens, 24-hour TTL, max 5 tokens per session |
| Input Validation | Zod schemas (36+ validators) + express-validator for legacy routes |
| Output | Helmet CSP, X-Frame-Options DENY, HSTS, no X-Powered-By |
| Encryption | AES-256-GCM at rest, TLS in transit, per-field encryption for PII |

### CI/CD Security
- **OWASP ZAP** scanning on every PR
- **npm audit** in CI pipeline
- **Schema drift detection** — migration files validated against running database
- ESLint security rules with max cyclomatic complexity of 15

---

## Testing Strategy

### Test Pyramid
```
                    ╱ ╲
                   ╱ E2E╲         2 tests — full user journeys
                  ╱───────╲
                 ╱ Security ╲     8 tests — auth bypass, injection, CSRF
                ╱─────────────╲
               ╱  Performance  ╲  2 tests — load testing with Artillery
              ╱─────────────────╲
             ╱    Compliance     ╲ 2 tests — child safety, FHA rules
            ╱─────────────────────╲
           ╱    Contract (34)      ╲  API schema validation
          ╱─────────────────────────╲
         ╱    Integration (35)       ╲  real DB + Redis
        ╱─────────────────────────────╲
       ╱        Unit (14+)             ╲  mocked dependencies
      ╱─────────────────────────────────╲
```

### Coverage Enforcement
- **85% global threshold** for branches, functions, lines, and statements
- **100% mandatory** for child safety validators — the build fails if any child-data-related code path is untested
- Separate Jest configurations per tier with appropriate timeouts (unit: 10s, integration: 30s, security: 30s, E2E: 60s)

---

## Database Schema (Key Tables)

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| `users` | Authentication | `email`, `password_hash`, `phone_verified`, `two_factor_enabled`, `status` |
| `profiles` | Parent profiles | Demographics, preferences — **no child-identifying data** |
| `verifications` | ID + background check status | `provider`, `status`, `expires_at` |
| `matches` | Compatibility pairings | `compatibility_score`, `score_breakdown` (JSONB) |
| `conversations` / `messages` | Encrypted messaging | `content_encrypted`, `read_at` |
| `households` | Shared living groups | `rent_amount`, `rules` (JSONB) |
| `organizations` | B2B multi-tenancy | `slug`, `plan_tier`, `settings` (JSONB) |
| `clients` | Org-managed individuals | `household_size`, `budget_max`, `accessibility_needs` (JSONB) |
| `housing_units` | Property inventory | `location` (PostGIS), `accessibility_features` (JSONB) |
| `placements` | Client-to-unit pipeline | `stage` (6-step), `compatibility_score`, `score_breakdown` |
| `webhook_events` | Provider webhook idempotency | `provider`, `event_type`, `idempotency_key` |
| `payment_audit_log` | Financial audit trail | `action`, `amount`, `stripe_event_id` |

---

## Regulatory Compliance Summary

| Regulation | How It's Addressed |
|------------|-------------------|
| **FHA (Fair Housing Act)** | `childrenCount` excluded from discovery/matching. No religion-proxy fields in scoring. Compliance tests enforce this. |
| **FCRA (Fair Credit Reporting Act)** | Two-step adverse action for background checks. Standalone written disclosure. Consumer dispute rights. |
| **COPPA** | Zero child data storage. Platform is parent-only. 100% test coverage on child safety validators. |
| **VAWA** | DV survivors with protective orders are not blocked by safety attestations. Address confidentiality supported. |
| **Fair Chance Housing** | Criminal history questions deferred to verification gate — not asked during onboarding. Tiered assessment (sex offender → auto-reject, violent → individualized review, non-violent → approve). |

---

## Running Locally

### Prerequisites
- Docker Desktop
- Node.js 18+

### Start Services
```bash
docker compose up -d                  # PostgreSQL + Redis
cd backend && npm install
cp .env.example .env                  # Configure environment
npx knex migrate:latest               # Run migrations
npm run dev                           # API on localhost:3000
```

### Run Tests
```bash
npm test                              # All tests
npm run test:security                 # Security suite only
npm run test:coverage                 # With coverage report
```

### Mobile
```bash
cd mobile && npm install
cd ios && pod install && cd ..
npm start                             # Metro bundler
npm run ios                           # iOS simulator
```

---

## Project Structure

```
conest/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Stripe, Socket.io, security configs
│   │   ├── features/        # Feature modules (matching, placement, verification, etc.)
│   │   ├── models/          # 23 Knex models with typed interfaces
│   │   ├── middleware/       # 12 middleware layers (auth, CSRF, rate limit, etc.)
│   │   ├── migrations/      # 35 migrations tracking 6 months of schema evolution
│   │   ├── utils/           # Encryption, JWT, validation helpers
│   │   ├── lib/             # Shared libraries (org-scoped queries)
│   │   └── app.ts           # Express app with Sentry, Swagger, webhook handlers
│   └── tests/               # 179 test files across 7 tiers
│       ├── unit/            # Mocked dependency tests
│       ├── integration/     # Real DB/Redis tests
│       ├── contract/        # API schema validation
│       ├── security/        # Auth bypass, injection, CSRF tests
│       ├── compliance/      # Child safety, FHA rules
│       ├── e2e/             # Full user journey tests
│       └── performance/     # Artillery load tests
├── mobile/                  # React Native app (304 source files)
│   ├── src/
│   │   ├── screens/         # App screens
│   │   ├── components/      # Reusable UI components
│   │   ├── store/           # Redux Toolkit slices
│   │   ├── navigation/      # React Navigation config
│   │   ├── hooks/           # Custom hooks
│   │   └── services/        # API integration
├── .github/workflows/       # 9 CI/CD pipelines
├── docker-compose.yml       # PostgreSQL 15 + PostGIS, Redis 7
└── SECURITY.md              # Security practices documentation
```

---

## What I'd Do Differently

- **ORM choice**: Started with Knex raw query builder for control. For a team project, Prisma or Drizzle would provide better type safety and migration tooling at the cost of some query flexibility.
- **Monorepo tooling**: Using npm workspaces. Turborepo or Nx would improve build caching and task orchestration as the repo scales.
- **State management**: Redux Toolkit works but React Query handles most of the server state. Would reduce Redux surface area in a rewrite.
- **Test isolation**: Integration tests share a database. Testcontainers per test suite would eliminate ordering dependencies.
