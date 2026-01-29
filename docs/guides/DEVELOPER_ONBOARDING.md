# CoNest Developer Onboarding Guide

A comprehensive guide for developers joining the CoNest project - a single parent housing platform built with React Native and Node.js.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Quick Start](#3-quick-start)
4. [Infrastructure & Docker](#4-infrastructure--docker)
5. [Backend Architecture](#5-backend-architecture)
6. [Mobile App Architecture](#6-mobile-app-architecture)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Authentication & Security](#9-authentication--security)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Development Workflow](#11-development-workflow)
12. [Testing](#12-testing)
13. [Code Conventions](#13-code-conventions)
14. [Key Business Logic](#14-key-business-logic)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

### What is CoNest?

CoNest helps single parents find safe, verified, and compatible roommates for shared housing. The platform prioritizes child safety while making housing affordable through cost-sharing.

### Core Safety Principles

- **NO child data storage** - Only parent profiles, no children's names/photos/details
- **Mandatory verification** - Background checks, ID verification for all users
- **End-to-end encryption** - All messages and sensitive data encrypted
- **Parent-only platform** - Children never interact with the app

### Business Model

| Feature | Price |
|---------|-------|
| Browse profiles | Free |
| Verification (required for messaging) | $39 one-time |
| Premium subscription | $14.99/month |
| Bundle (verification + 6mo premium) | $99 |

### Target Users

- Single parents seeking affordable housing
- Ages 25-45 primarily
- Income $25K-75K range
- Currently paying 40-60% income on rent

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18.2 | Web framework |
| TypeScript | 5.2+ | Type safety |
| PostgreSQL | 15 (with PostGIS) | Primary database |
| Knex.js | 3.0.1 | Query builder |
| Objection.js | 3.1.5 | ORM |
| Redis | 7 | Caching, sessions |
| Socket.io | 4.6 | Real-time messaging |
| Stripe | 14.5 | Payments |
| Bull | 4.11 | Job queues |
| Zod | 3.22 | Validation |
| Winston | 3.11 | Logging |

### Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.74.5 | Mobile framework |
| TypeScript | 5.3+ | Type safety |
| Redux Toolkit | 1.9.7 | State management |
| React Query | 5.17 | Server state |
| React Navigation | 6.x | Navigation |
| React Native Paper | 5.12 | UI components |
| Axios | 1.6.5 | HTTP client |
| Socket.io Client | 4.7 | Real-time |

### Infrastructure

| Service | Technology |
|---------|------------|
| Containers | Docker Compose |
| Database | PostgreSQL 15 + PostGIS |
| Caching | Redis 7 |
| File Storage | AWS S3 |
| SMS/Push | Twilio |
| ID Verification | Veriff |
| Background Checks | Certn |
| Payments | Stripe Connect |

---

## 3. Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- iOS: Xcode 15+, CocoaPods
- Android: Android Studio, JDK 17

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd conest

# Start infrastructure
docker-compose up -d postgres redis

# Backend setup
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run migrate
npm run seed:dev
npm run dev

# Mobile setup (new terminal)
cd mobile
npm install
cd ios && pod install && cd ..

# Run mobile app
npm start
# In another terminal:
npm run ios  # or npm run android
```

### Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```bash
# Essential for local development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safenest_db
DB_USER=safenest
DB_PASSWORD=

REDIS_HOST=localhost
REDIS_PORT=6380

JWT_SECRET=dev-secret-change-in-production-2024
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-2024
```

---

## 4. Infrastructure & Docker

### Docker Services

```yaml
# docker-compose.yml
services:
  postgres:      # Port 5432, PostgreSQL 15 with PostGIS
  redis:         # Port 6380 -> 6379
  backend:       # Port 3000 (API), 3001 (WebSocket)
```

### Connection Details

| Service | Host (Docker) | Host (Local) | Port |
|---------|---------------|--------------|------|
| PostgreSQL | postgres | localhost | 5432 |
| Redis | redis | localhost | 6380 |
| Backend API | backend | localhost | 3000 |
| WebSocket | backend | localhost | 3001 |

### Database Credentials

```
Database: safenest_db
User: safenest
Password: 
```

### Common Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Connect to database
docker exec -it conest-postgres psql -U safenest -d safenest_db

# Reset database
docker-compose down -v
docker-compose up -d postgres redis
cd backend && npm run migrate && npm run seed:dev
```

---

## 5. Backend Architecture

### Directory Structure

```
backend/src/
├── config/           # Configuration (database, redis, stripe, etc.)
├── controllers/      # HTTP request handlers (16 files)
├── middleware/       # Express middleware (13 files)
├── models/           # Objection.js ORM models (18 files)
├── migrations/       # Knex database migrations (17 files)
├── routes/           # API route definitions (14 files)
├── services/         # Business logic (29 files)
├── types/            # TypeScript definitions
├── utils/            # Helper functions (8 files)
├── validators/       # Input validation schemas
├── websockets/       # Socket.io handlers
├── workers/          # Background job processors
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

### Request Flow

```
Request → Middleware Chain → Controller → Service → Model → Database
                                              ↓
Response ← Controller ← Service ← Model ← Database
```

### Middleware Stack (Order Matters)

1. **Helmet** - Security headers
2. **CORS** - Cross-origin configuration
3. **Request Size Limit** - Body size validation
4. **Sanitization** - Input sanitization
5. **Rate Limiting** - IP & user-based limits
6. **Authentication** - JWT validation
7. **Authorization** - Role-based access
8. **Validation** - Request schema validation

### Key Controllers

| Controller | File | Responsibility |
|------------|------|----------------|
| Auth | `authController.ts` | Login, signup, tokens |
| Profile | `profileController.ts` | User profile CRUD |
| Verification | `verificationController.ts` | ID/background checks |
| Discovery | `discoveryController.ts` | Profile feed, browsing |
| Connection | `connectionRequestController.ts` | Connection workflow |
| Message | `messageController.ts` | Messaging |
| Household | `householdController.ts` | Shared living |
| Payment | `paymentController.ts` | Subscriptions |

### Key Services

| Service | File | Purpose |
|---------|------|---------|
| Auth | `authService.ts` | JWT generation, validation |
| Matching | `matchingService.ts` | Compatibility algorithm |
| Verification | `verificationService.ts` | Verification workflow |
| Payment | `paymentService.ts` | Stripe integration |
| Messaging | `EnhancedMessagingService.ts` | Encrypted messaging |
| Discovery | `DiscoveryService.ts` | Feed generation |

### Models (Objection.js)

```typescript
// Example: User model relationships
class User extends Model {
  static tableName = 'users';

  static relationMappings = {
    profile: {
      relation: Model.HasOneRelation,
      modelClass: Profile,
      join: { from: 'users.id', to: 'profiles.user_id' }
    },
    verification: {
      relation: Model.HasOneRelation,
      modelClass: Verification,
      join: { from: 'users.id', to: 'verifications.user_id' }
    }
  };
}
```

---

## 6. Mobile App Architecture

### Directory Structure

```
mobile/src/
├── navigation/       # React Navigation setup (8 files)
├── screens/          # Screen components (7 directories)
├── components/       # Reusable UI components (8 directories)
├── store/            # Redux state management
│   └── slices/       # Redux Toolkit slices (11 files)
├── services/         # API & utility services
│   └── api/          # API client modules (10 files)
├── types/            # TypeScript definitions
├── utils/            # Helper utilities (8 files)
├── theme/            # Styling & colors
├── hooks/            # Custom React hooks
└── config/           # App configuration
```

### Navigation Structure

```
AppNavigator
├── AuthNavigator (not authenticated)
│   ├── LoginScreen
│   ├── SignupScreen
│   └── ForgotPasswordScreen
├── OnboardingNavigator (authenticated, not onboarded)
│   └── OnboardingSteps...
└── MainNavigator (authenticated + onboarded)
    ├── HomeNavigator (Tab)
    ├── ProfileNavigator (Tab)
    ├── MessagesNavigator (Tab)
    └── VerificationNavigator (Tab)
```

### Redux Store Structure

```typescript
store = {
  auth: {           // Authentication state, tokens
  user: {           // Current user profile
  verification: {   // Verification status
  browseDiscovery: {// Discovery feed, profiles
  connectionRequests: { // Connection workflow
  enhancedMessages: { // Encrypted messaging
  household: {      // Shared living
  savedProfiles: {  // Favorites
  matches: {        // Match data
}
```

### Key Screens

| Screen | File | Purpose |
|--------|------|---------|
| Discovery | `BrowseDiscoveryScreen.tsx` | Browse and compare profiles |
| Home | `HomeScreen.tsx` | Dashboard |
| Profile | `ProfileScreen.tsx` | User profile management |
| Messages | `MessagesScreen.tsx` | Conversation list |
| Connections | `ConnectionRequestsScreen.tsx` | Request management |

### API Services

```typescript
// Example: API service usage
import { discoveryAPI } from '@/services/api/discoveryAPI';

// Get discovery feed
const profiles = await discoveryAPI.getFeed(filters);

// Express interest in a profile
await discoveryAPI.sendInterest(profileId);
```

---

## 7. Database Schema

### Core Tables

```sql
-- Users & Authentication
users (id, email, password_hash, phone, oauth_provider, oauth_id, ...)

-- User Profiles
profiles (id, user_id, first_name, bio, location, preferences_json, ...)

-- Verification System
verifications (id, user_id, id_status, bg_check_status, expires_at, ...)
verification_payments (id, user_id, stripe_payment_id, amount, ...)

-- Matching & Discovery
matches (id, user1_id, user2_id, compatibility_score, ...)
connection_requests (id, sender_id, receiver_id, status, message, ...)

-- Messaging
conversations (id, participant_ids[], created_at, ...)
messages (id, conversation_id, sender_id, content_encrypted, ...)

-- Household Management
households (id, name, address, rules_json, ...)
household_members (id, household_id, user_id, role, ...)
expenses (id, household_id, payer_id, amount, description, ...)

-- Payments & Subscriptions
subscriptions (id, user_id, stripe_subscription_id, plan, status, ...)
payments (id, user_id, amount, type, stripe_payment_id, ...)

-- Profile Features
saved_profiles (id, user_id, saved_user_id, folder_id, ...)
```

### Key Relationships

```
User 1:1 Profile
User 1:1 Verification
User M:N Matches
User M:N Conversations (via messages)
User M:N Households (via household_members)
User 1:N ConnectionRequests (as sender/receiver)
```

### Migration Commands

```bash
# Run pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Seed development data
npm run seed:dev
```

---

## 8. API Reference

### Base URL

- Development: `http://localhost:3000/api`
- WebSocket: `http://localhost:3001`

### Authentication Endpoints

```
POST /api/auth/signup        # Create account
POST /api/auth/login         # Login, get tokens
POST /api/auth/refresh       # Refresh access token
POST /api/auth/logout        # Invalidate session
POST /api/auth/google        # Google OAuth
POST /api/auth/apple         # Apple Sign-In
```

### Profile Endpoints

```
GET    /api/profiles/:id     # Get profile
POST   /api/profiles         # Create profile
PUT    /api/profiles/:id     # Update profile
DELETE /api/profiles/:id     # Delete profile
```

### Discovery Endpoints

```
GET  /api/discovery/feed              # Get profiles to browse
POST /api/discovery/interest          # Express interest in profile
GET  /api/discovery/filter-options    # Get available filters
```

### Connection Endpoints

```
GET    /api/connection-requests       # List requests
POST   /api/connection-requests       # Send request
PUT    /api/connection-requests/:id   # Accept/decline
DELETE /api/connection-requests/:id   # Cancel request
```

### Messaging Endpoints

```
GET  /api/messages/conversations      # List conversations
GET  /api/messages/:conversationId    # Get messages
POST /api/messages/send               # Send message
```

### Verification Endpoints

```
POST /api/verification/start          # Begin verification
GET  /api/verification/status         # Check status
POST /api/verification/webhook        # Provider callbacks
```

### Payment Endpoints

```
POST /api/payments/subscribe          # Create subscription
GET  /api/payments/subscription       # Get current plan
POST /api/payments/cancel             # Cancel subscription
POST /api/stripe/webhook              # Stripe webhooks
```

### Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [...]
  }
}
```

---

## 9. Authentication & Security

### JWT Token Flow

```
1. User logs in with credentials
2. Server validates and returns:
   - Access token (15min expiry)
   - Refresh token (7 day expiry)
3. Client stores tokens securely (Keychain/Keystore)
4. Access token sent in Authorization header
5. When expired, use refresh token to get new access token
```

### Development Authentication

For local development and testing, use the dev token endpoint to get valid JWTs:

```bash
# Get a test token (dev/test environments only)
curl http://localhost:3000/api/dev/test-token?user=sarah

# Response includes accessToken, refreshToken, and usage instructions
# Use the token in subsequent requests:
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/api/profiles/compare
```

**Available test users:**
- `sarah` - Sarah Johnson (default)
- `michael` - Michael Chen
- `emily` - Emily Rodriguez

**⚠️ Security Notes:**
- The `/api/dev/*` endpoints only exist when `NODE_ENV=development` or `NODE_ENV=test`
- These endpoints are NOT registered in production builds
- Never use hardcoded auth bypasses - always use real JWTs
- For unit tests, mock the `authenticateJWT` middleware at the test framework level

### Security Middleware

| Middleware | Purpose |
|------------|---------|
| `auth.ts` | Validates JWT, attaches user to request |
| `csrf.ts` | CSRF protection for state-changing requests |
| `rateLimit.ts` | User-based rate limiting |
| `ipRateLimit.ts` | IP-based rate limiting |
| `sanitization.ts` | XSS prevention, input cleaning |
| `requestSizeLimit.ts` | Prevents large payload attacks |

### Message Encryption

```typescript
// Messages are encrypted end-to-end using AES-256-GCM
// Each conversation has a shared key
// Keys are derived from user key pairs
// Backend never sees plaintext messages
```

### Mobile Security

- **Certificate Pinning**: HTTPS certificates validated against known pins
- **Biometric Auth**: Optional fingerprint/Face ID for app access
- **Secure Storage**: Tokens stored in iOS Keychain / Android Keystore
- **Screenshot Detection**: Users notified when screenshots taken

---

## 10. Third-Party Integrations

### Veriff (ID Verification)

```
Purpose: Government ID verification
Flow:
1. Backend creates Veriff session
2. Mobile opens Veriff WebView
3. User submits ID photo + selfie
4. Veriff processes and calls webhook
5. Backend updates verification status
```

### Certn (Background Checks)

```
Purpose: Criminal background checks
Flow:
1. User consents to background check
2. Backend submits check to Certn
3. Certn processes (24-72 hours)
4. Webhook updates verification status
```

### Stripe (Payments)

```
Purpose: Subscriptions and one-time payments
Webhooks:
- payment_intent.succeeded
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
```

### Twilio (SMS)

```
Purpose: Phone verification, notifications
Usage:
- OTP codes for phone verification
- Push notifications for messages/matches
```

### AWS S3 (File Storage)

```
Purpose: Profile photos, documents
Bucket: safenest-uploads (or per environment)
Access: Pre-signed URLs for secure upload/download
```

---

## 11. Development Workflow

### Available Scripts

**Backend:**

```bash
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Run compiled code
npm run migrate      # Run database migrations
npm run seed:dev     # Seed development data
npm run test         # Run tests
npm run lint         # ESLint check
npm run format       # Prettier format
```

**Mobile:**

```bash
npm start            # Start Metro bundler
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run pod-install  # Install iOS pods
npm run clean        # Clean build artifacts
npm test             # Run tests
```

### Git Workflow

```
main          - Production-ready code
develop       - Integration branch
feature/*     - New features
bugfix/*      - Bug fixes
release/*     - Release preparation
```

### Branch Naming

```
feature/001-discovery-screen
feature/002-messaging-encryption
bugfix/003-login-crash
```

### Commit Messages

```
feat: Add profile card transitions in discovery
fix: Resolve crash on profile load
docs: Update API documentation
refactor: Simplify matching algorithm
test: Add unit tests for auth service
```

---

## 12. Testing

### Backend Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- authService.test.ts

# Run security tests
npm run test:security
```

### Test Structure

```
backend/__tests__/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   └── routes/
├── security/
└── e2e/
```

### Mobile Testing

```bash
# Unit tests
npm test

# E2E tests with Detox
npm run test:e2e

# Run specific test
npm test -- LoginScreen.test.tsx
```

### Testing Stack

| Tool | Purpose |
|------|---------|
| Jest | Unit testing |
| Supertest | API integration tests |
| Playwright | Backend E2E |
| Detox | Mobile E2E |
| React Testing Library | Component tests |

---

## 13. Code Conventions

### TypeScript

```typescript
// Use explicit types for function parameters and returns
function calculateScore(profile1: Profile, profile2: Profile): number {
  // ...
}

// Use interfaces for object shapes
interface UserPreferences {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  quietHours: TimeRange;
}

// Use enums for fixed sets
enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

### File Naming

```
# React components: PascalCase
ProfileCard.tsx
MessageBubble.tsx

# Services/utilities: camelCase
authService.ts
dateUtils.ts

# Types: PascalCase with suffix
User.types.ts
verification.types.ts
```

### Import Organization

```typescript
// 1. External libraries
import React, { useState } from 'react';
import { View, Text } from 'react-native';

// 2. Internal modules
import { useAuth } from '@/hooks/useAuth';
import { ProfileCard } from '@/components';

// 3. Types
import type { User, Profile } from '@/types';

// 4. Styles/constants
import { colors, spacing } from '@/theme';
```

### Error Handling

```typescript
// Backend: Use custom error classes
throw new ValidationError('Invalid email format');
throw new AuthenticationError('Token expired');
throw new NotFoundError('Profile not found');

// Mobile: Use try-catch with proper handling
try {
  await api.login(credentials);
} catch (error) {
  if (error.code === 'INVALID_CREDENTIALS') {
    showToast('Invalid email or password');
  } else {
    showToast('Something went wrong');
    logger.error(error);
  }
}
```

---

## 14. Key Business Logic

### Matching Algorithm

```typescript
// Compatibility score weights
const weights = {
  scheduleCompatibility: 0.25,   // Work/custody schedules
  parentingPhilosophy: 0.20,     // Parenting style alignment
  houseRulesAlignment: 0.20,     // Rules preferences
  locationSchools: 0.15,         // Location/school proximity
  budgetMatch: 0.10,             // Budget compatibility
  lifestyleFactors: 0.10,        // Smoking, pets, etc.
};

// Score calculation
totalScore = sum(categoryScore * weight) for each category
```

### Verification Flow

```
1. User pays $39 verification fee
2. ID verification starts (Veriff)
   - Takes ~5 minutes
   - Validates government ID
3. Background check starts (Certn)
   - Takes 24-72 hours
   - Criminal record check
4. Both pass → User verified
5. Verification expires after 1 year
   - 7-day grace period before hidden
```

### Connection Request Flow

```
1. User A browses profiles and finds User B
2. User A sends connection request with message
3. User B receives request notification
4. User B can: Accept / Decline / Ignore
5. If accepted: Conversation enabled, match created
6. If declined: Connection blocked for 30 days
```

### Subscription States

```
FREE:
- Browse profiles (limited)
- Basic filters
- Cannot message

VERIFIED ($39 one-time):
- Full profile browsing
- Can send messages
- Basic matching

PREMIUM ($14.99/mo):
- Unlimited profile views
- Advanced filters
- Priority in discovery
- See who's interested in pairing
```

---

## 15. Troubleshooting

### Common Issues

**Docker: Database connection refused**
```bash
# Check if postgres is running
docker ps | grep postgres

# Check logs
docker logs conest-postgres

# Restart services
docker-compose down && docker-compose up -d
```

**Mobile: Metro bundler cache issues**
```bash
# Clear Metro cache
npm start -- --reset-cache

# Clear all caches (iOS)
cd ios && pod deintegrate && pod install && cd ..
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clear all caches (Android)
cd android && ./gradlew clean && cd ..
```

**Mobile: Pod install fails**
```bash
cd ios
pod deintegrate
pod repo update
pod install
```

**Backend: Migration fails**
```bash
# Check migration status
npm run migrate:status

# Rollback and retry
npm run migrate:rollback
npm run migrate
```

**TypeScript errors after pulling**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Useful Debug Commands

```bash
# Check API health
curl http://localhost:3000/health

# Connect to database
docker exec -it conest-postgres psql -U safenest -d safenest_db

# View backend logs
docker-compose logs -f backend

# Redis CLI
docker exec -it conest-redis redis-cli
```

### Log Locations

```
Backend: docker logs conest-backend
         backend/logs/error.log (if file logging enabled)

Mobile:  React Native Metro console
         Xcode console (iOS)
         Logcat (Android)
```

---

## Quick Reference Card

```
# Start everything
docker-compose up -d && cd backend && npm run dev

# Database
psql: docker exec -it conest-postgres psql -U safenest -d safenest_db
migrate: cd backend && npm run migrate
seed: cd backend && npm run seed:dev

# Mobile
iOS: cd mobile && npm run ios
Android: cd mobile && npm run android
Metro: cd mobile && npm start

# API
Health: curl http://localhost:3000/health
Base: http://localhost:3000/api

# Credentials (dev)
DB: safenest / 
```

---

**Last Updated:** November 2024
**Current Branch:** 004-mobile-verification-screens
**Questions?** Check CLAUDE.md or ask the team
