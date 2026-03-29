# Fix Discovery Screen + Demo Recording

**Date:** 2026-03-01
**Status:** Approved
**Branch:** 005-slim-onboarding-housing

## Problem

The discovery screen shows "No profiles found" despite the backend returning profiles correctly. This blocks the demo recording of two moms (Sarah & Maria) matching on the platform.

## Root Cause

Four bugs identified, two critical:

1. **discoveryAPI uses a private axios client** (`discoveryAPI.ts:63-126`) — separate from the shared `apiClient` that handles JWT token refresh. When the access token expires or isn't ready, discovery silently fails with a 401 and shows empty state.
2. **discoveryAPI clears all tokens on 401** (`discoveryAPI.ts:116-122`) — instead of refreshing, it wipes credentials and forces logout.
3. **No re-fetch on filter/sort change** (`BrowseDiscoveryScreen.tsx:172-177`) — `useEffect` depends only on `[dispatch]`, not on `filters` or `sortBy`. Changing filters clears profiles but never re-fetches.
4. **Inconsistent base URL strategy** — discoveryAPI uses `process.env.REACT_APP_API_URL` (CRA convention, unavailable in React Native) while the main apiClient uses `getApiBaseUrl()`.

## Solution

### Fix 1: discoveryAPI uses shared apiClient

Replace the private axios instance in `discoveryAPI.ts` with the shared `apiClient` from `config/api.ts`. Remove the constructor, `setupInterceptors()`, and the independent axios import. Adjust endpoint paths from `/discovery/profiles` to `/api/discovery/profiles` (shared client base URL is `http://localhost:3000`).

### Fix 2: useEffect re-fetches on filter/sort change

Add a `useEffect` in `BrowseDiscoveryScreen.tsx` that calls `fetchProfiles(true)` when `filters` or `sortBy` changes.

### Fix 3: Update Detox test

Update `demo-matching-flow.e2e.ts` to use correct selectors (`"Maria, 35"` card text), scroll to `interested-button`, and dismiss alerts between tab navigations.

### Fix 4: Rebuild and record

Rebuild the iOS debug app, run the Detox test with `xcrun simctl io booted recordVideo` to capture a clean mp4.

## Files Changed

| File | Change |
|------|--------|
| `mobile/src/services/api/discoveryAPI.ts` | Replace private axios with shared apiClient |
| `mobile/src/screens/main/BrowseDiscoveryScreen.tsx` | Add useEffect for filter/sort re-fetch |
| `mobile/e2e/demo-matching-flow.e2e.ts` | Fix selectors, add alert dismissals |

## Success Criteria

- Discovery screen shows Maria's profile after login
- "I'm Interested" button is tappable in profile modal
- All 11 Detox test steps pass
- Screen recording captures the full two-moms matching story
