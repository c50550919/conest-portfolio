# Discovery API - Correct Test Patterns

Quick reference guide for writing tests against the discovery API.

## API Response Structure

### GET /api/discovery/profiles

**Correct Response Structure:**
```typescript
{
  success: true,
  data: {
    profiles: ProfileCard[],
    nextCursor: string | null
  }
}
```

**Correct Test Pattern:**
```typescript
const response = await request(app)
  .get('/api/discovery/profiles')
  .set('Authorization', `Bearer ${authToken}`)
  .expect(200);

// Access profiles
expect(response.body).toHaveProperty('success', true);
expect(response.body).toHaveProperty('data');
expect(response.body.data).toHaveProperty('profiles');
expect(response.body.data).toHaveProperty('nextCursor');

// Iterate over profiles
response.body.data.profiles.forEach((profile: any) => {
  // assertions
});
```

❌ **Incorrect (old pattern):**
```typescript
// DON'T DO THIS
expect(response.body).toHaveProperty('profiles');
response.body.profiles.forEach(...) // Wrong!
```

---

## ProfileCard Schema

### Correct Schema:
```typescript
interface ProfileCard {
  // Required fields
  userId: string;              // UUID
  firstName: string;
  age: number;                 // 18-80
  city: string;
  childrenCount: number;       // 0-10
  childrenAgeGroups: ('toddler' | 'elementary' | 'teen')[];
  compatibilityScore: number;  // 0-100

  // Nested verification status
  verificationStatus: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
    phoneVerified: boolean;
  };

  // Optional fields
  budget?: number;
  moveInDate?: string;         // ISO 8601
  bio?: string;
  profilePhoto?: string;       // URL
}
```

### Correct Verification Checks:
```typescript
// ✅ Correct
expect(profile.verificationStatus).toBeDefined();
expect(profile.verificationStatus.idVerified).toBe(true);
expect(profile.verificationStatus.backgroundCheckComplete).toBe(true);
expect(profile.verificationStatus.phoneVerified).toBe(true);

// ❌ Incorrect (old pattern)
expect(profile.idVerified).toBe(true); // Wrong!
expect(profile.backgroundCheckVerified).toBe(true); // Wrong!
```

### Correct Photo Field:
```typescript
// ✅ Correct
expect(profile.profilePhoto).toMatch(/^https?:\/\//);

// ❌ Incorrect
expect(profile.profilePhotoUrl).toBeDefined(); // Wrong field name!
```

---

## Database Operations

### Correct Table Names:
```typescript
// ✅ Correct
await db('parents').insert({
  user_id: userId,
  first_name: 'TestUser',
  date_of_birth: '1990-01-01',
  city: 'San Francisco',
  children_count: 1,
  children_age_groups: '{toddler}',
  budget_min: 1500,
  budget_max: 2500,
  profile_photo_url: 'https://example.com/photo.jpg', // Note: _url suffix in DB
});

// ❌ Incorrect
await db('profiles').insert(...) // Wrong table!
```

### Field Name Mapping (DB → API):
```
Database Column      → API Field
----------------------------------
profile_photo_url    → profilePhoto
children_count       → childrenCount
children_age_groups  → childrenAgeGroups
budget_min/max       → budget (calculated average)
move_in_date         → moveInDate
first_name           → firstName
date_of_birth        → age (calculated)
```

---

## Filtering Logic

### Connection Request Filtering:
```typescript
// ✅ Correct - Use connection_requests table
await db('connection_requests').insert({
  sender_id: userId,
  recipient_id: targetUserId,
  status: 'pending',
  created_at: new Date(),
});

// ❌ Incorrect - swipes table is deprecated
await db('swipes').insert({
  user_id: userId,
  target_user_id: targetUserId,
  direction: 'right',
}); // Wrong! Endpoint removed.
```

### Expected Filtering Behavior:
Discovery endpoint excludes:
- Users with existing connection requests (any status)
- Already matched users
- Current user
- Unverified users

Discovery endpoint DOES NOT exclude:
- Saved profiles (users can browse saved)

---

## Zod Schema Validation

### Correct Zod Schema:
```typescript
const ProfileCardSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(50),
  age: z.number().int().min(18).max(80),
  city: z.string().min(1).max(100),
  childrenCount: z.number().int().min(0).max(10),
  childrenAgeGroups: z.array(z.enum(['toddler', 'elementary', 'teen'])),
  verificationStatus: z.object({
    idVerified: z.boolean(),
    backgroundCheckComplete: z.boolean(),
    phoneVerified: z.boolean(),
  }),
  compatibilityScore: z.number().int().min(0).max(100),
  profilePhoto: z.string().url().optional(),
  budget: z.number().optional(),
  moveInDate: z.string().optional(),
  bio: z.string().optional(),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    profiles: z.array(ProfileCardSchema),
    nextCursor: z.string().uuid().nullable(),
  }),
});
```

---

## Common Test Scenarios

### Test: Pagination
```typescript
const firstPage = await request(app)
  .get('/api/discovery/profiles')
  .set('Authorization', `Bearer ${authToken}`)
  .query({ limit: 5 })
  .expect(200);

expect(firstPage.body.data.profiles.length).toBeLessThanOrEqual(5);

if (firstPage.body.data.nextCursor) {
  const secondPage = await request(app)
    .get('/api/discovery/profiles')
    .set('Authorization', `Bearer ${authToken}`)
    .query({
      limit: 5,
      cursor: firstPage.body.data.nextCursor
    })
    .expect(200);

  expect(secondPage.body.data.profiles[0].userId).not.toBe(
    firstPage.body.data.profiles[0].userId
  );
}
```

### Test: Child Safety Compliance
```typescript
response.body.data.profiles.forEach((profile: any) => {
  // FORBIDDEN fields - must NOT exist
  expect(profile).not.toHaveProperty('childrenNames');
  expect(profile).not.toHaveProperty('childrenPhotos');
  expect(profile).not.toHaveProperty('childrenAges');
  expect(profile).not.toHaveProperty('childrenSchools');

  // ALLOWED fields
  expect(typeof profile.childrenCount).toBe('number');
  expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);
});
```

### Test: Verification Filtering
```typescript
// All profiles must be fully verified
response.body.data.profiles.forEach((profile: any) => {
  expect(profile.verificationStatus.idVerified).toBe(true);
  expect(profile.verificationStatus.backgroundCheckComplete).toBe(true);
  expect(profile.verificationStatus.phoneVerified).toBe(true);
});
```

---

## Deprecated Endpoints

### ❌ Removed (2025-11-29):
```
POST /api/discovery/swipe
```

Use instead:
```
POST /api/connection-requests
```

---

## Quick Checklist

Before writing a discovery test:

- [ ] Access profiles via `response.body.data.profiles`
- [ ] Access nextCursor via `response.body.data.nextCursor`
- [ ] Use `verificationStatus` nested object
- [ ] Use `profilePhoto` not `profilePhotoUrl`
- [ ] Use `parents` table not `profiles` table
- [ ] Use `connection_requests` table not `swipes` table
- [ ] Check for `success: true` in response
- [ ] No child PII fields in assertions

---

## Example Complete Test

```typescript
describe('GET /api/discovery/profiles', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db('users').insert({
      email: 'test@example.com',
      email_verified: true,
      password_hash: 'hash',
    }).returning('*');

    userId = user.id;

    // Create parent profile
    await db('parents').insert({
      user_id: userId,
      first_name: 'Test',
      date_of_birth: '1990-01-01',
      city: 'San Francisco',
      children_count: 1,
      children_age_groups: '{toddler}',
      budget_min: 1500,
      budget_max: 2500,
    });

    // Create verification
    await db('verifications').insert({
      user_id: userId,
      fully_verified: true,
      id_verification_status: 'approved',
      background_check_status: 'clear',
      phone_verified: true,
    });

    authToken = `Bearer mock-token-${userId}`;
  });

  it('should return profiles with correct structure', async () => {
    const response = await request(app)
      .get('/api/discovery/profiles')
      .set('Authorization', authToken)
      .expect(200);

    // Response structure
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('profiles');
    expect(response.body.data).toHaveProperty('nextCursor');

    // Profile validation
    response.body.data.profiles.forEach((profile: any) => {
      expect(profile).toHaveProperty('userId');
      expect(profile).toHaveProperty('firstName');
      expect(profile).toHaveProperty('age');
      expect(profile).toHaveProperty('verificationStatus');
      expect(profile.verificationStatus.idVerified).toBe(true);
    });
  });
});
```
