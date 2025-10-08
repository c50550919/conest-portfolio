# Discovery Screen - Detailed Acceptance Criteria

**Feature**: Discovery Screen Swipeable Cards
**Version**: 1.0
**Last Updated**: 2025-10-07

---

## Table of Contents
1. [Core Swipe Functionality](#core-swipe-functionality)
2. [Animation & Performance](#animation--performance)
3. [Match Modal](#match-modal)
4. [Child Safety Compliance](#child-safety-compliance)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Performance Benchmarks](#performance-benchmarks)
7. [User Experience](#user-experience)
8. [Data Integrity](#data-integrity)
9. [Developer Tools](#developer-tools)

---

## Core Swipe Functionality

### Test #1: Basic Swipe Right (Like)

**Given**: User is on Discovery Screen with profiles loaded
**When**: User swipes top card right beyond 50% of screen width
**Then**:

#### Visual Behavior
- [ ] Card begins moving right immediately on touch
- [ ] Card rotates clockwise proportional to swipe distance
  - Max rotation: +30 degrees at screen edge
  - Rotation formula: `position.x * (30 / screenWidth)`
- [ ] Green heart icon appears at top-left of card
- [ ] Heart opacity increases from 0 to 1.0 based on swipe progress
  - Opacity = 0 at 0% swipe
  - Opacity = 1.0 at 50% swipe (threshold)
- [ ] Checkmark badge appears below heart icon
- [ ] Card scale remains at 1.0 (no scaling on active card)

#### Animation Timing
- [ ] Card follows finger position with <16ms latency (60fps)
- [ ] Spring animation triggers upon release
  - Duration: ~400ms
  - Damping: 15
  - useNativeDriver: true
- [ ] Card animates off-screen to right (1.5x screen width)
- [ ] Next card smoothly transitions to front position

#### Backend Integration
- [ ] POST request sent to `/api/discovery/swipe`
- [ ] Request payload includes:
  ```json
  {
    "targetUserId": "uuid",
    "direction": "right",
    "timestamp": "ISO-8601"
  }
  ```
- [ ] Response status: 200 OK or 201 Created
- [ ] Swipe recorded in database with correct user_id and target_user_id

#### State Management
- [ ] Swiped profile removed from local card stack
- [ ] Next profile becomes index 0 (top card)
- [ ] Card count decrements by 1
- [ ] Swipe event logged for analytics

**Acceptance**: All criteria met, no visual glitches, swipe feels natural

---

### Test #2: Basic Swipe Left (Pass)

**Given**: User is on Discovery Screen with profiles loaded
**When**: User swipes top card left beyond 50% of screen width
**Then**:

#### Visual Behavior
- [ ] Card moves left following touch position
- [ ] Card rotates counter-clockwise proportional to swipe
  - Max rotation: -30 degrees at screen edge
  - Rotation formula: `position.x * (30 / screenWidth)`
- [ ] Red X icon appears at top-right of card
- [ ] X icon opacity increases from 0 to 1.0 based on swipe
- [ ] Close badge appears below X icon
- [ ] Red color theme used (#F44336)

#### Animation Timing
- [ ] Same timing as swipe right (consistency)
- [ ] Spring animation on release (damping: 15)
- [ ] Card animates off-screen to left (-1.5x screen width)
- [ ] Smooth transition to next card

#### Backend Integration
- [ ] POST request to `/api/discovery/swipe`
- [ ] Payload direction: "left"
- [ ] Response 200/201 status
- [ ] Database record created

#### State Management
- [ ] Profile removed from stack
- [ ] Next profile advances to top
- [ ] Analytics event: "profile_passed"

**Acceptance**: Identical feel to swipe right, but opposite direction

---

### Test #3: Partial Swipe - Spring Back

**Given**: User starts swiping a card
**When**: User releases touch before reaching 50% threshold
**Then**:

#### Visual Behavior
- [ ] Card immediately begins spring-back animation
- [ ] Card returns to center position (x: 0, y: 0)
- [ ] Rotation returns to 0 degrees
- [ ] Like/Nope indicator fades out smoothly
  - Fade duration: matches spring animation (~300ms)
- [ ] Card settles with no bounce at center
- [ ] Spring friction: 4 (slightly firm)

#### State Management
- [ ] NO backend request sent
- [ ] Card remains in stack at same position
- [ ] Index unchanged
- [ ] No analytics event fired

#### Edge Cases
- [ ] Works correctly at 49% swipe (just below threshold)
- [ ] Works if user reverses direction mid-swipe
- [ ] Works if user swipes vertically then releases
- [ ] No animation conflicts if user immediately swipes again

**Acceptance**: Natural spring-back feel, no "stuck" cards

---

### Test #4: Threshold Testing

**Given**: User swipes card to various distances
**When**: User releases at different swipe percentages
**Then**:

#### Threshold Behavior
- [ ] **At 49% screen width**: Card springs back to center
- [ ] **At 50% screen width**: Card completes swipe (boundary case)
- [ ] **At 51% screen width**: Card completes swipe
- [ ] **At 75% screen width**: Card completes swipe (well past threshold)

#### Threshold Calculation
```typescript
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;
const shouldComplete = Math.abs(gesture.dx) > SWIPE_THRESHOLD;
```

#### Consistency Requirements
- [ ] Threshold identical for left and right swipes
- [ ] Threshold consistent across all devices
- [ ] No floating-point precision errors at boundary
- [ ] Threshold feels natural to users (not too easy, not too hard)

**Acceptance**: Threshold is precise, predictable, and user-friendly

---

## Animation & Performance

### Test #5: Smooth 60fps Animation

**Given**: User performs swipes at various speeds
**When**: Performance monitor is active
**Then**:

#### Frame Rate Requirements
- [ ] **JS Thread**: 59-60 FPS during active swipe
- [ ] **UI Thread**: 59-60 FPS during active swipe
- [ ] **JS Thread**: 60 FPS during spring-back animation
- [ ] **UI Thread**: 60 FPS during off-screen animation
- [ ] No frame drops >16ms (1 frame)

#### Animation Quality
- [ ] Rotation interpolation smooth (no stuttering)
- [ ] Opacity changes smooth (no flickering)
- [ ] Position updates smooth (no jank)
- [ ] Native driver enabled for all transform animations

#### Speed Variations
- [ ] **Slow swipe** (2 sec duration): Smooth, no frame drops
- [ ] **Medium swipe** (0.5 sec): Smooth, no frame drops
- [ ] **Fast swipe** (0.2 sec): Smooth, no frame drops

#### Performance Monitoring
```typescript
// All animations use native driver
Animated.spring(position, {
  toValue: { x: targetX, y: gesture.dy },
  useNativeDriver: true, // ✅ Required
});
```

**Acceptance**: Silky smooth animations, no visible performance issues

---

### Test #6: Rapid Consecutive Swipes

**Given**: User wants to quickly browse profiles
**When**: User swipes 5 cards in rapid succession (<3 seconds total)
**Then**:

#### Animation Sequencing
- [ ] Each card completes animation before next starts
- [ ] No animation queue backlog
- [ ] No visual conflicts between cards
- [ ] Stack z-index maintained correctly

#### Performance Under Load
- [ ] No frame rate degradation
- [ ] No memory spikes
- [ ] No animation lag after 5th swipe
- [ ] Bridge traffic remains low

#### Data Integrity
- [ ] All 5 swipes registered in backend
- [ ] Swipes recorded in correct chronological order
- [ ] No duplicate swipes
- [ ] No missed swipes

#### UX Consistency
- [ ] Each swipe feels identical to previous
- [ ] Spring animations don't "speed up" or "slow down"
- [ ] Indicators appear/disappear consistently

**Acceptance**: User can swipe rapidly without issues, all swipes register

---

### Test #7: Card Stack Visual Hierarchy

**Given**: Discovery screen loaded with 3+ profiles
**When**: User views the card stack
**Then**:

#### Card 0 (Top Card)
- [ ] Scale: 1.0 (full size)
- [ ] Opacity: 1.0 (fully visible)
- [ ] zIndex: 100
- [ ] Position: (0, 0) - centered
- [ ] Shadows visible
- [ ] All text fully readable

#### Card 1 (Second Card)
- [ ] Scale: 0.95 (5% smaller)
- [ ] Opacity: 0.8 (20% transparent)
- [ ] zIndex: 99
- [ ] Visible behind top card
- [ ] Slight depth perception

#### Card 2 (Third Card)
- [ ] Scale: 0.90 (10% smaller)
- [ ] Opacity: 0.6 (40% transparent)
- [ ] zIndex: 98
- [ ] Barely visible behind card 1
- [ ] Creates depth effect

#### Visual Depth Calculation
```typescript
const scale = 1 - index * 0.05;
const opacity = 1 - index * 0.2;
const zIndex = 100 - index;
```

#### Stack Behavior
- [ ] Maximum 3 cards rendered (performance optimization)
- [ ] Cards beyond index 2 not rendered (culled)
- [ ] Stack updates correctly as cards are swiped

**Acceptance**: Clear visual hierarchy, professional depth effect

---

## Match Modal

### Test #8: Match Modal Appearance

**Given**: User A and User B have mutually swiped right
**When**: Second user completes their right swipe
**Then**:

#### Modal Appearance Animation
- [ ] Modal fades in from opacity 0 to 1
- [ ] Fade duration: ~300ms
- [ ] Modal appears within 500ms of swipe completion
- [ ] Gradient background visible immediately

#### Gradient Background
- [ ] Start color: #E91E63 (pink) at top-left
- [ ] End color: #9C27B0 (purple) at bottom-right
- [ ] Gradient angle: 45 degrees diagonal
- [ ] Covers full screen as overlay

#### Heart Icon Animation
```typescript
// Sequence: 0 → 1.2 → 1.0
1. Initial: scale 0, invisible
2. After 200ms delay: spring to scale 1.2 (bounce)
3. Then: spring to scale 1.0 (settle)
```
- [ ] Heart icon white color (#fff)
- [ ] Heart size: 100px
- [ ] Bounce effect feels celebratory

#### Content Display
- [ ] Title: "It's a Match!" in large bold text
- [ ] Subtitle: "You and your match are compatible!"
- [ ] Compatibility score badge:
  - Background: #4CAF50 (green)
  - Text: "{score}% Compatible"
  - Font size: 36px for number
  - Rounded badge with padding
- [ ] Match ID displayed (for support)
- [ ] Creation date displayed

#### Action Buttons
- [ ] "Send Message" button:
  - Background: #E91E63 (pink)
  - White text with message icon
  - Prominent position (primary action)
- [ ] "Keep Swiping" button:
  - Transparent background
  - Pink border and text
  - Secondary visual hierarchy

**Acceptance**: Modal feels celebratory, all info visible, buttons clear

---

### Test #9: Match Modal - Send Message

**Given**: Match modal is visible
**When**: User taps "Send Message" button
**Then**:

#### Navigation
- [ ] Modal closes immediately (no delay)
- [ ] Navigation transition to Messages screen
- [ ] Transition duration: <300ms
- [ ] Smooth animation (slide or fade)

#### Messages Screen State
- [ ] New conversation appears at top of list
- [ ] Matched user's profile photo visible
- [ ] Matched user's name visible
- [ ] "New Match" badge or indicator shown
- [ ] Message input field active and focused
- [ ] Keyboard appears automatically

#### Backend State
- [ ] Conversation record created in database
- [ ] Match status updated to "messaged"
- [ ] Timestamp recorded for first message opportunity
- [ ] Analytics event: "match_messaged"

**Acceptance**: Seamless transition, user ready to send first message

---

### Test #10: Match Modal - Keep Swiping

**Given**: Match modal is visible
**When**: User taps "Keep Swiping" button
**Then**:

#### Modal Dismissal
- [ ] Modal fades out (300ms duration)
- [ ] Fade to opacity 0
- [ ] Modal removed from DOM after animation
- [ ] No modal flicker or jank

#### Discovery Screen State
- [ ] Discovery screen still active
- [ ] Next card (card 1) now in position 0
- [ ] Previous matched card removed from stack
- [ ] Card count decremented
- [ ] User can immediately swipe next card

#### Backend State
- [ ] Match record remains in database
- [ ] Match visible in Messages tab later
- [ ] No conversation created yet
- [ ] Analytics event: "match_deferred"

#### UX Continuity
- [ ] No interruption to discovery flow
- [ ] Next card visible within 100ms
- [ ] Smooth return to swiping

**Acceptance**: User can continue discovery without friction

---

## Child Safety Compliance

### Test #11: Profile Data Display - No Child PII

**Given**: User viewing profile cards
**When**: Profile is displayed on screen
**Then**:

#### ✅ Allowed Child Data (Aggregate Only)
- [ ] `childrenCount` displayed as number (e.g., "2 children")
- [ ] `childrenAgeGroups` displayed as comma-separated list
  - Example: "Toddler (1-3), School-age (6-12)"
  - Age ranges only, no specific ages
- [ ] Child data shown in "Family Info" section

#### ❌ Prohibited Child Data (ZERO TOLERANCE)
- [ ] NO child names visible anywhere
- [ ] NO child photos visible anywhere
- [ ] NO child birthdates or specific ages
- [ ] NO child gender information
- [ ] NO child school names
- [ ] NO child medical information
- [ ] NO identifying child information of any kind

#### ✅ Allowed Parent Data
- [ ] Parent's first name
- [ ] Parent's age
- [ ] Parent's profile photo
- [ ] Parent's bio/description
- [ ] Parent's location (city/state only)
- [ ] Parent's interests and preferences

#### Code-Level Enforcement
```typescript
// ProfileCard component MUST NOT access:
profile.children // ❌ Undefined
profile.childrenNames // ❌ Undefined
profile.childrenPhotos // ❌ Undefined
profile.childrenBirthdates // ❌ Undefined

// ProfileCard component CAN access:
profile.childrenCount // ✅ Number
profile.childrenAgeGroups // ✅ Array<string>
```

**Acceptance**: ZERO child PII visible, only aggregate family data shown

---

### Test #12: Network Request - No Child PII in Payload

**Given**: App fetching discovery profiles
**When**: Network request to `/api/discovery/profiles` occurs
**Then**:

#### Request Validation
- [ ] Request URL: `GET /api/discovery/profiles?limit=10&cursor={cursor}`
- [ ] No child PII in request parameters
- [ ] Authorization header present and valid

#### Response Schema Validation
```json
{
  "profiles": [
    {
      "userId": "uuid",
      "firstName": "string",
      "age": "number",
      "profilePhoto": "url",
      "bio": "string",
      "location": "string",
      "childrenCount": 2, // ✅ Allowed
      "childrenAgeGroups": ["Toddler (1-3)", "School-age (6-12)"], // ✅ Allowed
      // ❌ NO children array
      // ❌ NO childrenNames field
      // ❌ NO childrenPhotos field
      // ❌ NO childrenBirthdates field
    }
  ],
  "nextCursor": "string|null",
  "hasMore": "boolean"
}
```

#### Prohibited Fields
- [ ] Response does NOT contain `children` array
- [ ] Response does NOT contain `childrenNames`
- [ ] Response does NOT contain `childrenPhotos`
- [ ] Response does NOT contain `childrenBirthdates`
- [ ] Response does NOT contain ANY child PII

#### Validation Tools
- [ ] Chrome DevTools Network tab inspection
- [ ] React Native Debugger network inspection
- [ ] Postman/Insomnia API testing
- [ ] Automated schema validation tests

#### Compliance Documentation
- [ ] Screenshot of API response with NO child PII
- [ ] JSON response logged and verified
- [ ] Schema validation passed
- [ ] Security audit signed off

**Acceptance**: API responses contain ZERO child PII, schema validated

---

## Edge Cases & Error Handling

### Test #13: Empty Card Stack

**Given**: User has swiped through all available profiles
**When**: No more profiles remain in stack
**Then**:

#### UI State
- [ ] Empty state message displayed:
  - Title: "No More Profiles"
  - Subtitle: "Check back later for new matches!"
- [ ] Refresh/reload button visible
- [ ] Optional: Filters adjustment suggestion
- [ ] No blank screen or infinite loading

#### User Actions
- [ ] Tap refresh button → re-fetch profiles
- [ ] Navigate to other tabs (Messages, Profile)
- [ ] Pull-to-refresh gesture works
- [ ] No crash or frozen state

#### Backend Behavior
- [ ] API returns empty array: `{ profiles: [], hasMore: false }`
- [ ] Cursor handling graceful
- [ ] No 404 errors

**Acceptance**: Clear empty state, user knows what to do next

---

### Test #14: Network Offline - Swipe Actions

**Given**: User is offline (no WiFi, no cellular)
**When**: User attempts to swipe a card
**Then**:

#### Local Behavior
- [ ] Swipe animation completes locally (optimistic UI)
- [ ] Card removed from local stack
- [ ] Next card becomes visible
- [ ] No app freeze or crash

#### Error Notification
- [ ] Toast/snackbar appears within 2 seconds
- [ ] Message: "No internet connection. Swipe will retry when online."
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Error icon shown

#### Retry Logic
- [ ] Swipe queued in local storage
- [ ] Automatic retry when connection restored
- [ ] Retry attempt every 30 seconds
- [ ] Max retry attempts: 5
- [ ] Failed swipes logged for debugging

#### User Recovery
- [ ] User can continue swiping cached cards
- [ ] App doesn't block user actions
- [ ] Clear indication of offline state

**Acceptance**: Graceful offline handling, swipes queued for retry

---

### Test #15: API Error Response - 500 Error

**Given**: Backend returns 500 Internal Server Error
**When**: User performs action requiring API call
**Then**:

#### Error Detection
- [ ] 500 error caught by error handler
- [ ] Error logged to monitoring service (Sentry, etc.)
- [ ] User-friendly error message shown

#### Error Message
- [ ] Title: "Something went wrong"
- [ ] Message: "We're working on it. Please try again."
- [ ] Avoid technical jargon (no "500 error")
- [ ] Retry button visible

#### State Preservation
- [ ] Previous card state maintained
- [ ] User position in stack preserved
- [ ] No data loss
- [ ] App remains functional

#### Retry Mechanism
- [ ] Tap retry button → re-attempt request
- [ ] Exponential backoff if retries fail
- [ ] Max 3 automatic retries
- [ ] Clear feedback on each retry

**Acceptance**: User informed of error, can retry, no data loss

---

### Test #16: Missing Profile Photo

**Given**: Profile has no photo (`profilePhoto: null`)
**When**: Card is displayed
**Then**:

#### Placeholder Display
- [ ] Gray background box shown
  - Color: #E0E0E0 or similar neutral
  - Size: matches photo dimensions
- [ ] Text: "No Photo" centered
  - Font size: 16px
  - Color: #666666
- [ ] No broken image icon
- [ ] No empty white space

#### Card Functionality
- [ ] Card still fully swipeable
- [ ] All other profile data visible
- [ ] Name, age, bio displayed normally
- [ ] Like/Nope indicators work

#### Visual Polish
- [ ] Placeholder matches app design system
- [ ] Consistent with other placeholder states
- [ ] Professional appearance

**Acceptance**: Missing photos handled gracefully, no visual bugs

---

## Performance Benchmarks

### Test #17: API Response Time

**Given**: App making API requests to `/api/discovery/profiles`
**When**: Multiple requests measured over time
**Then**:

#### Performance Targets
- [ ] **P50 (Median)**: < 50ms
- [ ] **P95**: < 100ms (warm cache)
- [ ] **P99**: < 200ms
- [ ] **First Load (Cold)**: < 500ms

#### Test Methodology
- [ ] 100+ requests measured
- [ ] Warm cache (after first load)
- [ ] Production-like network conditions
- [ ] Mix of different cursor positions

#### Measurement Tools
- [ ] Backend performance tests
- [ ] React Query devtools
- [ ] Chrome DevTools timing
- [ ] New Relic or similar APM

#### Conditions
- [ ] WiFi: Targets as listed above
- [ ] 4G: Targets +100ms acceptable
- [ ] 3G: Targets +200ms acceptable

**Acceptance**: P95 < 100ms on WiFi with warm cache

---

### Test #18: Profile Load Time

**Given**: User opens app to Discovery Screen
**When**: Measuring time from launch to first card visible
**Then**:

#### Load Time Targets
- [ ] **WiFi**: < 2 seconds
- [ ] **4G**: < 2.5 seconds
- [ ] **3G**: < 3 seconds

#### Loading States
- [ ] Loading spinner shows within 100ms
- [ ] Skeleton screens optional but recommended
- [ ] Progressive loading (show cards as they arrive)
- [ ] No blank screens

#### Measurement
- [ ] Start: app launch or navigation to Discovery
- [ ] End: first card fully rendered and visible
- [ ] 10+ measurements averaged
- [ ] Real device testing (not simulator)

**Acceptance**: < 2 sec on WiFi, loading indicators visible

---

### Test #19: Memory Usage - Continuous Swiping

**Given**: User swipes through 50+ profiles
**When**: Memory usage monitored throughout
**Then**:

#### Memory Targets
- [ ] **Peak Memory**: < 150MB on mobile
- [ ] **Average Memory**: < 100MB
- [ ] **Memory Growth**: < 1MB per 10 swipes
- [ ] **No Memory Leaks**: Stable memory graph

#### Image Memory Management
- [ ] Images released after card dismissed
- [ ] Maximum 3-5 images in memory
- [ ] Image caching efficient (react-native-fast-image)
- [ ] No orphaned image references

#### Monitoring Tools
- [ ] Xcode Instruments (iOS)
- [ ] Android Profiler (Android)
- [ ] Memory graph over 5+ minute session
- [ ] Leak detection tools

**Acceptance**: Stable memory, no leaks, < 150MB peak

---

## User Experience

### Test #20: Visual Indicators Clarity

**Given**: User swiping cards
**When**: Observing like/nope indicators
**Then**:

#### Like Indicator (Right Swipe)
- [ ] Appears at >25% right swipe
- [ ] Position: top-left of card
- [ ] Icon: Green heart (#4CAF50)
- [ ] Size: 60px
- [ ] Rotation: -15° for visual interest
- [ ] Checkmark badge below heart
- [ ] White border around badge
- [ ] Opacity increases smoothly (0 to 1)

#### Nope Indicator (Left Swipe)
- [ ] Appears at >25% left swipe
- [ ] Position: top-right of card
- [ ] Icon: Red X (#F44336)
- [ ] Size: 60px
- [ ] Rotation: +15° for visual interest
- [ ] Close badge below X
- [ ] White border around badge
- [ ] Opacity increases smoothly (0 to 1)

#### Opacity Interpolation
```typescript
const likeOpacity = position.x.interpolate({
  inputRange: [0, SWIPE_THRESHOLD / 2],
  outputRange: [0, 1],
  extrapolate: 'clamp',
});
```

**Acceptance**: Indicators clear, appear at right time, visually distinct

---

### Test #21: Gesture Conflicts

**Given**: Multiple cards in stack
**When**: User attempts to interact with cards
**Then**:

#### Touch Handling
- [ ] Only top card (index 0) responds to touch
- [ ] Cards underneath completely ignore touch
- [ ] No accidental swipes on background cards
- [ ] PanResponder condition:
  ```typescript
  onStartShouldSetPanResponder: () => index === 0
  ```

#### Multi-Touch
- [ ] No multi-touch conflicts
- [ ] Two-finger gestures don't cause issues
- [ ] Pinch-to-zoom disabled on cards
- [ ] Clean gesture isolation

**Acceptance**: Only top card swipeable, no gesture conflicts

---

### Test #22: Screen Rotation

**Given**: User rotates device during use
**When**: Screen orientation changes
**Then**:

#### Landscape Mode (If Supported)
- [ ] Layout adjusts to landscape
- [ ] Cards remain centered
- [ ] All UI elements accessible
- [ ] No content cutoff

#### Portrait Mode
- [ ] Default layout restored
- [ ] Cards properly sized
- [ ] Standard UI visible

#### During Swipe
- [ ] Active swipe completes or cancels gracefully
- [ ] No visual glitches
- [ ] Card state preserved

#### Rotation Lock (If Enforced)
- [ ] App locked to portrait
- [ ] Mark test as N/A
- [ ] No rotation issues possible

**Acceptance**: Rotation handled gracefully or locked appropriately

---

## Data Integrity

### Test #23: Duplicate Prevention

**Given**: User attempts to swipe same profile twice
**When**: Backend receives duplicate swipe request
**Then**:

#### Backend Validation
- [ ] Database unique constraint: `(user_id, target_user_id)`
- [ ] Duplicate INSERT rejected
- [ ] 409 Conflict status returned
- [ ] Error message: "You already swiped on this user"

#### Frontend Handling
- [ ] Error toast displayed
- [ ] Card not removed from stack (if visible)
- [ ] User informed clearly
- [ ] No crash

#### Cache Behavior
- [ ] Client-side cache prevents re-showing swiped users
- [ ] Cache synced with backend
- [ ] Cache cleared appropriately on logout

**Acceptance**: Duplicates prevented, user informed if attempted

---

### Test #24: Swipe History Tracking

**Given**: User swipes multiple profiles
**When**: Database inspected after swipes
**Then**:

#### Database Records
- [ ] Each swipe creates exactly 1 record
- [ ] Table: `swipes`
- [ ] Fields populated:
  ```sql
  id: UUID (primary key)
  user_id: UUID (foreign key to users)
  target_user_id: UUID (foreign key to users)
  direction: ENUM('left', 'right')
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  ```

#### Data Accuracy
- [ ] `user_id` matches logged-in user
- [ ] `target_user_id` matches swiped profile
- [ ] `direction` matches swipe direction
- [ ] `created_at` timestamps in order
- [ ] No missing swipes
- [ ] No duplicate swipes

#### Audit Trail
- [ ] All swipes logged
- [ ] Timestamps accurate
- [ ] Queryable for analytics

**Acceptance**: 100% swipe tracking accuracy, all fields correct

---

### Test #25: Match Creation Logic

**Given**: Two users mutually swipe right
**When**: Second user completes their right swipe
**Then**:

#### Match Record Creation
- [ ] New record in `matches` table
- [ ] Fields:
  ```sql
  id: UUID
  user1_id: UUID (alphabetically first)
  user2_id: UUID (alphabetically second)
  compatibility_score: INTEGER (0-100)
  created_at: TIMESTAMP
  ```

#### Notifications
- [ ] Both users receive Socket.io notification
- [ ] Notification type: "new_match"
- [ ] Payload includes match ID and compatibility score
- [ ] Delivered within 1 second

#### Compatibility Score
- [ ] Score calculated by matching algorithm
- [ ] Score stored in match record
- [ ] Score displayed in match modal
- [ ] Score > 0 and <= 100

#### UI Updates
- [ ] Match modal appears for second swiper
- [ ] Match visible in Messages tab for both users
- [ ] Match count increments

**Acceptance**: Matches created correctly, both users notified immediately

---

## Developer Tools

### Test #26: React Native Performance Monitor

**Given**: Developer tools enabled
**When**: Performance monitor displayed during swipes
**Then**:

#### Metrics Displayed
- [ ] JS FPS: 60 (green) during active swipe
- [ ] UI FPS: 60 (green) during active swipe
- [ ] RAM: Stable, < 150MB
- [ ] Views: Count stable
- [ ] Bridge traffic: Minimal (< 10 messages/sec)

#### No Performance Warnings
- [ ] No red FPS indicators
- [ ] No yellow warnings
- [ ] Bridge not saturated

**Acceptance**: All metrics green, 60 FPS maintained

---

### Test #27: Redux DevTools (If Applicable)

**Given**: Redux DevTools connected
**When**: User performs swipe actions
**Then**:

#### Actions Dispatched
- [ ] `SWIPE_START` on touch down
- [ ] `SWIPE_MOVE` during drag (optional, may be throttled)
- [ ] `SWIPE_COMPLETE` on release
  - Payload: `{ direction: 'left'|'right', profileId: 'uuid' }`
- [ ] `PROFILES_UPDATE` removes swiped profile from stack
- [ ] `MATCH_CREATED` if mutual match (optional)

#### State Updates
- [ ] State changes predictable
- [ ] No unnecessary re-renders
- [ ] State transitions clean

**Acceptance**: Clean action flow, state updates logical

---

### Test #28: Logcat/Console Monitoring

**Given**: Developer console open
**When**: User performs discovery actions
**Then**:

#### Console Output
- [ ] No error logs (red)
- [ ] Info logs show swipe events:
  - Example: `[Discovery] Swipe right on profile abc123`
- [ ] Network requests logged:
  - Example: `[API] GET /api/discovery/profiles - 200 OK (45ms)`
- [ ] Performance metrics logged (optional)

#### No Warnings
- [ ] No React warnings
- [ ] No deprecation warnings
- [ ] No uncaught promise rejections

#### Log Levels
- [ ] Production: Error + Info only
- [ ] Development: Debug + Verbose enabled

**Acceptance**: Clean logs, no errors, useful info for debugging

---

## Production Deployment Criteria

### Must Pass (Blockers)
All tests marked **CRITICAL** must pass:
- Test #1, #2 (Basic swipes)
- Test #8, #9, #25 (Match functionality)
- Test #11, #12 (Child safety - ZERO TOLERANCE)
- Test #23 (Duplicate prevention)

### Should Pass (High Priority)
All tests marked **HIGH** should pass:
- Tests #3-7 (Core UX)
- Test #10, #14, #17, #18, #20, #24 (Performance and reliability)

### Nice to Have
All tests marked **MEDIUM** or **LOW** improve quality but not blockers.

### Overall Pass Rate
- **Target**: ≥ 95% pass rate
- **Minimum**: ≥ 90% pass rate for production

---

**End of Acceptance Criteria Document**
