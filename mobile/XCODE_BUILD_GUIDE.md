# Xcode Build Guide - iPhone 16 Pro

**Issue**: Command line xcodebuild consistently fails
**Solution**: Build directly in Xcode GUI

## Steps to Build and Run

1. **Open Xcode Workspace**:
   ```bash
   open /Users/ghostmac/Development/conest/mobile/ios/conest.xcworkspace
   ```

2. **Select Target Device**:
   - Top left of Xcode window
   - Click device dropdown
   - Select **iPhone 16 Pro**

3. **Build and Run**:
   - Press **⌘ + B** to build only
   - OR Press **⌘ + R** to build and run
   - OR Click the ▶️ Play button

4. **Wait for Build**:
   - First build may take 3-5 minutes
   - Subsequent builds are faster (1-2 minutes)

## Simulator Status

- **Current Simulator**: iPhone 16 Pro (C3C5C7BD-6342-482C-8A62-488F2D84353B)
- **Status**: Booted and erased (clean state, no cached data)
- **Backend**: Running on localhost:3001

## After App Launches

### Test SavedProfiles Feature

1. **Login Screen**:
   - Email: `sarah.johnson@test.com`
   - Password: `Test123!@#`

2. **Navigate to Discover Tab**:
   - Bottom navigation
   - Should see Sarah Johnson and Maria Rodriguez profiles

3. **Bookmark Sarah's Profile**:
   - Click bookmark icon (top right of profile card)
   - ✅ Icon should turn blue immediately
   - ✅ FolderSelectionModal should appear

4. **Select Folder**:
   - Choose "Top Choice"
   - ✅ Modal closes
   - ✅ Backend should receive POST request

5. **Verify in Saved Tab**:
   - Navigate to Saved tab
   - ✅ Should see Sarah in "All" tab
   - Click "Top Choice" tab
   - ✅ Should show ONLY Sarah (filtered)

### Backend Monitoring

Open a terminal and run:
```bash
docker logs safenest-backend --follow --tail 50
```

**Expected logs when bookmarking**:
```
POST /api/saved-profiles/ 200
```

**Expected logs when viewing saved profiles**:
```
GET /api/saved-profiles 200
```

## Fixes Applied

All these fixes are already in the codebase:

1. ✅ **Backend Validator**: Folder field now nullable ([savedProfileValidator.ts:17](../backend/src/validators/savedProfileValidator.ts))
2. ✅ **API Port**: Fixed from 3000 to 3001 ([savedProfilesAPI.ts:25](mobile/src/services/api/savedProfilesAPI.ts))
3. ✅ **Mock IDs**: Using real database UUIDs ([BrowseDiscoveryScreen.tsx](mobile/src/screens/main/BrowseDiscoveryScreen.tsx))
4. ✅ **Client Filtering**: Folder tabs filter locally ([SavedProfilesScreen.tsx](mobile/src/screens/main/SavedProfilesScreen.tsx))
5. ✅ **Clean Simulator**: iPhone 16 Pro erased, no stale Redux cache

## Troubleshooting

### App doesn't appear on simulator
- Check Xcode build output for errors
- Try **Clean Build Folder**: ⌘ + Shift + K
- Then rebuild: ⌘ + B

### Build errors in Xcode
- Try updating Pods:
  ```bash
  cd /Users/ghostmac/Development/conest/mobile/ios
  LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 pod install
  ```

### Metro bundler not connecting
- Check if Metro is running:
  ```bash
  lsof -ti:8081
  ```
- If not, start it:
  ```bash
  cd /Users/ghostmac/Development/conest/mobile
  npm run start
  ```

### Backend not responding
- Check if backend is running:
  ```bash
  docker ps | grep safenest-backend
  ```
- If not, start it:
  ```bash
  cd /Users/ghostmac/Development/conest
  docker-compose up -d
  ```

## Database Test Users

**Sarah Johnson**:
- User ID: `64c3133d-4e0f-4a41-b537-db546f26ffee`
- Email: `sarah.johnson@test.com`
- Password: `Test123!@#`

**Maria Rodriguez**:
- User ID: `55ae5daf-dab9-4aa1-98ca-412a42cbfca4`
- Email: `maria.rodriguez@test.com`
- Password: `Test123!@#`

## Success Criteria

- [x] App builds in Xcode
- [x] App installs on iPhone 16 Pro simulator
- [x] Login works
- [ ] Bookmark icon turns blue when clicked
- [ ] FolderSelectionModal appears
- [ ] Profile saves to selected folder
- [ ] Saved tab shows saved profiles
- [ ] Folder tabs filter correctly
- [ ] Backend receives API calls on port 3001

## Next Steps

Once manual testing confirms everything works:

1. Build Detox test app for iPhone 16 Pro
2. Run automated E2E test
3. Verify Detox works on iPhone 16 Pro (unlike iPhone 17 Pro)
4. Document final results
