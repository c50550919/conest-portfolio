# Saved Profiles Feature

## Overview

The Saved Profiles feature allows users to bookmark and organize profiles they're interested in. Users can save profiles into four folders (Top Choice, Strong Maybe, Considering, Backup), add encrypted notes, and compare saved profiles side-by-side. A 50-profile limit is enforced per user.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/saved-profiles` | Save a profile to a folder | Yes |
| GET | `/api/saved-profiles` | Get all saved profiles | Yes |
| GET | `/api/saved-profiles/folders` | Get profiles grouped by folder | Yes |
| GET | `/api/saved-profiles/limit-status` | Get save limit status | Yes |
| GET | `/api/saved-profiles/compare` | Compare 2-4 saved profiles | Yes |
| GET | `/api/saved-profiles/check/:profileId` | Check if profile is saved | Yes |
| GET | `/api/saved-profiles/:id/notes` | Get decrypted notes | Yes |
| PATCH | `/api/saved-profiles/:id` | Update folder or notes | Yes |
| DELETE | `/api/saved-profiles/:id` | Delete saved profile | Yes |

## Services

### savedProfileController
- `saveProfile` - Saves profile to specified folder
- `getSavedProfiles` - Gets all saved profiles (optional folder filter)
- `getSavedProfilesByFolder` - Gets profiles grouped by folder
- `getLimitStatus` - Gets current count vs. limit
- `compareProfiles` - Compares 2-4 saved profiles
- `checkIfSaved` - Checks if profile is already saved
- `getNotes` - Gets decrypted notes for saved profile
- `updateSavedProfile` - Updates folder or notes
- `deleteSavedProfile` - Removes saved profile

### SavedProfileService
- `saveProfile(userId, profileId, folder, notes)` - Creates saved profile
- `getSavedProfiles(userId, folder)` - Gets saved profiles
- `getSavedProfilesByFolder(userId)` - Gets grouped profiles
- `getNotes(id, userId)` - Gets decrypted notes
- `moveToFolder(id, userId, folder)` - Moves to different folder
- `updateNotes(id, userId, notes)` - Updates notes
- `unsaveProfile(id, userId)` - Deletes saved profile
- `compareProfiles(userId, ids)` - Compares profiles
- `getLimitStatus(userId)` - Gets limit status
- `isSaved(userId, profileId)` - Checks if saved

## Models/Types

### SavedProfile
```typescript
interface SavedProfile {
  id: string;
  user_id: string;
  profile_id: string;
  folder: FolderType;
  notes?: string;           // Encrypted
  created_at: Date;
  updated_at: Date;
}

type FolderType =
  | 'Top Choice'
  | 'Strong Maybe'
  | 'Considering'
  | 'Backup';
```

### SavedProfileWithProfile
```typescript
interface SavedProfileWithProfile extends SavedProfile {
  profile: {
    id: string;
    firstName: string;
    city: string;
    state: string;
    bio?: string;
    profileImageUrl?: string;
    childrenCount: number;
    childrenAgeGroups: string[];
    verified: boolean;
  };
}
```

### CreateSavedProfile
```typescript
interface CreateSavedProfile {
  profileId: string;
  folder: FolderType;
  notes?: string;           // Max 500 characters
}
```

### UpdateSavedProfile
```typescript
interface UpdateSavedProfile {
  folder?: FolderType;
  notes?: string | null;    // null to clear notes
}
```

### LimitStatus
```typescript
interface LimitStatus {
  count: number;
  limit: number;            // 50
  remaining: number;
}
```

## Dependencies

- `../../middleware/auth.middleware` - authenticateJWT
- `../../middleware/validation` - Request validation
- `../../validators/savedProfileValidator` - Zod schemas
- `../../models/SavedProfile` - Data model
- `../../utils/encryption` - Notes encryption/decryption

## Data Flow

### Save Profile Flow
1. Authenticate user via JWT
2. Validate request body
3. Check notes length (max 500 chars)
4. Check if profile already saved (error if duplicate)
5. Check limit (50 profiles)
6. Encrypt notes if provided
7. Create saved profile record
8. Return saved profile

### Get Saved Profiles Flow
1. Authenticate user via JWT
2. Query saved profiles for user
3. Join with profiles table
4. Filter by folder if specified
5. Return saved profiles with profile data

### Compare Profiles Flow
1. Authenticate user via JWT
2. Validate 2-4 profile IDs provided
3. Verify all profiles belong to user
4. Fetch full profile data for each
5. Return profiles for side-by-side comparison

### Get Notes Flow
1. Authenticate user via JWT
2. Find saved profile by ID
3. Verify ownership
4. Decrypt notes
5. Return decrypted notes

## Folder Organization

| Folder | Purpose |
|--------|---------|
| Top Choice | Highest priority potential matches |
| Strong Maybe | Very interested, need more info |
| Considering | Interested but not priority |
| Backup | Keeping as options |

## Security Notes

- 50-profile limit enforced at model level
- Notes encrypted at rest
- Users can only access their own saved profiles
- Cannot save own profile
- Ownership verified on all operations
