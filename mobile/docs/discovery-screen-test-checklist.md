# Discovery Screen Testing Checklist

**Version**: 1.0
**Last Updated**: 2025-10-07
**Feature**: Discovery Screen - Swipeable Cards
**Phase**: 3.6 Testing

---

## Test Execution Summary

| **Total Tests** | **Completed** | **Passed** | **Failed** | **Blocked** | **Pass Rate** |
|-----------------|---------------|------------|------------|-------------|---------------|
| 28              | 0             | 0          | 0          | 0           | 0%            |

---

## Quick Test Execution Order

### 🚀 Phase 1: Smoke Test (5 min)
- [ ] Test #1 - Basic Swipe Right
- [ ] Test #2 - Basic Swipe Left
- [ ] Test #11 - Child Safety Compliance
- [ ] Test #16 - Missing Profile Photo

### ⚡ Phase 2: Core Functionality (15 min)
- [ ] Test #3 - Partial Swipe Spring Back
- [ ] Test #4 - Threshold Testing
- [ ] Test #5 - Animation Smoothness
- [ ] Test #6 - Rapid Consecutive Swipes
- [ ] Test #7 - Card Stack Hierarchy
- [ ] Test #20 - Visual Indicators
- [ ] Test #21 - Gesture Conflicts

### 🔗 Phase 3: Integration (20 min)
- [ ] Test #8 - Match Modal Appearance
- [ ] Test #9 - Match Modal Send Message
- [ ] Test #10 - Match Modal Keep Swiping
- [ ] Test #23 - Duplicate Prevention
- [ ] Test #24 - Swipe History
- [ ] Test #25 - Match Creation

### 📊 Phase 4: Performance (10 min)
- [ ] Test #5 - 60fps Animation
- [ ] Test #17 - API Response Time
- [ ] Test #18 - Profile Load Time
- [ ] Test #19 - Memory Usage
- [ ] Test #26 - Performance Monitor

### 🛡️ Phase 5: Edge Cases (15 min)
- [ ] Test #13 - Empty Card Stack
- [ ] Test #14 - Network Offline
- [ ] Test #15 - API Error Response
- [ ] Test #22 - Screen Rotation

### ✅ Phase 6: Compliance (10 min - CRITICAL)
- [ ] Test #11 - Profile Data Privacy
- [ ] Test #12 - Network Request Inspection

---

## Detailed Test Cases

### 🎯 Core Swipe Functionality

#### ✅ Test #1: Basic Swipe Right (Like)
| **Priority** | Critical | **Type** | Functional |
|--------------|----------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Open Discovery Screen
2. Swipe top card right with moderate speed (>50% screen width)
3. Observe animation and indicators

**Expected Results**:
- ✅ Card rotates clockwise (up to +30°)
- ✅ Green heart "LIKE" indicator appears with increasing opacity
- ✅ Card animates smoothly off-screen to the right
- ✅ Next card becomes active and moves to front
- ✅ Backend receives swipe event with `direction: 'right'`

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #2: Basic Swipe Left (Pass)
| **Priority** | Critical | **Type** | Functional |
|--------------|----------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Open Discovery Screen
2. Swipe top card left with moderate speed (>50% screen width)
3. Observe animation and indicators

**Expected Results**:
- ✅ Card rotates counter-clockwise (up to -30°)
- ✅ Red X "NOPE" indicator appears with increasing opacity
- ✅ Card animates smoothly off-screen to the left
- ✅ Next card becomes active
- ✅ Backend receives swipe event with `direction: 'left'`

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #3: Partial Swipe - Spring Back
| **Priority** | High | **Type** | Functional |
|--------------|------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Swipe card approximately 30% of screen width
2. Release touch
3. Observe card behavior

**Expected Results**:
- ✅ Card springs back to center position with smooth animation
- ✅ Rotation returns to 0 degrees
- ✅ Like/Nope indicators fade out completely
- ✅ Same card remains active (no swipe registered)
- ✅ No backend swipe event triggered

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #4: Threshold Testing
| **Priority** | High | **Type** | Functional |
|--------------|------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Swipe card exactly 50% of screen width (current threshold)
2. Test 49% swipe (should cancel)
3. Test 51% swipe (should complete)

**Expected Results**:
- ✅ 50%+ swipe completes and registers
- ✅ <50% swipe springs back
- ✅ Threshold is precise and consistent
- ✅ No edge case bugs at boundary

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 🎨 Animation & Performance

#### ✅ Test #5: Smooth 60fps Animation
| **Priority** | High | **Type** | Performance |
|--------------|------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Enable Performance Monitor (shake device → "Show Perf Monitor")
2. Perform slow swipe
3. Perform medium speed swipe
4. Perform fast swipe
5. Observe FPS counter throughout

**Expected Results**:
- ✅ JS FPS: 59-60 throughout all swipes
- ✅ UI FPS: 59-60 throughout all swipes
- ✅ No frame drops or stuttering visible
- ✅ Smooth rotation interpolation
- ✅ Smooth opacity changes on indicators

**Actual Results**: ___________________________
**JS FPS**: ___ | **UI FPS**: ___ | **Frame Drops**: ___

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #6: Rapid Consecutive Swipes
| **Priority** | High | **Type** | Functional + Performance |
|--------------|------|----------|--------------------------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Swipe 5 cards quickly in succession
2. Alternate left/right swipes
3. Observe animations and state

**Expected Results**:
- ✅ Each card completes animation before next activates
- ✅ No animation conflicts or visual glitches
- ✅ All 5 swipes register correctly in backend
- ✅ Stack reorders properly
- ✅ No performance degradation

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #7: Card Stack Visual Hierarchy
| **Priority** | Medium | **Type** | Visual/UX |
|--------------|--------|----------|-----------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Open Discovery Screen with multiple cards
2. Observe cards underneath top card
3. Take screenshot for visual verification

**Expected Results**:
- ✅ Card 0 (top): Scale 1.0, Opacity 1.0, zIndex 100
- ✅ Card 1: Scale 0.95, Opacity 0.8, zIndex 99
- ✅ Card 2: Scale 0.90, Opacity 0.6, zIndex 98
- ✅ Proper stacking order maintained
- ✅ Visual depth effect clear

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 💫 Match Modal

#### ✅ Test #8: Match Modal Appearance
| **Priority** | Critical | **Type** | Functional |
|--------------|----------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Swipe right on profile that already swiped right on you
2. Wait for modal to appear
3. Observe modal content and animations

**Expected Results**:
- ✅ Modal appears with fade animation within 500ms
- ✅ Gradient background (pink #E91E63 to purple #9C27B0) visible
- ✅ Heart icon scales with bounce: 0 → 1.2 → 1.0
- ✅ "It's a Match!" title displays correctly
- ✅ Compatibility score shows (e.g., "87% Compatible")
- ✅ Match ID and creation date visible
- ✅ "Send Message" button visible
- ✅ "Keep Swiping" button visible

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #9: Match Modal - Send Message
| **Priority** | Critical | **Type** | Integration |
|--------------|----------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Trigger match modal (swipe right on mutual match)
2. Tap "Send Message" button
3. Verify navigation

**Expected Results**:
- ✅ Modal closes immediately
- ✅ Navigation to Messages screen occurs
- ✅ New conversation with matched user appears
- ✅ Matched user visible in conversation list
- ✅ Message input field active and ready

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #10: Match Modal - Keep Swiping
| **Priority** | High | **Type** | Functional |
|--------------|------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Trigger match modal
2. Tap "Keep Swiping" button
3. Verify behavior

**Expected Results**:
- ✅ Modal closes with fade animation
- ✅ Discovery screen remains active
- ✅ Next card appears for swiping
- ✅ Previous card is removed from stack
- ✅ No navigation occurs

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 🔒 Child Safety Compliance (CRITICAL)

#### ✅ Test #11: Profile Data Display - No Child PII
| **Priority** | **CRITICAL** ⚠️ | **Type** | Compliance |
|--------------|------------------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Review all visible profile card data on screen
2. Check for any child information displayed
3. Verify only parent data is shown
4. Screenshot for evidence

**Expected Results**:
- ✅ Shows: `childrenCount` (e.g., "2 children")
- ✅ Shows: `childrenAgeGroups` (e.g., "Toddler, School-age")
- ❌ NO child names visible anywhere
- ❌ NO child photos visible anywhere
- ❌ NO child birthdates visible
- ❌ NO child gender information
- ✅ Only parent's photo displayed
- ✅ Only parent's name displayed
- ✅ Parent age, bio, location shown

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

**⚠️ BLOCKER**: Any child PII visible = FAIL = Production blocker

---

#### ✅ Test #12: Network Request Inspection - No Child PII
| **Priority** | **CRITICAL** ⚠️ | **Type** | Compliance + Security |
|--------------|------------------|----------|------------------------|
| **Status**   | ⬜ Not Started | **Duration** | 5 min |

**Steps**:
1. Open Chrome DevTools or React Native Debugger
2. Monitor network requests to `/api/discovery/profiles`
3. Inspect response payload
4. Verify data structure

**Expected Results**:
- ✅ API response contains ONLY `childrenCount` field
- ✅ API response contains ONLY `childrenAgeGroups` array
- ❌ NO `childrenNames` field present
- ❌ NO `childrenPhotos` field present
- ❌ NO `childrenBirthdates` field present
- ❌ NO `children` nested objects with PII
- ✅ Response matches schema in API docs

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

**⚠️ BLOCKER**: Any child PII in payload = FAIL = Production blocker

---

### 📱 Edge Cases & Error Handling

#### ✅ Test #13: Empty Card Stack
| **Priority** | Medium | **Type** | Edge Case |
|--------------|--------|----------|-----------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Swipe through all available profiles
2. Observe behavior when no cards remain

**Expected Results**:
- ✅ "No more profiles" message appears
- ✅ Refresh button or prompt shown
- ✅ No crashes or blank screens
- ✅ User can navigate back or refresh
- ✅ Helpful message with next steps

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #14: Network Offline - Swipe Actions
| **Priority** | High | **Type** | Error Handling |
|--------------|------|----------|----------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Turn off WiFi and cellular data
2. Attempt to swipe right/left
3. Observe error handling

**Expected Results**:
- ✅ Swipe animation completes locally
- ✅ Error toast/snackbar appears
- ✅ Error message clear: "No internet connection"
- ✅ Swipe queued for retry when online
- ✅ App doesn't crash
- ✅ User can continue browsing cached cards

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #15: API Error Response - 500 Error
| **Priority** | Medium | **Type** | Error Handling |
|--------------|--------|----------|----------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Trigger 500 error from backend (mock or intentional)
2. Observe error handling

**Expected Results**:
- ✅ Error message displayed to user
- ✅ Previous card state maintained
- ✅ Option to retry operation
- ✅ No app crash
- ✅ Error logged for debugging

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #16: Missing Profile Photo
| **Priority** | Medium | **Type** | Edge Case |
|--------------|--------|----------|-----------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Load profile with no photo (`profilePhoto: null`)
2. Observe placeholder display

**Expected Results**:
- ✅ Placeholder displays: "No Photo" text
- ✅ Gray background box shown
- ✅ No broken image icons
- ✅ Card still fully swipeable
- ✅ All other profile data visible

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### ⚡ Performance Benchmarks

#### ✅ Test #17: API Response Time
| **Priority** | High | **Type** | Performance |
|--------------|------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 3 min |

**Steps**:
1. Monitor `/api/discovery/profiles` endpoint
2. Measure response times for 10 requests
3. Calculate P95 and P99 latency

**Expected Results**:
- ✅ P95 latency < 100ms (warm cache)
- ✅ P99 latency < 200ms
- ✅ First load < 500ms
- ✅ Median < 50ms

**Actual Results**:
**P95**: ___ ms | **P99**: ___ ms | **Median**: ___ ms

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #18: Profile Load Time
| **Priority** | High | **Type** | Performance |
|--------------|------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Close and reopen app
2. Measure time from launch to first card visible
3. Test on WiFi and 3G

**Expected Results**:
- ✅ WiFi: < 2 seconds
- ✅ 3G: < 3 seconds
- ✅ Loading indicator visible during fetch
- ✅ Progressive loading (show cards as they arrive)

**Actual Results**:
**WiFi**: ___ sec | **3G**: ___ sec

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #19: Memory Usage - Continuous Swiping
| **Priority** | Medium | **Type** | Performance |
|--------------|--------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 5 min |

**Steps**:
1. Open Xcode Instruments or Android Profiler
2. Swipe through 50+ profiles continuously
3. Monitor memory usage throughout

**Expected Results**:
- ✅ Memory stays < 150MB on mobile
- ✅ No memory leaks detected
- ✅ Images properly released from memory
- ✅ No crashes after extended use
- ✅ Memory graph shows stable pattern

**Actual Results**:
**Peak Memory**: ___ MB | **Leaks Detected**: ___

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 🎭 User Experience

#### ✅ Test #20: Visual Indicators Clarity
| **Priority** | High | **Type** | UX |
|--------------|------|----------|-----|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Swipe slowly right and observe like indicator
2. Swipe slowly left and observe nope indicator
3. Verify visibility and clarity

**Expected Results**:
- ✅ Like indicator (green heart + checkmark) clearly visible at >25% right swipe
- ✅ Nope indicator (red X) clearly visible at >25% left swipe
- ✅ Icons properly positioned (like: top-left, nope: top-right)
- ✅ 15° rotation on indicators for visual interest
- ✅ Opacity increases smoothly with swipe distance

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #21: Gesture Conflicts
| **Priority** | Medium | **Type** | Functional |
|--------------|--------|----------|------------|
| **Status**   | ⬜ Not Started | **Duration** | 30 sec |

**Steps**:
1. Attempt to swipe top card
2. Attempt to touch/swipe cards underneath
3. Verify only top card responds

**Expected Results**:
- ✅ Only top card (index 0) responds to gestures
- ✅ Cards underneath ignore touch events
- ✅ No multi-touch conflicts
- ✅ Consistent behavior across all cards

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #22: Screen Rotation
| **Priority** | Low | **Type** | Edge Case |
|--------------|-----|----------|-----------|
| **Status**   | ⬜ Not Started | **Duration** | 1 min |

**Steps**:
1. Rotate device to landscape during swipe
2. Rotate back to portrait
3. Observe behavior

**Expected Results**:
- ✅ Swipe completes or cancels gracefully
- ✅ Card stack re-layouts properly
- ✅ No visual glitches
- ✅ All UI elements remain accessible
- ✅ (Note: If rotation locked, mark N/A)

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 🧪 Data Integrity

#### ✅ Test #23: Duplicate Prevention
| **Priority** | High | **Type** | Data Integrity |
|--------------|------|----------|----------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Swipe right on a user
2. Navigate away and return (or trigger re-fetch)
3. Verify same user doesn't appear again

**Expected Results**:
- ✅ Backend rejects duplicate swipe attempts
- ✅ Error message: "You already swiped on this user"
- ✅ Cache prevents duplicate presentations
- ✅ User cannot swipe same person twice

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #24: Swipe History Tracking
| **Priority** | High | **Type** | Data Integrity |
|--------------|------|----------|----------------|
| **Status**   | ⬜ Not Started | **Duration** | 3 min |

**Steps**:
1. Swipe 10 profiles (mix of left/right)
2. Check backend database for swipe records
3. Verify all data fields

**Expected Results**:
- ✅ All 10 swipes recorded in database
- ✅ Correct `user_id` for each swipe
- ✅ Correct `target_user_id` for each swipe
- ✅ Correct `direction` ('left' or 'right')
- ✅ Accurate `created_at` timestamps
- ✅ Timestamps in correct chronological order

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #25: Match Creation Logic
| **Priority** | Critical | **Type** | Integration |
|--------------|----------|----------|-------------|
| **Status**   | ⬜ Not Started | **Duration** | 3 min |

**Steps**:
1. User A swipes right on User B
2. User B swipes right on User A (mutual match)
3. Verify match creation

**Expected Results**:
- ✅ Match record created in database
- ✅ Both users receive match notification
- ✅ Compatibility score calculated and stored
- ✅ Match modal appears for User B immediately
- ✅ Match appears in Messages tab for both users
- ✅ Socket.io notification sent to both clients

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

### 🔧 Developer Testing Tools

#### ✅ Test #26: React Native Performance Monitor
| **Priority** | Medium | **Type** | Development Tool |
|--------------|--------|----------|------------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Shake device to open dev menu
2. Enable "Show Perf Monitor"
3. Perform various swipes
4. Observe metrics

**Expected Results**:
- ✅ JS frame rate: 60 FPS during swipes
- ✅ UI frame rate: 60 FPS during swipes
- ✅ Bridge traffic minimal during gestures
- ✅ No red warnings or drops

**Actual Results**:
**JS FPS**: ___ | **UI FPS**: ___ | **Bridge**: ___

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #27: Redux DevTools (if applicable)
| **Priority** | Low | **Type** | Development Tool |
|--------------|-----|----------|------------------|
| **Status**   | ⬜ Not Started | **Duration** | 2 min |

**Steps**:
1. Open Redux DevTools
2. Perform swipe actions
3. Monitor state changes

**Expected Results**:
- ✅ `SWIPE_START` action dispatched on touch
- ✅ `SWIPE_COMPLETE` action with correct direction
- ✅ `PROFILES_UPDATE` removes swiped profile from stack
- ✅ State updates clean and predictable

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

#### ✅ Test #28: Logcat/Console Monitoring
| **Priority** | Medium | **Type** | Development Tool |
|--------------|--------|----------|------------------|
| **Status**   | ⬜ Not Started | **Duration** | 3 min |

**Steps**:
1. Filter logs for "Discovery" or "Swipe"
2. Perform various swipe actions
3. Monitor console output

**Expected Results**:
- ✅ No error logs present
- ✅ Info logs show swipe events with timestamps
- ✅ Performance warnings absent
- ✅ Network requests logged with status codes
- ✅ No uncaught exceptions

**Actual Results**: ___________________________

**Pass/Fail**: ⬜ | **Notes**: ___________________________

---

## Sign-Off

### Test Completion Summary

| **Phase** | **Tests** | **Passed** | **Failed** | **Blocked** | **Pass %** |
|-----------|-----------|------------|------------|-------------|------------|
| Phase 1 - Smoke | 4 | ___ | ___ | ___ | ___% |
| Phase 2 - Core | 7 | ___ | ___ | ___ | ___% |
| Phase 3 - Integration | 6 | ___ | ___ | ___ | ___% |
| Phase 4 - Performance | 4 | ___ | ___ | ___ | ___% |
| Phase 5 - Edge Cases | 4 | ___ | ___ | ___ | ___% |
| Phase 6 - Compliance | 2 | ___ | ___ | ___ | ___% |
| **TOTAL** | **28** | **___** | **___** | **___** | **___%** |

### Production Readiness Criteria

- [ ] **All Critical tests passed** (Tests #1, #2, #8, #9, #11, #12, #23, #25)
- [ ] **All High Priority tests passed** (Tests #3-7, #10, #14, #17, #18, #20, #24)
- [ ] **Child Safety compliance verified** (Tests #11, #12)
- [ ] **Performance benchmarks met** (Tests #5, #17, #18, #19)
- [ ] **No blockers or critical bugs**
- [ ] **Overall pass rate ≥ 95%**

### Sign-Off

**Tested By**: ___________________________
**Date**: ___________________________
**Environment**: ⬜ Android | ⬜ iOS | ⬜ Both
**Device**: ___________________________
**OS Version**: ___________________________

**QA Approval**: ___________________________
**Product Owner Approval**: ___________________________
**Engineering Approval**: ___________________________

**Production Deployment**: ⬜ Approved | ⬜ Rejected | ⬜ Pending

**Notes**: ___________________________

---

**End of Testing Checklist**
