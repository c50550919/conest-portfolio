# Manual E2E Test Flow - iOS Simulator
## Discovery → Match → Message Flow

**Date**: October 13, 2025
**Platform**: iOS Simulator (iPhone 16 Pro)
**Test User**: test@conest.com / Test1234

---

## Prerequisites
- ✅ iOS app running on iPhone 16 Pro simulator
- ✅ Backend running with ngrok URL
- ✅ WebSocket connected
- ✅ BrowseDiscoveryScreen active (swipe UI removed)
- ✅ Test profiles seeded in database

---

## Test Flow Steps

### 1. Login Verification
**Status**: ✅ COMPLETED (Previous session)
- User authenticated with stored tokens
- Tokens loaded from KeyChain successfully
- User ID: `a912b357-4dbf-4441-aa86-2843860fa31f`

### 2. Navigate to Discovery Screen
**Action**: Tap on "Discover" tab in bottom navigation

**Expected**:
- BrowseDiscoveryScreen loads
- Profile grid/list displays
- Mock profiles visible (Sarah Johnson, Jennifer Lee, Maria Garcia, etc.)

**Verify**:
- [ ] Discovery tab is accessible
- [ ] Profiles load within 500ms
- [ ] At least 1 profile card is visible
- [ ] Profile shows: photo, name, age, city, children count (NO child PII)

---

### 3. Browse Profiles
**Action**: Scroll through profile list/grid

**Expected**:
- Smooth scrolling
- Multiple profiles visible
- Filter button accessible
- View mode switcher (grid/list)

**Verify**:
- [ ] Profiles display correctly
- [ ] No loading errors in Metro logs
- [ ] Images load properly
- [ ] Compatibility scores visible

---

### 4. View Profile Details
**Action**: Tap on a profile card (e.g., Sarah Johnson)

**Expected**:
- ProfileDetailsModal opens
- Full profile information displayed
- "Express Interest" button visible
- Bio, location, schedule, budget info shown

**Verify**:
- [ ] Modal opens smoothly
- [ ] All profile data loads
- [ ] NO child PII displayed (only count + age groups)
- [ ] Action buttons functional

---

### 5. Express Interest (Replaces Swipe Right)
**Action**: Tap "Express Interest" button in profile modal

**Expected**:
- API call to POST /api/discovery/swipe (with direction: 'right')
- Optimistic UI update
- If mutual interest: Match notification appears
- Profile removed from browse list

**Verify**:
- [ ] Button responds to tap
- [ ] Loading indicator shows briefly
- [ ] Success feedback provided
- [ ] WebSocket match notification (if mutual)

**Metro Log Check**:
```
LOG [DiscoveryAPI] Request: POST /discovery/swipe
LOG [DiscoveryAPI] Response: 200 /discovery/swipe
```

---

### 6. Match Notification (If Mutual Interest)
**Expected**:
- MatchModal appears with celebration UI
- Shows matched user info
- "Send Message" button available
- WebSocket event received: `match_created`

**Verify**:
- [ ] Match modal displays
- [ ] Compatibility score shown
- [ ] Matched user details correct
- [ ] "Send Message" button works

---

### 7. Navigate to Messages
**Action**: Tap "Send Message" in MatchModal OR navigate to Messages tab

**Expected**:
- Conversation created automatically
- Messages screen loads
- New conversation visible in list
- Can compose and send message

**Verify**:
- [ ] Messages tab accessible
- [ ] Conversation list loads
- [ ] New match conversation present
- [ ] Message input field functional

---

### 8. Send Message
**Action**: Type message and tap send

**Expected**:
- Message sent via WebSocket or API
- Message appears in conversation
- Real-time delivery (if WebSocket connected)
- Typing indicators work

**Verify**:
- [ ] Message input works
- [ ] Send button functional
- [ ] Message appears in thread
- [ ] Timestamp displayed

**Metro Log Check**:
```
LOG Socket connected: Ba0rjCftCLiqOz5lAAAC
LOG [MessagesAPI] Request: POST /messages
LOG [MessagesAPI] Response: 200 /messages
```

---

## Current Test Status

### ✅ Completed
1. iOS platform setup
2. WebSocket connection fixed
3. BrowseDiscoveryScreen activated
4. Swipe UI removed and archived
5. App running successfully on iOS simulator

### ⏳ Pending Manual Verification
1. Browse profiles in Discovery screen
2. View profile details
3. Express interest in profile
4. Receive match notification (if mutual)
5. Send message to matched user

---

## Test Profiles Available
From seed file `/backend/src/seeds/001_test_discovery_profiles.ts`:

1. **Sarah Johnson** - Oakland, CA - 2 children
2. **Jennifer Lee** - San Francisco, CA - 1 child
3. **Maria Garcia** - Oakland, CA - 3 children
4. **Amanda Wilson** - Berkeley, CA - 1 child
5. **Lisa Martinez** - Healthcare worker, 2 kids
6. ...and 15 more profiles

---

## Known Issues / Notes
- Backend may be local (not Docker), verify it's running
- Seed data needs to be run: `cd backend && npm run seed`
- If no profiles appear, check API logs for errors
- WebSocket match notifications require both users to express interest

---

## Success Criteria
- ✅ Can browse profiles without swipe UI
- ✅ Can view full profile details
- ✅ Can express interest (connection request)
- ✅ Match notification appears (if mutual)
- ✅ Can send message to matched user
- ✅ No child PII displayed anywhere
- ✅ All API calls complete within performance budgets (<500ms)

---

## Next Steps
1. Run seed data if not already done
2. Manually test the flow on iOS simulator
3. Log any issues or failures
4. Create automated Detox test based on manual results
