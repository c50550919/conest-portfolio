/**
 * Verification Payment Screen
 *
 * Purpose: Handle $39 verification payment for ID verification + background check
 * Constitution: Principle II (Child Safety - no child data in billing)
 *              Principle III (Security - secure payment handling)
 *              Principle IV (Performance - <100ms UI response)
 *
 * Flow:
 * 1. Display verification fee explanation
 * 2. Show what's included (ID verification, background check, verified badge)
 * 3. Display refund policy
 * 4. Process payment via Google Play Billing
 * 5. Validate receipt with backend
 * 6. Navigate to ID verification screen on success
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
  fetchVerificationPaymentStatus,
  validateReceipt,
  selectVerificationPayment,
  selectVerificationPaymentLoading,
  selectHasPaidForVerification,
  markPaymentProcessing,
  setVerificationPaymentError,
  clearVerificationPaymentError,
} from '../../store/slices/billingSlice';
import { VERIFICATION_PRICING } from '../../config/pricing';
import type { AppDispatch } from '../../store';

// Navigation types
type RootStackParamList = {
  VerificationPayment: undefined;
  IDVerification: undefined;
  VerificationDashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const VerificationPaymentScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();

  // Redux state
  const verificationPayment = useSelector(selectVerificationPayment);
  const isLoading = useSelector(selectVerificationPaymentLoading);
  const hasPaid = useSelector(selectHasPaidForVerification);

  // Local state
  const [billingInitialized, setBillingInitialized] = useState(false);
  const [product, setProduct] = useState<BillingProduct | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Initialize billing and check payment status
  useEffect(() => {
    initializeBilling();
    dispatch(fetchVerificationPaymentStatus());

    return () => {
      // Cleanup handled by billing service
    };
  }, [dispatch]);

  // Navigate to ID verification if already paid
  useEffect(() => {
    if (hasPaid) {
      Alert.alert(
        'Already Verified',
        'You have already paid for verification. Continuing to ID verification.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('IDVerification'),
          },
        ]
      );
    }
  }, [hasPaid, navigation]);

  const initializeBilling = async () => {
    try {
      await GooglePlayBillingService.initConnection();
      setBillingInitialized(true);

      // Fetch verification product
      const products = await GooglePlayBillingService.getProducts();
      const verificationProduct = products.find(
        (p) => p.productId === PRODUCT_SKUS.VERIFICATION_PAYMENT
      );
      if (verificationProduct) {
        setProduct(verificationProduct);
      }
    } catch (error: any) {
      console.error('Error initializing billing:', error);
      dispatch(
        setVerificationPaymentError('Failed to initialize billing. Please try again.')
      );
    }
  };

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);
      dispatch(clearVerificationPaymentError());
      dispatch(markPaymentProcessing());

      // Initiate purchase via Google Play
      const result = await GooglePlayBillingService.purchaseProduct(
        PRODUCT_SKUS.VERIFICATION_PAYMENT
      );

      if (result.success && result.purchaseToken && result.transactionId) {
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
          Alert.alert(
            'Payment Successful!',
            'Your verification payment has been processed. Let\'s continue with ID verification.',
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
      console.error('Purchase error:', error);
      const message = error.message || 'An unexpected error occurred';

      // Don't show error for user cancellation
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        Alert.alert('Purchase Failed', message);
        dispatch(setVerificationPaymentError(message));
      }
    } finally {
      setPurchasing(false);
    }
  }, [dispatch, navigation, purchasing]);

  const handleRestorePurchases = useCallback(async () => {
    try {
      setPurchasing(true);
      const purchases = await GooglePlayBillingService.restorePurchases();

      const verificationPurchase = purchases.find(
        (p) => p.productId === PRODUCT_SKUS.VERIFICATION_PAYMENT
      );

      if (verificationPurchase) {
        // Validate with backend
        const result = await dispatch(
          validateReceipt({
            productId: verificationPurchase.productId,
            purchaseToken: verificationPurchase.purchaseToken || '',
            transactionId: verificationPurchase.transactionId || '',
            platform: 'android',
          })
        ).unwrap();

        if (result.valid) {
          Alert.alert('Purchase Restored', 'Your verification purchase has been restored.', [
            {
              text: 'Continue',
              onPress: () => navigation.replace('IDVerification'),
            },
          ]);
        }
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous verification purchases were found for this account.'
        );
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'Failed to restore purchases. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [dispatch, navigation]);

  // Loading state
  if (isLoading && !billingInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="shield-check" size={64} color="#4CAF50" />
          <Text style={styles.title}>Get Verified</Text>
          <Text style={styles.subtitle}>
            Verify your identity to unlock matching and messaging
          </Text>
        </View>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceAmount}>
            {product?.localizedPrice || VERIFICATION_PRICING.displayPrice}
          </Text>
          <Text style={styles.priceLabel}>One-time payment</Text>
          <Text style={styles.priceDescription}>{VERIFICATION_PRICING.description}</Text>
        </View>

        {/* What's Included */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          {VERIFICATION_PRICING.breakdown.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <Icon
                name={item.icon as any}
                size={32}
                color="#4CAF50"
                style={styles.featureIcon}
              />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDescription}>{item.description}</Text>
              </View>
            </View>
          ))}

          {/* Additional features */}
          <View style={styles.featureItem}>
            <Icon name="message-text" size={32} color="#4CAF50" style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Unlock Messaging</Text>
              <Text style={styles.featureDescription}>
                Message your matches after verification
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Icon name="gesture-swipe" size={32} color="#4CAF50" style={styles.featureIcon} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>10 Daily Swipes</Text>
              <Text style={styles.featureDescription}>
                Browse and match with verified parents
              </Text>
            </View>
          </View>
        </View>

        {/* Refund Policy */}
        <View style={styles.refundSection}>
          <Text style={styles.sectionTitle}>Refund Policy</Text>
          <View style={styles.refundCard}>
            <View style={styles.refundItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.refundText}>
                {VERIFICATION_PRICING.refundPolicy.automated_fail}
              </Text>
            </View>
            <View style={styles.refundItem}>
              <Icon name="information" size={20} color="#2196F3" />
              <Text style={styles.refundText}>
                {VERIFICATION_PRICING.refundPolicy.courtesy_30day}
              </Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {verificationPayment.error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{verificationPayment.error}</Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="shield-check" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.purchaseButtonText}>Pay & Get Verified</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={purchasing}
        >
          <Text style={styles.restoreButtonText}>Restore Previous Purchase</Text>
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
          By purchasing, you agree to our Terms of Service and Privacy Policy. Your payment
          information is handled securely by {Platform.OS === 'ios' ? 'Apple' : 'Google'} and
          is never stored by CoNest.
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
    fontSize: 32,
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
  priceCard: {
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
    color: '#4CAF50',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  priceDescription: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
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
  refundSection: {
    marginBottom: 24,
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  refundText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 12,
    flex: 1,
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
  restoreButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'underline',
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

export default VerificationPaymentScreen;
