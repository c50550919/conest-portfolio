# CoNest Project Roadmap & Master Checklist

**Project**: CoNest - Single Parent Housing Platform
**Current Branch**: `001-discovery-screen-swipeable`
**Last Updated**: 2025-10-06
**Status**: 🟡 Active Development

---

## 🎯 Mission & Goals

Help single parents find safe, verified, and compatible roommates for shared housing. Reduce housing costs by 40-60% while maintaining **zero child safety incidents**.

### Success Metrics
- [ ] Zero child safety incidents (CRITICAL)
- [ ] 95% user verification rate
- [ ] <24hr background check completion
- [ ] 80% successful housing matches
- [ ] Average housing stability: >12 months

---

## 📊 Project Status Overview

### Infrastructure & Foundation
- [x] Git repository initialized
- [x] Project constitution ratified (v1.0.0)
- [x] Spec Kit integration complete
- [x] React Native mobile app scaffold
- [x] Node.js backend scaffold
- [ ] Docker environment setup
- [ ] PostgreSQL database configuration
- [ ] Redis cache configuration
- [ ] CI/CD pipeline setup

### Core Features Status

#### 🔵 Phase 1: Discovery & Matching (In Progress)
**Branch**: `001-discovery-screen-swipeable`

- [x] Feature spec created
- [ ] **4 CLARIFICATIONS NEEDED** (see spec.md line 98-109)
  - Screenshot detection policy
  - Verification expiration behavior
  - Undo swipe feature
  - Performance threshold confirmation
- [ ] Implementation plan (plan.md) - **IN PROGRESS**
- [ ] Phase 0: Research complete
- [ ] Phase 1: Design & contracts
- [ ] Phase 2: Task generation
- [ ] Backend: Discovery API
- [ ] Backend: Swipe tracking
- [ ] Backend: Matching algorithm
- [ ] Mobile: Swipeable card UI
- [ ] Mobile: Profile detail view
- [ ] Mobile: Match notifications
- [ ] Testing: Unit tests (85% coverage target)
- [ ] Testing: Integration tests
- [ ] Testing: E2E tests (Detox)

#### ⚪ Phase 2: Authentication & Verification
**Status**: Not Started

- [ ] Feature spec
- [ ] Implementation plan
- [ ] Phone verification (Twilio)
- [ ] ID verification (Jumio)
- [ ] Background checks (Checkr API)
- [ ] Verification badge system
- [ ] Email verification
- [ ] Income verification (optional)

#### ⚪ Phase 3: Real-time Messaging
**Status**: Not Started

- [ ] Feature spec
- [ ] Implementation plan
- [ ] Socket.io infrastructure
- [ ] End-to-end encryption (Signal Protocol)
- [ ] Message persistence
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Push notifications
- [ ] Offline message queue

#### ⚪ Phase 4: Profile & Onboarding
**Status**: Partially Started (Screens scaffolded)

- [ ] Feature spec
- [ ] Implementation plan
- [ ] Welcome screen flow
- [ ] Phone verification screen
- [ ] Profile setup screen
- [ ] Children info screen (NO PII - compliance critical)
- [ ] Work schedule screen
- [ ] Preferences screen
- [ ] ID verification screen
- [ ] Background check screen

#### ⚪ Phase 5: Household Management
**Status**: Not Started

- [ ] Feature spec
- [ ] Implementation plan
- [ ] Expense splitting (Stripe)
- [ ] Shared calendar
- [ ] Chore scheduling
- [ ] House rules documentation
- [ ] Lease agreement templates
- [ ] Visitor logging
- [ ] Emergency contacts

#### ⚪ Phase 6: Payment Processing
**Status**: Not Started

- [ ] Feature spec
- [ ] Implementation plan
- [ ] Stripe Connect integration
- [ ] Premium subscriptions ($4.99/month)
- [ ] Success fee ($29 one-time)
- [ ] Payment history
- [ ] Refund processing
- [ ] Payment verification

---

## 🏗️ Technical Architecture

### Frontend (React Native + TypeScript)
**Location**: `/mobile/`

#### Components Status
- [x] App.tsx - Main entry point with Redux/React Query
- [x] Navigation structure (AppNavigator, OnboardingNavigator, MainNavigator)
- [x] Redux store with slices (auth, user, matches, messages, household)
- [x] Theme configuration (React Native Paper)
- [ ] Discovery screen implementation
- [ ] Swipeable card component
- [ ] Profile detail modal
- [ ] Match notification component
- [ ] Message list component
- [ ] Chat interface
- [ ] Verification badge component
- [ ] Loading states & error handling

#### Mobile Testing
- [ ] Detox E2E test setup (.detoxrc.js exists)
- [ ] Test scenarios for onboarding flow
- [ ] Test scenarios for discovery flow
- [ ] Test scenarios for messaging
- [ ] Visual regression tests
- [ ] Accessibility tests (WCAG 2.1 AA)

### Backend (Node.js + Express + TypeScript)
**Location**: `/backend/`

#### API Endpoints Status
- [ ] Authentication (`/api/auth/*`)
- [ ] User profiles (`/api/users/*`)
- [ ] Discovery (`/api/discovery/*`) - **FILES UNTRACKED**
- [ ] Swipes (`/api/swipes/*`)
- [ ] Matches (`/api/matches/*`)
- [ ] Messages (`/api/messages/*`)
- [ ] Households (`/api/households/*`)
- [ ] Payments (`/api/payments/*`)
- [ ] Verification (`/api/verification/*`)

#### Services Status
- [ ] AuthService
- [ ] UserService
- [ ] DiscoveryService - **FILE UNTRACKED**
- [ ] SwipeService - **FILE UNTRACKED**
- [ ] MatchingService (algorithm implementation)
- [ ] MessageService
- [ ] HouseholdService
- [ ] PaymentService
- [ ] VerificationService

#### Database & Models
- [ ] Knex configuration
- [ ] Users table migration
- [ ] Profiles table migration
- [ ] Swipes table migration - **FILE UNTRACKED**
- [ ] Matches table migration
- [ ] Messages table migration
- [ ] Households table migration
- [ ] Verification table migration
- [ ] Swipe model - **FILE UNTRACKED**
- [ ] Match model
- [ ] Message model

#### Backend Testing
- [ ] Jest configuration
- [ ] Unit test coverage (85% target)
- [ ] Integration tests (Supertest)
- [ ] Contract tests for API endpoints
- [ ] Security tests (SQL injection, XSS, CSRF)
- [ ] Load tests (Artillery) - 10K concurrent users

### Infrastructure & DevOps
- [ ] Docker Compose configuration (docker-compose.yml exists)
- [ ] PostgreSQL container
- [ ] Redis container
- [ ] Backend container
- [ ] Environment configuration (.env)
- [ ] GitHub Actions CI/CD
- [ ] Automated testing pipeline
- [ ] Code quality checks (ESLint, Prettier)
- [ ] Coverage reporting
- [ ] Deployment to staging
- [ ] Deployment to production

---

## 🔒 Constitution Compliance

### Principle I: Child Safety (CRITICAL)
- [ ] Database schema validation (NO child PII fields)
- [ ] API validation with Zod schemas
- [ ] Compliance test suite (`__tests__/compliance/child-safety.test.ts`)
- [ ] 100% compliance test coverage
- [ ] Automated monitoring for child data patterns
- [ ] Quarterly security audits

### Principle II: Code Quality
- [ ] 85% minimum test coverage (general)
- [ ] 100% test coverage (child safety modules)
- [ ] Max cyclomatic complexity: 15
- [ ] Prettier formatting enforced
- [ ] TypeScript strict mode enabled
- [ ] ESLint configured and passing

### Principle III: Security
- [ ] Input validation (Zod schemas)
- [ ] SQL injection prevention (Knex parameterized queries)
- [ ] XSS protection (Helmet.js, CSP headers)
- [ ] Authentication (Bcrypt + JWT)
- [ ] Rate limiting (Express-rate-limit + Redis)
- [ ] Encryption (AES-256-GCM at rest, TLS 1.3 in transit)
- [ ] Monthly security reviews
- [ ] Annual penetration testing

### Principle IV: Performance
- [ ] API P95 latency: <200ms (GET), <500ms (POST/PUT)
- [ ] Matching algorithm: <500ms
- [ ] Mobile cold start: <2s
- [ ] Screen navigation: <100ms
- [ ] UI animations: 60fps
- [ ] Socket.io latency: <100ms
- [ ] APM tooling setup (New Relic/DataDog)
- [ ] Performance regression tests

### Principle V: Testing
- [ ] Unit tests (Jest)
- [ ] Integration tests (Supertest)
- [ ] E2E tests (Detox)
- [ ] Compliance tests (100% coverage)
- [ ] Security tests (OWASP Top 10)
- [ ] Load tests (Artillery)
- [ ] TDD workflow enforced
- [ ] CI/CD test automation

---

## 📝 Current Sprint: Discovery Screen (001)

### Active Tasks
1. ✅ Fix app crash (Metro bundler connection)
2. 🔄 Create implementation plan (this file + plan.md)
3. ⏳ Address 4 spec clarifications
4. ⏳ Execute Phase 0: Research
5. ⏳ Execute Phase 1: Design & contracts
6. ⏳ Execute Phase 2: Task generation

### Next Sprint Candidates
- Authentication & verification flow
- Backend API infrastructure
- Database schema implementation
- Matching algorithm development

---

## 🐛 Known Issues & Tech Debt

### Critical
- None currently

### High Priority
- [ ] 4 spec clarifications needed (discovery screen)
- [ ] Backend discovery service files untracked
- [ ] Swipe model and migration untracked
- [ ] Docker environment not configured
- [ ] Database migrations not run

### Medium Priority
- [ ] React Native version upgrade available (0.74.5 → 0.81.4)
- [ ] Deprecated AndroidManifest package attributes in dependencies
- [ ] TypeScript validators needed for backend

### Low Priority
- [ ] Gradle Daemon warnings during Android build
- [ ] Deprecated React FontManager in Lottie

---

## 📚 Documentation Index

### Project Docs (Root)
- `CLAUDE.md` - Project overview & safety principles
- `README.md` - Getting started guide
- `ARCHITECTURE.md` - System architecture
- `SECURITY.md` - Security guidelines
- `DATABASE.sql` - Database schema
- `DEPLOYMENT_CHECKLIST.md` - Deployment procedures
- `PROJECT_SUMMARY.md` - Comprehensive summary
- `SPEC_KIT_GUIDE.md` - Spec-driven development guide
- **`PROJECT_ROADMAP.md`** - This file

### Feature Specs
- `specs/001-discovery-screen-swipeable/spec.md` - Discovery feature spec
- `specs/001-discovery-screen-swipeable/plan.md` - Implementation plan (in progress)

### Constitution
- `.specify/memory/constitution.md` - Project constitution (v1.0.0)

### Templates
- `.specify/templates/spec-template.md`
- `.specify/templates/plan-template.md`
- `.specify/templates/tasks-template.md`
- `.specify/templates/agent-file-template.md`

---

## 🎬 Next Steps

### Immediate (This Session)
1. Complete implementation plan for discovery screen
2. Generate research.md (Phase 0)
3. Generate data-model.md and contracts (Phase 1)
4. Create quickstart.md for testing
5. Update CLAUDE.md with new context

### This Week
1. Address 4 spec clarifications
2. Run `/tasks` command to generate tasks.md
3. Implement backend discovery API
4. Implement swipe tracking
5. Build matching algorithm

### This Month
1. Complete discovery screen feature
2. Implement authentication flow
3. Start verification system
4. Set up Docker environment
5. Configure database migrations

---

## 📞 Team & Resources

### Key Contacts
- **Product Owner**: TBD
- **Technical Lead**: TBD
- **Security Champion**: TBD

### External Services
- **ID Verification**: Jumio
- **Background Checks**: Checkr API
- **SMS/Phone**: Twilio
- **Payments**: Stripe Connect
- **Storage**: AWS S3
- **Monitoring**: New Relic/DataDog

### Repository
- **URL**: (Local development)
- **Main Branch**: `main`
- **Current Branch**: `001-discovery-screen-swipeable`

---

**Legend**:
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked
- ⚠️ Needs Attention
