# Quick Start Guide

Get the SafeNest backend running in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check npm
npm --version

# Check PostgreSQL (need 14+)
psql --version

# Check Redis (need 6+)
redis-cli --version
```

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
```

Edit `.env` and set minimum required values:
```env
# Database
DB_HOST=localhost
DB_NAME=safenest
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

# Redis
REDIS_HOST=localhost

# JWT (generate secure random strings)
JWT_SECRET=your_secure_random_string_here
JWT_REFRESH_SECRET=another_secure_random_string_here

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

### 3. Create Database
```bash
# Using psql
createdb safenest

# Or using SQL
psql -U postgres
CREATE DATABASE safenest;
\q
```

### 4. Run Migrations
```bash
npm run migrate
```

You should see:
```
Batch 1 run: 6 migrations
✅ 20250101000000_create_users_table.ts
✅ 20250101000001_create_profiles_table.ts
✅ 20250101000002_create_verifications_table.ts
✅ 20250101000003_create_matches_table.ts
✅ 20250101000004_create_conversations_and_messages_tables.ts
✅ 20250101000005_create_households_and_payments_tables.ts
```

### 5. Start Redis
```bash
# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis

# Or run directly
redis-server
```

### 6. Start Development Server
```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏡 SafeNest API Server Running                          ║
║                                                            ║
║   Environment: development                                ║
║   Port: 5000                                              ║
║   API URL: http://localhost:5000                          ║
║                                                            ║
║   📊 Health: http://localhost:5000/health                 ║
║   🔌 WebSocket: Enabled                                   ║
║   🔒 Security: Active                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

## Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-03T...",
  "uptime": 1.234
}
```

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": "15m"
    }
  }
}
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

## Common Issues & Solutions

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check connection details in .env
# Make sure DB_HOST, DB_USER, DB_PASSWORD are correct
```

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### Port 5000 Already in Use
```bash
# Change port in .env
PORT=5001

# Or kill process using port 5000
lsof -ti:5000 | xargs kill
```

### Migration Errors
```bash
# Rollback last migration
npm run migrate:rollback

# Run migrations again
npm run migrate
```

## Development Tools

### View Logs
```bash
# Logs are in logs/ directory
tail -f logs/combined.log
tail -f logs/error.log
```

### Database GUI
- **pgAdmin**: https://www.pgadmin.org/
- **TablePlus**: https://tableplus.com/
- **DBeaver**: https://dbeaver.io/

### Redis GUI
- **RedisInsight**: https://redis.com/redis-enterprise/redis-insight/
- **Medis**: https://getmedis.com/

### API Testing
- **Postman**: Import endpoints from README.md
- **Insomnia**: REST client alternative
- **cURL**: Command-line testing (examples in README)

## Mock Service Testing

### Phone Verification
```bash
# Send code (check console for output)
curl -X POST http://localhost:5000/api/verification/phone/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Verify with code "123456"
curl -X POST http://localhost:5000/api/verification/phone/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### Background Check (Mock)
```bash
curl -X POST http://localhost:5000/api/verification/background/initiate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Wait 3 seconds, then check status
curl http://localhost:5000/api/verification/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Next Steps

1. **Create a Profile**: POST `/api/profiles`
2. **Complete Verifications**: Use verification endpoints
3. **Find Matches**: GET `/api/matches/find`
4. **Test Messaging**: Connect to WebSocket
5. **Test Payments**: Create Stripe test account

## Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Useful Commands

```bash
# Development
npm run dev              # Start with hot reload

# Database
npm run migrate          # Run migrations
npm run migrate:rollback # Rollback last migration
npm run seed:dev         # Seed development data (if available)

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Production
npm run build            # Build TypeScript
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
```

## Support

- **Documentation**: See README.md for full API documentation
- **Architecture**: See ARCHITECTURE.md in project root
- **Implementation Details**: See IMPLEMENTATION_SUMMARY.md

Happy coding! 🚀
