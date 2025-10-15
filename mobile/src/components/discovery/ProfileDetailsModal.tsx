/**
 * ProfileDetailsModal Component
 *
 * Purpose: Full-screen detailed profile view with photo gallery
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - Swipeable photo gallery (up to 5 photos)
 * - Full profile information with sections
 * - Compatibility breakdown with visual indicators
 * - Schedule compatibility display
 * - Parenting philosophy and house rules
 * - Budget and move-in details
 * - Smooth slide-in animation
 * - Pull-to-close gesture
 *
 * Child Safety: ONLY displays childrenCount and childrenAgeGroups (NO PII)
 *
 * Created: 2025-10-09
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ExtendedProfileCard } from '../../types/discovery';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_HEIGHT * 0.5;

interface ProfileDetailsModalProps {
  visible: boolean;
  profile: ExtendedProfileCard | null;
  onClose: () => void;
  onInterested?: () => void;
}

export default function ProfileDetailsModal({
  visible,
  profile,
  onClose,
  onInterested,
}: ProfileDetailsModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Photo gallery photos (main + additional)
  const photos = profile
    ? [profile.profilePhoto, ...(profile.additionalPhotos || [])].filter(Boolean)
    : [];

  // Animate modal slide in/out
  React.useEffect(() => {
    if (visible) {
      setCurrentPhotoIndex(0);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Pull-to-close gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only enable pull-to-close at the top of scroll
        return gestureState.dy > 10 && scrollY._value === 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Close modal
          onClose();
        } else {
          // Spring back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!profile) return null;

  const {
    firstName,
    age,
    city,
    childrenCount,
    childrenAgeGroups,
    compatibilityScore,
    compatibilityBreakdown,
    verificationStatus,
    budget,
    moveInDate,
    desiredLeaseTerm,
    bio,
    lookingFor,
    schedule,
    parenting,
    housingPreferences,
    interests,
    personalityTraits,
  } = profile;

  // Format age groups
  const ageGroupLabels: Record<string, string> = {
    infant: '0-2',
    toddler: '3-5',
    elementary: '6-12',
    teen: '13-18',
  };

  const formattedAgeGroups = (childrenAgeGroups || [])
    .map((group) => ageGroupLabels[group] || group)
    .join(', ');

  // Compatibility color
  const getCompatibilityColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  // Format budget
  const budgetText = budget ? `$${budget.toLocaleString()}/mo` : 'Not specified';

  // Format move-in date
  const moveInText = moveInDate
    ? new Date(moveInDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Flexible';

  // Format lease term
  const leaseTermText = desiredLeaseTerm
    ? `${desiredLeaseTerm} ${desiredLeaseTerm === 1 ? 'month' : 'months'}`
    : 'Flexible';

  // Render compatibility bar
  const renderCompatibilityBar = (label: string, score: number, testId: string) => {
    const color = getCompatibilityColor(score);
    return (
      <View key={label} testID={testId} style={styles.compatibilityBarContainer}>
        <View style={styles.compatibilityBarHeader}>
          <Text style={styles.compatibilityBarLabel}>{label}</Text>
          <Text style={[styles.compatibilityBarScore, { color }]}>{score}%</Text>
        </View>
        <View style={styles.compatibilityBarTrack}>
          <View
            testID={`compatibility-bar-${label.toLowerCase().replace(' ', '-')}`}
            style={[
              styles.compatibilityBarFill,
              { width: `${score}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  // Render section
  const renderSection = (
    icon: string,
    title: string,
    content: React.ReactNode,
    testId?: string
  ) => (
    <View testID={testId} style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={22} color="#333" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{content}</View>
    </View>
  );

  return (
    <Modal
      testID="profile-details-modal"
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close profile details"
          >
            <View style={styles.closeButtonBackground}>
              <Ionicons name="close" size={28} color="#333" />
            </View>
          </TouchableOpacity>

          {/* Photo Gallery */}
          <View style={styles.galleryContainer} {...panResponder.panHandlers}>
            {photos.length > 0 ? (
              <>
                <ScrollView
                  testID="photo-gallery"
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                    );
                    setCurrentPhotoIndex(index);
                  }}
                >
                  {photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Photo indicators */}
                {photos.length > 1 && (
                  <View testID="photo-indicators" style={styles.photoIndicators}>
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.photoIndicator,
                          index === currentPhotoIndex && styles.photoIndicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.galleryGradient}
                />

                {/* Basic info overlay */}
                <View style={styles.galleryInfo}>
                  <Text testID="profile-name-text" style={styles.galleryName}>
                    {firstName}, {age}
                  </Text>
                  <View style={styles.galleryLocationRow}>
                    <Ionicons name="location-outline" size={18} color="#fff" />
                    <Text style={styles.galleryCity}>{city || 'Location not set'}</Text>
                  </View>
                </View>

                {/* Compatibility badge */}
                <View
                  style={[
                    styles.galleryCompatibilityBadge,
                    { backgroundColor: getCompatibilityColor(compatibilityScore) },
                  ]}
                >
                  <Text style={styles.galleryCompatibilityText}>
                    {compatibilityScore}% Match
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noPhotoContainer}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={120}
                  color="#ccc"
                />
                <Text style={styles.noPhotoText}>No photos available</Text>
              </View>
            )}
          </View>

          {/* Scrollable details */}
          <ScrollView
            testID="profile-details-scroll"
            style={styles.detailsScroll}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {/* Verification Badges */}
            <View style={styles.badgesRow}>
              {verificationStatus.idVerified && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.badgeText}>ID Verified</Text>
                </View>
              )}
              {verificationStatus.backgroundCheckComplete && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="certificate"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.badgeText}>Background Check</Text>
                </View>
              )}
              {verificationStatus.phoneVerified && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="phone-check"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.badgeText}>Phone Verified</Text>
                </View>
              )}
            </View>

            {/* Compatibility Breakdown */}
            {compatibilityBreakdown && (
              <View testID="compatibility-section" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="chart-donut" size={22} color="#333" />
                  <Text style={styles.sectionTitle}>Compatibility Breakdown</Text>
                </View>
                <View style={styles.sectionContent}>
                  {renderCompatibilityBar('Schedule', compatibilityBreakdown.schedule, 'schedule-compatibility')}
                  {renderCompatibilityBar('Parenting', compatibilityBreakdown.parenting, 'parenting-compatibility')}
                  {renderCompatibilityBar('Location', compatibilityBreakdown.location, 'location-compatibility')}
                  {renderCompatibilityBar('Budget', compatibilityBreakdown.budget, 'budget-compatibility')}
                  {renderCompatibilityBar('Lifestyle', compatibilityBreakdown.lifestyle, 'lifestyle-compatibility')}
                </View>
              </View>
            )}

            {/* About */}
            {bio && (
              renderSection(
                'text-box-outline',
                'About',
                <Text style={styles.bioText}>{bio}</Text>,
                'about-section'
              )
            )}

            {/* Looking For */}
            {lookingFor && (
              renderSection(
                'magnify',
                'Looking For',
                <Text style={styles.bioText}>{lookingFor}</Text>,
                'looking-for-section'
              )
            )}

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
              'children-section'
            )}

            {/* Housing & Budget */}
            {renderSection(
              'home-variant',
              'Housing & Budget',
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Budget:</Text>
                  <Text style={styles.detailValue}>{budgetText}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Move-in:</Text>
                  <Text style={styles.detailValue}>{moveInText}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lease term:</Text>
                  <Text style={styles.detailValue}>{leaseTermText}</Text>
                </View>
                {housingPreferences && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type:</Text>
                      <Text style={styles.detailValue}>
                        {housingPreferences.housingType.charAt(0).toUpperCase() +
                          housingPreferences.housingType.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.tagRow}>
                      {housingPreferences.petFriendly && (
                        <View style={styles.tag}>
                          <MaterialCommunityIcons name="paw" size={14} color="#666" />
                          <Text style={styles.tagText}>Pet-friendly</Text>
                        </View>
                      )}
                      {housingPreferences.smokeFree && (
                        <View style={styles.tag}>
                          <MaterialCommunityIcons
                            name="smoking-off"
                            size={14}
                            color="#666"
                          />
                          <Text style={styles.tagText}>Smoke-free</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </>,
              'housing-budget-section'
            )}

            {/* Schedule */}
            {schedule && (
              renderSection(
                'clock-outline',
                'Schedule',
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Work schedule:</Text>
                    <Text style={styles.detailValue}>
                      {schedule.workSchedule.charAt(0).toUpperCase() +
                        schedule.workSchedule.slice(1)}
                    </Text>
                  </View>
                  {schedule.typicalWorkHours && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Typical hours:</Text>
                      <Text style={styles.detailValue}>{schedule.typicalWorkHours}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weekend availability:</Text>
                    <Text style={styles.detailValue}>
                      {schedule.weekendAvailability ? 'Available' : 'Limited'}
                    </Text>
                  </View>
                </>,
                'schedule-section'
              )
            )}

            {/* Parenting Philosophy */}
            {parenting && (
              renderSection(
                'heart-outline',
                'Parenting Philosophy',
                <>
                  {(parenting.parentingPhilosophy || []).length > 0 && (
                    <View style={styles.tagGroup}>
                      <Text style={styles.tagGroupLabel}>Philosophy:</Text>
                      <View style={styles.tagRow}>
                        {parenting.parentingPhilosophy.map((item) => (
                          <View key={item} style={styles.tag}>
                            <Text style={styles.tagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {(parenting.disciplineStyle || []).length > 0 && (
                    <View style={styles.tagGroup}>
                      <Text style={styles.tagGroupLabel}>Discipline:</Text>
                      <View style={styles.tagRow}>
                        {parenting.disciplineStyle.map((item) => (
                          <View key={item} style={styles.tag}>
                            <Text style={styles.tagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {(parenting.educationPriorities || []).length > 0 && (
                    <View style={styles.tagGroup}>
                      <Text style={styles.tagGroupLabel}>Education priorities:</Text>
                      <View style={styles.tagRow}>
                        {parenting.educationPriorities.map((item) => (
                          <View key={item} style={styles.tag}>
                            <Text style={styles.tagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Screen time:</Text>
                    <Text style={styles.detailValue}>
                      {parenting.screenTimeApproach.charAt(0).toUpperCase() +
                        parenting.screenTimeApproach.slice(1)}
                    </Text>
                  </View>
                </>,
                'parenting-section'
              )
            )}

            {/* Personality & Interests */}
            {(personalityTraits?.length > 0 || interests?.length > 0) && (
              renderSection(
                'star-outline',
                'Personality & Interests',
                <>
                  {personalityTraits?.length > 0 && (
                    <View style={styles.tagGroup}>
                      <Text style={styles.tagGroupLabel}>Personality:</Text>
                      <View style={styles.tagRow}>
                        {personalityTraits.map((trait) => (
                          <View key={trait} style={styles.tag}>
                            <Text style={styles.tagText}>{trait}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {interests?.length > 0 && (
                    <View style={styles.tagGroup}>
                      <Text style={styles.tagGroupLabel}>Interests:</Text>
                      <View style={styles.tagRow}>
                        {interests.map((interest) => (
                          <View key={interest} style={styles.tag}>
                            <Text style={styles.tagText}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>,
                'personality-section'
              )
            )}

            {/* Bottom padding for action buttons */}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              testID="continue-browsing-button"
              style={[styles.actionButton, styles.passActionButton]}
              onPress={onClose}
              accessibilityLabel="Close and continue browsing"
            >
              <Text style={styles.passActionText}>Continue Browsing</Text>
            </TouchableOpacity>

            {onInterested && (
              <TouchableOpacity
                testID="interested-button"
                style={[styles.actionButton, styles.interestedActionButton]}
                onPress={() => {
                  onInterested();
                  onClose();
                }}
                accessibilityLabel="Express interest in this profile"
              >
                <MaterialCommunityIcons name="home-account" size={24} color="#fff" />
                <Text style={styles.interestedActionText}>I'm Interested</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  closeButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  galleryContainer: {
    height: GALLERY_HEIGHT,
    position: 'relative',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
  },
  noPhotoContainer: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  photoIndicators: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  photoIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  galleryGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  galleryInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 100,
  },
  galleryName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  galleryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  galleryCity: {
    color: '#fff',
    fontSize: 18,
  },
  galleryCompatibilityBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  galleryCompatibilityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsScroll: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingBottom: 10,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionContent: {
    paddingLeft: 32,
  },
  compatibilityBarContainer: {
    marginBottom: 16,
  },
  compatibilityBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compatibilityBarLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  compatibilityBarScore: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  compatibilityBarTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compatibilityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  bioText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#777',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 14,
    color: '#777',
  },
  tagGroup: {
    marginBottom: 16,
  },
  tagGroupLabel: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passActionButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  passActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  interestedActionButton: {
    backgroundColor: '#2ECC71',
  },
  interestedActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
