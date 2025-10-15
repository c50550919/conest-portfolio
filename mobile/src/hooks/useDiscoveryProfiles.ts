/**
 * Discovery Profiles Hooks
 *
 * Purpose: React Query hooks for Browse Discovery Screen data fetching
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Hooks:
 * - useDiscoveryProfiles: Infinite query for profile cards with cursor pagination
 * - useReportScreenshot: Mutation for screenshot detection
 *
 * Note: Browse-based discovery (no swipe gestures)
 * Created: 2025-10-06
 * Updated: 2025-10-13 - Removed swipe functionality
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import discoveryAPI, {
  DiscoveryResponse,
  ProfileCard,
} from '../services/api/discoveryAPI';

/**
 * Discovery Profiles Query Hook
 *
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - 5 minute stale time for performance
 * - Automatic background refetch
 * - Error handling with retry logic
 *
 * @param limit - Number of profiles per page (default: 10)
 * @returns Query result with profiles, loading state, and fetch functions
 */
export function useDiscoveryProfiles(limit: number = 10) {
  return useInfiniteQuery<DiscoveryResponse, Error>({
    queryKey: ['discovery', 'profiles', limit],
    queryFn: async ({ pageParam }) => {
      console.log('[useDiscoveryProfiles] Fetching profiles, cursor:', pageParam || 'initial');
      try {
        const result = await discoveryAPI.getProfiles(pageParam as string | undefined, limit);
        console.log('[useDiscoveryProfiles] Success:', result.profiles.length, 'profiles, nextCursor:', result.nextCursor);
        return result;
      } catch (error: any) {
        console.error('[useDiscoveryProfiles] Error:', error.message, error.response?.data);
        throw error;
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Mobile apps don't need window focus refetch
    retry: 2,
  });
}

// REMOVED: useRecordSwipe() - Browse-based discovery uses deliberate connection requests, not swipes
// See: BrowseDiscoveryScreen.tsx for connection request handling

/**
 * Report Screenshot Mutation Hook
 *
 * Features:
 * - Logs screenshot event to backend
 * - Notifies profile owner via Socket.io
 * - No cache invalidation needed
 *
 * @returns Mutation function and state
 */
export function useReportScreenshot() {
  return useMutation<
    { success: boolean; message: string },
    Error,
    { targetUserId: string }
  >({
    mutationFn: ({ targetUserId }) => discoveryAPI.reportScreenshot(targetUserId),

    onSuccess: () => {
      // Screenshot logged successfully
      // You might want to show a toast notification to the user
    },

    onError: (error) => {
      console.error('Failed to report screenshot:', error);
      // Silently fail - screenshot detection is a best-effort feature
    },
  });
}

/**
 * Get all flattened profiles from infinite query
 * @param data - Infinite query data
 * @returns Flattened array of profiles
 */
export function getFlattenedProfiles(
  data: { pages: DiscoveryResponse[] } | undefined
): ProfileCard[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.profiles);
}

/**
 * Check if there are more profiles to load
 * @param data - Infinite query data
 * @returns True if there are more pages
 */
export function hasMoreProfiles(
  data: { pages: DiscoveryResponse[] } | undefined
): boolean {
  if (!data || data.pages.length === 0) return false;
  const lastPage = data.pages[data.pages.length - 1];
  return lastPage.nextCursor !== null;
}
