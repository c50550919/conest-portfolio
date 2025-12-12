/**
 * CoNest/SafeNest Mobile App
 * Main entry point with Redux, React Query, and Navigation
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { store, RootState } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { ModerationStatusModal } from './src/components/moderation/ModerationStatusModal';
import { MessageBlockedToast } from './src/components/moderation/MessageBlockedToast';
import { initializeModerationSocket, cleanupModerationSocket } from './src/services/moderation/moderationSocketIntegration';

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (replaces cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Inner app component with access to Redux store
 * Handles moderation UI overlays and socket initialization
 */
function AppContent(): React.JSX.Element {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      // Initialize moderation socket when user is authenticated
      initializeModerationSocket();
    }

    return () => {
      // Cleanup on unmount or logout
      cleanupModerationSocket();
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    // Dispatch logout action - handled by auth slice
    store.dispatch({ type: 'auth/logout' });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <AppNavigator />
      {/* Global moderation UI overlays */}
      <ModerationStatusModal onLogout={handleLogout} />
      <MessageBlockedToast />
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <AppContent />
          </PaperProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
