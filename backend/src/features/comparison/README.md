# Comparison Feature

## Overview

The Comparison feature enables users to compare 2-4 profiles side-by-side from mixed sources (discovery feed and saved profiles). It also provides detailed 6-dimension compatibility calculations between two profiles, helping users make informed decisions about potential roommates.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/profiles/compare` | Compare 2-4 profiles from mixed sources | Yes |
| POST | `/api/compatibility/calculate` | Calculate detailed 6-dimension compatibility | Yes |

## Services

### ProfileComparisonService
- `compareProfiles(userId, profiles[])` - Compares 2-4 profiles and returns comparison data
- Handles mixed source types (discovery profiles and saved profiles)
- Validates user has access to requested profiles

### Compatibility Calculation Functions
- `calculateScheduleCompatibility` - Evaluates daily routine and availability alignment
- `calculateParentingCompatibility` - Analyzes parenting philosophy alignment
- `calculateLifestyleCompatibility` - Compares lifestyle preferences (pets, smoking, cleanliness)
- `calculateLocationCompatibility` - Checks proximity to preferred locations and schools
- `calculateBudgetCompatibility` - Evaluates financial compatibility
- `calculateHouseRulesCompatibility` - Compares household rules preferences

## Models/Types

### CompareProfilesRequest
```typescript
interface CompareProfilesRequest {
  profiles: Array<{
    type: 'discovery' | 'saved';
    id: string;  // userId for discovery, savedProfileId for saved
  }>;
}
```

### CompatibilityRequest
```typescript
interface CompatibilityRequest {
  profile1Id: string;
  profile2Id: string;
}
```

### CompatibilityResponse
```typescript
interface CompatibilityResponse {
  success: boolean;
  data: {
    overallScore: number;      // Weighted average (0-100)
    dimensions: Array<{
      dimension: string;        // e.g., 'Schedule Compatibility'
      score: number;            // 0-100
      weight: number;           // 0-1
      explanation: string;      // Human-readable explanation
      icon: string;             // UI icon identifier
    }>;
    calculatedAt: string;       // ISO timestamp
  };
}
```

### Compatibility Dimensions
| Dimension | Weight | Description |
|-----------|--------|-------------|
| Schedule Compatibility | 25% | Daily routines and availability |
| Parenting Philosophy | 20% | Parenting styles and values |
| Lifestyle Compatibility | 20% | Pets, smoking, habits |
| Location & Schools | 15% | Geographic proximity |
| Budget Alignment | 10% | Financial compatibility |
| House Rules Agreement | 10% | Household expectations |

## Dependencies

- `../../middleware/auth.middleware` - authenticateJWT for authentication
- `../../validators/comparisonValidator` - Zod schemas for request validation
- `../../models/Profile` - Profile data access
- `../saved-profiles` - SavedProfile model for saved profile access

## Data Flow

### Profile Comparison Flow
1. Request validated (2-4 profiles required)
2. User authentication verified
3. For each profile:
   - Discovery type: Fetch from profile database
   - Saved type: Verify user owns saved profile, fetch associated profile
4. Profiles aggregated and returned for side-by-side display

### Compatibility Calculation Flow
1. Request validated (two profile IDs required)
2. Both profiles fetched using comparison service
3. Each dimension calculated independently:
   - Extract relevant preferences from both profiles
   - Apply dimension-specific algorithm
   - Generate score (0-100)
4. Overall score calculated as weighted average
5. Response returned with all dimension scores and explanations
