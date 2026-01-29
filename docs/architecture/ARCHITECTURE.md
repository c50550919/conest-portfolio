# Technical Architecture

## System Overview
Microservices-ready architecture with Docker containerization, enabling independent scaling of components.

## Backend Architecture

### Feature-Based Structure
The backend uses a **vertical slice architecture** where each domain feature is self-contained with its own controller, service, routes, and types.

```
/backend/src/
├── /features              # Domain-organized feature modules
│   ├── /admin             # Admin dashboard & user management
│   ├── /auth              # Authentication, OAuth, 2FA
│   ├── /comparison        # Profile compatibility comparison
│   ├── /connections       # Connection requests between users
│   ├── /discovery         # Profile discovery & swiping
│   │   └── /cache         # Discovery caching layer
│   ├── /household         # Household management & expenses
│   ├── /matching          # Matching algorithm & recommendations
│   ├── /messages          # Real-time messaging & enhanced messaging
│   ├── /moderation        # Content moderation & AI filtering
│   ├── /payments          # Stripe integration & billing
│   ├── /profile           # User profile management
│   ├── /saved-profiles    # Saved/bookmarked profiles
│   └── /verification      # Identity & background verification
│       ├── /veriff        # Veriff ID verification client
│       ├── /certn         # Certn background check client
│       └── /telnyx        # Telnyx phone verification
│
├── /config                # Configuration (env, security, stripe, etc.)
├── /middleware            # Shared middleware (auth, rate limiting, validation)
├── /models                # Shared database models
├── /migrations            # Database migrations (Knex)
├── /seeds                 # Seed data for testing
├── /services              # Cross-cutting shared services only
├── /websockets            # Socket.io handlers
├── /workers               # Background job workers (BullMQ)
├── /types                 # Shared TypeScript types
├── /utils                 # Shared utilities
└── /validators            # Shared validation schemas
```

### Feature Module Structure
Each feature follows a consistent pattern:
```
/features/{name}/
├── {name}.controller.ts   # Request handlers
├── {name}.service.ts      # Business logic
├── {name}.routes.ts       # Express route definitions
├── {name}.schemas.ts      # Zod validation schemas (optional)
├── {name}.types.ts        # TypeScript types (optional)
└── index.ts               # Barrel exports
```

### Core Features

| Feature | Purpose | Key Capabilities |
|---------|---------|------------------|
| **auth** | Authentication & identity | JWT tokens, refresh tokens, OAuth (Google/Apple), 2FA via Telnyx |
| **verification** | User verification | Veriff ID checks, Certn background checks, phone verification |
| **discovery** | Profile browsing | Weighted discovery, Redis caching, swipe recording |
| **matching** | Match creation | Compatibility algorithm, ML recommendations, PostGIS queries |
| **messages** | Real-time chat | Socket.io, E2E encryption, file sharing via S3, AI moderation |
| **payments** | Billing & subscriptions | Stripe Connect, verification fees, premium subscriptions |
| **household** | Co-living management | Expense splitting, shared calendars, house rules dxfg
| **moderation** | Content safety | AI content filtering, report handling, admin review queue |

## Frontend Architecture

### Mobile App Structure
/mobile/src/
├── /components     # Reusable UI components
├── /screens        # App screens
├── /navigation     # React Navigation setup
├── /services       # API calls & native features
├── /store          # Redux Toolkit state
├── /hooks          # Custom React hooks
└── /utils          # Helpers & constants
### State Management
- Redux Toolkit for global state
- React Query for API caching
- SecureStore for sensitive data

## Database Design
- PostgreSQL: Primary data store
- Redis: Session cache & queues
- PostGIS: Location-based queries
- pgcrypto: Encryption at rest

## Security Layers
1. **API Security**
   - Helmet.js for headers
   - Rate limiting (100 req/15min)
   - CORS configuration
   - Input validation (Joi/Zod)

2. **Data Security**
   - Encryption at rest (AES-256)
   - TLS 1.3 for transit
   - PII tokenization
   - Audit logging

## Deployment Strategy
- Development: Docker Compose local
- Staging: AWS ECS
- Production: AWS ECS with auto-scaling
- CI/CD: GitHub Actions

## Performance Targets
- API response: <200ms p95
- App launch: <2 seconds
- Match generation: <500ms
- Message delivery: <100ms