# Switching to iPhone 16 Pro for Detox Testing

**Date**: 2025-10-22
**Reason**: iPhone 17 Pro simulator has compatibility issues with Detox and iOS 18/Xcode 16

## Changes Made

### 1. Updated Detox Configuration
**File**: `.detoxrc.js`
**Change**: Updated simulator device type from `iPhone 17 Pro` to `iPhone 16 Pro`

```javascript
devices: {
  simulator: {
    type: 'ios.simulator',
    device: {
      type: 'iPhone 16 Pro'  // Changed from 'iPhone 17 Pro'
    }
  },
```

### 2. Simulator Setup
- **Shutdown**: iPhone 17 Pro (ID: FAFD53B1-CBE6-4EA3-98DB-404E942FA377)
- **Erased**: iPhone 16 Pro (ID: C3C5C7BD-6342-482C-8A62-488F2D84353B) - Fresh state, no cached Redux data
- **Booted**: iPhone 16 Pro

### 3. App Build
- **Status**: Building app for iPhone 16 Pro
- **Command**: `npx react-native run-ios --simulator "iPhone 16 Pro"`

## Previous Issues with iPhone 17 Pro

1. **Detox Timeout**: Tests would timeout without executing
2. **iOS Build Failures**: xcodebuild consistently failed to produce complete app bundle
3. **Known Incompatibility**: Detox has not fully stabilized with iPhone 17 Pro/iOS 18 stack

## Expected Benefits

1. **Stable Detox Tests**: iPhone 16 Pro has better Detox compatibility
2. **Successful Builds**: More reliable iOS builds
3. **Automated Testing**: Ability to run E2E tests without manual intervention
4. **Faster Iteration**: Automated tests eliminate redundant manual testing

## Fixes Already Applied

These fixes remain in place and should work with iPhone 16 Pro:

1. ✅ **API Port Fix**: `savedProfilesAPI.ts` now uses `localhost:3001` (correct backend port)
2. ✅ **Folder Nullable**: Backend validator allows `null` folder values
3. ✅ **Real User IDs**: Mock profiles use actual database UUIDs
4. ✅ **Client-side Filtering**: SavedProfilesScreen filters profiles locally
5. ✅ **Fresh Simulator**: iPhone 16 Pro erased, no stale Redux persist cache

## Next Steps

1. Wait for app build to complete on iPhone 16 Pro
2. Test SavedProfiles functionality manually to verify fixes
3. Run Detox E2E test: `npx detox test --configuration ios.sim.debug`
4. Verify automated testing works end-to-end

## Testing Checklist

Once app is installed on iPhone 16 Pro:

- [ ] App launches successfully
- [ ] Login as sarah.johnson@test.com works
- [ ] Bookmark icon on Sarah profile turns blue
- [ ] FolderSelectionModal appears
- [ ] Selecting "Top Choice" saves profile
- [ ] Navigate to Saved tab → Sarah appears
- [ ] Click "Top Choice" tab → Shows ONLY "Top Choice" profiles
- [ ] Backend logs show `POST /api/saved-profiles/` on port 3001
- [ ] Backend logs show `GET /api/saved-profiles` on port 3001

## Backend Monitoring

Current backend status:
- ✅ Backend running on port 3001
- ✅ WebSocket connections working
- ✅ User authentication successful
- ⚠️ No `/api/saved-profiles` calls yet (waiting for app to be rebuilt)

## References

- User research: "Detox has not yet fully stabilized with the new iPhone 17 Pro/iOS 18 simulator stack"
- User recommendation: "Use an Iphone 16 Pro"
- Detox config: `/Users/ghostmac/Development/conest/mobile/.detoxrc.js`
