/**
 * Unit Tests for Auth Redux Slice
 * Tests authentication state management
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginSuccess,
  registerSuccess,
  setOnboardingComplete,
  updateUser,
  setLoading,
  setError,
  clearError,
  logout,
  refreshTokenSuccess,
  User,
} from '../../src/store/slices/authSlice';

describe('authSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    profileComplete: false,
    phoneVerified: true,
    idVerified: false,
    backgroundCheckVerified: false,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.isOnboardingComplete).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loginSuccess', () => {
    it('should set authenticated state with user data', () => {
      store.dispatch(loginSuccess({ user: mockUser }));

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set onboarding complete based on user profileComplete', () => {
      const completedUser = { ...mockUser, profileComplete: true };
      store.dispatch(loginSuccess({ user: completedUser }));

      const state = store.getState().auth;
      expect(state.isOnboardingComplete).toBe(true);
    });

    it('should set onboarding incomplete for new users', () => {
      store.dispatch(loginSuccess({ user: mockUser }));

      const state = store.getState().auth;
      expect(state.isOnboardingComplete).toBe(false);
    });
  });

  describe('registerSuccess', () => {
    it('should set authenticated state with user data', () => {
      store.dispatch(registerSuccess({ user: mockUser }));

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should always set onboarding incomplete for new registration', () => {
      const completedUser = { ...mockUser, profileComplete: true };
      store.dispatch(registerSuccess({ user: completedUser }));

      const state = store.getState().auth;
      expect(state.isOnboardingComplete).toBe(false);
    });
  });

  describe('setOnboardingComplete', () => {
    it('should update onboarding complete status', () => {
      store.dispatch(loginSuccess({ user: mockUser }));
      store.dispatch(setOnboardingComplete(true));

      const state = store.getState().auth;
      expect(state.isOnboardingComplete).toBe(true);
    });

    it('should update user profileComplete when user exists', () => {
      store.dispatch(loginSuccess({ user: mockUser }));
      store.dispatch(setOnboardingComplete(true));

      const state = store.getState().auth;
      expect(state.user?.profileComplete).toBe(true);
    });

    it('should handle setting false', () => {
      store.dispatch(loginSuccess({ user: { ...mockUser, profileComplete: true } }));
      store.dispatch(setOnboardingComplete(false));

      const state = store.getState().auth;
      expect(state.isOnboardingComplete).toBe(false);
      expect(state.user?.profileComplete).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user properties', () => {
      store.dispatch(loginSuccess({ user: mockUser }));
      store.dispatch(updateUser({ firstName: 'Jane', phoneVerified: true }));

      const state = store.getState().auth;
      expect(state.user?.firstName).toBe('Jane');
      expect(state.user?.phoneVerified).toBe(true);
      expect(state.user?.lastName).toBe('Doe'); // Unchanged
    });

    it('should not update if no user exists', () => {
      store.dispatch(updateUser({ firstName: 'Jane' }));

      const state = store.getState().auth;
      expect(state.user).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true and clear error', () => {
      store.dispatch(setError('Some error'));
      store.dispatch(setLoading(true));

      const state = store.getState().auth;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set loading to false without clearing error', () => {
      store.dispatch(setError('Some error'));
      store.dispatch(setLoading(false));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Some error');
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      store.dispatch(setLoading(true));
      store.dispatch(setError('Network error'));

      const state = store.getState().auth;
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      store.dispatch(setError('Some error'));
      store.dispatch(clearError());

      const state = store.getState().auth;
      expect(state.error).toBeNull();
    });
  });

  describe('logout', () => {
    it('should reset to initial state', () => {
      store.dispatch(loginSuccess({ user: mockUser }));
      store.dispatch(setOnboardingComplete(true));
      store.dispatch(setError('Some error'));
      store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.isOnboardingComplete).toBe(false);
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('refreshTokenSuccess', () => {
    it('should confirm authentication and clear error', () => {
      store.dispatch(setError('Token expired'));
      store.dispatch(refreshTokenSuccess());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });
  });
});
