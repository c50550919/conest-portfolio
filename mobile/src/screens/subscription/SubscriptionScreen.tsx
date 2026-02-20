/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Subscription Screen
 *
 * Purpose: Display premium subscription plan and manage subscription
 * Constitution: Principle II (Child Safety - no child data in billing)
 *              Principle III (Security - secure payment handling)
 *
 * Features:
 * - Display premium plan ($4.99/month)
 * - Subscribe to premium features
 * - View current subscription status
 * - Restore previous purchases
 * - Cancel/manage subscription
 *
 * Premium Features:
 * - Unlimited profile views
 * - Advanced matching filters
 * - Priority customer support
 * - Read receipts in messages
 * - Extended profile visibility
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GooglePlayBillingService, {
  BillingSubscription,
  SubscriptionStatus,
  PRODUCT_SKUS,
} from '../../services/billing/GooglePlayBillingService';

const PREMIUM_FEATURES = [
  {
    icon: 'eye-outline',
    title: 'Unlimited Profile Views',
    description: 'Browse as many profiles as you want without restrictions',
  },
  {
    icon: 'filter-variant',
    title: 'Advanced Filters',
    description: 'Find your perfect roommate with detailed matching criteria',
  },
  {
    icon: 'star-outline',
    title: 'Priority Support',
    description: '24/7 customer support with priority response times',
  },
  {
    icon: 'email-check-outline',
    title: 'Read Receipts',
    description: 'Know when your messages have been read',
  },
  {
    icon: 'account-check-outline',
    title: 'Extended Visibility',
    description: 'Get 3x more profile views from potential roommates',
  },
];

const SubscriptionScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    initializeBilling();

    return () => {
      // Cleanup: Don't end connection here as it might be used elsewhere
    };
  }, []);

  const initializeBilling = async () => {
    try {
      setLoading(true);

      // Initialize billing
      await GooglePlayBillingService.initConnection();

      // Fetch subscription products
      const subscriptions = await GooglePlayBillingService.getSubscriptions();
      if (subscriptions.length > 0) {
        setSubscription(subscriptions[0]);
      }

      // Check current subscription status
      const currentStatus = await GooglePlayBillingService.checkSubscriptionStatus();
      setStatus(currentStatus);
    } catch (error: any) {
      console.error('Error initializing billing:', error);
      Alert.alert('Error', 'Failed to load subscription information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setPurchasing(true);

      const result = await GooglePlayBillingService.purchaseSubscription(
        PRODUCT_SKUS.PREMIUM_MONTHLY,
      );

      if (result.success) {
        Alert.alert('Success!', 'Your subscription is now active. Enjoy premium features!', [
          {
            text: 'OK',
            onPress: () => {
              // Refresh subscription status
              initializeBilling();
            },
          },
        ]);
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error || 'Unable to complete purchase. Please try again.',
        );
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);

      const purchases = await GooglePlayBillingService.restorePurchases();

      if (purchases.length > 0) {
        // Refresh subscription status
        await initializeBilling();
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      status?.expiresAt
        ? `Your subscription will remain active until ${new Date(status.expiresAt).toLocaleDateString()}. After cancellation, you will not be charged again.`
        : 'You can cancel your subscription through your device\'s subscription settings.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const url = Platform.select({
                ios: 'https://apps.apple.com/account/subscriptions',
                android: 'https://play.google.com/store/account/subscriptions',
              });
              if (url) {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert(
                    'Unable to Open',
                    Platform.OS === 'ios'
                      ? 'Go to Settings > Apple ID > Subscriptions to cancel.'
                      : 'Go to Google Play Store > Account > Subscriptions to cancel.',
                  );
                }
              }
            } catch (error) {
              console.error('Error opening subscription management:', error);
              Alert.alert('Error', 'Could not open subscription settings. Please manage your subscription through your device settings.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading subscription information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="crown-outline" size={64} color="#FFD700" />
          <Text style={styles.title}>CoNest Premium</Text>
          <Text style={styles.subtitle}>Find your perfect roommate faster</Text>
        </View>

        {/* Current Status */}
        {status?.isActive ? (
          <View style={styles.statusCard}>
            <Icon name="check-circle" size={48} color="#4CAF50" />
            <Text style={styles.statusTitle}>You're a Premium Member!</Text>
            <Text style={styles.statusDescription}>
              Your subscription is active and auto-renewing
            </Text>
            {status.expiresAt && (
              <Text style={styles.expiryText}>
                Renews on {new Date(status.expiresAt).toLocaleDateString()}
              </Text>
            )}
            <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pricingCard}>
            <Text style={styles.priceAmount}>{subscription?.localizedPrice || '$4.99'}</Text>
            <Text style={styles.pricePeriod}>per month</Text>
            <Text style={styles.priceDescription}>Cancel anytime</Text>
          </View>
        )}

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Icon name={feature.icon} size={32} color="#FF6B6B" style={styles.featureIcon} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscribe Button (only if not subscribed) */}
        {!status?.isActive && (
          <TouchableOpacity
            style={[styles.subscribeButton, purchasing && styles.subscribeButtonDisabled]}
            onPress={handleSubscribe}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="star" size={24} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Restore Purchases Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#666666" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Terms & Privacy */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </Text>
          <Text style={styles.legalText}>
            Subscription automatically renews unless cancelled at least 24 hours before the end of
            the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  statusDescription: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  manageButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#666666',
    marginTop: 4,
  },
  priceDescription: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  legalSection: {
    marginTop: 16,
  },
  legalText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});

export default SubscriptionScreen;
