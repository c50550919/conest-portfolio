# Profile Feature

## Overview

The Profile feature manages user profiles including creation, retrieval, updates, and deletion. It also handles profile photo uploads to S3 with automatic cleanup of old photos. All endpoints require authentication.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/profiles` | Create new profile | Yes |
| GET | `/api/profiles/me` | Get current user's profile | Yes |
| GET | `/api/profiles/search` | Search profiles with filters | Yes |
| GET | `/api/profiles/:id` | Get profile by ID (public view) | Yes |
| PUT | `/api/profiles/me` | Update current user's profile | Yes |
| DELETE | `/api/profiles/me` | Delete current user's profile | Yes |
| POST | `/api/profiles/photo` | Upload profile photo | Yes |
| DELETE | `/api/profiles/photo` | Delete profile photo | Yes |

## Services

### profileController
- `createProfile` - Creates new profile for authenticated user
- `getMyProfile` - Retrieves current user's full profile
- `getProfile` - Retrieves public profile view by ID
- `updateProfile` - Updates current user's profile
- `searchProfiles` - Searches profiles with filters
- `deleteProfile` - Deletes current user's profile
- `uploadPhoto` - Uploads profile photo to S3
- `deletePhoto` - Deletes profile photo from S3

### ProfileModel
- `create(data)` - Creates profile in database
- `findById(id)` - Finds profile by ID
- `findByUserId(userId)` - Finds profile by user ID
- `update(id, data)` - Updates profile
- `delete(id)` - Deletes profile
- `search(filters)` - Searches profiles with filters

## Models/Types

### CreateProfile
```typescript
interface CreateProfile {
  first_name: string;
  last_name: string;
  date_of_birth: string;      // ISO date
  city: string;
  state: string;              // 2-letter code
  zip_code: string;
  bio?: string;
  children_count?: number;      // OPTIONAL - FHA compliant naming
  children_age_groups?: string; // OPTIONAL - Age groups only
  parenting_style?: string;
  housing_preferences?: HousingPreferences;
  household_preferences?: HouseholdPreferences;
}
```

### Profile
```typescript
interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name?: string;         // Private
  date_of_birth: Date;
  city: string;
  state: string;
  zip_code: string;
  bio?: string;
  profile_image_url?: string;
  children_count?: number;       // FHA compliant naming
  children_age_groups?: string;  // FHA compliant naming
  parenting_style?: string;
  housing_preferences?: HousingPreferences;
  household_preferences?: HouseholdPreferences;
  verified: boolean;
  verification_level: number;
  created_at: Date;
  updated_at: Date;
}
```

### PublicProfile (returned by getProfile)
```typescript
interface PublicProfile {
  id: string;
  first_name: string;
  city: string;
  state: string;
  bio?: string;
  profile_image_url?: string;
  children_count?: number;       // FHA compliant naming
  children_age_groups?: string;  // FHA compliant naming
  parenting_style?: string;
  verified: boolean;
  verification_level: number;
}
```

### SearchFilters
```typescript
interface SearchFilters {
  city?: string;
  state?: string;
  budgetMin?: number;
  budgetMax?: number;
  verified?: boolean;
}
```

### HousingPreferences
```typescript
interface HousingPreferences {
  budget?: number;
  move_in_date?: string;
  lease_length?: string;
  preferred_areas?: string[];
}
```

### HouseholdPreferences
```typescript
interface HouseholdPreferences {
  smoking?: boolean;
  has_pets?: boolean;
  pet_types?: string[];
  quiet_hours?: string;
  guest_policy?: string;
  cleanliness_level?: string;
}
```

## Dependencies

- `../../middleware/auth.middleware` - authenticateToken
- `../../middleware/validation` - Request validation
- `../../middleware/upload` - Multer configuration for photo upload
- `../../models/Profile` - Profile data model
- `../../services/s3Service` - S3 file upload/delete

## Data Flow

### Create Profile Flow
1. Authenticate user via JWT
2. Validate request body against schema
3. Check if profile already exists (400 if exists)
4. Convert date_of_birth to Date object
5. Create profile with user_id
6. Return created profile

### Upload Photo Flow
1. Authenticate user via JWT
2. Multer middleware validates file (type, size)
3. Verify profile exists
4. Upload new photo to S3 (profile-photos category)
5. If old photo exists, delete from S3
6. Update profile with new photo URL
7. Return updated profile

### Search Profiles Flow
1. Authenticate user via JWT
2. Parse query parameters
3. Build filter object
4. Query profiles matching filters
5. Return matching profiles

### Get Profile (Public) Flow
1. Authenticate user via JWT
2. Find profile by ID
3. Return only public fields (excludes last_name, full address, etc.)

## Photo Upload Details

### Multer Configuration
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp
- Field name: 'photo'

### S3 Storage
- Bucket category: profile-photos
- Key format: `profile-photos/{userId}/{timestamp}-{filename}`
- Old photos automatically deleted to prevent storage exhaustion

## Security Notes

- All endpoints require authentication
- Only profile owner can update/delete their profile
- Public profile view excludes sensitive information
- Photo validation prevents malicious uploads
- Old photos cleaned up to prevent storage attacks
