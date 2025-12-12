/**
 * Unit Tests for User Redux Slice
 * Tests user profile and onboarding state management
 */

import { configureStore } from '@reduxjs/toolkit';
import userReducer, {
  setUserProfile,
  updateUserProfile,
  updateOnboardingData,
  setOnboardingStep,
  clearOnboardingData,
  setLoading,
  setError,
  clearUserProfile,
  UserProfile,
  OnboardingData,
} from '../../src/store/slices/userSlice';

describe('userSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockProfile: UserProfile = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    bio: 'A single parent',
    occupation: 'Software Engineer',
    profilePhoto: 'https://example.com/photo.jpg',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'elementary'],
    workSchedule: { monday: '9-5' },
    parentingStyle: 'authoritative',
    householdPreferences: { petFriendly: true },
    budgetMin: 1500,
    budgetMax: 2500,
    verifiedStatus: 'verified',
    backgroundCheckStatus: 'approved',
  };

  const mockOnboardingData: OnboardingData = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    bio: 'Looking for a roommate',
    occupation: 'Teacher',
    dateOfBirth: '1985-05-15',
    childrenCount: 1,
    childrenAgeGroups: ['infant'],
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    budgetMin: 1000,
    budgetMax: 2000,
    scheduleType: 'fixed',
    workFromHome: true,
    parentingStyle: 'gentle',
    profilePhotoUri: 'file://local/photo.jpg',
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        user: userReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().user;

      expect(state.profile).toBeNull();
      expect(state.onboardingData).toEqual({});
      expect(state.onboardingStep).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setUserProfile', () => {
    it('should set the complete user profile', () => {
      store.dispatch(setUserProfile(mockProfile));

      const state = store.getState().user;
      expect(state.profile).toEqual(mockProfile);
    });

    it('should clear onboarding data after profile is set', () => {
      store.dispatch(updateOnboardingData(mockOnboardingData));
      store.dispatch(setOnboardingStep(3));
      store.dispatch(setUserProfile(mockProfile));

      const state = store.getState().user;
      expect(state.onboardingData).toEqual({});
      expect(state.onboardingStep).toBe(0);
    });
  });

  describe('updateUserProfile', () => {
    it('should update existing user profile partially', () => {
      store.dispatch(setUserProfile(mockProfile));
      store.dispatch(updateUserProfile({ firstName: 'Johnny', city: 'New York' }));

      const state = store.getState().user;
      expect(state.profile?.firstName).toBe('Johnny');
      expect(state.profile?.city).toBe('New York');
      expect(state.profile?.lastName).toBe('Doe'); // Unchanged
    });

    it('should not update if no profile exists', () => {
      store.dispatch(updateUserProfile({ firstName: 'Johnny' }));

      const state = store.getState().user;
      expect(state.profile).toBeNull();
    });

    it('should update verification statuses', () => {
      store.dispatch(setUserProfile(mockProfile));
      store.dispatch(updateUserProfile({
        verifiedStatus: 'partial',
        backgroundCheckStatus: 'pending',
      }));

      const state = store.getState().user;
      expect(state.profile?.verifiedStatus).toBe('partial');
      expect(state.profile?.backgroundCheckStatus).toBe('pending');
    });
  });

  describe('updateOnboardingData', () => {
    it('should update onboarding data incrementally', () => {
      store.dispatch(updateOnboardingData({ firstName: 'Jane', lastName: 'Smith' }));
      store.dispatch(updateOnboardingData({ email: 'jane@example.com' }));

      const state = store.getState().user;
      expect(state.onboardingData.firstName).toBe('Jane');
      expect(state.onboardingData.lastName).toBe('Smith');
      expect(state.onboardingData.email).toBe('jane@example.com');
    });

    it('should overwrite existing values', () => {
      store.dispatch(updateOnboardingData({ firstName: 'Jane' }));
      store.dispatch(updateOnboardingData({ firstName: 'Janet' }));

      const state = store.getState().user;
      expect(state.onboardingData.firstName).toBe('Janet');
    });

    it('should handle children data (FHA compliant)', () => {
      store.dispatch(updateOnboardingData({
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      }));

      const state = store.getState().user;
      expect(state.onboardingData.childrenCount).toBe(2);
      expect(state.onboardingData.childrenAgeGroups).toEqual(['toddler', 'elementary']);
    });

    it('should handle schedule and lifestyle data', () => {
      store.dispatch(updateOnboardingData({
        scheduleType: 'shift_work',
        workFromHome: false,
        parentingStyle: 'authoritative',
      }));

      const state = store.getState().user;
      expect(state.onboardingData.scheduleType).toBe('shift_work');
      expect(state.onboardingData.workFromHome).toBe(false);
      expect(state.onboardingData.parentingStyle).toBe('authoritative');
    });
  });

  describe('setOnboardingStep', () => {
    it('should set the current onboarding step', () => {
      store.dispatch(setOnboardingStep(2));

      const state = store.getState().user;
      expect(state.onboardingStep).toBe(2);
    });

    it('should allow going back to previous steps', () => {
      store.dispatch(setOnboardingStep(3));
      store.dispatch(setOnboardingStep(1));

      const state = store.getState().user;
      expect(state.onboardingStep).toBe(1);
    });
  });

  describe('clearOnboardingData', () => {
    it('should clear all onboarding data', () => {
      store.dispatch(updateOnboardingData(mockOnboardingData));
      store.dispatch(setOnboardingStep(4));
      store.dispatch(clearOnboardingData());

      const state = store.getState().user;
      expect(state.onboardingData).toEqual({});
      expect(state.onboardingStep).toBe(0);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      store.dispatch(setLoading(true));

      const state = store.getState().user;
      expect(state.loading).toBe(true);
    });

    it('should unset loading state', () => {
      store.dispatch(setLoading(true));
      store.dispatch(setLoading(false));

      const state = store.getState().user;
      expect(state.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      store.dispatch(setError('Profile update failed'));

      const state = store.getState().user;
      expect(state.error).toBe('Profile update failed');
    });

    it('should clear error when set to null', () => {
      store.dispatch(setError('Some error'));
      store.dispatch(setError(null));

      const state = store.getState().user;
      expect(state.error).toBeNull();
    });
  });

  describe('clearUserProfile', () => {
    it('should clear all user data (for logout)', () => {
      store.dispatch(setUserProfile(mockProfile));
      store.dispatch(updateOnboardingData(mockOnboardingData));
      store.dispatch(setOnboardingStep(2));
      store.dispatch(setError('Some error'));
      store.dispatch(clearUserProfile());

      const state = store.getState().user;
      expect(state.profile).toBeNull();
      expect(state.onboardingData).toEqual({});
      expect(state.onboardingStep).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});
