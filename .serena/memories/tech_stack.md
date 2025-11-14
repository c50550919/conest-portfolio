# Technology Stack

## Frontend (Mobile App)
- **Framework**: React Native 0.74.5
- **Language**: TypeScript 5.3.3
- **State Management**: Redux Toolkit 1.9 + React Query 5.x
- **Navigation**: React Navigation 6.x (@react-navigation/native, /stack, /bottom-tabs)
- **UI Libraries**: 
  - react-native-paper 5.12.5
  - react-native-vector-icons 10.3.0
  - lottie-react-native 6.5.1
- **Gestures**: react-native-gesture-handler 2.16.0 + react-native-reanimated
- **Forms**: react-hook-form 7.64.0 + yup 1.7.1
- **Images**: react-native-fast-image 8.6.3
- **Auth**: @invertase/react-native-apple-authentication 2.4.1 + @react-native-google-signin/google-signin 11.0.1
- **Payments**: @stripe/stripe-react-native 0.37.2
- **Real-time**: socket.io-client 4.7.2
- **Security**: react-native-keychain 8.2.0 + react-native-aes-crypto 3.2.1
- **Storage**: @react-native-async-storage/async-storage 1.21.0

## Backend (API Server)
- **Runtime**: Node.js 18.x
- **Framework**: Express 4.18.2
- **Language**: TypeScript 5.2.0
- **Database ORM**: Knex 3.0.1 + Objection 3.1.5
- **Validation**: Zod 3.22.4 + express-validator 7.0.1
- **Authentication**: jsonwebtoken 9.0.2 + bcrypt 5.1.1
- **OAuth**: google-auth-library 9.15.1 + apple-signin-auth 1.7.9
- **Real-time**: Socket.io 4.6.0 + @socket.io/redis-adapter 8.3.0
- **Job Queue**: Bull 4.11.5
- **Payments**: Stripe 14.5.0
- **Security**: Helmet 7.1.0 + express-rate-limit 7.1.5
- **Logging**: Winston 3.11.0 + Morgan 1.10.1
- **File Upload**: Multer 1.4.5-lts.1
- **Scheduling**: node-cron 3.0.3
- **Cloud Storage**: AWS SDK 2.1450.0 (S3)
- **SMS**: Twilio 4.19.0

## Database & Infrastructure
- **Primary Database**: PostgreSQL 14+ with PostGIS extension
- **Cache/Sessions**: Redis 4.6 (ioredis 5.8.1)
- **Containerization**: Docker Compose
- **PostgreSQL Image**: postgis/postgis:15-3.3-alpine (port 5433)
- **Redis Image**: redis:7-alpine (port 6380)

## Testing
- **Backend**: Jest 29.7.0 + Supertest 6.3.3 + Artillery 2.0.21
- **Frontend**: Jest 29.7.0 + @testing-library/react-native 13.3.3 + Detox 20.43.0
- **E2E**: Playwright @playwright/test 1.55.1

## Code Quality
- **Linting**: ESLint 8.56.0 + @typescript-eslint/* 6.18.0
- **Complexity**: Max cyclomatic complexity: 15, max nesting: 4
- **Line Limits**: Max 300 lines/file, 50 lines/function
