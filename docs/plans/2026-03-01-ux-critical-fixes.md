# UX Critical Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 UX issues across the CoNest mobile app that hurt user experience and retention.

**Architecture:** Frontend-only changes to React Native components. Remove FHA-violating children data from UI, add loading/error states, fix broken navigation, and add progress indicators. No backend changes needed.

**Tech Stack:** React Native 0.74.5, TypeScript, React Navigation, Redux Toolkit, react-native-vector-icons/MaterialCommunityIcons

**Scope Note:** Fixes 4 (verification lock UX) and 8 (disable chat input when locked) from the design doc are ALREADY IMPLEMENTED in `ChatScreen.tsx` (lines 344-424) and `ConversationsListScreen.tsx` (lines 231-261). Verified — no work needed.

---

### Task 1: Remove children count from ProfileGridCard

**Files:**
- Modify: `mobile/src/components/discovery/ProfileGridCard.tsx:177-184`

**Step 1: Remove children info block**

Delete lines 177-184 (the `{/* Children Info */}` block):

```tsx
// DELETE this entire block:
        {/* Children Info (NO PII - counts and age groups only) */}
        <View style={styles.childrenRow}>
          <MaterialCommunityIcons name="account-group" size={12} color="#95A5A6" />
          <Text style={styles.childrenText} numberOfLines={1}>
            {childrenCount} {childrenCount === 1 ? 'child' : 'children'} (
            {formatAgeGroups(childrenAgeGroups)})
          </Text>
        </View>
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ProfileGridCard" || echo "No errors"`
Expected: No errors (childrenCount/childrenAgeGroups are still in props, just unused in render)

**Step 3: Commit**

```bash
git add mobile/src/components/discovery/ProfileGridCard.tsx
git commit -m "fix(discovery): remove children count from ProfileGridCard (FHA compliance)"
```

---

### Task 2: Remove children count from ProfileDetailsModal

**Files:**
- Modify: `mobile/src/components/discovery/ProfileDetailsModal.tsx:396-409`

**Step 1: Remove children section**

Delete lines 396-409 (the `{/* Children Info - NO PII */}` block):

```tsx
// DELETE this entire block:
            {/* Children Info - NO PII */}
            {renderSection(
              'human-male-child',
              'Children',
              <>
                <Text testID="children-count" style={styles.detailText}>
                  {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
                </Text>
                <Text testID="children-age-groups" style={styles.detailSubtext}>
                  Age groups: {formattedAgeGroups}
                </Text>
              </>,
              'children-section',
            )}
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ProfileDetailsModal" || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add mobile/src/components/discovery/ProfileDetailsModal.tsx
git commit -m "fix(discovery): remove children count from ProfileDetailsModal (FHA compliance)"
```

---

### Task 3: Remove children count from ProfileCard

**Files:**
- Modify: `mobile/src/components/discovery/ProfileCard.tsx:153-163`

**Step 1: Remove children section**

Delete lines 153-163 (the `{/* Children Info */}` section):

```tsx
// DELETE this entire block:
        {/* Children Info - ONLY count and age groups (NO PII) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="human-male-child" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Children</Text>
          </View>
          <Text style={styles.sectionText}>
            {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
          </Text>
          <Text style={styles.sectionSubtext}>Age groups: {formattedAgeGroups}</Text>
        </View>
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ProfileCard" || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add mobile/src/components/discovery/ProfileCard.tsx
git commit -m "fix(discovery): remove children count from ProfileCard (FHA compliance)"
```

---

### Task 4: Remove children count from ParentCard

**Files:**
- Modify: `mobile/src/components/common/ParentCard.tsx:73-79`

**Step 1: Remove children row**

Delete lines 73-79 (the `{/* Children count */}` block):

```tsx
// DELETE this entire block:
          {/* Children count - NO specific details */}
          <View style={styles.childrenRow}>
            <Icon name="account-child" size={16} color={colors.text.secondary} />
            <Text style={styles.childrenText}>
              {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
            </Text>
          </View>
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ParentCard" || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add mobile/src/components/common/ParentCard.tsx
git commit -m "fix(common): remove children count from ParentCard (FHA compliance)"
```

---

### Task 5: Remove children count from ComparisonModal

**Files:**
- Modify: `mobile/src/components/discovery/ComparisonModal.tsx:104-110`

**Step 1: Remove children attribute**

Delete lines 104-110 (the Children attribute block):

```tsx
// DELETE this entire block:
                    <View style={styles.attribute}>
                      <Text style={styles.attributeLabel}>Children</Text>
                      <Text style={styles.attributeValue}>
                        {profile.childrenCount} child(ren)
                      </Text>
                    </View>
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ComparisonModal" || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add mobile/src/components/discovery/ComparisonModal.tsx
git commit -m "fix(discovery): remove children count from ComparisonModal (FHA compliance)"
```

---

### Task 6: Add splash/loading screen

**Files:**
- Create: `mobile/src/components/common/LoadingScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx:176-178`

**Step 1: Create LoadingScreen component**

```tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../theme';

const { colors } = theme;

const LoadingScreen: React.FC = () => (
  <SafeAreaView style={styles.container} testID="loading-screen">
    <View style={styles.content}>
      <Text style={styles.logo}>CoNest</Text>
      <Text style={styles.tagline}>Safe Housing for Single Parents</Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
        testID="loading-indicator"
      />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});

export default LoadingScreen;
```

**Step 2: Wire LoadingScreen into AppNavigator**

In `mobile/src/navigation/AppNavigator.tsx`, replace `return null;` (line 177) with:

```tsx
// Before:
  if (isLoading) {
    return null; // TODO: Replace with proper SplashScreen component
  }

// After:
  if (isLoading) {
    return <LoadingScreen />;
  }
```

Add the import at the top:
```tsx
import LoadingScreen from '../components/common/LoadingScreen';
```

**Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "LoadingScreen\|AppNavigator" || echo "No errors"`
Expected: No errors

**Step 4: Commit**

```bash
git add mobile/src/components/common/LoadingScreen.tsx mobile/src/navigation/AppNavigator.tsx
git commit -m "feat(navigation): add branded loading screen for auth check"
```

---

### Task 7: Add error boundaries

**Files:**
- Create: `mobile/src/components/common/ErrorBoundary.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/navigation/MainNavigator.tsx`

**Step 1: Create ErrorBoundary component**

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

const { colors } = theme;

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container} testID="error-boundary">
          <View style={styles.content}>
            <Icon name="alert-circle-outline" size={64} color={colors.error || '#E74C3C'} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              testID="error-boundary-retry"
            >
              <Icon name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
```

**Step 2: Wrap AppNavigator root with ErrorBoundary**

In `mobile/src/navigation/AppNavigator.tsx`, wrap the outermost `<NavigationContainer>` return:

```tsx
// Add import:
import ErrorBoundary from '../components/common/ErrorBoundary';

// In the return, wrap NavigationContainer:
  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        ...
      >
        ...
      </NavigationContainer>
    </ErrorBoundary>
  );
```

**Step 3: Wrap MainNavigator tab content with ErrorBoundary**

In `mobile/src/navigation/MainNavigator.tsx`, wrap the `<Tab.Navigator>`:

```tsx
// Add import:
import ErrorBoundary from '../components/common/ErrorBoundary';

// In the return, wrap Tab.Navigator:
  return (
    <ErrorBoundary fallbackMessage="A screen crashed. Tap retry to recover.">
      <Tab.Navigator ...>
        ...
      </Tab.Navigator>
    </ErrorBoundary>
  );
```

**Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ErrorBoundary\|AppNavigator\|MainNavigator" || echo "No errors"`
Expected: No errors

**Step 5: Commit**

```bash
git add mobile/src/components/common/ErrorBoundary.tsx mobile/src/navigation/AppNavigator.tsx mobile/src/navigation/MainNavigator.tsx
git commit -m "feat(navigation): add error boundaries to prevent full-app crashes"
```

---

### Task 8: Add tab bar badges (Messages + Home)

**Files:**
- Modify: `mobile/src/navigation/MainNavigator.tsx:105-123`

**Step 1: Add badge hook and imports**

At the top of `MainNavigator.tsx`, add:

```tsx
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
```

Inside the `MainNavigator` component, before the return, add:

```tsx
  // Get unread counts for tab badges
  const unreadMessages = useSelector((state: RootState) => {
    const conversations = state.messaging?.conversations || [];
    return conversations.reduce(
      (total: number, conv: any) => total + (conv.unreadCount || 0),
      0,
    );
  });

  const pendingRequests = useSelector((state: RootState) => {
    const requests = state.connections?.receivedRequests || [];
    return requests.filter((r: any) => r.status === 'pending').length;
  });
```

**Step 2: Update Messages tab badge**

Replace the Messages tab options (line 108-113):

```tsx
// Before:
          tabBarIcon: ({ color, size }) => <Icon name="message-text" size={size} color={color} />,
          tabBarBadge: undefined, // Will be dynamic based on unread count

// After:
          tabBarIcon: ({ color, size }) => <Icon name="message-text" size={size} color={color} />,
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E74C3C', fontSize: 10 },
```

**Step 3: Add Home tab badge for pending requests**

Find the Home tab `<Tab.Screen>` options and add:

```tsx
          tabBarBadge: pendingRequests > 0 ? pendingRequests : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E74C3C', fontSize: 10 },
```

**Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "MainNavigator" || echo "No errors"`
Expected: No errors

**Step 5: Commit**

```bash
git add mobile/src/navigation/MainNavigator.tsx
git commit -m "feat(navigation): add tab bar badges for unread messages and pending requests"
```

---

### Task 9: Fix household empty state button

**Files:**
- Modify: `mobile/src/screens/main/HouseholdScreen.tsx:175`

**Step 1: Add onPress handler to Find Roommates button**

Add navigation import if not already present, then add `onPress`:

```tsx
// Before:
          <TouchableOpacity style={styles.primaryButton} testID="find-roommates-button">
            <Text style={styles.primaryButtonText}>Find Roommates</Text>
          </TouchableOpacity>

// After:
          <TouchableOpacity
            style={styles.primaryButton}
            testID="find-roommates-button"
            onPress={() => navigation.navigate('Discover' as never)}
          >
            <Text style={styles.primaryButtonText}>Find Roommates</Text>
          </TouchableOpacity>
```

Verify `navigation` is available — check if `useNavigation` is imported and called. If not, add:

```tsx
import { useNavigation } from '@react-navigation/native';
// Inside the component:
const navigation = useNavigation();
```

**Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "HouseholdScreen" || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add mobile/src/screens/main/HouseholdScreen.tsx
git commit -m "fix(household): add onPress to Find Roommates button in empty state"
```

---

### Task 10: Home stats error handling + pull-to-refresh

**Files:**
- Modify: `mobile/src/screens/main/HomeScreen.tsx:118-151`

**Step 1: Add error tracking state**

After the existing state declarations (around line 116), add:

```tsx
const [statsError, setStatsError] = useState(false);
```

**Step 2: Update fetchDashboardStats to track errors**

Replace the `fetchDashboardStats` function (lines 119-151):

```tsx
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(false);

    let pendingConnections = 0;
    let unreadMessages = 0;
    const avgCompatibility = 0;
    let hasError = false;

    try {
      const connectionStats = await connectionRequestsAPI.getStatistics();
      pendingConnections = connectionStats.received?.pending ?? 0;
    } catch (err) {
      console.log('[HomeScreen] Could not fetch connection stats:', err);
      hasError = true;
    }

    try {
      const response = await enhancedMessagesAPI.getConversations();
      const conversations = response.data || [];
      unreadMessages = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
    } catch (err) {
      console.log('[HomeScreen] Could not fetch messages:', err);
      hasError = true;
    }

    setStats({
      pendingConnections,
      unreadMessages,
      avgCompatibility,
    });
    setStatsError(hasError);
    setIsLoadingStats(false);
  }, []);
```

**Step 3: Update stats display to show error indicator**

Find where `stats.pendingConnections` and `stats.unreadMessages` are rendered. When `statsError` is true AND the value is 0, show "—" instead:

```tsx
// Replace stat value display pattern:
// Before:
<Text style={styles.statValue}>{stats.pendingConnections}</Text>

// After:
<Text style={styles.statValue}>
  {statsError && stats.pendingConnections === 0 ? '—' : stats.pendingConnections}
</Text>
```

Apply same pattern for `stats.unreadMessages`.

**Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "HomeScreen" || echo "No errors"`
Expected: No errors

**Step 5: Commit**

```bash
git add mobile/src/screens/main/HomeScreen.tsx
git commit -m "fix(home): show error indicator when dashboard stats fail to load"
```

---

### Task 11: Add onboarding progress bar

**Files:**
- Create: `mobile/src/components/onboarding/ProgressBar.tsx`
- Modify: `mobile/src/navigation/OnboardingNavigator.tsx`

**Step 1: Create ProgressBar component**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

const { colors } = theme;

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container} testID="onboarding-progress">
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  barBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default ProgressBar;
```

**Step 2: Add progress bar to onboarding screens via navigator options**

In `mobile/src/navigation/OnboardingNavigator.tsx`, update to inject step info via screen options:

```tsx
import React from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import ProgressBar from '../components/onboarding/ProgressBar';

// ... existing imports ...

const TOTAL_STEPS = 9;

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerTransparent: true,
        headerLeft: () => null,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false, // Welcome screen has no progress bar
        }}
      />
      <Stack.Screen
        name="PhoneVerification"
        component={PhoneVerificationScreen}
        options={{
          header: () => <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          header: () => <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="ChildrenInfo"
        component={ChildrenInfoScreen}
        options={{
          header: () => <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="WorkSchedule"
        component={WorkScheduleScreen}
        options={{
          header: () => <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          header: () => <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="IDVerification"
        component={IDVerificationScreen}
        options={{
          header: () => <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="BackgroundCheck"
        component={BackgroundCheckScreen}
        options={{
          header: () => <ProgressBar currentStep={7} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen
        name="HouseholdSafetyDisclosure"
        component={HouseholdSafetyDisclosureScreen}
        options={{
          header: () => <ProgressBar currentStep={8} totalSteps={TOTAL_STEPS} />,
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
```

Note: Welcome screen is the intro — not counted as a "step". Steps 1-8 cover PhoneVerification through HouseholdSafetyDisclosure. Adjust `TOTAL_STEPS = 8` accordingly.

**Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ProgressBar\|OnboardingNavigator" || echo "No errors"`
Expected: No errors

**Step 4: Commit**

```bash
git add mobile/src/components/onboarding/ProgressBar.tsx mobile/src/navigation/OnboardingNavigator.tsx
git commit -m "feat(onboarding): add progress bar showing step X of N"
```

---

### Task 12: Add reusable ErrorState component

**Files:**
- Create: `mobile/src/components/common/ErrorState.tsx`
- Modify: `mobile/src/screens/main/HomeScreen.tsx`

**Step 1: Create ErrorState component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

const { colors } = theme;

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  icon?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong',
  onRetry,
  icon = 'wifi-off',
}) => (
  <View style={styles.container} testID="error-state">
    <Icon name={icon} size={48} color={colors.text.secondary} />
    <Text style={styles.message}>{message}</Text>
    {onRetry && (
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        testID="error-retry-button"
      >
        <Icon name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorState;
```

**Step 2: Apply ErrorState to HomeScreen for activity feed errors**

In `mobile/src/screens/main/HomeScreen.tsx`, if the activity feed fetch fails, show `<ErrorState>` instead of empty list. Import and use where activity loading errors occur.

```tsx
import ErrorState from '../../components/common/ErrorState';

// In render, where activities loading error exists:
{activitiesError ? (
  <ErrorState
    message="Couldn't load recent activity"
    onRetry={fetchRecentActivities}
    icon="alert-circle-outline"
  />
) : (
  // existing activity list render
)}
```

**Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "ErrorState\|HomeScreen" || echo "No errors"`
Expected: No errors

**Step 4: Commit**

```bash
git add mobile/src/components/common/ErrorState.tsx mobile/src/screens/main/HomeScreen.tsx
git commit -m "feat(common): add reusable ErrorState component with retry button"
```

---

## Verification Checklist

After all tasks, verify:

- [ ] `grep -r "childrenCount" mobile/src/components/ mobile/src/screens/ --include="*.tsx" -l` — should return NO files that render childrenCount (adapter/types files are OK)
- [ ] App shows branded loading screen on launch (not blank)
- [ ] Crashing a component shows "Something went wrong" + Retry (not blank screen)
- [ ] Tab badges show unread messages and pending requests
- [ ] Household "Find Roommates" button navigates to Discover
- [ ] Home stats show "—" when API fails
- [ ] Onboarding shows "Step X of N" progress bar
- [ ] ErrorState component renders with retry button

## Already Complete (No Work Needed)

- **Fix 4 (Verification lock UX)**: `ChatScreen.tsx:344-365` has `renderLockedState()` with "Get Verified Now" button. `ConversationsListScreen.tsx:231-261` has `renderLockedMessagesBanner()`.
- **Fix 8 (Disable chat input when locked)**: `ChatScreen.tsx:411-424` conditionally shows `lockedInputContainer` instead of `MessageInput` when `isConversationLocked`.
