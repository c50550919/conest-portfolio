# Auth Feature

## Overview

The Auth feature handles user authentication including registration, login, token refresh, and phone verification. It enforces child safety principles by only accepting generic children information (count and age groups) without any child PII. All authentication endpoints are public but protected by rate limiting.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/register` | Create new user account | No |
| POST | `/api/auth/login` | Authenticate existing user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/verify-phone` | Verify phone number with SMS code | No |

## Services

### AuthController
- `register` - Creates a new user account with validation
- `login` - Authenticates user and returns JWT tokens
- `refresh` - Exchanges refresh token for new access/refresh tokens
- `verifyPhone` - Verifies phone number using SMS verification code

### AuthService
- Password hashing with bcrypt
- JWT token generation (access + refresh tokens)
- Token validation and refresh logic
- User lookup and creation

## Models/Types

### RegisterRequest
```typescript
interface RegisterRequest {
  email: string;              // Valid email format
  password: string;           // Min 8 chars, uppercase, lowercase, number, special char
  phone: string;              // E.164 format (+1XXXXXXXXXX)
  firstName: string;
  lastName: string;
  dateOfBirth: string;        // ISO date (YYYY-MM-DD)
  city: string;
  state: string;              // 2-letter state code
  zipCode: string;            // 5-digit zip
  childrenCount: number;      // 0-10
  childrenAgeGroups: string[]; // ['infant', 'toddler', 'preschool', 'elementary', 'middle_school', 'high_school']
}
```

### LoginRequest
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

### AuthResponse
```typescript
interface AuthResponse {
  success: boolean;
  data: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  };
}
```

### RefreshTokenRequest
```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}
```

### VerifyPhoneRequest
```typescript
interface VerifyPhoneRequest {
  phone: string;  // E.164 format
  code: string;   // 6-digit code
}
```

## Dependencies

- `../../middleware/rateLimit` - authLimiter (5 req/15min), verificationLimiter
- `./auth.schemas` - Zod validation schemas
- `../../models/User` - User model for database operations
- JWT libraries for token management
- bcrypt for password hashing

## Data Flow

### Registration Flow
1. Request validated against RegisterRequestSchema (Zod)
2. Rate limiting applied (5 requests per 15 minutes)
3. Check if email already registered
4. Password hashed with bcrypt
5. User created in database
6. Verification record created
7. JWT tokens generated and returned

### Login Flow
1. Request validated against LoginRequestSchema
2. Rate limiting applied
3. User looked up by email
4. Password verified against hash
5. Account status checked (not suspended/banned)
6. JWT tokens generated and returned

### Token Refresh Flow
1. Refresh token validated
2. New access and refresh tokens generated
3. Old refresh token invalidated
4. New tokens returned

### Phone Verification Flow
1. Request validated against VerifyPhoneSchema
2. Rate limiting applied (3 requests per hour)
3. Verification code validated (via Telnyx or mock)
4. User phone_verified status updated
5. Verification score recalculated

## Security Notes

- Child Safety: NO child PII fields accepted - only childrenCount and childrenAgeGroups
- Rate limiting prevents brute force attacks
- Passwords require complexity (uppercase, lowercase, number, special char)
- JWT tokens have expiration times
- Refresh tokens are single-use
