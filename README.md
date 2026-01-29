# CoNest - Single Parent Housing Platform

> **Safe, Verified, and Compatible Roommate Matching for Single Parents**

[![Security](https://img.shields.io/badge/security-hardened-green.svg)](./SECURITY.md)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](./backend/TESTING_GUIDE.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen.svg)](./backend/TESTING_GUIDE.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 🎯 Mission

Help single parents find safe, verified, and compatible roommates to make housing affordable while prioritizing child safety through cost-sharing.

## 🛡️ Core Safety Principles

- **NO child data storage** - Only parent profiles, never children's names/photos/details
- **Mandatory verification** - Background checks and ID verification for all users
- **End-to-end encryption** - All messages and sensitive data encrypted
- **Parent-only platform** - Children never interact with the app

## ✨ Key Features

### 1. **Parent Verification System**
- Government ID verification via Veriff (mocked for development)
- Background checks via Certn API (mocked for development)
- Phone/email verification
- Income verification (optional)
- Trust scoring system

### 2. **Smart Matching Algorithm**
Weighted compatibility scoring:
- **25%** Schedule compatibility
- **20%** Parenting philosophy alignment
- **20%** House rules compatibility
- **15%** Location & schools
- **10%** Budget match
- **10%** Lifestyle factors

### 3. **Safety Features**
- Verification badges on all profiles
- Emergency contact system
- Report/block functionality
- Visitor logging for households
- Comprehensive audit trails

### 4. **Household Management**
- Expense splitting with Stripe Connect
- Shared calendar and chore scheduling
- House rules documentation
- Lease agreement templates
- Payment automation

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed
- Git initialized
- Stripe account (test mode enabled)

### 1. Environment Setup

```bash
# Clone repository
cd /Users/ghostmac/Development/conest

# Start Docker containers (PostgreSQL + Redis)
docker-compose up -d

# Verify containers are running
docker ps
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Setup test database and seed data
chmod +x scripts/*.sh
./scripts/test-setup.sh

# Run tests
npm test

# Start development server
npm run dev
```

Backend API will be available at: **http://localhost:3000**

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS (in new terminal)
npm run ios

# Or run on Android
npm run android
```

## 📊 Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15 with PostGIS
- **Cache**: Redis 7
- **Real-time**: Socket.io
- **Payments**: Stripe Connect
- **Authentication**: JWT with refresh tokens

### Mobile
- **Framework**: React Native with TypeScript
- **Navigation**: React Navigation 6
- **State Management**: Redux Toolkit + React Query
- **UI**: React Native Paper + custom components
- **Storage**: AsyncStorage (encrypted)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest + Supertest + Artillery
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions

## 🧪 Testing

### Run All Tests
```bash
cd backend
./scripts/run-tests.sh --coverage
```

### Run Specific Test Suites
```bash
# Security tests only
npm run test:security

# Integration tests
./scripts/run-tests.sh --suite integration

# E2E tests
./scripts/run-tests.sh --suite e2e

# Compliance tests (child safety)
./scripts/run-tests.sh --suite compliance
```

### API Health Check
```bash
# Start server first
npm run dev

# In another terminal
TEST_EMAIL=sarah.verified@test.com TEST_PASSWORD=TestPassword123! \
  ./scripts/api-health-check.sh
```

### Load Testing
```bash
npm install -g artillery
artillery run artillery-config.yml
```

## 📚 Documentation

- **[ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)** - System architecture and design
- **[SECURITY.md](./SECURITY.md)** - Security best practices and compliance
- **[COMPLEXITY.md](./backend/COMPLEXITY.md)** - Code complexity management
- **[UI_DESIGN.md](./docs/guides/UI_DESIGN.md)** - Design system and components
- **[TESTING_GUIDE.md](./backend/TESTING_GUIDE.md)** - Comprehensive testing guide
- **[API_EXAMPLES.md](./backend/API_EXAMPLES.md)** - All 47 API endpoint examples
- **[IMPLEMENTATION.md](./docs/implementation/IMPLEMENTATION.md)** - Step-by-step implementation guide

### Additional Documentation
- **[Developer Onboarding](./docs/guides/DEVELOPER_ONBOARDING.md)** - Getting started guide
- **[Code Quality Standards](./docs/guides/CODE_QUALITY_STANDARDS.md)** - Coding standards
- **[Security Testing](./docs/security/SECURITY_TESTING_GUIDE.md)** - Security test guide
- **[Business Roadmap](./docs/business/PROJECT_ROADMAP.md)** - Product roadmap

## 🔐 Security Features

### Authentication & Authorization
- ✅ Bcrypt password hashing (cost factor 12)
- ✅ JWT with short expiry (15min access, 7day refresh)
- ✅ Refresh token rotation
- ✅ Account lockout after 5 failed attempts
- ✅ Session management with Redis
- ✅ Role-based access control (RBAC)

### Input Validation
- ✅ SQL injection prevention
- ✅ XSS protection with CSP headers
- ✅ CSRF token protection
- ✅ Request size limits (10MB body, 5MB files)
- ✅ Rate limiting (100 req/15min general, stricter for sensitive endpoints)

### Data Encryption
- ✅ AES-256-GCM encryption for sensitive data
- ✅ PBKDF2 key derivation (100K iterations)
- ✅ PII tokenization for audit logs
- ✅ End-to-end message encryption preparation
- ✅ SSL/TLS for all communications

### Code Quality
- ✅ ESLint with max complexity 15
- ✅ Prettier for consistent formatting
- ✅ 85%+ test coverage requirement
- ✅ Automated security audits
- ✅ SonarQube quality gates

## 🎨 Design System

### Color Palette
```typescript
primary: '#2ECC71'    // Trust green - growth, safety
secondary: '#3498DB'  // Calm blue - stability
tertiary: '#F39C12'   // Warm amber - home
error: '#E74C3C'      // Alert red
success: '#27AE60'    // Verified green
```

### Core Components
- **SafetyBadge** - Verification status indicators
- **CompatibilityScore** - Circular progress with gradient
- **ParentCard** - Profile cards (NO child data)
- **TrustIndicator** - Trust metrics display

## 📈 Success Metrics

### Safety & Trust
- Zero child safety incidents (**CRITICAL**)
- 95% user verification rate
- <24hr background check completion
- Zero data breaches (**CRITICAL**)

### User Experience
- 80% successful housing matches
- Average housing stability: >12 months
- <3s app launch time
- <200ms API response time (p95)

### Code Quality
- 85%+ test coverage (enforced)
- Max complexity 15 (enforced)
- Zero critical vulnerabilities (enforced)

## 🛠️ Development Commands

### Backend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage
npm run test:security    # Run security tests
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run security:audit   # Run security audit
```

### Mobile
```bash
npm start                # Start Metro bundler
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm test                 # Run tests
npm run lint             # Run ESLint
npm run format           # Format code
```

## 🚦 API Endpoints

### Authentication (8 endpoints)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/verify-email` - Email verification
- `POST /api/v1/auth/verify-phone` - Phone verification
- `POST /api/v1/auth/password-reset` - Password reset
- `POST /api/v1/auth/2fa/enable` - Enable 2FA

### Profiles (6 endpoints)
- `GET /api/v1/profiles/:id` - Get profile by ID
- `POST /api/v1/profiles` - Create profile
- `PUT /api/v1/profiles/:id` - Update profile
- `DELETE /api/v1/profiles/:id` - Delete profile
- `POST /api/v1/profiles/:id/photo` - Upload photo
- `GET /api/v1/profiles/search` - Search profiles

### Matching (5 endpoints)
- `GET /api/v1/matches` - Get potential matches
- `POST /api/v1/matches` - Create match
- `GET /api/v1/matches/:id` - Get match details
- `POST /api/v1/matches/:id/like` - Express interest
- `POST /api/v1/matches/:id/pass` - Pass on match

### Messages (6 endpoints)
- `GET /api/v1/conversations` - Get all conversations
- `GET /api/v1/conversations/:id/messages` - Get messages
- `POST /api/v1/messages` - Send message
- `PUT /api/v1/messages/:id/read` - Mark as read
- `DELETE /api/v1/messages/:id` - Delete message
- `GET /api/v1/messages/unread` - Get unread count

### Payments (9 endpoints)
- `POST /api/v1/stripe/connect` - Create Stripe Connect account
- `GET /api/v1/payments` - Get payment history
- `POST /api/v1/payments` - Create payment
- `POST /api/v1/payments/:id/refund` - Process refund
- `POST /api/v1/households/:id/split-rent` - Split rent
- `POST /api/v1/stripe/webhook` - Stripe webhook handler

**See [API_EXAMPLES.md](./backend/API_EXAMPLES.md) for complete documentation with cURL examples**

## 👥 Test Users

All test users have password: **`TestPassword123!`**

| Email | Status | Children | Budget |
|-------|--------|----------|--------|
| sarah.verified@test.com | Fully verified | 2 (ages 5-10) | $800-1200 |
| maria.fullverified@test.com | Fully + 2FA | 1 (ages 2-4) | $700-1000 |
| lisa.pending@test.com | Partial | 1 (ages 6-8) | $1000-1500 |
| jennifer.complete@test.com | Fully verified | 3 (ages 4-12) | $900-1300 |

## 📦 Project Structure

```
conest/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/      # Database, Redis, security configs
│   │   ├── controllers/ # Route handlers
│   │   ├── models/      # Database models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic & external APIs
│   │   ├── middleware/  # Auth, validation, security
│   │   ├── websockets/  # Socket.io real-time
│   │   ├── workers/     # Background jobs
│   │   ├── utils/       # Helpers & utilities
│   │   └── migrations/  # Database migrations
│   ├── __tests__/       # Test suites
│   ├── scripts/         # Utility scripts
│   └── seeds/           # Test data
│
├── mobile/              # React Native app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── screens/     # App screens
│   │   ├── navigation/  # React Navigation setup
│   │   ├── services/    # API calls & native features
│   │   ├── store/       # Redux Toolkit state
│   │   ├── hooks/       # Custom React hooks
│   │   ├── theme/       # Design system
│   │   └── utils/       # Helpers & constants
│   └── __tests__/       # Component & integration tests
│
├── .github/             # GitHub Actions CI/CD
├── DATABASE.sql         # PostgreSQL schema
├── docker-compose.yml   # Docker orchestration
└── Documentation files
```

## 🤝 Contributing

We follow secure coding practices and maintain high code quality standards:

1. All code must pass ESLint (max complexity 15)
2. Test coverage must be ≥80%
3. All security tests must pass
4. No child data storage violations
5. Follow existing code style (Prettier enforced)

## 🔒 License

MIT License - See [LICENSE](./LICENSE) for details

## 📞 Support

For issues and feature requests, please create an issue in the repository.

## 🙏 Acknowledgments

Built with security and child safety as top priorities. Special thanks to all contributors dedicated to making housing accessible for single-parent families.

---

**⚠️ REMEMBER: This platform prioritizes child safety. NEVER store, display, or transmit child-identifying information.**
