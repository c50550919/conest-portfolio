/**
 * CoNest Household Screen
 * Roommate management, expenses, schedule coordination
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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';

const HouseholdScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.householdName}>Mountain View House</Text>
            <Text style={styles.householdSubtitle}>3 Members • Established Dec 2024</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="cog-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="account-plus" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Add Member</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Icon name="file-document" size={20} color={colors.secondary} />
            </View>
            <Text style={styles.actionText}>Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: colors.tertiary + '20' }]}>
              <Icon name="cash-multiple" size={20} color={colors.tertiary} />
            </View>
            <Text style={styles.actionText}>Payments</Text>
          </TouchableOpacity>
        </View>

        {/* Household Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Household Members</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {/* Member Card 1 - Current User */}
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                <Text style={styles.avatarText}>SM</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName}>Sarah Martinez</Text>
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              </View>
              <Text style={styles.memberDetails}>2 children (5, 8) • Lease holder</Text>
              <View style={styles.memberStats}>
                <View style={styles.statBadge}>
                  <Icon name="shield-check" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Verified</Text>
                </View>
                <View style={styles.statBadge}>
                  <Icon name="check-circle" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Rent Paid</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.memberActions}>
              <Icon name="dots-vertical" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Member Card 2 */}
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary + '30' }]}>
                <Text style={styles.avatarText}>JK</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>Jennifer Kim</Text>
              <Text style={styles.memberDetails}>1 child (3) • Joined Jan 2025</Text>
              <View style={styles.memberStats}>
                <View style={styles.statBadge}>
                  <Icon name="shield-check" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Verified</Text>
                </View>
                <View style={styles.statBadge}>
                  <Icon name="check-circle" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Rent Paid</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.memberActions}>
              <Icon name="dots-vertical" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Member Card 3 */}
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tertiary + '30' }]}>
                <Text style={styles.avatarText}>ML</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>Maria Lopez</Text>
              <Text style={styles.memberDetails}>1 child (6) • Joined Dec 2024</Text>
              <View style={styles.memberStats}>
                <View style={styles.statBadge}>
                  <Icon name="shield-check" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Verified</Text>
                </View>
                <View style={styles.statBadge}>
                  <Icon name="check-circle" size={14} color={colors.primary} />
                  <Text style={styles.statBadgeText}>Rent Paid</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.memberActions}>
              <Icon name="dots-vertical" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expenses Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.expenseCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.expenseHeader}>
              <Text style={styles.expenseTitle}>January 2025</Text>
              <View style={styles.expenseStatusBadge}>
                <Icon name="check" size={14} color="#FFFFFF" />
                <Text style={styles.expenseStatusText}>All Paid</Text>
              </View>
            </View>
            <View style={styles.expenseBreakdown}>
              <View style={styles.expenseRow}>
                <Text style={styles.expenseLabel}>Rent</Text>
                <Text style={styles.expenseAmount}>$2,400</Text>
              </View>
              <View style={styles.expenseRow}>
                <Text style={styles.expenseLabel}>Utilities</Text>
                <Text style={styles.expenseAmount}>$180</Text>
              </View>
              <View style={styles.expenseRow}>
                <Text style={styles.expenseLabel}>Internet</Text>
                <Text style={styles.expenseAmount}>$60</Text>
              </View>
              <View style={styles.expenseDivider} />
              <View style={styles.expenseRow}>
                <Text style={styles.expenseTotalLabel}>Your Share</Text>
                <Text style={styles.expenseTotalAmount}>$880</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Recent Transactions */}
          <View style={styles.transactionsContainer}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>

            <View style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Icon name="arrow-up" size={18} color={colors.primary} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Rent Payment - January</Text>
                <Text style={styles.transactionSubtitle}>Paid to Sarah Martinez</Text>
              </View>
              <Text style={styles.transactionAmount}>$800</Text>
            </View>

            <View style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Icon name="arrow-down" size={18} color={colors.tertiary} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Utilities Split</Text>
                <Text style={styles.transactionSubtitle}>Received from Maria L.</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: colors.primary }]}>+$60</Text>
            </View>

            <View style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Icon name="arrow-up" size={18} color={colors.primary} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Internet Bill</Text>
                <Text style={styles.transactionSubtitle}>Monthly payment</Text>
              </View>
              <Text style={styles.transactionAmount}>$20</Text>
            </View>
          </View>
        </View>

        {/* Schedule Overview */}
        <View style={[styles.section, { marginBottom: spacing.xl }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shared Schedule</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleCard}>
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleDate}>
                <Text style={styles.scheduleDateNumber}>15</Text>
                <Text style={styles.scheduleDateMonth}>JAN</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleTitle}>Sarah's Turn - Kitchen</Text>
                <Text style={styles.scheduleSubtitle}>Cleaning schedule</Text>
              </View>
              <View style={[styles.scheduleIcon, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="broom" size={20} color={colors.primary} />
              </View>
            </View>

            <View style={styles.scheduleItem}>
              <View style={styles.scheduleDate}>
                <Text style={styles.scheduleDateNumber}>17</Text>
                <Text style={styles.scheduleDateMonth}>JAN</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleTitle}>Household Meeting</Text>
                <Text style={styles.scheduleSubtitle}>7:00 PM - Living room</Text>
              </View>
              <View style={[styles.scheduleIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Icon name="account-group" size={20} color={colors.secondary} />
              </View>
            </View>

            <View style={styles.scheduleItem}>
              <View style={styles.scheduleDate}>
                <Text style={styles.scheduleDateNumber}>20</Text>
                <Text style={styles.scheduleDateMonth}>JAN</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleTitle}>Rent Due</Text>
                <Text style={styles.scheduleSubtitle}>Monthly payment</Text>
              </View>
              <View style={[styles.scheduleIcon, { backgroundColor: colors.tertiary + '20' }]}>
                <Icon name="currency-usd" size={20} color={colors.tertiary} />
              </View>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  householdName: {
    ...typography.h5,
    color: colors.text.primary,
  },
  householdSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
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
  seeAllText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  memberAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h6,
    color: colors.text.primary,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  memberName: {
    ...typography.subtitle1,
    color: colors.text.primary,
  },
  youBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  youBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  memberDetails: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  memberStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    gap: 2,
  },
  statBadgeText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  memberActions: {
    padding: spacing.sm,
  },
  expenseCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  expenseTitle: {
    ...typography.h6,
    color: '#FFFFFF',
  },
  expenseStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  expenseStatusText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expenseBreakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  expenseLabel: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  expenseAmount: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expenseDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.sm,
  },
  expenseTotalLabel: {
    ...typography.subtitle1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expenseTotalAmount: {
    ...typography.h6,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transactionsContainer: {
    marginTop: spacing.sm,
  },
  transactionsTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  transactionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  transactionAmount: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '700',
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  scheduleDate: {
    width: 48,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  scheduleDateNumber: {
    ...typography.h6,
    color: colors.text.primary,
    fontWeight: '700',
  },
  scheduleDateMonth: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  scheduleSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HouseholdScreen;
