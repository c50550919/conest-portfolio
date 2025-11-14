# Archived Swipe Infrastructure - October 17, 2025

## Reason for Archival
Swipe-based matching functionality was replaced with professional browse-based discovery to better align with SafeNest's identity as a **housing/roommate platform** rather than a dating app.

## Archived Files
- `SwipeService.ts` - Service handling swipe logic and match creation (4KB, Oct 8 2025)
- `Swipe.ts` - Swipe database model

## Related Files Still Active
- `src/migrations/20250101000006_create_swipes_table.ts` - Migration (kept for database history)
- Database table `swipes` - Preserved with existing data for audit trail

## Replacement
Swipe functionality replaced by:
- **Browse-based Discovery**: Grid/list view in BrowseDiscoveryScreen.tsx (mobile)
- **Deliberate Connection Requests**: POST /api/connections/request endpoint
- **No Swipe Gestures**: Users tap cards to view full profiles, then send connection requests

## Backend Endpoint Status
- ✅ `POST /api/discovery/swipe` - **DEPRECATED** with 410 Gone response
- ✅ Alternative endpoint: `POST /api/connections/request`
- ✅ Migration path documented in response

## Mobile App Status
- ✅ `react-native-deck-swiper` dependency removed from package.json
- ✅ All swipe UI components archived to `mobile/src/_archive/swipe-ui-deprecated-2025-10-13/`
- ✅ Browse-based grid interface is production-ready

## Can These Be Safely Deleted?
**Not Recommended** - Keep for audit trail and potential data migration:
1. Database contains existing swipe history
2. May need to reference for analytics or user behavior analysis
3. Migration might be needed to convert swipes to connection requests

**Recommended Retention**: 6 months minimum, then can be deleted after:
- ✅ All clients updated to v2.0+ (no swipe endpoint calls)
- ✅ Data migration complete (if needed)
- ✅ No analytics reports referencing swipe data

## Database Table Strategy
The `swipes` table is **NOT** being dropped:
- Preserves user interaction history for analytics
- May be useful for understanding user behavior patterns
- Can inform future feature development
- Low storage cost (<1MB for typical usage)

**Future Cleanup** (Optional):
```sql
-- Mark table as deprecated (don't delete)
COMMENT ON TABLE swipes IS 'DEPRECATED 2025-10-13: Replaced by connection_requests table';
```

## Related Documentation
- Mobile: `/mobile/SWIPE_REMOVAL_COMPLETE.md`
- Migration guide: See endpoint 410 response for details

## Archival Date
October 17, 2025

## Archived By
Claude Code cleanup operation - Complete swipe infrastructure deprecation
