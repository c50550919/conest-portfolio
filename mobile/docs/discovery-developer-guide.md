# Discovery Screen Developer Guide

## Overview

Comprehensive guide for developers working on the Discovery Screen feature - a swipeable profile browsing experience with real-time matching notifications.

**Technology Stack**:
- React Native + TypeScript
- React Query (@tanstack/react-query) for data fetching
- React Native Reanimated for 60fps animations
- React Native Gesture Handler for swipe gestures
- Socket.io-client for real-time events
- Expo ScreenCapture for screenshot detection

**Key Features**:
- Swipeable card stack with gesture controls
- Infinite scroll with cursor pagination
- Real-time match notifications
- Screenshot detection and reporting
- Optimistic UI updates
- Child safety compliance (NO child PII)

---

## Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│     DiscoverScreen.tsx              │  ← Screen orchestration
│  (React Query + Socket.io + State)  │
├─────────────────────────────────────┤
│     UI Components Layer             │
│  • SwipeableCard (gestures)         │
│  • ProfileCard (display)            │
│  • MatchModal (celebration)         │
├─────────────────────────────────────┤
│     Hooks Layer                     │
│  • useDiscoveryProfiles (data)      │
│  • useRecordSwipe (mutation)        │
│  • useMatchNotifications (events)   │
│  • useSocketConnection (WebSocket)  │
├─────────────────────────────────────┤
│     Services Layer                  │
│  • discoveryAPI.ts (HTTP client)    │
│  • socket.ts (Socket.io client)     │
└─────────────────────────────────────┘
```

### Data Flow

**Profile Fetching**:
```
DiscoverScreen
  → useDiscoveryProfiles()
    → React Query useInfiniteQuery()
      → discoveryAPI.getProfiles()
        → Backend API /discovery/profiles
          → PostgreSQL + Redis cache
```

**Swipe Action**:
```
User swipes right/left
  → SwipeableCard.onSwipe()
    → DiscoverScreen.handleSwipe()
      → useRecordSwipe.mutate()
        → Optimistic update (remove card)
          → discoveryAPI.recordSwipe()
            → Backend API /discovery/swipe
              → If match: Socket.io event emitted
                → useMatchNotifications receives event
                  → MatchModal displayed
```

**Real-Time Match**:
```
Backend creates mutual match
  → Socket.io emits "match_created"
    → socketService.onMatchCreated()
      → useMatchNotifications.handleMatchCreated()
        → setCurrentMatch() + setIsMatchModalVisible(true)
          → MatchModal appears with animation
```

---

## File Structure

```
mobile/src/
├── screens/main/
│   └── DiscoverScreen.tsx           # Main screen orchestration
├── components/discovery/
│   ├── ProfileCard.tsx              # Profile display (child safety compliant)
│   ├── SwipeableCard.tsx            # Gesture-based swipeable wrapper
│   └── MatchModal.tsx               # Match celebration modal
├── hooks/
│   ├── useDiscoveryProfiles.ts      # React Query infinite scroll
│   ├── useMatchNotifications.ts     # Socket.io match events
│   └── useSocketConnection.ts       # WebSocket connection management
├── services/
│   ├── api/
│   │   └── discoveryAPI.ts          # HTTP API client
│   └── socket.ts                    # Socket.io client singleton
└── types/
    └── discovery.ts                 # TypeScript interfaces
```

---

## Core Components

### 1. DiscoverScreen.tsx

**Purpose**: Main screen orchestrating all Discovery Screen functionality

**Key Responsibilities**:
- Manage current card index state
- Fetch profiles with React Query infinite scroll
- Handle swipe gestures and mutations
- Listen for real-time match notifications
- Detect screenshots and report them
- Render card stack with proper z-index layering
- Display loading, error, and empty states

**State Management**:
```typescript
const [currentIndex, setCurrentIndex] = useState(0);

// React Query - Data fetching
const { data, fetchNextPage, hasNextPage, isFetching } = useDiscoveryProfiles(10);

// React Query - Mutations
const { mutate: recordSwipe } = useRecordSwipe();
const { mutate: reportScreenshot } = useReportScreenshot();

// Socket.io - Real-time events
const { isConnected } = useSocketConnection();
const { currentMatch, isMatchModalVisible, closeMatchModal } = useMatchNotifications();
```

**Profile Flattening**:
```typescript
// Helper: Flatten infinite query pages into single array
const profiles = getFlattenedProfiles(data);
// profiles = [profile1, profile2, profile3, ...]
```

**Prefetching Logic**:
```typescript
// Prefetch next page when 3 cards remaining
useEffect(() => {
  if (profiles.length - currentIndex <= 3 && hasMore && !isFetching) {
    fetchNextPage();
  }
}, [currentIndex, profiles.length, hasMore, isFetching, fetchNextPage]);
```

**Card Stack Rendering**:
```typescript
// Show current + next 2 cards (reversed for z-index)
const visibleCards = profiles
  .slice(currentIndex, currentIndex + 3)
  .reverse();

// Render with correct z-index stacking
{visibleCards.map((profile, stackIndex) => {
  const isTopCard = stackIndex === visibleCards.length - 1;
  return (
    <SwipeableCard
      key={profile.userId}
      profile={profile}
      onSwipe={isTopCard ? handleSwipe : () => {}}
      index={stackIndex}
    />
  );
})}
```

**Screenshot Detection** (Child Safety):
```typescript
useEffect(() => {
  const subscription = ScreenCapture.addScreenshotListener(() => {
    const currentProfile = profiles[currentIndex];
    if (currentProfile) {
      Alert.alert(
        'Screenshot Detected',
        'Screenshots are discouraged to protect privacy. The profile owner has been notified.'
      );
      reportScreenshot({ targetUserId: currentProfile.userId });
    }
  });
  return () => subscription.remove();
}, [currentIndex, profiles, reportScreenshot]);
```

**Empty States**:
```typescript
// Loading state
if (isLoading) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#E91E63" />
      <Text style={styles.loadingText}>Finding compatible roommates...</Text>
    </View>
  );
}

// Error state
if (isError) {
  return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="alert-circle" size={64} color="#F44336" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <TouchableOpacity onPress={() => window.location.reload()}>
        <Text>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// No more profiles
if (profiles.length === 0 || currentIndex >= profiles.length) {
  return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="account-search" size={80} color="#999" />
      <Text style={styles.emptyTitle}>No More Profiles</Text>
      <Text style={styles.emptySubtitle}>
        Check back soon for new matches!
      </Text>
    </View>
  );
}
```

---

### 2. SwipeableCard.tsx

**Purpose**: Gesture-based swipeable card wrapper with 60fps animations

**Key Technologies**:
- React Native Reanimated (worklet-based animations)
- React Native Gesture Handler (PanGestureHandler)
- Shared values for animation state
- Interpolation for rotation effects

**Animation Architecture**:
```typescript
// Shared values (run on UI thread)
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);

// Gesture handler (runs on UI thread via worklet)
const gestureHandler = useAnimatedGestureHandler({
  onStart: (event, ctx: any) => {
    ctx.startX = translateX.value;
    ctx.startY = translateY.value;
  },

  onActive: (event, ctx: any) => {
    // Update position during drag
    translateX.value = ctx.startX + event.translationX;
    translateY.value = ctx.startY + event.translationY;
  },

  onEnd: (event) => {
    const absX = Math.abs(translateX.value);

    if (absX > SWIPE_THRESHOLD) {
      // Swipe detected - animate off screen
      const direction = translateX.value > 0 ? 'right' : 'left';
      const targetX = translateX.value > 0 ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

      translateX.value = withSpring(
        targetX,
        { velocity: event.velocityX },
        (finished) => {
          if (finished) runOnJS(handleSwipeComplete)(direction);
        }
      );
    } else {
      // Snap back to center
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  },
});
```

**Rotation Interpolation**:
```typescript
const animatedCardStyle = useAnimatedStyle(() => {
  // Rotate card based on horizontal position
  const rotate = interpolate(
    translateX.value,
    [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    [-30, 0, 30],  // degrees
    Extrapolate.CLAMP
  );

  return {
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate}deg` },
    ],
  };
});
```

**Overlay Labels**:
```typescript
const likeOpacity = useAnimatedStyle(() => ({
  opacity: interpolate(
    translateX.value,
    [0, SCREEN_WIDTH / 2],
    [0, 1],
    Extrapolate.CLAMP
  ),
}));

const passOpacity = useAnimatedStyle(() => ({
  opacity: interpolate(
    translateX.value,
    [-SCREEN_WIDTH / 2, 0],
    [1, 0],
    Extrapolate.CLAMP
  ),
}));
```

**Performance Tips**:
- Use `useAnimatedStyle()` for styles that change during animation
- Use `runOnJS()` to call JavaScript functions from worklets
- Keep worklets pure (no closures over JS variables)
- Use `withSpring()` for natural physics-based animations

---

### 3. ProfileCard.tsx

**Purpose**: Display profile information with **strict child safety compliance**

**Child Safety Compliance** (Constitution Principle I):
```typescript
// ✅ ALLOWED: Only non-identifying child data
<View style={styles.section}>
  <Text style={styles.sectionText}>
    {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
  </Text>
  <Text style={styles.sectionSubtext}>
    Age groups: {childrenAgeGroups.join(', ')}
  </Text>
</View>

// ❌ PROHIBITED: Never display child PII
// - NO child names
// - NO child photos
// - NO exact ages (e.g., "5 years old")
// - NO schools/daycares
// - ONLY generic age groups: "toddler", "elementary", "teen"
```

**Compatibility Score Display**:
```typescript
const getCompatibilityColor = (score: number) => {
  if (score >= 80) return '#4CAF50';  // Green - Excellent match
  if (score >= 60) return '#FF9800';  // Orange - Good match
  return '#F44336';                    // Red - Poor match
};

<View style={[
  styles.compatibilityBadge,
  { backgroundColor: getCompatibilityColor(compatibilityScore) }
]}>
  <Text style={styles.compatibilityText}>{compatibilityScore}%</Text>
</View>
```

**Verification Badges**:
```typescript
const VerificationBadges = ({ verificationStatus }: { verificationStatus: VerificationStatus }) => (
  <View style={styles.badges}>
    {verificationStatus.idVerified && (
      <View style={styles.badge}>
        <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />
        <Text style={styles.badgeText}>ID Verified</Text>
      </View>
    )}
    {verificationStatus.backgroundCheckComplete && (
      <View style={styles.badge}>
        <MaterialCommunityIcons name="shield-check" size={16} color="#2196F3" />
        <Text style={styles.badgeText}>Background Check</Text>
      </View>
    )}
  </View>
);
```

---

### 4. MatchModal.tsx

**Purpose**: Celebration modal displayed on mutual match

**Animation Strategy**:
```typescript
const scale = useSharedValue(0);
const heartScale = useSharedValue(0);

useEffect(() => {
  if (visible) {
    // Modal entrance - spring animation
    scale.value = withSpring(1, { damping: 15 });

    // Heart bounce - sequence animation
    heartScale.value = withSequence(
      withDelay(200, withSpring(1.2, { damping: 8 })),  // Overshoot
      withSpring(1, { damping: 10 })                     // Settle
    );
  } else {
    scale.value = 0;
    heartScale.value = 0;
  }
}, [visible]);
```

**Gradient Background**:
```typescript
<LinearGradient
  colors={['#E91E63', '#9C27B0']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={StyleSheet.absoluteFillObject}
/>
```

**Action Buttons**:
```typescript
<TouchableOpacity
  style={[styles.button, styles.messageButton]}
  onPress={onSendMessage}
>
  <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
  <Text style={styles.buttonText}>Send Message</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[styles.button, styles.continueButton]}
  onPress={onClose}
>
  <Text style={styles.continueButtonText}>Keep Swiping</Text>
</TouchableOpacity>
```

---

## Hooks Architecture

### useDiscoveryProfiles.ts

**Purpose**: React Query infinite scroll for profile fetching

**Key Features**:
- Cursor-based pagination
- Automatic cache management
- Prefetching support
- Stale-while-revalidate strategy

**Implementation**:
```typescript
export function useDiscoveryProfiles(limit: number = 10) {
  return useInfiniteQuery<DiscoveryResponse, Error>({
    queryKey: ['discovery', 'profiles', limit],

    // Fetch function with cursor support
    queryFn: ({ pageParam }) =>
      discoveryAPI.getProfiles(pageParam as string | undefined, limit),

    // Pagination setup
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    // Cache configuration
    staleTime: 5 * 60 * 1000,    // 5 minutes (data stays fresh)
    gcTime: 10 * 60 * 1000,       // 10 minutes (garbage collection)

    // Behavior
    refetchOnWindowFocus: false,  // Don't refetch on app resume
    retry: 2,                      // Retry failed requests twice
  });
}
```

**Helper Functions**:
```typescript
// Flatten paginated data into single array
export function getFlattenedProfiles(
  data: InfiniteData<DiscoveryResponse> | undefined
): ProfileCard[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.profiles);
}

// Check if more pages available
export function hasMoreProfiles(
  data: InfiniteData<DiscoveryResponse> | undefined
): boolean {
  if (!data) return false;
  const lastPage = data.pages[data.pages.length - 1];
  return lastPage?.hasMore ?? false;
}
```

**Usage Pattern**:
```typescript
const {
  data,              // InfiniteData<DiscoveryResponse>
  fetchNextPage,     // () => Promise<void>
  hasNextPage,       // boolean
  isFetching,        // boolean (any network activity)
  isLoading,         // boolean (initial load only)
  isError,           // boolean
  error,             // Error | null
} = useDiscoveryProfiles(10);

const profiles = getFlattenedProfiles(data);
const hasMore = hasMoreProfiles(data);
```

---

### useRecordSwipe.ts

**Purpose**: Mutation hook for swipe actions with optimistic updates

**Optimistic Update Strategy**:
```typescript
export function useRecordSwipe() {
  const queryClient = useQueryClient();

  return useMutation<
    SwipeResult,
    Error,
    { targetUserId: string; direction: 'left' | 'right' }
  >({
    mutationFn: ({ targetUserId, direction }) =>
      discoveryAPI.recordSwipe(targetUserId, direction),

    // 1. Optimistic update: Remove card immediately
    onMutate: async ({ targetUserId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['discovery', 'profiles'] });

      // Snapshot current data for rollback
      const previousData = queryClient.getQueryData(['discovery', 'profiles']);

      // Optimistically update cache
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

    // 2. Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['discovery', 'profiles'],
          context.previousData
        );
      }
    },

    // 3. Invalidate on success
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'profiles'] });

      if (data.matchCreated) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });
}
```

**Why Optimistic Updates?**:
- **Instant UI feedback**: Card removed immediately, no waiting
- **Better UX**: Users can swipe rapidly without lag
- **Error resilience**: Automatic rollback if API fails
- **Network efficiency**: UI updates don't block on network

---

### useMatchNotifications.ts

**Purpose**: Socket.io event integration for real-time match notifications

**State Management**:
```typescript
export function useMatchNotifications() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [isMatchModalVisible, setIsMatchModalVisible] = useState(false);

  const handleMatchCreated = useCallback((data: MatchCreatedEvent) => {
    setCurrentMatch({
      matchId: data.matchId,
      matchedUserId: data.matchedUserId,
      compatibilityScore: data.compatibilityScore,
      createdAt: data.createdAt,
    });
    setIsMatchModalVisible(true);
  }, []);

  useEffect(() => {
    // Subscribe to match events
    socketService.onMatchCreated(handleMatchCreated);

    // Cleanup on unmount
    return () => {
      socketService.offMatchCreated(handleMatchCreated);
    };
  }, [handleMatchCreated]);

  const closeMatchModal = useCallback(() => {
    setIsMatchModalVisible(false);
    setCurrentMatch(null);
  }, []);

  return {
    currentMatch,
    isMatchModalVisible,
    closeMatchModal,
  };
}
```

**Socket.io Lifecycle**:
```typescript
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect on mount
    socketService.connect().then(() => {
      setIsConnected(socketService.isConnected());
    });

    // Listen for connection events
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);

    // Disconnect on unmount
    return () => {
      socketService.offConnect(handleConnect);
      socketService.offDisconnect(handleDisconnect);
      socketService.disconnect();
    };
  }, []);

  return { isConnected };
}
```

---

## Services Layer

### discoveryAPI.ts

**Purpose**: Type-safe HTTP client for Discovery API endpoints

**API Client Setup**:
```typescript
class DiscoveryAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add JWT token to all requests
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors (token expired)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          navigationRef.navigate('Login');
        }
        return Promise.reject(error);
      }
    );
  }

  async getProfiles(cursor?: string, limit: number = 10): Promise<DiscoveryResponse> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await this.client.get<DiscoveryResponse>(
      '/discovery/profiles',
      { params }
    );
    return response.data;
  }

  async recordSwipe(targetUserId: string, direction: 'left' | 'right'): Promise<SwipeResult> {
    const response = await this.client.post<SwipeResult>('/discovery/swipe', {
      targetUserId,
      direction,
    });
    return response.data;
  }

  async reportScreenshot(targetUserId: string): Promise<ScreenshotResponse> {
    const response = await this.client.post<ScreenshotResponse>(
      '/discovery/screenshot',
      { targetUserId }
    );
    return response.data;
  }
}

export const discoveryAPI = new DiscoveryAPI();
```

---

### socket.ts

**Purpose**: Socket.io client singleton for WebSocket communication

**Connection Management**:
```typescript
class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token available');
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },              // JWT authentication
      transports: ['websocket'],    // WebSocket only (no polling)
      reconnection: true,           // Auto-reconnect
      reconnectionAttempts: 5,      // Max 5 retries
      reconnectionDelay: 1000,      // 1s between retries
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket?.on('connect', () => {
      console.log('Socket.io connected');
    });

    this.socket?.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });

    this.socket?.on('error', (error) => {
      console.error('Socket.io error:', error);
    });
  }

  // Event subscription methods
  onMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this.socket?.on('match_created', callback);
  }

  offMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this.socket?.off('match_created', callback);
  }

  onScreenshotDetected(callback: SocketEventCallback<ScreenshotDetectedEvent>): void {
    this.socket?.on('screenshot_detected', callback);
  }

  offScreenshotDetected(callback: SocketEventCallback<ScreenshotDetectedEvent>): void {
    this.socket?.off('screenshot_detected', callback);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
```

---

## Performance Optimization

### 60fps Animation Guidelines

**✅ DO**:
- Use `useAnimatedStyle()` for animated styles
- Run animations on UI thread (worklets)
- Use `withSpring()` / `withTiming()` for smooth transitions
- Keep worklets pure (no JS dependencies)
- Use `runOnJS()` to call JS functions from worklets

**❌ DON'T**:
- Use `Animated` API (legacy, runs on JS thread)
- Update state during animation
- Perform heavy calculations in gesture handlers
- Use arrow functions in `useAnimatedStyle()` (create closures)

### React Query Optimization

**Caching Strategy**:
```typescript
staleTime: 5 * 60 * 1000,    // Data fresh for 5 minutes
gcTime: 10 * 60 * 1000,       // Cache persists for 10 minutes
refetchOnWindowFocus: false,  // Don't refetch on app resume
```

**Prefetching**:
```typescript
// Prefetch when 3 cards remaining
if (profiles.length - currentIndex <= 3 && hasMore && !isFetching) {
  fetchNextPage();
}
```

**Optimistic Updates**:
```typescript
// Immediate UI update, rollback on error
onMutate: async ({ targetUserId }) => {
  const previousData = queryClient.getQueryData(['discovery', 'profiles']);
  queryClient.setQueryData(['discovery', 'profiles'], (old) => {
    // Remove swiped profile immediately
  });
  return { previousData };
},
```

### Bundle Size Optimization

**Code Splitting**:
- Lazy load MatchModal (not needed until match occurs)
- Use dynamic imports for heavy libraries
- Tree-shake unused icon sets

**Image Optimization**:
- Use optimized image formats (WebP)
- Implement progressive loading
- Cache profile photos with React Query

---

## Testing Strategy

### Unit Tests

**Component Tests** (`__tests__/components/`):
```typescript
describe('ProfileCard', () => {
  it('should display ONLY childrenCount and childrenAgeGroups (child safety)', () => {
    const profile = {
      userId: 'user1',
      firstName: 'Sarah',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'elementary'],
    };

    const { getByText, queryByText } = render(<ProfileCard profile={profile} />);

    // Should display allowed data
    expect(getByText('2 children')).toBeTruthy();
    expect(getByText('Age groups: toddler, elementary')).toBeTruthy();

    // Should NOT display child PII
    expect(queryByText(/Emma|Sophia|exact age/)).toBeNull();
  });
});
```

**Hook Tests** (`__tests__/hooks/`):
```typescript
describe('useDiscoveryProfiles', () => {
  it('should fetch profiles with pagination', async () => {
    const { result, waitFor } = renderHook(() => useDiscoveryProfiles(10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const profiles = getFlattenedProfiles(result.current.data);
    expect(profiles.length).toBeGreaterThan(0);
    expect(result.current.hasNextPage).toBe(true);
  });
});
```

### Integration Tests

**E2E Tests** (`e2e/discovery.e2e.test.ts`):
```typescript
describe('Discovery Screen E2E', () => {
  it('should swipe right and receive match notification', async () => {
    await element(by.id('discovery-screen')).tap();

    // Swipe right on profile
    await element(by.id('swipeable-card-0')).swipe('right');

    // Wait for match modal
    await waitFor(element(by.id('match-modal')))
      .toBeVisible()
      .withTimeout(2000);

    // Verify match details
    await expect(element(by.id('match-score'))).toHaveText('87%');
  });

  it('should detect screenshot and show alert', async () => {
    await device.takeScreenshot('profile-screenshot');

    // Verify alert shown
    await expect(element(by.text('Screenshot Detected'))).toBeVisible();
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue**: Cards not swiping smoothly
- **Cause**: Animations running on JS thread instead of UI thread
- **Fix**: Ensure `useAnimatedGestureHandler` and `useAnimatedStyle` are used correctly

**Issue**: Profiles not loading
- **Cause**: JWT token expired or missing
- **Fix**: Check AsyncStorage for valid token, implement token refresh logic

**Issue**: Match modal not appearing
- **Cause**: Socket.io connection lost or event listener not set up
- **Fix**: Verify `useSocketConnection` shows `isConnected: true`, check event subscription

**Issue**: Screenshot detection not working
- **Cause**: Expo ScreenCapture permission not granted
- **Fix**: Request permission in app.json: `"ios": { "NSPhotoLibraryUsageDescription": "..." }`

**Issue**: Optimistic update causing flicker
- **Cause**: Cache invalidation triggering before optimistic update completes
- **Fix**: Use `cancelQueries()` before optimistic update to prevent race conditions

---

## Best Practices

### Child Safety Compliance

**CRITICAL RULES**:
1. **NEVER** display child names, photos, exact ages, or schools
2. **ONLY** display `childrenCount` (integer) and `childrenAgeGroups` (array)
3. **ALWAYS** use generic age ranges: `toddler`, `elementary`, `teen`
4. **VALIDATE** all profile data against child safety schema
5. **TEST** child safety compliance with 100% coverage

### Performance

1. **Use worklets** for all animations (60fps requirement)
2. **Prefetch data** when 3 cards remaining (seamless UX)
3. **Implement optimistic updates** for instant feedback
4. **Cache aggressively** with React Query (5min stale time)
5. **Monitor bundle size** - lazy load heavy components

### State Management

1. **React Query** for server state (profiles, matches)
2. **useState** for local UI state (current index, modals)
3. **Socket.io hooks** for real-time events (matches)
4. **AsyncStorage** for persistence (auth token)

### Error Handling

1. **Always handle** network errors with user-friendly messages
2. **Implement rollback** for optimistic updates (onError)
3. **Auto-reconnect** Socket.io with exponential backoff
4. **Log errors** to analytics for monitoring

---

## Future Enhancements

- [ ] Undo last swipe (premium feature)
- [ ] Filter profiles by distance, budget, preferences
- [ ] Boost profile visibility (premium)
- [ ] Video profile introductions
- [ ] AI-powered compatibility insights
- [ ] Push notifications for matches (APNs/FCM)
- [ ] Offline mode with cached profiles

---

## Resources

**Documentation**:
- [React Query Docs](https://tanstack.com/query/latest)
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Gesture Handler Docs](https://docs.swmansion.com/react-native-gesture-handler/)
- [Socket.io Client Docs](https://socket.io/docs/v4/client-api/)

**Code References**:
- `/mobile/src/screens/main/DiscoverScreen.tsx`
- `/mobile/src/hooks/useDiscoveryProfiles.ts`
- `/backend/docs/api-discovery.md`
- `/backend/tests/compliance/child-safety.compliance.test.ts`

**Support**:
- Mobile Issues: `/mobile/docs/TROUBLESHOOTING.md`
- Backend Issues: `/backend/docs/TROUBLESHOOTING.md`
- Architecture Questions: Team Slack #mobile-dev
