# CoNest Type Synchronization Report

**Generated**: 2025-12-30
**Purpose**: Document type definition mismatches across backend models, validators, types, and mobile types

---

## Executive Summary

The CoNest codebase has multiple layers of type definitions that have diverged over time:
- **Database Models** (`/backend/src/models/`) - Use `snake_case` field names
- **Zod Validators** (`/backend/src/validators/`) - Mixed casing (some `snake_case`, some `camelCase`)
- **TypeScript Types** (`/backend/src/types/`) - Use `camelCase` field names
- **Mobile Types** (`/mobile/src/types/`) - Use `camelCase` field names

### Key Issues Identified
1. **Inconsistent casing conventions** between database and API layers
2. **Missing fields** in some type definitions
3. **Different field names** for the same concept across layers
4. **Duplicate type definitions** with slight variations
5. **Profile vs Parent model confusion** - Two overlapping concepts

---

## Critical Entity Mismatches

### 1. USER Entity

#### Database Model (`/backend/src/models/User.ts`, lines 15-29)
```typescript
interface User {
  id: string;
  email: string;
  password_hash: string;
  phone?: string;                    // snake_case
  phone_verified: boolean;           // snake_case
  email_verified: boolean;           // snake_case
  mfa_enabled: boolean;              // snake_case
  mfa_secret?: string;               // snake_case
  account_status: 'active' | 'suspended' | 'deleted';
  last_login?: Date;                 // snake_case
  refresh_token_hash?: string;       // snake_case
  created_at: Date;                  // snake_case
  updated_at: Date;                  // snake_case
}
```

#### Mobile Types (Implicit via verification.ts)
- Uses `camelCase` throughout
- Expects API responses in `camelCase`

#### Mismatches
| Database Field | Expected API Field | Status |
|---------------|-------------------|--------|
| `password_hash` | N/A (never exposed) | OK |
| `phone_verified` | `phoneVerified` | NEEDS TRANSFORM |
| `email_verified` | `emailVerified` | NEEDS TRANSFORM |
| `mfa_enabled` | `mfaEnabled` | NEEDS TRANSFORM |
| `account_status` | `accountStatus` | NEEDS TRANSFORM |
| `last_login` | `lastLogin` | NEEDS TRANSFORM |
| `created_at` | `createdAt` | NEEDS TRANSFORM |
| `updated_at` | `updatedAt` | NEEDS TRANSFORM |

---

### 2. PROFILE vs PARENT Entity (CRITICAL CONFUSION)

The codebase has **two overlapping concepts** that should be consolidated:

#### Profile Model (`/backend/src/models/Profile.ts`, lines 16-37)
```typescript
interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  bio?: string;
  profile_image_url?: string;
  number_of_children?: number;       // Different field name!
  ages_of_children?: string;         // Different type (string vs array)!
  parenting_style?: string;
  verified: boolean;
  verification_level: 'none' | 'basic' | 'full';
  created_at: Date;
  updated_at: Date;
  // Extends EnhancedPreferences (many more fields)
}
```

#### Parent Model (`/backend/src/models/Parent.ts`, lines 13-69)
```typescript
interface Parent {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;        // Different field name!
  date_of_birth: Date;
  children_count: number;            // Different field name!
  children_age_groups: string[];     // Different field name + type!
  city?: string;
  state?: string;
  zip_code?: string;
  location?: any;
  preferred_radius?: number;
  occupation?: string;
  employer?: string;
  work_schedule?: any;
  work_from_home?: boolean;
  parenting_style?: string;
  household_preferences?: any;
  dietary_restrictions?: string[];
  allergies?: string[];
  budget_min?: number;
  budget_max?: number;
  move_in_date?: Date;
  looking_for_housing?: boolean;
  school_districts?: string[];
  verified_status?: string;
  background_check_status?: string;
  background_check_date?: Date;
  id_verified?: boolean;
  income_verified?: boolean;
  references_count?: number;
  profile_completed?: boolean;
  profile_completion_percentage?: number;
  trust_score?: number;
  response_rate?: number;
  average_response_time?: number;
  created_at: Date;
  updated_at: Date;
}
```

#### ProfileCard Type (`/backend/src/types/ProfileCard.ts`, lines 17-36)
```typescript
interface ProfileCard {
  userId: string;                    // camelCase
  firstName: string;                 // camelCase
  age: number;                       // Computed, not stored
  city: string;
  childrenCount: number;             // camelCase
  childrenAgeGroups: ('toddler' | 'elementary' | 'teen')[];
  compatibilityScore: number;
  verificationStatus: VerificationStatus;
  budget?: number;
  moveInDate?: string;
  bio?: string;
  profilePhoto?: string;
}
```

#### Mobile ExtendedProfileCard (`/mobile/src/types/discovery.ts`, lines 61-136)
```typescript
interface ExtendedProfileCard {
  userId: string;
  firstName: string;
  age: number;
  gender: 'female' | 'male' | 'non-binary';
  city: string;
  state: string;
  profilePhoto: string;
  additionalPhotos?: string[];
  distanceMeters?: number;
  zipCode?: string;
  location?: {...};
  childrenCount: number;
  childrenAgeGroups: ('infant' | 'toddler' | 'elementary' | 'middle-school' | 'high-school' | 'teen')[];
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  compatibilityScore: number;
  compatibilityBreakdown?: {...};
  budget: number;
  housingBudget?: { min: number; max: number };
  moveInDate: string;
  desiredLeaseTerm?: number;
  housingPreferences: HousingPreferences;
  schedule: ScheduleInfo;
  parenting: ParentingInfo;
  personalityTraits?: string[];
  interests?: string[];
  bio: string;
  lookingFor?: string;
  dealBreakers?: string[];
  hasReferences?: boolean;
  referenceCount?: number;
  lastActive?: string;
  joinedDate?: string;
  responseRate?: number;
}
```

#### Profile/Parent Mismatches
| Concept | Profile Model | Parent Model | ProfileCard | Mobile ExtendedProfileCard |
|---------|--------------|--------------|-------------|---------------------------|
| Photo URL | `profile_image_url` | `profile_photo_url` | `profilePhoto` | `profilePhoto` |
| Children count | `number_of_children` | `children_count` | `childrenCount` | `childrenCount` |
| Children ages | `ages_of_children` (string) | `children_age_groups` (string[]) | `childrenAgeGroups` | `childrenAgeGroups` |
| Age groups enum | N/A | N/A | toddler/elementary/teen | infant/toddler/elementary/middle-school/high-school/teen |
| Verification | `verified` + `verification_level` | `verified_status` + multiple fields | `verificationStatus` object | `verificationStatus` object |

---

### 3. MESSAGE Entity

#### Database Model (`/backend/src/models/Message.ts`, lines 3-15)
```typescript
interface Message {
  id: string;
  conversation_id: string;           // snake_case
  sender_id: string;                 // snake_case
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;                 // snake_case
  read: boolean;
  read_at?: Date;                    // snake_case
  deleted: boolean;
  created_at: Date;                  // snake_case
  updated_at: Date;                  // snake_case
}
```

#### Zod Validator (`/backend/src/validators/messageSchemas.ts`, lines 82-93)
```typescript
// MessageResponseSchema uses camelCase
{
  id: z.string().uuid(),
  matchId: z.string().uuid(),        // Different! (matchId vs conversation_id)
  senderId: z.string().uuid(),       // camelCase
  content: z.string(),
  messageType: z.enum(['text', 'image', 'file']),
  fileUrl: z.string().url().nullable(),
  read: z.boolean(),
  readAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime(),     // Not in DB model!
  createdAt: z.string().datetime(),
}
```

#### Mobile Type (`/mobile/src/types/messages.ts`, lines 23-33)
```typescript
interface Message {
  id: string;
  matchId: string;                   // camelCase (different from DB!)
  senderId: string;                  // camelCase
  content: string;
  messageType: MessageType;
  fileUrl?: string;                  // camelCase
  createdAt: string;                 // camelCase + string (not Date)
  readAt?: string;                   // camelCase + string (not Date)
  status: MessageStatus;             // NEW FIELD (not in DB!)
}
```

#### Message Mismatches
| Database Field | Validator Field | Mobile Field | Issue |
|---------------|-----------------|--------------|-------|
| `conversation_id` | `matchId` | `matchId` | DIFFERENT CONCEPT! |
| `sender_id` | `senderId` | `senderId` | Case transform needed |
| `message_type` | `messageType` | `messageType` | Case transform needed |
| `file_url` | `fileUrl` | `fileUrl` | Case transform needed |
| `read_at` | `readAt` | `readAt` | Case + type transform |
| `created_at` | `createdAt` | `createdAt` | Case + type transform |
| N/A | N/A | `status` | MISSING FROM DB! |
| N/A | `sentAt` | N/A | Computed/derived field? |

---

### 4. VERIFICATION Entity

#### Database Model (`/backend/src/models/Verification.ts`, lines 3-51)
```typescript
interface Verification {
  id: string;
  user_id: string;
  id_provider: 'veriff' | 'jumio';
  background_provider: 'certn' | 'checkr';
  id_verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  id_verification_date?: Date;
  id_verification_data?: string;
  background_check_status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'consider' | 'expired';
  background_check_date?: Date;
  background_check_report_id?: string;
  certn_report_id?: string;
  certn_applicant_id?: string;
  flagged_records?: any;
  admin_review_required: boolean;
  admin_reviewed_by?: string;
  admin_review_date?: Date;
  admin_review_notes?: string;
  income_verification_status: 'pending' | 'verified' | 'rejected';
  income_verification_date?: Date;
  income_range?: string;
  phone_verified: boolean;
  phone_verification_date?: Date;
  email_verified: boolean;
  email_verification_date?: Date;
  verification_score: number;
  fully_verified: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### Mobile Type (`/mobile/src/types/verification.ts`, lines 12-26)
```typescript
interface VerificationStatusResponse {
  email_verified: boolean;           // Uses snake_case! (inconsistent with other mobile types)
  phone_verified: boolean;
  id_verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  background_check_status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'consider' | 'expired';
  income_verification_status: 'pending' | 'verified' | 'rejected';
  verification_score: number;
  fully_verified: boolean;
}
```

**Note**: Mobile verification types use `snake_case` which is INCONSISTENT with other mobile types. This is actually correct for matching the API but inconsistent within the mobile codebase.

---

### 5. CONNECTION REQUEST Entity

#### Database Model (`/backend/src/models/ConnectionRequest.ts`, lines 20-35)
```typescript
interface ConnectionRequest {
  id: string;
  sender_id: string;                 // snake_case
  recipient_id: string;              // snake_case
  message_encrypted: string;
  message_iv: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  sent_at: Date;                     // snake_case
  expires_at: Date;                  // snake_case
  response_message_encrypted: string | null;
  response_message_iv: string | null;
  responded_at: Date | null;         // snake_case
  archived_at: Date | null;          // snake_case
  created_at: Date;
  updated_at: Date;
}
```

#### Zod Validator (`/backend/src/validators/connectionRequestValidator.ts`)
```typescript
// Uses snake_case in body schemas
createConnectionRequestSchema: {
  body: {
    recipient_id: z.string().uuid(),  // snake_case
    message: z.string()               // Different! (plain message, not encrypted)
  }
}
```

#### Mobile Type (`/mobile/src/types/discovery.ts`, lines 257-266)
```typescript
interface ConnectionRequest {
  id: string;
  targetUserId: string;              // DIFFERENT NAME! (targetUserId vs recipient_id)
  targetProfile: ExtendedProfileCard;
  status: ConnectionRequestStatus;
  message: string;                   // Decrypted
  sentAt: string;                    // camelCase
  respondedAt?: string;              // camelCase
  expiresAt: string;                 // camelCase
}
```

#### Connection Request Mismatches
| Database Field | Validator Field | Mobile Field | Issue |
|---------------|-----------------|--------------|-------|
| `recipient_id` | `recipient_id` | `targetUserId` | NAME MISMATCH! |
| `sender_id` | N/A | N/A | Missing from response |
| `message_encrypted` | `message` | `message` | Transform: decrypt |
| `sent_at` | N/A | `sentAt` | Case + type transform |
| `expires_at` | N/A | `expiresAt` | Case + type transform |
| `responded_at` | N/A | `respondedAt` | Case + type transform |

---

### 6. HOUSEHOLD Entity

#### Database Model (`/backend/src/models/Household.ts`, lines 15-29)
```typescript
interface Household {
  id: string;
  name: string;
  address: string;                   // Flat string
  city: string;
  state: string;
  zip_code: string;                  // snake_case
  monthly_rent: number;              // snake_case (in cents)
  lease_start_date?: Date;           // snake_case
  lease_end_date?: Date;             // snake_case
  stripe_account_id?: string;        // snake_case
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}
```

#### Zod Validator (`/backend/src/validators/householdSchemas.ts`)
```typescript
// Uses camelCase in request schemas
CreateHouseholdSchema: {
  zipCode: z.string(),               // camelCase
  monthlyRent: z.number(),           // camelCase
  leaseStartDate: z.string(),        // camelCase
  leaseEndDate: z.string(),          // camelCase
}
```

#### Mobile Type (`/mobile/src/types/household.ts`, lines 21-51)
```typescript
interface Household {
  id: string;
  name: string;
  address: {                         // DIFFERENT! (object vs string)
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  establishedAt: string;             // NOT IN DB!
  leaseStartDate: string;            // camelCase
  leaseEndDate: string;              // camelCase
  monthlyRent: number;               // camelCase
  totalMembers: number;              // NOT IN DB!
  maxMembers: number;                // NOT IN DB!
  status: 'active' | 'pending' | 'dissolved';  // Different enum!
  settings: {...};                   // NOT IN DB!
  createdAt: string;
  updatedAt: string;
}
```

#### Household Mismatches
| Database Field | Validator Field | Mobile Field | Issue |
|---------------|-----------------|--------------|-------|
| `address` (string) | `address` (string) | `address` (object) | TYPE MISMATCH! |
| `zip_code` | `zipCode` | `address.zipCode` | Structure mismatch |
| `monthly_rent` | `monthlyRent` | `monthlyRent` | Case transform |
| `status` | N/A | `status` | ENUM MISMATCH! |
| N/A | N/A | `totalMembers` | Computed field |
| N/A | N/A | `maxMembers` | Missing from DB |
| N/A | N/A | `settings` | Missing from DB |

---

## Comparison Type Definitions

#### Backend (`/backend/src/types/comparison.ts`)
```typescript
interface ComparisonProfile {
  sourceType: ProfileSourceType;
  profileId: string;
  userId: string;
  profile: {
    firstName: string;
    age: number;
    city: string;
    state: string;
    childrenCount: number;
    housingBudget?: number;
    moveInDate?: string;
    workSchedule?: string;
    hasPets: boolean;
    smoking: string;
    isVerified: boolean;
    verificationScore?: number;
    cleanlinessLevel?: string;
    noiseLevel?: string;
    guestPolicy?: string;
    sharingPreferences?: string;
    dietaryRestrictions?: string;
    allergies?: string;
    folder?: string;
    notes?: string;
    savedAt?: string;
  };
}
```

#### Mobile (`/mobile/src/types/comparison.ts`)
```typescript
interface ComparisonProfileData {
  firstName: string;
  lastName?: string;                 // Additional field!
  age?: number;                      // Optional vs required
  city?: string;                     // Optional vs required
  state?: string;
  bio?: string;
  profilePhoto?: string;
  isVerified?: boolean;
  verificationScore?: number;
  housingBudget?: number | { min: number; max: number };  // Different type!
  childrenCount?: number;
  childrenAgeGroups?: string[];      // Additional field!
  workSchedule?: string | { type: string; hours?: string };  // Different type!
  moveInDate?: string;
  hasPets?: boolean;
  smoking?: 'yes' | 'no' | 'outside';
  folder?: string | null;
  savedAt?: string;
  [key: string]: any;                // Allows any additional properties
}
```

---

## Recommendations

### 1. Create Single Source of Truth
Create canonical type definitions in `/backend/src/types/entities/` that define:
- Database types (snake_case)
- API response types (camelCase)
- Transformation functions

### 2. Consolidate Profile/Parent Models
- Determine if `Profile` and `Parent` should be merged
- Create single canonical `Parent` entity
- Deprecate the `Profile` model or clarify their relationship

### 3. Standardize Field Naming
| Concept | Database (snake_case) | API (camelCase) |
|---------|----------------------|-----------------|
| Photo URL | `profile_photo_url` | `profilePhotoUrl` |
| Children count | `children_count` | `childrenCount` |
| Children ages | `children_age_groups` | `childrenAgeGroups` |

### 4. Standardize Enums
- `childrenAgeGroups`: Use full set `['infant', 'toddler', 'elementary', 'middle-school', 'high-school', 'teen']`
- `household.status`: Use `['active', 'inactive', 'pending', 'dissolved']`

### 5. Add Missing Database Fields
- `Message.status` for message delivery status
- `Household.max_members` for capacity limits
- `Household.settings` as JSONB for flexible configuration

### 6. Create Transformation Utilities
Implement bidirectional transformation functions for snake_case <-> camelCase conversion.

---

## Files Analyzed

### Backend Models
- `/backend/src/models/User.ts`
- `/backend/src/models/Profile.ts`
- `/backend/src/models/Parent.ts`
- `/backend/src/models/Message.ts`
- `/backend/src/models/Verification.ts`
- `/backend/src/models/ConnectionRequest.ts`
- `/backend/src/models/Household.ts`
- `/backend/src/models/Match.ts`

### Backend Validators
- `/backend/src/validators/auth.validator.ts`
- `/backend/src/validators/messageSchemas.ts`
- `/backend/src/validators/connectionRequestValidator.ts`
- `/backend/src/validators/householdSchemas.ts`
- `/backend/src/validators/discoverySchemas.ts`
- `/backend/src/validators/comparisonValidator.ts`
- `/backend/src/validators/savedProfileValidator.ts`

### Backend Types
- `/backend/src/types/ProfileCard.ts`
- `/backend/src/types/comparison.ts`
- `/backend/src/types/preferences.ts`

### Mobile Types
- `/mobile/src/types/messages.ts`
- `/mobile/src/types/comparison.ts`
- `/mobile/src/types/verification.ts`
- `/mobile/src/types/discovery.ts`
- `/mobile/src/types/household.ts`
