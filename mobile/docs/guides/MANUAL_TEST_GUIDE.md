# Manual Test Guide - Bookmark Validation Fix

## Test Environment Setup ✅
- ✅ iPhone 17 Pro Simulator (FAFD53B1-CBE6-4EA3-98DB-404E942FA377) - **BOOTED**
- ✅ Conest App Launched (PID: 4498)
- ✅ Backend Container Running (safenest-backend)
- ✅ Backend Monitoring Active (watching for saved-profiles API calls)
- ✅ Metro Bundler Running (port 8081)

## Test Objective
Verify that the bookmark validation error is resolved after fixes to:
1. Backend validator: Made query object optional in [savedProfileValidator.ts:49-53](../backend/src/validators/savedProfileValidator.ts#L49-L53)
2. Frontend Redux: Synchronized state between browseDiscoverySlice and savedProfilesSlice
3. Folder format: Standardized to Title Case ("Top Choice" not "top_choice")

## Test Steps

### Step 1: Navigate to Discover Tab
1. Look at the iPhone 17 Pro simulator
2. Tap the **"Discover"** tab at the bottom
3. Wait for "Browse Connections" header to appear
4. **Expected**: Profile cards load successfully (Jessica, Amanda, etc.)

### Step 2: Bookmark a Profile (Jessica or Amanda)
1. Find the **second row profile** (Jessica, 29 or Amanda, 34)
2. Click the **bookmark icon** (🔖) in the top-right corner of the profile card
3. **Expected**: Folder selection modal appears with 4 options:
   - ⭐ Top Choice
   - 👍 Strong Maybe
   - 💭 Considering
   - 📦 Backup

### Step 3: Select a Folder
1. Tap **"Top Choice"** folder
2. **Expected**:
   - Modal closes
   - Bookmark icon turns **BLUE** (🔖 → 🔖💙)
   - No "Validation failed" error
   - Console shows successful API call

### Step 4: Navigate to Saved Tab
1. Tap the **"Saved"** tab at the bottom
2. **Expected**:
   - "Saved Profiles" header appears
   - Profile appears in **"Top Choice"** section
   - **Only** the bookmarked profile appears (not all profiles)
   - Profile count shows: "Top Choice (1)"

### Step 5: Verify Redux State
1. Open React Native Debugger or Chrome DevTools
2. Check Redux state:
   ```javascript
   state.savedProfiles.savedProfiles // Should contain the bookmarked profile
   state.browseDiscovery.savedProfiles // Should be in sync
   ```

## Backend Monitoring

I have backend monitoring running in the background. When you perform the test, I'll see:
- `POST /api/saved-profiles` - When you bookmark a profile
- `GET /api/saved-profiles` - When you navigate to Saved tab
- Any validation errors or success responses

## What to Look For

### ✅ SUCCESS Indicators:
- Bookmark icon turns blue after selection
- No "Validation failed" error appears
- Profile appears in Saved tab under correct folder
- Only bookmarked profiles appear in Saved tab
- Backend logs show successful API calls

### ❌ FAILURE Indicators:
- Bookmark icon stays gray after selection
- "Validation failed" error appears
- All profiles appear in Saved tab (not just bookmarked ones)
- Profile appears in wrong folder
- Backend logs show validation errors

## Expected Backend Response

When you bookmark a profile, the backend should return:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "profile_id": "uuid",
  "folder": "Top Choice",
  "notes": null,
  "profile": {
    "first_name": "Jessica",
    "city": "Austin",
    "state": "TX",
    "verification_score": 85
  }
}
```

## Fixes Applied

### 1. Backend Validator Fix
**File**: [backend/src/validators/savedProfileValidator.ts:49-53](../backend/src/validators/savedProfileValidator.ts#L49-L53)
```typescript
export const getSavedProfilesSchema = z.object({
  query: z.object({
    folder: folderSchema.optional(),
  }).optional(),  // ← Made query object optional to handle empty GET requests
});
```

### 2. Frontend Redux Synchronization
**File**: [mobile/src/screens/main/BrowseDiscoveryScreen.tsx:81-84](./src/screens/main/BrowseDiscoveryScreen.tsx#L81-L84)
```typescript
// Added selector for persisted saved profiles from API
const { savedProfiles: persistedSavedProfiles } = useSelector(
  (state: RootState) => state.savedProfiles
);

// Updated isProfileSaved to use persisted state
const isProfileSaved = (profileId: string): boolean => {
  return persistedSavedProfiles.some(sp => sp.profile_id === profileId);
};
```

### 3. Folder Format Standardization
**Files**: Multiple files updated to use Title Case
- `FolderSelectionModal.tsx`: Folder IDs changed to "Top Choice", "Strong Maybe", etc.
- `savedProfilesSlice.ts`: Type definitions updated to Title Case
- `savedProfilesAPI.ts`: Method signatures updated to Title Case

## After Testing

Please let me know:
1. Did the bookmark icon turn blue? ✅ or ❌
2. Did you see any validation errors? ✅ or ❌
3. Did the profile appear in Saved tab correctly? ✅ or ❌
4. What did the backend logs show? (I'll check the monitoring output)

Once you complete the test, I can check the backend monitoring logs to see the exact API calls and responses.
