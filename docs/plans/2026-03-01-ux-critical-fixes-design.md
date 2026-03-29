# UX Critical + High Priority Fixes

**Date:** 2026-03-01
**Status:** Approved
**Branch:** 005-slim-onboarding-housing

## Problem

Multiple UX issues across the mobile app hurt user experience and retention. These affect both demo and regular usage — they're code-level frontend issues, not demo-specific.

## Fixes (10 items, priority order)

### Fix 1: Remove children count from ALL UI

**Why:** FHA compliance + user request. Children data is collected by backend for matching algorithm scoring only. Should never be displayed to other users.

**Files:**
- `mobile/src/components/discovery/ProfileGridCard.tsx` — Remove children text line (~line 178-184)
- `mobile/src/components/discovery/ProfileDetailsModal.tsx` — Remove "Children" section (~line 397-409)
- `mobile/src/components/discovery/ProfileCard.tsx` — Remove "Children" section (~line 153-163)
- `mobile/src/components/common/ParentCard.tsx` — Remove children row (~line 73-79)
- `mobile/src/components/discovery/ComparisonModal.tsx` — Remove children attribute (~line 107-110)

**Keep:** `ExtendedProfileCard` type fields and `discoveryAdapter.ts` mapping — backend still uses these for scoring.

### Fix 2: Add splash/loading screen

**Why:** App shows blank black screen while checking auth state. Users think app is broken.

**Files:**
- `mobile/src/navigation/AppNavigator.tsx` — Replace `return null` with LoadingScreen (~line 177)
- `mobile/src/components/common/LoadingScreen.tsx` — New component: SafeAreaView + logo + ActivityIndicator

### Fix 3: Add error boundaries

**Why:** Any component crash kills the entire app with no recovery.

**Files:**
- `mobile/src/components/common/ErrorBoundary.tsx` — New: Class component with `componentDidCatch`, shows "Something went wrong" + Retry button
- `mobile/src/navigation/AppNavigator.tsx` — Wrap root navigator with ErrorBoundary
- `mobile/src/navigation/MainNavigator.tsx` — Wrap tab navigator with ErrorBoundary

### Fix 4: Fix verification lock UX

**Why:** Users can't tell why messaging is locked. No explanation, no CTA to get verified.

**Files:**
- `mobile/src/screens/messaging/ChatScreen.tsx` — Add locked banner with "Complete verification to message" + "Get Verified" button when `isConversationLocked`
- `mobile/src/screens/messaging/ConversationsListScreen.tsx` — Verify locked state shows lock icon + explanation

### Fix 5: Add tab bar badges

**Why:** Users have no visual cue about unread messages or pending connection requests without opening each tab.

**Files:**
- `mobile/src/navigation/MainNavigator.tsx` — Add `tabBarBadge` to Messages (unread count) and Home (pending requests count)
- Need Redux selector or hook to provide counts from existing slices

### Fix 6: Fix household empty state

**Why:** "Find Roommates" button has no `onPress` handler — users can't take action.

**Files:**
- `mobile/src/screens/main/HouseholdScreen.tsx` — Add onPress navigation to Discover tab (~line 167-181)

### Fix 7: Home stats error handling

**Why:** When API calls fail, stats show 0 — users miss notifications thinking everything is quiet.

**Files:**
- `mobile/src/screens/main/HomeScreen.tsx` — Show "—" or error indicator when fetch fails instead of 0. Add pull-to-refresh.

### Fix 8: Disable chat input when locked

**Why:** Users try to type in locked conversations — nothing happens, confusion.

**Files:**
- `mobile/src/screens/messaging/ChatScreen.tsx` — Disable TextInput + show overlay when `isConversationLocked`

### Fix 9: Onboarding progress bar

**Why:** 9 onboarding screens with no progress indicator — users abandon thinking it's endless.

**Files:**
- `mobile/src/components/onboarding/ProgressBar.tsx` — New: Simple "Step X of N" progress bar
- Each onboarding screen — Add ProgressBar to header with current step number

### Fix 10: Network error handling

**Why:** API failures show one-time Alert that disappears. No retry mechanism.

**Files:**
- `mobile/src/components/common/ErrorState.tsx` — New: Reusable "Something went wrong" + Retry button component
- Apply to HomeScreen, DiscoveryScreen, ConnectionRequestsScreen error states

## Success Criteria

- Children count not visible anywhere in the app
- App shows branded loading screen on launch
- Component crashes show error boundary, not blank screen
- Locked messaging shows clear "Get Verified" CTA
- Tab badges show unread messages and pending requests
- Household empty state has working navigation
- Home stats show error indicator when API fails
- Chat input disabled when conversation is locked
- Onboarding shows progress bar
- Error states have retry buttons

## Scope

- Frontend only — no backend changes
- Affects both demo and regular usage
- Branch: 005-slim-onboarding-housing
