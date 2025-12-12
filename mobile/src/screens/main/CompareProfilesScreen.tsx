/**
 * CompareProfilesScreen - Side-by-side profile comparison
 *
 * Purpose: Display 2-4 saved profiles side-by-side for comparison
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 * Task: T045
 *
 * Features:
 * - Horizontal scrolling for 2-4 profiles
 * - Compare key attributes (location, housing budget, children ages, schedule, etc.)
 * - Remove profiles from comparison
 * - Navigate to full profile details
 *
 * Created: 2025-10-19
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { compareProfiles } from '../../store/slices/savedProfilesSlice';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CompareProfile } from '../../services/api/savedProfilesAPI';
import CompatibilityBreakdownModal from '../../components/compatibility/CompatibilityBreakdownModal';
import compatibilityAPI, { CompatibilityBreakdown } from '../../services/api/compatibilityAPI';

/**
 * Render source type badge (all comparison profiles are saved)
 */
const renderSourceBadge = () => {
  return (
    <View style={[localStyles.sourceBadge, { backgroundColor: colors.success }]}>
      <Icon name="bookmark" size={12} color="#FFFFFF" />
      <Text style={localStyles.sourceBadgeText}>Saved</Text>
    </View>
  );
};

/**
 * Comparison attribute configuration
 */
interface ComparisonAttribute {
  label: string;
  icon: string;
  getValue: (profile: any) => string | number;
  format?: (value: any) => string;
}

const COMPARISON_ATTRIBUTES: ComparisonAttribute[] = [
  {
    label: 'Location',
    icon: 'map-marker',
    getValue: (p: CompareProfile) => (p.city ? `${p.city}` : 'Not specified'),
  },
  {
    label: 'Housing Budget',
    icon: 'currency-usd',
    getValue: (p: CompareProfile) => p.budget || 'Not specified',
    format: (v) => (typeof v === 'number' ? `$${v.toLocaleString()}/mo` : v),
  },
  {
    label: 'Children',
    icon: 'account-child',
    getValue: (p: CompareProfile) => p.childrenCount || 0,
    format: (v) => `${v} child${v !== 1 ? 'ren' : ''}`,
  },
  {
    label: 'Age Groups',
    icon: 'account-group',
    getValue: (p: CompareProfile) => {
      const groups = p.childrenAgeGroups;
      if (!groups || groups.length === 0) {
        return 'Not specified';
      }
      return groups.join(', ');
    },
  },
  {
    label: 'Move-in Date',
    icon: 'calendar',
    getValue: (p: CompareProfile) => p.moveInDate || 'Flexible',
  },
  {
    label: 'Compatibility',
    icon: 'heart',
    getValue: (p: CompareProfile) => p.compatibilityScore || 0,
    format: (v) => (typeof v === 'number' ? `${v}%` : v),
  },
  {
    label: 'Age',
    icon: 'account',
    getValue: (p: CompareProfile) => p.age || 'Not specified',
    format: (v) => (typeof v === 'number' ? `${v} years` : v),
  },
  {
    label: 'Folder',
    icon: 'folder',
    getValue: (p: CompareProfile) => p.folder || 'Uncategorized',
  },
];

const CompareProfilesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { comparisonProfiles, comparing, error } = useSelector(
    (state: RootState) => state.savedProfiles
  );

  // Get selected profiles from discovery screen
  const selectedDiscoveryProfiles = useSelector(
    (state: RootState) => state.browseDiscovery.comparisonProfiles
  );

  // Get saved profiles from state to look up saved IDs
  const savedProfiles = useSelector((state: RootState) => state.savedProfiles.savedProfiles);

  // Track if we've already triggered the comparison
  const [hasTriggered, setHasTriggered] = useState(false);

  // Compatibility breakdown modal state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<CompatibilityBreakdown | null>(null);
  const [selectedPairNames, setSelectedPairNames] = useState<{
    profile1: string;
    profile2: string;
  } | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    // Auto-trigger comparison if profiles are selected but not yet compared
    if (
      !comparing &&
      !hasTriggered &&
      comparisonProfiles.length === 0 &&
      selectedDiscoveryProfiles.length >= 2
    ) {
      console.log(
        '[CompareProfilesScreen] Auto-triggering comparison for',
        selectedDiscoveryProfiles.length,
        'profiles',
      );

      // Map discovery profiles to saved profile IDs
      const savedProfileIds =
        savedProfiles && Array.isArray(savedProfiles)
          ? selectedDiscoveryProfiles
              .map((cp) => {
                // Find the saved profile entry by matching profileId
                const saved = savedProfiles.find(
                  (sp) => sp.profile_id === (cp as any).profile?.userId,
                );
                console.log(
                  '[CompareProfilesScreen] Mapping profile:',
                  (cp as any).profile?.userId,
                  '→ saved ID:',
                  saved?.id,
                );
                return saved?.id; // Return the saved_profiles table ID
              })
              .filter((id): id is string => id !== undefined)
          : [];

      console.log('[CompareProfilesScreen] Found saved profile IDs:', savedProfileIds);

      if (savedProfileIds.length >= 2) {
        // Use saved profile IDs for comparison - compareProfiles expects string[]
        console.log('[CompareProfilesScreen] Comparison IDs:', savedProfileIds);
        dispatch(compareProfiles(savedProfileIds));
        setHasTriggered(true); // Mark as triggered to prevent loop
      } else {
        console.warn(
          '[CompareProfilesScreen] Not enough saved profiles found. Discovery profiles must be saved first.',
        );
        Alert.alert('Profiles Not Saved', 'Please save the profiles you want to compare first.', [
          { text: 'OK' },
        ]);
        setHasTriggered(true); // Prevent repeated alerts
      }
    }
    // Reset trigger flag if profiles change
    else if (selectedDiscoveryProfiles.length === 0) {
      setHasTriggered(false);
    }
    // Show alert only if no profiles selected anywhere and we haven't shown it yet
    else if (
      !comparing &&
      !hasTriggered &&
      comparisonProfiles.length === 0 &&
      selectedDiscoveryProfiles.length === 0
    ) {
      Alert.alert(
        'No Profiles Selected',
        'Please select 2-4 profiles from the Discover or Saved Profiles screens to compare.',
        [{ text: 'OK' }]
      );
      setHasTriggered(true); // Prevent repeated alerts
    }
  }, [
    comparing,
    comparisonProfiles.length,
    selectedDiscoveryProfiles.length,
    savedProfiles?.length,
    hasTriggered,
    dispatch,
  ]);

  /**
   * Show compatibility breakdown for two profiles
   */
  const handleShowBreakdown = async (profile1: CompareProfile, profile2: CompareProfile) => {
    try {
      setLoadingBreakdown(true);
      const breakdown = await compatibilityAPI.calculateCompatibility(
        profile1.profile_id,
        profile2.profile_id
      );
      setSelectedBreakdown(breakdown);
      setSelectedPairNames({
        profile1: profile1.firstName,
        profile2: profile2.firstName,
      });
      setShowBreakdownModal(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to calculate compatibility breakdown. Please try again.', [
        { text: 'OK' },
      ]);
      console.error('Compatibility calculation error:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  /**
   * Remove profile from comparison
   */
  const handleRemoveProfile = useCallback(
    (profileId: string) => {
      const remainingProfiles = comparisonProfiles.filter((p) => p.id !== profileId);

      if (remainingProfiles.length < 2) {
        Alert.alert(
          'Minimum Profiles Required',
          'You need at least 2 profiles to compare. Returning to previous screen.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Convert remaining profiles to IDs for comparison
      const ids = remainingProfiles.map((p) => p.id);
      dispatch(compareProfiles(ids));
    },
    [dispatch, comparisonProfiles],
  );

  /**
   * Render loading state
   */
  if (comparing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading comparison...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render empty state
   */
  if (comparisonProfiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="compare" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Profiles to Compare</Text>
          <Text style={styles.emptySubtitle}>
            Select 2-4 profiles from Discover or Saved Profiles to start comparing
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="compare-profiles-screen">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="compare" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Compare Profiles</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {comparisonProfiles.length} profile{comparisonProfiles.length !== 1 ? 's' : ''} selected
        </Text>
      </View>

      {/* Compatibility Scores (only for 2 profiles) */}
      {comparisonProfiles.length === 2 && (
        <View style={styles.compatibilitySection}>
          <Text style={styles.compatibilitySectionTitle}>Compatibility Analysis</Text>
          <TouchableOpacity
            testID="compatibility-breakdown-button"
            style={styles.compatibilityCard}
            onPress={() => handleShowBreakdown(comparisonProfiles[0], comparisonProfiles[1])}
            disabled={loadingBreakdown}
          >
            <View style={styles.compatibilityHeader}>
              <Icon name="chart-donut" size={24} color={colors.primary} />
              <Text style={styles.compatibilityTitle}>
                {comparisonProfiles[0].firstName} & {comparisonProfiles[1].firstName}
              </Text>
            </View>
            <Text style={styles.compatibilitySubtitle}>
              Tap to see detailed compatibility breakdown
            </Text>
            {loadingBreakdown && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Comparison Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {/* Attribute Labels Column */}
        <View style={styles.attributeColumn}>
          <View style={styles.profileHeaderPlaceholder} />
          {COMPARISON_ATTRIBUTES.map((attr, index) => (
            <View key={index} style={styles.attributeRow}>
              <Icon name={attr.icon} size={20} color={colors.text.secondary} />
              <Text style={styles.attributeLabel}>{attr.label}</Text>
            </View>
          ))}
        </View>

        {/* Profile Columns */}
        {comparisonProfiles.map((compareProfile) => (
          <View key={compareProfile.id} style={styles.profileColumn}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileHeaderContent}>
                {renderSourceBadge()}
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{compareProfile.firstName?.[0]}</Text>
                </View>
                <Text style={styles.profileName} numberOfLines={1}>
                  {compareProfile.firstName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveProfile(compareProfile.id)}
                style={styles.removeButton}
              >
                <Icon name="close" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Profile Attributes */}
            {COMPARISON_ATTRIBUTES.map((attr, attrIndex) => {
              const value = attr.getValue(compareProfile);
              const displayValue = attr.format ? attr.format(value) : value;

              return (
                <View key={attrIndex} style={styles.attributeValue}>
                  <Text style={styles.attributeValueText} numberOfLines={2}>
                    {displayValue}
                  </Text>
                </View>
              );
            })}

            {/* Saved Profile Metadata */}
            {compareProfile.folder && (
              <View style={localStyles.savedMetadata}>
                <View style={localStyles.metadataRow}>
                  <Icon name="folder" size={16} color={colors.text.secondary} />
                  <Text style={localStyles.metadataText}>{compareProfile.folder}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Footer Help Text */}
      <View style={styles.footer}>
        <Icon name="information" size={16} color={colors.text.secondary} />
        <Text style={styles.footerText}>Scroll horizontally to compare profiles side-by-side</Text>
      </View>

      {/* Compatibility Breakdown Modal */}
      <CompatibilityBreakdownModal
        visible={showBreakdownModal}
        breakdown={selectedBreakdown}
        profile1Name={selectedPairNames?.profile1 || ''}
        profile2Name={selectedPairNames?.profile2 || ''}
        onClose={() => {
          setShowBreakdownModal(false);
          setSelectedBreakdown(null);
          setSelectedPairNames(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  compatibilitySection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  compatibilitySectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  compatibilityCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  compatibilityTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  compatibilitySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  horizontalScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  attributeColumn: {
    width: 140,
    marginRight: spacing.md,
  },
  profileHeaderPlaceholder: {
    height: 100,
    marginBottom: spacing.sm,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 60,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  attributeLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  profileColumn: {
    width: 180,
    marginRight: spacing.md,
  },
  profileHeader: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    height: 100,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  profileHeaderContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  profileName: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attributeValue: {
    height: 60,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    justifyContent: 'center',
  },
  attributeValueText: {
    ...typography.body2,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});

/**
 * Local styles for source badges and saved metadata
 */
const localStyles = StyleSheet.create({
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
    alignSelf: 'center',
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savedMetadata: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

export default CompareProfilesScreen;
