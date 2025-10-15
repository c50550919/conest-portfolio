# Archived Swipe UI Components - October 13, 2025

## Reason for Archival
These components implemented a swipe-based dating-app-style interface for the Discovery feature. This UI pattern was replaced with a more professional browse-based interface to better align with the platform's identity as a **housing/roommate platform** rather than a dating app.

## Archived Files
- `DiscoverScreen.tsx` - Original swipe-based discovery screen with card stack
- `DiscoverScreen.mock.tsx` - Mock version for development
- `SwipeableCard.tsx` - Swipeable card component with gesture handling

## Replacement
These files have been replaced by:
- `BrowseDiscoveryScreen.tsx` - Grid/list-based browse interface
- `ProfileGridCard.tsx` - Static profile cards for grid view
- `ProfileCard.tsx` - Detailed profile cards

## Backend API Status
The backend `/api/discovery/swipe` endpoint is **still active** and may be used by the browse UI for "Express Interest" functionality. The swipe metaphor is abstracted away from users but the underlying connection request mechanism remains.

## Can These Be Safely Deleted?
**Yes**, after verifying:
1. ✅ BrowseDiscoveryScreen is working correctly
2. ✅ No other components import these files
3. ✅ Navigation is updated to use BrowseDiscoveryScreen

These files are kept in archive temporarily (30 days) in case rollback is needed.

## Related Hooks Still in Use
The following hooks from `useDiscoveryProfiles.ts` are **still used** by the browse UI:
- `useDiscoveryProfiles()` - Fetches profiles (used by both old and new UI)
- `useRecordSwipe()` - May be renamed to `useExpressInterest()` in the future

## Migration Date
October 13, 2025

## Verified By
Claude Code cleanup operation
