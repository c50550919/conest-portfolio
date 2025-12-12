/**
 * ComparisonModal Component Tests
 * Tests for the side-by-side profile comparison view
 * Constitution: Principle I (Child Safety - NO child PII)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonModal, ComparisonProfile } from '../../../src/components/discovery/ComparisonModal';
import { ExtendedProfileCard } from '../../../src/types/discovery';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const createMockProfile = (overrides: Partial<ExtendedProfileCard> = {}): ExtendedProfileCard => ({
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
  housingBudget: { min: 1200, max: 1800 },
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
  parenting: {
    philosophy: 'gentle-parenting',
  },
  bio: 'Single mom looking for a compatible housing partner.',
  ...overrides,
});

const mockProfiles: ComparisonProfile[] = [
  {
    profile: createMockProfile({ userId: 'user-1', firstName: 'Sarah' }),
    addedAt: new Date().toISOString(),
  },
  {
    profile: createMockProfile({
      userId: 'user-2',
      firstName: 'Emily',
      compatibilityScore: 78,
      city: 'Oakland',
    }),
    addedAt: new Date().toISOString(),
  },
];

describe('ComparisonModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnRemoveProfile = jest.fn();
  const mockOnShowBreakdown = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible with profiles', () => {
      const { getByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getByText('Compare Profiles (2)')).toBeTruthy();
    });

    it('should display profile names and ages', () => {
      const { getByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getByText('Sarah, 32')).toBeTruthy();
      expect(getByText('Emily, 32')).toBeTruthy();
    });

    it('should display profile locations', () => {
      const { getByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getByText('San Francisco, CA')).toBeTruthy();
      expect(getByText('Oakland, CA')).toBeTruthy();
    });

    it('should display compatibility scores', () => {
      const { getByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getByText('Compatibility: 85%')).toBeTruthy();
      expect(getByText('Compatibility: 78%')).toBeTruthy();
    });

    it('should display children count (NO PII)', () => {
      const { getAllByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getAllByText('2 child(ren)').length).toBe(2);
    });
  });

  describe('interactions', () => {
    it('should call onRemoveProfile when remove is pressed', () => {
      const { getAllByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      const removeButtons = getAllByText('Remove');
      fireEvent.press(removeButtons[0]);
      expect(mockOnRemoveProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('compatibility breakdown button', () => {
    it('should show breakdown button for 2 profiles', () => {
      const { getByTestId } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(getByTestId('compatibility-breakdown-button')).toBeTruthy();
    });

    it('should not show breakdown button for more than 2 profiles', () => {
      const threeProfiles = [
        ...mockProfiles,
        {
          profile: createMockProfile({ userId: 'user-3', firstName: 'Maria' }),
          addedAt: new Date().toISOString(),
        },
      ];
      const { queryByTestId } = render(
        <ComparisonModal
          visible={true}
          profiles={threeProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      expect(queryByTestId('compatibility-breakdown-button')).toBeNull();
    });

    it('should call onShowBreakdown when button is pressed', () => {
      const { getByTestId } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      fireEvent.press(getByTestId('compatibility-breakdown-button'));
      expect(mockOnShowBreakdown).toHaveBeenCalledTimes(1);
    });

    it('should show loading state when loadingBreakdown is true', () => {
      const { getByText } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={true}
        />
      );
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('child safety compliance', () => {
    it('should only show children count, not names or details', () => {
      const { toJSON } = render(
        <ComparisonModal
          visible={true}
          profiles={mockProfiles}
          onClose={mockOnClose}
          onRemoveProfile={mockOnRemoveProfile}
          onShowBreakdown={mockOnShowBreakdown}
          loadingBreakdown={false}
        />
      );
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/childName/i);
      expect(jsonString).not.toMatch(/childPhoto/i);
    });
  });
});
