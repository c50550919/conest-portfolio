/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest Household Screen
 * Roommate management, expenses, schedule coordination
 *
 * Constitution: Principle I (Child Safety - NO child PII displayed)
 * Constitution: Principle IV (Performance - <500ms load time)
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HouseholdStackParamList } from '../../navigation/HouseholdNavigator';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { RootState, AppDispatch } from '../../store';
import {
  fetchMyHousehold,
  fetchExpenses,
  fetchRecentTransactions,
  fetchUpcomingPayments,
  splitRent,
} from '../../store/slices/householdSlice';
import { Member, Expense } from '../../types/household';

const HouseholdScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<HouseholdStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  const { household, members, expenses, recentTransactions, loading, error } = useSelector(
    (state: RootState) => state.household,
  );

  const [refreshing, setRefreshing] = useState(false);

  // Log state changes for debugging
  useEffect(() => {
    console.log('[HouseholdScreen] State changed:', {
      hasHousehold: !!household,
      householdId: household?.id,
      householdName: household?.name,
      membersCount: members?.length,
      loading,
      error,
    });
  }, [household, members, loading, error]);

  // Fetch household data on mount
  useEffect(() => {
    loadHouseholdData();
  }, []);

  const loadHouseholdData = async () => {
    console.log('[HouseholdScreen] loadHouseholdData called');
    try {
      console.log('[HouseholdScreen] Dispatching fetchMyHousehold...');
      const result = await dispatch(fetchMyHousehold()).unwrap();
      console.log('[HouseholdScreen] fetchMyHousehold result:', JSON.stringify(result, null, 2));
      if (result.household) {
        console.log('[HouseholdScreen] Household found, fetching expenses/transactions...');
        // Fetch expenses and transactions in parallel
        await Promise.all([
          dispatch(fetchExpenses({ householdId: result.household.id, refresh: true })),
          dispatch(fetchRecentTransactions(result.household.id)),
          dispatch(fetchUpcomingPayments(result.household.id)),
        ]);
        console.log('[HouseholdScreen] All data loaded successfully');
      } else {
        console.log('[HouseholdScreen] No household in result');
      }
    } catch (err) {
      console.error('[HouseholdScreen] Failed to load household data:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHouseholdData();
    setRefreshing(false);
  }, []);

  const handleSplitRent = async () => {
    if (!household) {
      return;
    }

    Alert.alert(
      'Split Rent',
      `Split ${formatCurrency(household.monthlyRent)} among ${household.totalMembers} members?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Split',
          onPress: async () => {
            try {
              const today = new Date();
              const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

              await dispatch(
                splitRent({
                  householdId: household.id,
                  amount: household.monthlyRent,
                  dueDate: nextMonth.toISOString().split('T')[0],
                  splitMethod: 'equal',
                })
              ).unwrap();

              Alert.alert('Success', 'Rent split created successfully');
              await dispatch(fetchExpenses({ householdId: household.id, refresh: true }));
            } catch (err: any) {
              Alert.alert('Error', err || 'Failed to split rent');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getInitials = (firstName: string, lastName?: string): string => {
    if (lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return firstName.substring(0, 2).toUpperCase();
  };

  // Show loading state on initial load
  if (loading && !household) {
    return (
      <SafeAreaView style={styles.container} testID="household-screen">
        <View style={styles.centerContainer} testID="household-loading-state">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading household...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no household found
  if (!household && !loading) {
    return (
      <SafeAreaView style={styles.container} testID="household-screen">
        <View style={styles.centerContainer} testID="empty-household-state">
          <Icon name="home-alert" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Household Found</Text>
          <Text style={styles.emptySubtitle}>You're not currently part of a household.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            testID="find-roommates-button"
            onPress={() => navigation.navigate('Discover' as never)}
          >
            <Text style={styles.primaryButtonText}>Find Roommates</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="household-screen">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header} testID="household-info">
          <View>
            <Text style={styles.householdName} testID="household-name">
              {household?.name || 'My Household'}
            </Text>
            <Text style={styles.householdSubtitle}>
              {members.length} Members • Established {formatDate(household?.establishedAt || '')}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} testID="household-settings-button">
            <Icon name="cog-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions} testID="quick-actions">
          <TouchableOpacity style={styles.actionButton} testID="add-member-button">
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="account-plus" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Add Member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            testID="documents-button"
            onPress={() => navigation.navigate('Documents')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Icon name="file-document" size={20} color={colors.secondary} />
            </View>
            <Text style={styles.actionText}>Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            testID="split-rent-button"
            onPress={handleSplitRent}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tertiary + '20' }]}>
              <Icon name="cash-multiple" size={20} color={colors.tertiary} />
            </View>
            <Text style={styles.actionText}>Split Rent</Text>
          </TouchableOpacity>
        </View>

        {/* Household Members */}
        <View testID="household-members" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Household Members</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {members.map((member: Member, index: number) => {
            const avatarColors = [
              colors.primary + '30',
              colors.secondary + '30',
              colors.tertiary + '30',
            ];
            const avatarColor = avatarColors[index % avatarColors.length];

            const roleText = member.role === 'lease-holder' ? 'Lease holder' : 'Co-tenant';
            const joinDate = formatDate(member.joinedAt);

            return (
              <View key={member.userId} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(member.firstName, member.lastName)}
                    </Text>
                  </View>
                  {member.verificationBadges?.backgroundCheckComplete && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="check-decagram" size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{member.firstName}</Text>
                    {member.isCurrentUser && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberDetails}>
                    {roleText}
                  </Text>
                  <View style={styles.memberStats}>
                    {member.verificationBadges?.backgroundCheckComplete && (
                      <View style={styles.statBadge}>
                        <Icon name="shield-check" size={14} color={colors.primary} />
                        <Text style={styles.statBadgeText}>Verified</Text>
                      </View>
                    )}
                    {member.paymentStatus?.currentMonth === 'paid' && (
                      <View style={styles.statBadge}>
                        <Icon name="check-circle" size={14} color={colors.primary} />
                        <Text style={styles.statBadgeText}>Rent Paid</Text>
                      </View>
                    )}
                    {member.paymentStatus?.currentMonth === 'overdue' && (
                      <View style={[styles.statBadge, { backgroundColor: colors.errorLight }]}>
                        <Icon name="alert-circle" size={14} color={colors.error} />
                        <Text style={[styles.statBadgeText, { color: colors.error }]}>Overdue</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.memberActions}>
                  <Icon name="dots-vertical" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Expenses Overview */}
        <View testID="expense-split-section" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <TouchableOpacity testID="view-all-expenses-button">
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {expenses.length > 0 ? (
            expenses.slice(0, 3).map((expense: Expense) => {
              const statusColor =
                expense.status === 'paid'
                  ? colors.primary
                  : expense.status === 'overdue'
                    ? colors.error
                    : colors.tertiary;

              const statusText =
                expense.status === 'paid'
                  ? 'All Paid'
                  : expense.status === 'partial'
                    ? 'Partial'
                    : expense.status === 'overdue'
                      ? 'Overdue'
                      : 'Pending';

              const currentUserSplit = expense.splits.find(
                (s) => members.find((m) => m.isCurrentUser)?.userId === s.userId
              );

              return (
                <LinearGradient
                  key={expense.id}
                  colors={[statusColor, statusColor + 'CC']}
                  style={styles.expenseCard}
                  testID={`expense-card-${expense.id}`}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.expenseHeader}>
                    <Text style={styles.expenseTitle}>
                      {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                    </Text>
                    <View style={styles.expenseStatusBadge}>
                      <Icon
                        name={
                          expense.status === 'paid'
                            ? 'check'
                            : expense.status === 'overdue'
                              ? 'alert'
                              : 'clock-outline'
                        }
                        size={14}
                        color="#FFFFFF"
                      />
                      <Text style={styles.expenseStatusText}>{statusText}</Text>
                    </View>
                  </View>
                  <View style={styles.expenseBreakdown}>
                    <View style={styles.expenseRow}>
                      <Text style={styles.expenseLabel}>Total Amount</Text>
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.totalAmount)}
                      </Text>
                    </View>
                    <View style={styles.expenseRow}>
                      <Text style={styles.expenseLabel}>Due Date</Text>
                      <Text style={styles.expenseAmount}>{formatDate(expense.dueDate)}</Text>
                    </View>
                    {currentUserSplit && (
                      <>
                        <View style={styles.expenseDivider} />
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseTotalLabel}>Your Share</Text>
                          <Text style={styles.expenseTotalAmount}>
                            {formatCurrency(currentUserSplit.amount)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </LinearGradient>
              );
            })
          ) : (
            <View style={styles.emptyState} testID="empty-expenses-state">
              <Icon name="receipt-text-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyStateText}>No expenses yet</Text>
            </View>
          )}

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <View style={styles.transactionsContainer} testID="recent-transactions">
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>

              {recentTransactions.slice(0, 3).map((transaction) => {
                const isIncoming =
                  transaction.toUserId === members.find((m) => m.isCurrentUser)?.userId;
                const fromMember = members.find((m) => m.userId === transaction.fromUserId);
                const toMember = members.find((m) => m.userId === transaction.toUserId);

                return (
                  <View
                    key={transaction.id}
                    style={styles.transactionCard}
                    testID={`transaction-card-${transaction.id}`}
                  >
                    <View style={styles.transactionIcon}>
                      <Icon
                        name={isIncoming ? 'arrow-down' : 'arrow-up'}
                        size={18}
                        color={isIncoming ? colors.primary : colors.tertiary}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.description}</Text>
                      <Text style={styles.transactionSubtitle}>
                        {isIncoming
                          ? `Received from ${fromMember?.firstName || 'Unknown'}`
                          : `Paid to ${toMember?.firstName || 'Household'}`}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: isIncoming ? colors.primary : colors.text.primary },
                      ]}
                    >
                      {isIncoming ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Schedule Overview */}
        <View testID="shared-calendar" style={[styles.section, { marginBottom: spacing.xl }]}>
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
  centerContainer: {
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
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
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
