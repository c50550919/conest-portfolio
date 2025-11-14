# Suggested Development Commands

## Docker & Infrastructure

### Start All Services
```bash
docker-compose up -d
```
Services: PostgreSQL (5433), Redis (6380), Backend (3000-3001)

### Stop All Services
```bash
docker-compose down
```

### View Service Logs
```bash
docker logs safenest-backend --tail 50
docker logs safenest-postgres --tail 20
docker logs safenest-redis --tail 20
```

### Rebuild Backend Container
```bash
docker-compose build backend
docker-compose up -d backend
```

## Backend Development

### Start Development Server
```bash
cd backend
npm run dev
```
Runs with nodemon + ts-node, auto-restarts on changes

### Database Migrations
```bash
cd backend
npm run migrate              # Run latest migrations
npm run migrate:rollback     # Rollback last migration
npm run seed:dev             # Seed development data
```

### Run Tests
```bash
cd backend
npm test                     # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report
npm run test:security        # Security tests only
```

### Code Quality
```bash
cd backend
npm run lint                 # Check code quality
npm run lint:fix             # Auto-fix issues
npm run format               # Format with Prettier
npm run format:check         # Check formatting
npm run complexity           # Check code complexity
npm run security:audit       # Security audit (npm + snyk)
```

### Build Production
```bash
cd backend
npm run build                # TypeScript compilation to dist/
npm start                    # Run compiled production build
```

## Mobile Development

### Start Metro Bundler
```bash
cd mobile
npm start
```

### Run on iOS
```bash
cd mobile
npm run ios
# or specify simulator:
npx react-native run-ios --simulator="iPhone 17 Pro"
```

### Run on Android
```bash
cd mobile
npm run android
```

### Install iOS Dependencies
```bash
cd mobile
npm run pod-install
# or manually:
cd ios && LC_ALL=en_US.UTF-8 pod install
```

### Clean Build
```bash
cd mobile
npm run clean
# Manual cleanup:
cd android && ./gradlew clean
cd ../ios && xcodebuild clean
```

### Run Tests
```bash
cd mobile
npm test                     # Jest unit tests
```

### E2E Tests (Detox)
```bash
cd mobile
# iOS
npx detox test --configuration ios.sim.debug
# Android  
npx detox test --configuration android.emu.debug
```

## Database Commands (macOS/Darwin)

### Connect to PostgreSQL
```bash
docker exec -it safenest-postgres psql -U safenest -d safenest_db
```

### Run SQL Query
```bash
docker exec safenest-postgres psql -U safenest -d safenest_db -c "SELECT * FROM users LIMIT 5;"
```

### Check Database Tables
```bash
docker exec safenest-postgres psql -U safenest -d safenest_db -c "\\dt"
```

### Backup Database
```bash
docker exec safenest-postgres pg_dump -U safenest safenest_db > backup.sql
```

## macOS Utilities

### Process Management
```bash
lsof -i :3000                # Check what's using port 3000
lsof -i :5433                # Check PostgreSQL port
lsof -i :6380                # Check Redis port
pkill -f "nodemon"           # Kill nodemon processes
pkill -f "Metro"             # Kill Metro bundler
```

### iOS Simulator
```bash
xcrun simctl list devices    # List all simulators
xcrun simctl boot "iPhone 17 Pro"    # Boot specific device
open -a Simulator            # Open Simulator app
xcrun simctl listapps "iPhone 17 Pro" | grep conest  # Check app installation
```

### File Operations
```bash
find . -name "*.ts" -not -path "*/node_modules/*"  # Find TypeScript files
grep -r "TODO" backend/src --include="*.ts"        # Find TODOs
ls -la backend/src/controllers/  # List with permissions
```

## Git Workflow
```bash
git status                   # Check current status
git checkout -b feature/name # Create feature branch
git add .                    # Stage all changes
git commit -m "message"      # Commit with message
git push origin branch-name  # Push to remote
```

## Task Completion Checklist
When a task is completed, run these commands:
1. `npm run lint` (backend or mobile)
2. `npm test` (run relevant tests)
3. `docker-compose ps` (verify services healthy)
4. `git status` (check changes)
