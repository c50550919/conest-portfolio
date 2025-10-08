/**
 * Discovery Profiles Hooks
 *
 * Purpose: React Query hooks for Discovery Screen data fetching and mutations
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Hooks:
 * - useDiscoveryProfiles: Infinite query for profile cards with cursor pagination
 * - useRecordSwipe: Mutation for swipe actions with optimistic updates
 * - useReportScreenshot: Mutation for screenshot detection
 *
 * Created: 2025-10-06
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import discoveryAPI, {
  DiscoveryResponse,
  ProfileCard,
  SwipeResult,
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
    queryFn: ({ pageParam }) =>
      discoveryAPI.getProfiles(pageParam as string | undefined, limit),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Mobile apps don't need window focus refetch
    retry: 2,
  });
}

/**
 * Record Swipe Mutation Hook
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation on success
 * - Error rollback on failure
 * - Match notification handling
 *
 * @returns Mutation function and state
 */
export function useRecordSwipe() {
  const queryClient = useQueryClient();

  return useMutation<
    SwipeResult,
    Error,
    { targetUserId: string; direction: 'left' | 'right' }
  >({
    mutationFn: ({ targetUserId, direction }) =>
      discoveryAPI.recordSwipe(targetUserId, direction),

    // Optimistic update: Remove swiped profile from cache immediately
    onMutate: async ({ targetUserId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['discovery', 'profiles'] });

      // Snapshot current data for rollback
      const previousData = queryClient.getQueryData(['discovery', 'profiles']);

      // Optimistically remove the swiped profile
      queryClient.setQueryData<any>(['discovery', 'profiles'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: DiscoveryResponse) => ({
            ...page,
            profiles: page.profiles.filter(
              (profile: ProfileCard) => profile.userId !== targetUserId
            ),
          })),
        };
      });

      return { previousData };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['discovery', 'profiles'], context.previousData);
      }
    },

    // Invalidate and refetch on success
    onSuccess: (data, variables) => {
      // If match was created, you might want to show a modal
      if (data.matchCreated && data.match) {
        // Dispatch event or update global state for match modal
        // This will be handled by the component or Redux
      }

      // Invalidate profiles query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['discovery', 'profiles'] });

      // Also invalidate matches list if match was created
      if (data.matchCreated) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });
}

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
