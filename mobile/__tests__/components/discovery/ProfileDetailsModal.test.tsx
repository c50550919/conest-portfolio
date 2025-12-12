/**
 * ProfileDetailsModal Component Tests
 * Tests for the full-screen detailed profile view with photo gallery
 * Constitution: Principle I (Child Safety - NO child PII)
 * Constitution: Principle IV (Performance)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileDetailsModal from '../../../src/components/discovery/ProfileDetailsModal';
import { ExtendedProfileCard } from '../../../src/types/discovery';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

const createMockProfile = (overrides: Partial<ExtendedProfileCard> = {}): ExtendedProfileCard => ({
  userId: 'user-123',
  firstName: 'Sarah',
  age: 32,
  gender: 'female',
  city: 'San Francisco',
  state: 'CA',
  profilePhoto: 'https://example.com/photo1.jpg',
  additionalPhotos: ['https://example.com/photo2.jpg', 'https://example.com/photo3.jpg'],
  childrenCount: 2,
  childrenAgeGroups: ['toddler', 'elementary'],
  compatibilityScore: 85,
  compatibilityBreakdown: {
    schedule: 90,
    parenting: 85,
    location: 80,
    budget: 75,
    lifestyle: 70,
  },
  verificationStatus: {
    idVerified: true,
    backgroundCheckComplete: true,
    phoneVerified: true,
  },
  budget: 1500,
  moveInDate: '2025-02-01',
  desiredLeaseTerm: 12,
  bio: 'Single mom looking for a compatible housing partner.',
  lookingFor: 'A safe and supportive co-living environment.',
  schedule: {
    workSchedule: 'standard',
    typicalWorkHours: '9am-5pm',
    weekendAvailability: true,
  },
  parenting: {
    philosophy: 'gentle-parenting',
    parentingPhilosophy: ['positive-discipline', 'attachment'],
    disciplineStyle: ['natural-consequences', 'time-in'],
    educationPriorities: ['creativity', 'social-skills'],
    screenTimeApproach: 'limited',
  },
  housingPreferences: {
    housingType: 'apartment',
    petFriendly: true,
    smokeFree: true,
  },
  personalityTraits: ['organized', 'friendly', 'patient'],
  interests: ['cooking', 'hiking', 'reading'],
  ...overrides,
});

describe('ProfileDetailsModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnInterested = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when visible with profile', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('profile-details-modal')).toBeTruthy();
    });

    it('should return null when profile is null', () => {
      const { toJSON } = render(
        <ProfileDetailsModal
          visible={true}
          profile={null}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('should display profile name and age', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('profile-name-text')).toBeTruthy();
    });
  });

  describe('photo gallery', () => {
    it('should render photo gallery with photos', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('photo-gallery')).toBeTruthy();
    });

    it('should display photo indicators for multiple photos', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('photo-indicators')).toBeTruthy();
    });

    it('should not display photo indicators for single photo', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ additionalPhotos: [] })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('photo-indicators')).toBeNull();
    });

    it('should show no photo message when no photos available', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ profilePhoto: undefined, additionalPhotos: [] })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('No photos available')).toBeTruthy();
    });
  });

  describe('compatibility breakdown', () => {
    it('should display compatibility breakdown section', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('compatibility-section')).toBeTruthy();
    });

    it('should display schedule compatibility', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('schedule-compatibility')).toBeTruthy();
    });

    it('should display parenting compatibility', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('parenting-compatibility')).toBeTruthy();
    });

    it('should display location compatibility', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('location-compatibility')).toBeTruthy();
    });

    it('should display budget compatibility', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('budget-compatibility')).toBeTruthy();
    });

    it('should display lifestyle compatibility', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('lifestyle-compatibility')).toBeTruthy();
    });

    it('should not display breakdown section when no breakdown data', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ compatibilityBreakdown: undefined })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('compatibility-section')).toBeNull();
    });
  });

  describe('verification badges', () => {
    it('should display ID Verified badge when verified', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('ID Verified')).toBeTruthy();
    });

    it('should display Background Check badge when complete', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Background Check')).toBeTruthy();
    });

    it('should display Phone Verified badge when verified', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Phone Verified')).toBeTruthy();
    });

    it('should not display badges when not verified', () => {
      const { queryByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({
            verificationStatus: {
              idVerified: false,
              backgroundCheckComplete: false,
              phoneVerified: false,
            },
          })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByText('ID Verified')).toBeNull();
      expect(queryByText('Background Check')).toBeNull();
      expect(queryByText('Phone Verified')).toBeNull();
    });
  });

  describe('children info - NO PII', () => {
    it('should display children count', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('children-count')).toBeTruthy();
    });

    it('should display children age groups', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('children-age-groups')).toBeTruthy();
    });

    it('should display singular "child" for one child', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ childrenCount: 1 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('1 child')).toBeTruthy();
    });

    it('should display plural "children" for multiple children', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ childrenCount: 3 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('3 children')).toBeTruthy();
    });

    it('should format age groups correctly', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({
            childrenAgeGroups: ['infant', 'toddler', 'elementary', 'teen'],
          })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Age groups: 0-2, 3-5, 6-12, 13-18')).toBeTruthy();
    });
  });

  describe('housing and budget section', () => {
    it('should display housing & budget section', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('housing-budget-section')).toBeTruthy();
    });

    it('should display budget amount', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ budget: 1500 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('$1,500/mo')).toBeTruthy();
    });

    it('should display "Not specified" when no budget', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ budget: undefined })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Not specified')).toBeTruthy();
    });

    it('should display lease term', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ desiredLeaseTerm: 12 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('12 months')).toBeTruthy();
    });

    it('should display singular month for 1 month lease', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ desiredLeaseTerm: 1 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('1 month')).toBeTruthy();
    });

    it('should display housing type', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Apartment')).toBeTruthy();
    });

    it('should display pet-friendly tag when enabled', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Pet-friendly')).toBeTruthy();
    });

    it('should display smoke-free tag when enabled', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Smoke-free')).toBeTruthy();
    });
  });

  describe('schedule section', () => {
    it('should display schedule section', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('schedule-section')).toBeTruthy();
    });

    it('should display work schedule', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Standard')).toBeTruthy();
    });

    it('should display typical work hours', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('9am-5pm')).toBeTruthy();
    });

    it('should display weekend availability as Available', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Available')).toBeTruthy();
    });

    it('should display weekend availability as Limited when not available', () => {
      const { getAllByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({
            schedule: {
              workSchedule: 'standard',
              weekendAvailability: false,
            },
          })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      // Multiple "Limited" may appear (weekend availability + screen time)
      const limitedElements = getAllByText('Limited');
      expect(limitedElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parenting section', () => {
    it('should display parenting section', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('parenting-section')).toBeTruthy();
    });

    it('should display parenting philosophy', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Gentle Parenting')).toBeTruthy();
    });

    it('should display screen time approach', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Limited')).toBeTruthy();
    });
  });

  describe('about and looking for sections', () => {
    it('should display about section with bio', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('about-section')).toBeTruthy();
    });

    it('should display bio text', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Single mom looking for a compatible housing partner.')).toBeTruthy();
    });

    it('should display looking for section', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('looking-for-section')).toBeTruthy();
    });

    it('should not display about section when no bio', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ bio: '' })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('about-section')).toBeNull();
    });
  });

  describe('personality section', () => {
    it('should display personality section when traits or interests exist', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('personality-section')).toBeTruthy();
    });

    it('should not display personality section when no traits or interests', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({
            personalityTraits: [],
            interests: [],
          })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('personality-section')).toBeNull();
    });
  });

  describe('action buttons', () => {
    it('should display Continue Browsing button', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('continue-browsing-button')).toBeTruthy();
    });

    it('should display Interested button when onInterested is provided', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByTestId('interested-button')).toBeTruthy();
    });

    it('should not display Interested button when onInterested is not provided', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
        />
      );
      expect(queryByTestId('interested-button')).toBeNull();
    });

    it('should call onClose when Continue Browsing is pressed', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      fireEvent.press(getByTestId('continue-browsing-button'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onInterested and onClose when Interested is pressed', () => {
      const { getByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      fireEvent.press(getByTestId('interested-button'));
      expect(mockOnInterested).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('child safety compliance', () => {
    it('should never display child names', () => {
      const { toJSON } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      const jsonString = JSON.stringify(toJSON());
      // Check for actual child name PII patterns - not generic "child" + "name" occurrences
      expect(jsonString).not.toMatch(/childName/i);
      expect(jsonString).not.toMatch(/"childNames?"/i);
      expect(jsonString).not.toMatch(/child_name/i);
    });

    it('should never display child photos', () => {
      const { toJSON } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/childPhoto/i);
    });

    it('should never display individual child ages', () => {
      const { toJSON } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      const jsonString = JSON.stringify(toJSON());
      expect(jsonString).not.toMatch(/child.*age.*\d+.*years/i);
    });

    it('should only show aggregated age groups', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile()}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Age groups: 3-5, 6-12')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty childrenAgeGroups', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ childrenAgeGroups: [] })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('Age groups:')).toBeTruthy();
    });

    it('should handle undefined schedule', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ schedule: undefined })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('schedule-section')).toBeNull();
    });

    it('should handle undefined parenting', () => {
      const { queryByTestId } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ parenting: undefined })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(queryByTestId('parenting-section')).toBeNull();
    });

    it('should handle high compatibility score (100%)', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ compatibilityScore: 100 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('100% Match')).toBeTruthy();
    });

    it('should handle low compatibility score', () => {
      const { getByText } = render(
        <ProfileDetailsModal
          visible={true}
          profile={createMockProfile({ compatibilityScore: 35 })}
          onClose={mockOnClose}
          onInterested={mockOnInterested}
        />
      );
      expect(getByText('35% Match')).toBeTruthy();
    });
  });
});
