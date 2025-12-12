/**
 * ProfileCard Component Tests
 * Tests for the main profile card display in Discovery Screen
 * Constitution: Principle I (Child Safety - ONLY childrenCount, childrenAgeGroups)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileCard from '../../../src/components/discovery/ProfileCard';
import { ProfileCard as ProfileCardType } from '../../../src/services/api/discoveryAPI';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

const createMockProfile = (overrides: Partial<ProfileCardType> = {}): ProfileCardType => ({
  id: 'profile-123',
  firstName: 'Sarah',
  age: 32,
  city: 'San Francisco',
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
  bio: 'Single mom looking for a compatible housing partner.',
  profilePhoto: 'https://example.com/photo.jpg',
  ...overrides,
});

describe('ProfileCard Component', () => {
  describe('rendering', () => {
    it('should render profile card with name and age', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Sarah, 32')).toBeTruthy();
    });

    it('should display city location', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('San Francisco')).toBeTruthy();
    });

    it('should display "Location not set" when city is empty', () => {
      const profile = createMockProfile({ city: '' });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Location not set')).toBeTruthy();
    });

    it('should render profile photo', () => {
      const profile = createMockProfile();
      const { toJSON } = render(<ProfileCard profile={profile} />);
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).toContain('example.com/photo.jpg');
    });

    it('should show "No Photo" when profilePhoto is not provided', () => {
      const profile = createMockProfile({ profilePhoto: undefined });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('No Photo')).toBeTruthy();
    });
  });

  describe('compatibility score', () => {
    it('should display compatibility score percentage', () => {
      const profile = createMockProfile({ compatibilityScore: 85 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display "Match" label', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Match')).toBeTruthy();
    });

    it('should handle high compatibility score (80+)', () => {
      const profile = createMockProfile({ compatibilityScore: 90 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('90%')).toBeTruthy();
    });

    it('should handle medium compatibility score (60-79)', () => {
      const profile = createMockProfile({ compatibilityScore: 70 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('70%')).toBeTruthy();
    });

    it('should handle lower compatibility score (40-59)', () => {
      const profile = createMockProfile({ compatibilityScore: 50 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('50%')).toBeTruthy();
    });

    it('should handle low compatibility score (<40)', () => {
      const profile = createMockProfile({ compatibilityScore: 30 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('30%')).toBeTruthy();
    });
  });

  describe('verification badges', () => {
    it('should display ID Verified badge when verified', () => {
      const profile = createMockProfile({
        verificationStatus: {
          idVerified: true,
          backgroundCheckComplete: false,
          phoneVerified: false,
        },
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should display Background Check badge when complete', () => {
      const profile = createMockProfile({
        verificationStatus: {
          idVerified: false,
          backgroundCheckComplete: true,
          phoneVerified: false,
        },
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Background Check')).toBeTruthy();
    });

    it('should display Phone Verified badge when verified', () => {
      const profile = createMockProfile({
        verificationStatus: {
          idVerified: false,
          backgroundCheckComplete: false,
          phoneVerified: true,
        },
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Phone Verified')).toBeTruthy();
    });

    it('should display all verification badges when all verified', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('ID Verified')).toBeTruthy();
      expect(getByText('Background Check')).toBeTruthy();
      expect(getByText('Phone Verified')).toBeTruthy();
    });

    it('should not display badges when not verified', () => {
      const profile = createMockProfile({
        verificationStatus: {
          idVerified: false,
          backgroundCheckComplete: false,
          phoneVerified: false,
        },
      });
      const { queryByText } = render(<ProfileCard profile={profile} />);
      expect(queryByText('ID Verified')).toBeNull();
      expect(queryByText('Background Check')).toBeNull();
      expect(queryByText('Phone Verified')).toBeNull();
    });
  });

  describe('children info - NO PII', () => {
    it('should display children count with plural form', () => {
      const profile = createMockProfile({ childrenCount: 2 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('2 children')).toBeTruthy();
    });

    it('should display children count with singular form', () => {
      const profile = createMockProfile({ childrenCount: 1 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('1 child')).toBeTruthy();
    });

    it('should display age groups', () => {
      const profile = createMockProfile({
        childrenAgeGroups: ['toddler', 'elementary'],
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Age groups: 0-5, 6-12')).toBeTruthy();
    });

    it('should format infant age group correctly', () => {
      const profile = createMockProfile({
        childrenAgeGroups: ['infant'] as any,
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText(/Age groups:.*infant/)).toBeTruthy();
    });

    it('should format teen age group correctly', () => {
      const profile = createMockProfile({
        childrenAgeGroups: ['teen'],
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Age groups: 13-18')).toBeTruthy();
    });
  });

  describe('budget', () => {
    it('should display budget amount', () => {
      const profile = createMockProfile({ budget: 1500 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('$1,500/mo')).toBeTruthy();
    });

    it('should display "Not specified" when no budget', () => {
      const profile = createMockProfile({ budget: undefined });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should format large budget amounts', () => {
      const profile = createMockProfile({ budget: 3500 });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('$3,500/mo')).toBeTruthy();
    });
  });

  describe('move-in date', () => {
    it('should display formatted move-in date', () => {
      // Use mid-month date to avoid timezone edge cases
      const profile = createMockProfile({ moveInDate: '2025-02-15' });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Feb 2025')).toBeTruthy();
    });

    it('should display "Flexible" when no move-in date', () => {
      const profile = createMockProfile({ moveInDate: undefined });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Flexible')).toBeTruthy();
    });
  });

  describe('bio', () => {
    it('should display bio text', () => {
      const profile = createMockProfile({
        bio: 'Single mom looking for a compatible housing partner.',
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Single mom looking for a compatible housing partner.')).toBeTruthy();
    });

    it('should not render bio section when bio is empty', () => {
      const profile = createMockProfile({ bio: '' });
      const { queryByText } = render(<ProfileCard profile={profile} />);
      expect(queryByText('Single mom looking for a compatible housing partner.')).toBeNull();
    });
  });

  describe('child safety compliance', () => {
    it('should never display child names', () => {
      const profile = createMockProfile();
      const { toJSON } = render(<ProfileCard profile={profile} />);
      const jsonString = JSON.stringify(toJSON());
      // Check for actual child name PII patterns - not generic "child" + "name" occurrences
      expect(jsonString).not.toMatch(/childName/i);
      expect(jsonString).not.toMatch(/"childNames?"/i);
      expect(jsonString).not.toMatch(/child_name/i);
    });

    it('should never display child photos', () => {
      const profile = createMockProfile();
      const { toJSON } = render(<ProfileCard profile={profile} />);
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/childPhoto/i);
    });

    it('should never display child ages individually', () => {
      const profile = createMockProfile();
      const { toJSON } = render(<ProfileCard profile={profile} />);
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/child.*age.*\d+.*years/i);
    });

    it('should only show aggregated age groups', () => {
      const profile = createMockProfile({
        childrenCount: 3,
        childrenAgeGroups: ['toddler', 'elementary', 'teen'],
      });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('3 children')).toBeTruthy();
      expect(getByText('Age groups: 0-5, 6-12, 13-18')).toBeTruthy();
    });
  });

  describe('section headers', () => {
    it('should display Children section header', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Children')).toBeTruthy();
    });

    it('should display Budget section header', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Budget')).toBeTruthy();
    });

    it('should display Move-in section header', () => {
      const profile = createMockProfile();
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('Move-in')).toBeTruthy();
    });

    it('should display About section header when bio exists', () => {
      const profile = createMockProfile({ bio: 'Test bio' });
      const { getByText } = render(<ProfileCard profile={profile} />);
      expect(getByText('About')).toBeTruthy();
    });
  });
});
