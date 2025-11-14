# Codebase Structure

## Root Directory
```
conest/
├── backend/          # Node.js Express API server
├── mobile/           # React Native mobile app
├── specs/            # Feature specifications
├── docs/             # Project documentation
├── .github/          # GitHub workflows
├── docker-compose.yml       # Docker services configuration
├── docker-compose.test.yml  # Test environment
├── DATABASE.sql      # PostgreSQL schema
└── CLAUDE.md         # Project README
```

## Backend Structure (`backend/src/`)
```
backend/src/
├── config/          # Database, security, environment config
├── controllers/     # Request handlers (auth, payment, oauth, etc.)
├── middleware/      # Express middleware (auth, validation, error handling)
├── models/          # Database models (User, Profile, Verification, etc.)
├── routes/          # API route definitions
├── services/        # Business logic (authService, paymentService, etc.)
├── validators/      # Request validation schemas
├── workers/         # Background job workers
├── websockets/      # Socket.io event handlers
├── utils/           # Utility functions (password, encryption, etc.)
├── migrations/      # Knex database migrations
├── seeds/           # Database seed data
├── tests/           # Integration and unit tests
├── types/           # TypeScript type definitions
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## Mobile Structure (`mobile/src/`)
```
mobile/src/
├── components/      # Reusable React components
├── screens/         # Screen components (auth/, main/)
│   ├── auth/       # LoginScreen, SignupScreen
│   └── main/       # HomeScreen, ProfileScreen, BrowseDiscoveryScreen
├── navigation/      # React Navigation setup (MainNavigator.tsx)
├── store/           # Redux Toolkit slices and store
├── services/        # API clients
│   ├── api/        # API service modules (auth.ts, messages.ts, etc.)
│   └── socket.ts   # Socket.io client
├── hooks/           # Custom React hooks (useProfile.ts)
├── theme/           # Design system (colors, typography, spacing)
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── config/          # App configuration (api.ts)
```

## Key File Patterns
- **Controllers**: Handle HTTP requests, call services, return responses
- **Services**: Business logic, database operations, external API calls
- **Models**: Knex query builders and database schema definitions
- **Validators**: Zod schemas for request validation
- **Middleware**: auth.middleware.ts (JWT), error handling, rate limiting
