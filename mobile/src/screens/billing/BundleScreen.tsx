/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Bundle Screen
 *
 * Purpose: Display and process bundle purchase ($99 = verification + 6 months premium)
 * Constitution: Principle II (Child Safety - no child data in billing)
 *              Principle III (Security - secure payment handling)
 *              Principle IV (Performance - <100ms UI response)
 *
 * Features:
 * - Compare individual vs bundle pricing
 * - Highlight savings (23% off)
 * - Process bundle purchase via Google Play Billing
 * - Validate receipt with backend
 * - Navigate to verification flow on success
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import GooglePlayBillingService, {
  PRODUCT_SKUS,
  BillingProduct,
} from '../../services/billing/GooglePlayBillingService';
import {
  validateReceipt,
  selectVerificationPaymentLoading,
  selectHasPaidForVerification,
  setBundlePurchaseStatus,
  setBundlePurchaseError,
  clearBundlePurchaseError,
  selectBundlePurchase,
} from '../../store/slices/billingSlice';
import {
  VERIFICATION_PRICING,
  PREMIUM_PRICING,
  BUNDLE_PRICING,
} from '../../config/pricing';
import type { AppDispatch } from '../../store';

// Navigation types
type RootStackParamList = {
  Bundle: undefined;
  VerificationPayment: undefined;
  IDVerification: undefined;
  VerificationDashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BundleScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();

  // Redux state
  const bundlePurchase = useSelector(selectBundlePurchase);
  const hasPaidVerification = useSelector(selectHasPaidForVerification);

  // Local state
  const [billingInitialized, setBillingInitialized] = useState(false);
  const [bundleProduct, setBundleProduct] = useState<BillingProduct | null>(null);
  const [verificationProduct, setVerificationProduct] = useState<BillingProduct | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'bundle' | 'individual'>('bundle');

  // Initialize billing
  useEffect(() => {
    initializeBilling();
  }, []);

  // Redirect if already paid
  useEffect(() => {
    if (hasPaidVerification) {
      Alert.alert(
        'Already Verified',
        'You have already paid for verification.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('IDVerification'),
          },
        ]
      );
    }
  }, [hasPaidVerification, navigation]);

  const initializeBilling = async () => {
    try {
      await GooglePlayBillingService.initConnection();
      setBillingInitialized(true);

      // Fetch products
      const products = await GooglePlayBillingService.getProducts();

      const bundle = products.find(
        (p) => p.productId === PRODUCT_SKUS.VERIFICATION_PREMIUM_BUNDLE
      );
      const verification = products.find(
        (p) => p.productId === PRODUCT_SKUS.VERIFICATION_PAYMENT
      );

      if (bundle) setBundleProduct(bundle);
      if (verification) setVerificationProduct(verification);
    } catch (error: any) {
      console.error('Error initializing billing:', error);
      dispatch(setBundlePurchaseError('Failed to initialize billing. Please try again.'));
    }
  };

  const handleBundlePurchase = useCallback(async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);
      dispatch(clearBundlePurchaseError());
      dispatch(setBundlePurchaseStatus('purchasing'));

      // Purchase bundle via Google Play
      const result = await GooglePlayBillingService.purchaseProduct(
        PRODUCT_SKUS.VERIFICATION_PREMIUM_BUNDLE
      );

      if (result.success && result.purchaseToken && result.transactionId) {
        dispatch(setBundlePurchaseStatus('validating'));

        // Validate receipt with backend
        const validationResult = await dispatch(
          validateReceipt({
            productId: result.productId,
            purchaseToken: result.purchaseToken,
            transactionId: result.transactionId,
            platform: 'android',
          })
        ).unwrap();

        if (validationResult.valid) {
          dispatch(setBundlePurchaseStatus('succeeded'));
          Alert.alert(
            'Bundle Activated!',
            'Your verification and 6-month premium subscription are now active. Let\'s verify your identity.',
            [
              {
                text: 'Continue',
                onPress: () => navigation.replace('IDVerification'),
              },
            ]
          );
        } else {
          throw new Error('Receipt validation failed');
        }
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Bundle purchase error:', error);
      const message = error.message || 'An unexpected error occurred';

      if (!message.includes('cancelled') && !message.includes('canceled')) {
        Alert.alert('Purchase Failed', message);
        dispatch(setBundlePurchaseError(message));
        dispatch(setBundlePurchaseStatus('failed'));
      } else {
        dispatch(setBundlePurchaseStatus('idle'));
      }
    } finally {
      setPurchasing(false);
    }
  }, [dispatch, navigation, purchasing]);

  const handleVerificationOnly = useCallback(() => {
    navigation.navigate('VerificationPayment');
  }, [navigation]);

  // Loading state
  if (!billingInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading pricing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="star-circle" size={64} color="#FFD700" />
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Get verified and start matching with compatible roommates
          </Text>
        </View>

        {/* Bundle Option - Recommended */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedOption === 'bundle' && styles.optionCardSelected,
          ]}
          onPress={() => setSelectedOption('bundle')}
          activeOpacity={0.8}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>{BUNDLE_PRICING.recommendedText}</Text>
          </View>

          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Icon name="package-variant" size={28} color="#4CAF50" />
              <Text style={styles.optionTitle}>Bundle</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceStrike}>
                ${BUNDLE_PRICING.savings.regularPrice.toFixed(2)}
              </Text>
              <Text style={styles.price}>
                {bundleProduct?.localizedPrice || BUNDLE_PRICING.displayPrice}
              </Text>
            </View>
          </View>

          <View style={styles.savingsBadge}>
            <Icon name="tag" size={16} color="#FFFFFF" />
            <Text style={styles.savingsText}>{BUNDLE_PRICING.savings.displaySavings}</Text>
          </View>

          <Text style={styles.optionDescription}>{BUNDLE_PRICING.description}</Text>

          <View style={styles.featuresList}>
            {BUNDLE_PRICING.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={18} color="#4CAF50" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {selectedOption === 'bundle' && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </TouchableOpacity>

        {/* Verification Only Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedOption === 'individual' && styles.optionCardSelected,
          ]}
          onPress={() => setSelectedOption('individual')}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Icon name="shield-check" size={28} color="#2196F3" />
              <Text style={styles.optionTitle}>Verification Only</Text>
            </View>
            <Text style={styles.price}>
              {verificationProduct?.localizedPrice || VERIFICATION_PRICING.displayPrice}
            </Text>
          </View>

          <Text style={styles.optionDescription}>{VERIFICATION_PRICING.description}</Text>

          <View style={styles.featuresList}>
            {VERIFICATION_PRICING.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={18} color="#2196F3" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.upgradeNote}>
            Premium can be added later at ${PREMIUM_PRICING.monthlyAmount}/mo
          </Text>

          {selectedOption === 'individual' && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={24} color="#2196F3" />
            </View>
          )}
        </TouchableOpacity>

        {/* Comparison Summary */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Quick Comparison</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Verification + 6 months Premium:</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonItem}>
              Individual: ${BUNDLE_PRICING.savings.regularPrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonItem}>
              Bundle: ${BUNDLE_PRICING.amount.toFixed(2)}
            </Text>
            <Text style={styles.comparisonSavings}>
              Save ${BUNDLE_PRICING.savings.savingsAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {bundlePurchase.error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{bundlePurchase.error}</Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            purchasing && styles.purchaseButtonDisabled,
            selectedOption === 'individual' && styles.purchaseButtonSecondary,
          ]}
          onPress={selectedOption === 'bundle' ? handleBundlePurchase : handleVerificationOnly}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon
                name={selectedOption === 'bundle' ? 'star-circle' : 'shield-check'}
                size={24}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.purchaseButtonText}>
                {selectedOption === 'bundle'
                  ? `Get Bundle - ${bundleProduct?.localizedPrice || BUNDLE_PRICING.displayPrice}`
                  : `Get Verified - ${verificationProduct?.localizedPrice || VERIFICATION_PRICING.displayPrice}`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Icon name="lock" size={16} color="#999999" />
          <Text style={styles.securityText}>
            Secure payment via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
          </Text>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By purchasing, you agree to our Terms of Service and Privacy Policy.
          Bundle includes 6 months of premium that will not auto-renew.
        </Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceStrike: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    flex: 1,
  },
  upgradeNote: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  comparisonCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  comparisonItem: {
    fontSize: 14,
    color: '#666666',
  },
  comparisonSavings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  purchaseButtonSecondary: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityText: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BundleScreen;
