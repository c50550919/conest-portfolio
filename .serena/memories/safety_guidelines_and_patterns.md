# Child Safety Guidelines & Design Patterns

## Constitutional Safety Principles (CRITICAL)

### Principle I: Child Safety First
**ABSOLUTE RULES - NEVER VIOLATE**:
1. ❌ NO storage of children's names
2. ❌ NO storage of children's photos
3. ❌ NO storage of children's birthdates (only age ranges)
4. ❌ NO storage of children's school names
5. ❌ NO direct interaction between children and the app
6. ✅ ONLY parent profiles and parent-to-parent communication
7. ✅ ALL user-uploaded photos must be parent-only
8. ✅ ALL verification systems target parents only
9. ✅ Screenshot detection notifies profiled user (parents only)

### Data That CAN Be Stored
- Number of children (integer)
- Age ranges of children (e.g., "0-2", "3-5", "6-12", "13-18")
- General parenting philosophy
- Parent's schedule and availability
- Parent's verification status
- Household rules and preferences

### Verification Requirements
**Mandatory for all users**:
1. Government ID verification (Jumio API)
2. Background check (Checkr API)
3. Phone verification
4. Email verification

**Optional but encouraged**:
- Income verification
- Reference checks
- Social media verification

## Design Patterns

### Backend Patterns

#### Service Layer Pattern
```
Controller → Service → Model → Database
- Controllers: Handle HTTP, validate input, call services
- Services: Business logic, orchestrate models
- Models: Database queries and schema
- Avoid business logic in controllers or models
```

#### Error Handling Pattern
```typescript
try {
  // Business logic
  const result = await service.performOperation();
  return res.status(200).json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed', { error, context });
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({ 
      success: false, 
      error: error.message 
    });
  }
  return res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
}
```

#### Authentication Pattern
```typescript
// JWT with refresh tokens
- Access token: 15 minutes (short-lived)
- Refresh token: 7 days (stored securely)
- Token rotation on refresh
- Blacklist for logout
- Secure storage in react-native-keychain
```

#### Database Transaction Pattern
```typescript
await db.transaction(async (trx) => {
  const user = await User.create(userData, trx);
  const profile = await Profile.create(profileData, trx);
  await Verification.create(verificationData, trx);
  return { user, profile };
});
```

### Mobile Patterns

#### Screen Component Structure
```typescript
// 1. Imports
// 2. Type definitions
// 3. Component definition
// 4. Hooks (useState, useEffect, etc.)
// 5. Event handlers
// 6. Render logic
// 7. Styles (StyleSheet.create)
```

#### State Management Pattern
```
Redux Toolkit for global state:
- User authentication state
- Profile data
- App configuration

React Query for server state:
- API data fetching
- Caching
- Background updates

Local state (useState) for:
- Form inputs
- UI toggles
- Component-specific state
```

#### Navigation Pattern
```typescript
// Stack navigation for flows
// Tab navigation for main app sections
// Modal for overlays
// Deep linking for notifications
```

### API Design Patterns

#### RESTful Conventions
```
GET    /api/resource         - List resources
GET    /api/resource/:id     - Get single resource
POST   /api/resource         - Create resource
PUT    /api/resource/:id     - Update resource
DELETE /api/resource/:id     - Delete resource
```

#### Response Format
```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Security Patterns

#### Rate Limiting
```typescript
// Global: 100 requests per 15 minutes
// Auth endpoints: 5 requests per 15 minutes
// Payment endpoints: 10 requests per hour
```

#### Input Validation
```typescript
// 1. Express-validator middleware
// 2. Zod schema validation
// 3. Sanitization before database
// 4. SQL injection prevention (parameterized queries)
```

#### Encryption
```typescript
// Passwords: bcrypt with 12 rounds
// Sensitive data: AES-256 encryption
// JWT: HS256 algorithm
// HTTPS only in production
// E2E encryption for messages
```

## Common Anti-Patterns to Avoid

### ❌ DON'T
- Store passwords in plain text
- Use `any` type excessively in TypeScript
- Put business logic in controllers
- Commit `.env` files
- Use `console.log` in production code
- Suppress TypeScript errors with `@ts-ignore`
- Create God objects (classes that do everything)
- Nest callbacks (callback hell)
- Expose internal error details to clients
- Store JWT in localStorage (use secure keychain)

### ✅ DO
- Hash passwords with bcrypt
- Use specific TypeScript types
- Keep controllers thin, services fat
- Use environment variables
- Use Winston logger with proper levels
- Fix TypeScript errors properly
- Follow single responsibility principle
- Use async/await
- Return generic error messages to clients
- Store tokens in react-native-keychain

## Testing Patterns

### Unit Tests
```typescript
describe('Service', () => {
  it('should perform expected operation', async () => {
    // Arrange
    const input = { ... };
    // Act
    const result = await service.method(input);
    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Integration Tests
```typescript
describe('API Endpoint', () => {
  it('should return 200 on success', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(validData)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

## Performance Best Practices
- Use database indexes on frequently queried columns
- Implement pagination for list endpoints
- Cache frequently accessed data in Redis
- Use lazy loading for heavy components
- Optimize images with react-native-fast-image
- Minimize re-renders with React.memo
- Use FlatList for long lists (not ScrollView)
- Implement background job queues (Bull) for heavy tasks
