/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest Profile Screen
 * User profile, settings, verification status, and account management
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import {
  fetchVerificationStatus,
  selectVerificationStatus,
  selectVerificationScore,
} from '../../store/slices/verificationSlice';
import tokenStorage from '../../services/tokenStorage';
import profileAPI from '../../services/api/profileAPI';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  const verificationStatus = useSelector(selectVerificationStatus);
  const verificationScore = useSelector(selectVerificationScore);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  // Debug logging
  console.log('[ProfileScreen] User from Redux:', user);

  // Fetch verification status on mount
  useEffect(() => {
    dispatch(fetchVerificationStatus());
  }, [dispatch]);

  // Show loading state if user data is not yet available
  if (!user) {
    console.log('[ProfileScreen] No user data found in Redux, showing loading state');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate dynamic values from user data with fallbacks
  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email
        ? user.email.substring(0, 2).toUpperCase()
        : 'U';
  const fullName =
    user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'User';

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear tokens from secure storage
            await tokenStorage.clearTokens();
            // Clear Redux state
            dispatch(logout());
            console.log('[ProfileScreen] Logged out successfully');
          } catch (error) {
            console.error('[ProfileScreen] Logout error:', error);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileAPI.deleteProfile();
              await tokenStorage.clearTokens();
              dispatch(logout());
              console.log('[ProfileScreen] Account deleted successfully');
            } catch (error) {
              console.error('[ProfileScreen] Delete account error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="profile-screen">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <View testID="profile-photo" style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={20} color={colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text testID="profile-name" style={styles.userName}>
            {fullName}
          </Text>
          <Text testID="profile-email" style={styles.userEmail}>
            {user.email}
          </Text>
          <View style={styles.memberSinceContainer}>
            <Icon name="calendar-check" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.memberSinceText}>Member since Dec 2024</Text>
          </View>
        </LinearGradient>

        {/* Verification Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verification Status</Text>
            <TouchableOpacity
              testID="manage-verification-button"
              onPress={() => navigation.navigate('Verification', { screen: 'Dashboard' })}
              style={styles.manageButton}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
              <Icon name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.verificationCard}
            onPress={() => navigation.navigate('Verification', { screen: 'Dashboard' })}
            activeOpacity={0.7}
            accessibilityLabel="View verification details"
            accessibilityRole="button"
          >
            {/* Verification Score */}
            <View style={styles.verificationScoreContainer}>
              <View style={styles.verificationScoreCircle}>
                <Text style={styles.verificationScoreText}>{verificationScore}</Text>
                <Text style={styles.verificationScoreLabel}>Score</Text>
              </View>
              <View style={styles.verificationScoreInfo}>
                <Text style={styles.verificationScoreTitle}>
                  {verificationScore >= 85
                    ? 'Fully Verified'
                    : verificationScore >= 50
                      ? 'Partially Verified'
                      : 'Verification Needed'}
                </Text>
                <Text style={styles.verificationScoreSubtitle}>
                  {verificationScore >= 85
                    ? 'All verifications complete'
                    : 'Complete more verifications to increase trust'}
                </Text>
              </View>
            </View>

            <View style={styles.verificationDivider} />

            {/* Phone Verification */}
            <View style={styles.verificationItem}>
              <View
                style={[
                  styles.verificationIcon,
                  {
                    backgroundColor: verificationStatus?.phone_verified
                      ? `${colors.primary}15`
                      : `${colors.warning}15`,
                  },
                ]}
              >
                <Icon
                  name={verificationStatus?.phone_verified ? 'check-circle' : 'clock-outline'}
                  size={24}
                  color={verificationStatus?.phone_verified ? colors.primary : colors.warning}
                />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Phone Verified</Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus?.phone_verified ? 'Verified' : 'Not verified'}
                </Text>
              </View>
              <Icon
                name={verificationStatus?.phone_verified ? 'check' : 'chevron-right'}
                size={20}
                color={verificationStatus?.phone_verified ? colors.primary : colors.text.secondary}
              />
            </View>

            {/* Email Verification */}
            <View style={styles.verificationItem}>
              <View
                style={[
                  styles.verificationIcon,
                  {
                    backgroundColor: verificationStatus?.email_verified
                      ? `${colors.primary}15`
                      : `${colors.warning}15`,
                  },
                ]}
              >
                <Icon
                  name={verificationStatus?.email_verified ? 'check-circle' : 'clock-outline'}
                  size={24}
                  color={verificationStatus?.email_verified ? colors.primary : colors.warning}
                />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Email Verified</Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus?.email_verified ? user.email : 'Not verified'}
                </Text>
              </View>
              <Icon
                name={verificationStatus?.email_verified ? 'check' : 'chevron-right'}
                size={20}
                color={verificationStatus?.email_verified ? colors.primary : colors.text.secondary}
              />
            </View>

            {/* ID Verification */}
            <View style={styles.verificationItem}>
              <View
                style={[
                  styles.verificationIcon,
                  {
                    backgroundColor:
                      verificationStatus?.id_verification_status === 'approved'
                        ? `${colors.primary}15`
                        : verificationStatus?.id_verification_status === 'pending'
                          ? `${colors.warning}15`
                          : `${colors.text.secondary}15`,
                  },
                ]}
              >
                <Icon
                  name={
                    verificationStatus?.id_verification_status === 'approved'
                      ? 'check-circle'
                      : verificationStatus?.id_verification_status === 'pending'
                        ? 'clock-outline'
                        : 'card-account-details-outline'
                  }
                  size={24}
                  color={
                    verificationStatus?.id_verification_status === 'approved'
                      ? colors.primary
                      : verificationStatus?.id_verification_status === 'pending'
                        ? colors.warning
                        : colors.text.secondary
                  }
                />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Identity Verified</Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus?.id_verification_status === 'approved'
                    ? 'Government ID confirmed'
                    : verificationStatus?.id_verification_status === 'pending'
                      ? 'Verification in progress'
                      : 'Not started'}
                </Text>
              </View>
              <Icon
                name={
                  verificationStatus?.id_verification_status === 'approved'
                    ? 'check'
                    : 'chevron-right'
                }
                size={20}
                color={
                  verificationStatus?.id_verification_status === 'approved'
                    ? colors.primary
                    : colors.text.secondary
                }
              />
            </View>

            {/* Background Check */}
            <View style={[styles.verificationItem, { borderBottomWidth: 0 }]}>
              <View
                style={[
                  styles.verificationIcon,
                  {
                    backgroundColor:
                      verificationStatus?.background_check_status === 'approved'
                        ? `${colors.primary}15`
                        : verificationStatus?.background_check_status === 'pending'
                          ? `${colors.warning}15`
                          : `${colors.text.secondary}15`,
                  },
                ]}
              >
                <Icon
                  name={
                    verificationStatus?.background_check_status === 'approved'
                      ? 'check-circle'
                      : verificationStatus?.background_check_status === 'pending'
                        ? 'clock-outline'
                        : 'shield-account-outline'
                  }
                  size={24}
                  color={
                    verificationStatus?.background_check_status === 'approved'
                      ? colors.primary
                      : verificationStatus?.background_check_status === 'pending'
                        ? colors.warning
                        : colors.text.secondary
                  }
                />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Background Check</Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus?.background_check_status === 'approved'
                    ? 'Cleared'
                    : verificationStatus?.background_check_status === 'pending'
                      ? 'In progress (24-48 hours)'
                      : 'Not started'}
                </Text>
              </View>
              <Icon
                name={
                  verificationStatus?.background_check_status === 'approved'
                    ? 'check'
                    : 'chevron-right'
                }
                size={20}
                color={
                  verificationStatus?.background_check_status === 'approved'
                    ? colors.primary
                    : colors.text.secondary
                }
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section} testID="settings-section">
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity testID="edit-profile-button" style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="account-edit" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingSubtitle}>Update your information</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity testID="settings-button" style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="lock" size={24} color={colors.secondary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Password & Security</Text>
                <Text style={styles.settingSubtitle}>Change password, 2FA</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="shield-account" size={24} color={colors.tertiary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacy Settings</Text>
                <Text style={styles.settingSubtitle}>Control who sees your info</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="credit-card" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Payment Methods</Text>
                <Text style={styles.settingSubtitle}>Manage cards and billing</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="bell" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Match alerts, messages</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border.light, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="map-marker" size={24} color={colors.secondary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Location Services</Text>
                <Text style={styles.settingSubtitle}>Find nearby matches</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: colors.border.light, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="email" size={24} color={colors.tertiary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Email Preferences</Text>
                <Text style={styles.settingSubtitle}>Newsletter, updates</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="translate" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Language</Text>
                <Text style={styles.settingSubtitle}>English (US)</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="help-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Help Center</Text>
                <Text style={styles.settingSubtitle}>FAQs, guides, support</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="message-alert" size={24} color={colors.secondary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Contact Support</Text>
                <Text style={styles.settingSubtitle}>Get help from our team</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="file-document" size={24} color={colors.tertiary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Terms of Service</Text>
                <Text style={styles.settingSubtitle}>Legal agreements</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="shield-check" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingSubtitle}>How we protect your data</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              testID="logout-button"
              style={styles.settingItem}
              onPress={handleLogout}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.error + '20' }]}>
                <Icon name="logout" size={24} color={colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Log Out</Text>
                <Text style={styles.settingSubtitle}>Sign out of your account</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="delete-account-button"
              style={styles.settingItem}
              onPress={handleDeleteAccount}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.error + '20' }]}>
                <Icon name="delete-forever" size={24} color={colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Delete Account</Text>
                <Text style={styles.settingSubtitle}>Permanently remove account</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>CoNest v1.0.0</Text>
          <Text style={styles.versionSubtext}>Build 2025.01.07</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    ...typography.h5,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  userEmail: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberSinceText: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageButtonText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  verificationScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verificationScoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  verificationScoreText: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  verificationScoreLabel: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },
  verificationScoreInfo: {
    flex: 1,
  },
  verificationScoreTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  verificationScoreSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  verificationDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  verificationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  verificationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  verificationSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  versionText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  versionSubtext: {
    ...typography.caption,
    color: colors.text.hint,
    marginTop: spacing.xxs,
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
});

export default ProfileScreen;
