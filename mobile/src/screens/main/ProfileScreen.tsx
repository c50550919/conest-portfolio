/**
 * CoNest Profile Screen
 * User profile, settings, verification status, and account management
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';

const ProfileScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SM</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={20} color={colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Sarah Martinez</Text>
          <Text style={styles.userEmail}>sarah.martinez@email.com</Text>
          <View style={styles.memberSinceContainer}>
            <Icon name="calendar-check" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.memberSinceText}>Member since Dec 2024</Text>
          </View>
        </LinearGradient>

        {/* Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <View style={styles.verificationCard}>
            <View style={styles.verificationItem}>
              <View style={styles.verificationIcon}>
                <Icon name="check-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Identity Verified</Text>
                <Text style={styles.verificationSubtitle}>Government ID confirmed</Text>
              </View>
              <Icon name="check" size={20} color={colors.primary} />
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationIcon}>
                <Icon name="check-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Background Check</Text>
                <Text style={styles.verificationSubtitle}>Completed Jan 2025</Text>
              </View>
              <Icon name="check" size={20} color={colors.primary} />
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationIcon}>
                <Icon name="check-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Phone Verified</Text>
                <Text style={styles.verificationSubtitle}>+1 (555) 123-4567</Text>
              </View>
              <Icon name="check" size={20} color={colors.primary} />
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationIcon}>
                <Icon name="check-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Email Verified</Text>
                <Text style={styles.verificationSubtitle}>sarah.martinez@email.com</Text>
              </View>
              <Icon name="check" size={20} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Icon name="account-edit" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingSubtitle}>Update your information</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
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
            <TouchableOpacity style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: colors.error + '20' }]}>
                <Icon name="logout" size={24} color={colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Log Out</Text>
                <Text style={styles.settingSubtitle}>Sign out of your account</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
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
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
});

export default ProfileScreen;
