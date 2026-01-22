# CoNest Backend API

Complete Node.js/TypeScript backend for the CoNest single parent housing platform.

## Features Implemented

### Core Services
- **Authentication Service**: JWT with refresh tokens, password reset, 2FA (mock)
- **Verification Service**: ID verification (mock Veriff), background checks (mock Certn), phone/email verification (mock Twilio)
- **Matching Service**: Weighted compatibility algorithm (25% schedule, 20% parenting, 20% rules, 15% location, 10% budget, 10% lifestyle)
- **Messaging Service**: Real-time messaging via Socket.io with encryption placeholders
- **Payment Service**: Stripe Connect integration for rent splitting and payment processing

### Security Features
- Helmet.js for security headers
- Rate limiting (100 req/15min general, stricter for auth/payment endpoints)
- CORS configuration
- Input validation with Zod
- Password hashing with bcrypt (cost factor 12)
- JWT with proper expiry (15m access, 7d refresh)

### Database Schema
- Users & Authentication
- Profiles (parent-only data, NO child information stored)
- Verifications (multi-level verification system)
- Matches (compatibility scoring with breakdown)
- Messages & Conversations (encrypted messaging)
- Households & Payments (Stripe integration)

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Knex.js ORM
- **Cache**: Redis (sessions, queues)
- **Real-time**: Socket.io
- **Payment**: Stripe Connect
- **Background Jobs**: Bull queue system
- **Security**: Helmet, bcrypt, JWT, rate limiting

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Redis, Stripe, Logger configs
│   ├── controllers/     # Route handlers (auth, profile, match, etc.)
│   ├── models/          # Database models (User, Profile, Match, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic & external API integrations
│   ├── middleware/      # Auth, validation, security, error handling
│   ├── websockets/      # Socket.io real-time messaging
│   ├── workers/         # Background job processors
│   ├── utils/           # Helper functions
│   ├── migrations/      # Database migrations
│   └── server.ts        # Main entry point
├── tsconfig.json        # TypeScript configuration
├── knexfile.ts          # Knex migration configuration
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Stripe account (test mode keys)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create PostgreSQL database**
   ```bash
   createdb conest
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## Environment Variables

See `.env.example` for all required variables. Key configurations:

- `NODE_ENV`: development/staging/production
- `PORT`: Server port (default: 5000)
- `DB_*`: PostgreSQL connection details
- `REDIS_*`: Redis connection details
- `JWT_SECRET`: Secret for JWT tokens
- `STRIPE_SECRET_KEY`: Stripe test mode key
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)

## Mock Services

For development, the following services are mocked:

### Checkr (Background Checks)
- Always returns "clear" status
- Simulates 3-second async processing

### Jumio (ID Verification)
- Always returns "approved" status
- Simulates 2-second async processing

### Twilio (SMS/2FA)
- Logs OTP codes to console
- Always uses code "123456" for verification

### Real Services

- **Stripe**: Uses test mode for payment processing
- **PostgreSQL**: Real database operations
- **Redis**: Real caching and queue management

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/2fa/enable` - Enable 2FA (mock)
- `POST /api/auth/2fa/verify` - Verify 2FA code (mock)

### Profiles
- `POST /api/profiles` - Create user profile
- `GET /api/profiles/me` - Get current user's profile
- `PUT /api/profiles/me` - Update profile
- `GET /api/profiles/:id` - Get public profile
- `GET /api/profiles/search` - Search profiles
- `DELETE /api/profiles/me` - Delete profile

### Verification
- `GET /api/verification/status` - Get verification status
- `POST /api/verification/phone/send` - Send phone verification code
- `POST /api/verification/phone/verify` - Verify phone code
- `POST /api/verification/email/send` - Send email verification
- `POST /api/verification/id/initiate` - Start ID verification (mock Jumio)
- `POST /api/verification/background/initiate` - Start background check (mock Checkr)
- `POST /api/verification/income/initiate` - Start income verification

### Matching
- `GET /api/matches/find` - Find compatible matches
- `POST /api/matches/create` - Create match request
- `GET /api/matches/my-matches` - Get user's matches
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/:id/respond` - Accept/reject match

### Messaging
- `POST /api/messages/send` - Send message
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversations/:userId` - Get conversation with user
- `GET /api/messages/unread-count` - Get unread message count
- `POST /api/messages/:conversationId/mark-read` - Mark messages as read
- `DELETE /api/messages/:messageId` - Delete message

### Payments
- `POST /api/payments/create` - Create payment
- `GET /api/payments/my-payments` - Get user's payments
- `GET /api/payments/household/:householdId` - Get household payments
- `GET /api/payments/overdue` - Get overdue payments
- `POST /api/payments/:paymentId/refund` - Refund payment
- `POST /api/payments/household/:householdId/split-rent` - Split rent among members
- `POST /api/payments/stripe/create-account` - Create Stripe Connected Account
- `GET /api/payments/stripe/onboarding/:householdId` - Get Stripe onboarding link
- `POST /api/payments/webhook` - Stripe webhook handler

## WebSocket Events

### Client → Server
- `send_message` - Send a message
- `typing` - Typing indicator
- `mark_read` - Mark messages as read
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `presence_update` - Update user presence

### Server → Client
- `new_message` - Receive new message
- `message_delivered` - Message delivery confirmation
- `user_typing` - User typing notification
- `messages_read` - Messages read receipt
- `user_presence` - User presence update

## Database Migrations

Run migrations:
```bash
npm run migrate
```

Rollback last migration:
```bash
npm run migrate:rollback
```

## Development

Start development server with hot reload:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Background Workers

The API includes background workers for:
- Verification processing (ID checks, background checks)
- Notification delivery (email, SMS, push - all mocked)

Workers use Bull queue system with Redis as backend.

## Security Considerations

- **NO CHILD DATA**: System only stores parent profiles and parenting preferences
- **Verification Required**: Full verification needed for matching and messaging
- **Rate Limiting**: Aggressive rate limiting on all endpoints
- **Encryption**: Message content encrypted in database
- **JWT Security**: Short-lived access tokens with refresh token rotation
- **Password Security**: Bcrypt with cost factor 12
- **Input Validation**: All inputs validated with Zod schemas

## Next Steps

1. **Set up Docker Compose**: Configure PostgreSQL and Redis containers
2. **Connect Mobile App**: Integrate with React Native frontend
3. **Production Setup**: Configure AWS infrastructure
4. **Replace Mock Services**: Integrate real Checkr, Jumio, Twilio APIs
5. **Testing**: Add comprehensive test suite
6. **Monitoring**: Set up logging and error tracking

## Support

For issues or questions, check the main project documentation or create an issue in the repository.
