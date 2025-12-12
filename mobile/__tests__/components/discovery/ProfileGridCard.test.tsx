/**
 * ProfileGridCard Component Tests
 * Tests for the compact profile card used in grid/list view discovery
 * Constitution: Principle I (Child Safety - NO child PII display)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileGridCard } from '../../../src/components/discovery/ProfileGridCard';
import { ExtendedProfileCard } from '../../../src/types/discovery';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const mockProfile: ExtendedProfileCard = {
  userId: 'user-123',
  firstName: 'Sarah',
  age: 32,
  gender: 'female',
  city: 'San Francisco',
  state: 'CA',
  profilePhoto: 'https://example.com/photo.jpg',
  childrenCount: 2,
  childrenAgeGroups: ['toddler', 'elementary'],
  compatibilityScore: 85,
  verificationStatus: {
    idVerified: true,
    backgroundCheckComplete: true,
    phoneVerified: true,
  },
  budget: 1500,
  moveInDate: '2025-02-01',
  housingPreferences: {
    housingType: 'apartment',
    petFriendly: true,
    smokeFree: true,
  },
  schedule: {
    workSchedule: 'standard',
    weekendAvailability: true,
  },
  parenting: {},
  bio: 'Single mom looking for a compatible housing partner.',
};

describe('ProfileGridCard Component', () => {
  const mockOnPress = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnCompare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render profile card', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('Sarah, 32')).toBeTruthy();
    });

    it('should display location information', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('San Francisco, CA')).toBeTruthy();
    });

    it('should display compatibility score', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display children info without PII', () => {
      const { getByText, queryByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('2 children (3-5, 6-12)')).toBeTruthy();
      expect(queryByText(/child.*name/i)).toBeNull();
    });

    it('should display singular "child" for single child', () => {
      const singleChildProfile = {
        ...mockProfile,
        childrenCount: 1,
        childrenAgeGroups: ['toddler'] as const,
      };
      const { getByText } = render(
        <ProfileGridCard profile={singleChildProfile} onPress={mockOnPress} />
      );
      expect(getByText('1 child (3-5)')).toBeTruthy();
    });

    it('should display budget information', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('$1500/mo')).toBeTruthy();
    });

    it('should display housing type', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      expect(getByText('Apartment')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onPress when card is pressed', () => {
      const { getByText } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      fireEvent.press(getByText('Sarah, 32'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('compatibility score colors', () => {
    it('should render high compatibility (80+)', () => {
      const highProfile = { ...mockProfile, compatibilityScore: 90 };
      const { getByText } = render(
        <ProfileGridCard profile={highProfile} onPress={mockOnPress} />
      );
      expect(getByText('90%')).toBeTruthy();
    });

    it('should render medium compatibility (60-79)', () => {
      const mediumProfile = { ...mockProfile, compatibilityScore: 65 };
      const { getByText } = render(
        <ProfileGridCard profile={mediumProfile} onPress={mockOnPress} />
      );
      expect(getByText('65%')).toBeTruthy();
    });

    it('should render low compatibility (<60)', () => {
      const lowProfile = { ...mockProfile, compatibilityScore: 45 };
      const { getByText } = render(
        <ProfileGridCard profile={lowProfile} onPress={mockOnPress} />
      );
      expect(getByText('45%')).toBeTruthy();
    });
  });

  describe('housing type display', () => {
    it('should display "Any type" for either housing type', () => {
      const eitherProfile = {
        ...mockProfile,
        housingPreferences: {
          ...mockProfile.housingPreferences,
          housingType: 'either' as const,
        },
      };
      const { getByText } = render(
        <ProfileGridCard profile={eitherProfile} onPress={mockOnPress} />
      );
      expect(getByText('Any type')).toBeTruthy();
    });

    it('should capitalize housing type', () => {
      const houseProfile = {
        ...mockProfile,
        housingPreferences: {
          ...mockProfile.housingPreferences,
          housingType: 'house' as const,
        },
      };
      const { getByText } = render(
        <ProfileGridCard profile={houseProfile} onPress={mockOnPress} />
      );
      expect(getByText('House')).toBeTruthy();
    });
  });

  describe('age group formatting', () => {
    it('should format infant age group correctly', () => {
      const infantProfile = {
        ...mockProfile,
        childrenAgeGroups: ['infant'] as const,
      };
      const { getByText } = render(
        <ProfileGridCard profile={infantProfile} onPress={mockOnPress} />
      );
      expect(getByText(/0-2/)).toBeTruthy();
    });

    it('should format teen age group correctly', () => {
      const teenProfile = {
        ...mockProfile,
        childrenAgeGroups: ['teen'] as const,
      };
      const { getByText } = render(
        <ProfileGridCard profile={teenProfile} onPress={mockOnPress} />
      );
      expect(getByText(/13-18/)).toBeTruthy();
    });
  });

  describe('child safety compliance', () => {
    it('should never display child names', () => {
      const { toJSON } = render(
        <ProfileGridCard profile={mockProfile} onPress={mockOnPress} />
      );
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/childName/i);
      expect(jsonString).not.toMatch(/childPhoto/i);
    });
  });
});
