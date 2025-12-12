/**
 * Success Fee Screen
 *
 * Purpose: Handle one-time $29 success fee payment when lease is signed
 * Constitution: Principle III (Security - secure payment handling)
 *              Principle IV (Performance - optimized purchase flow)
 *
 * Features:
 * - Display success fee ($29)
 * - One-time purchase when lease signed
 * - Payment confirmation
 * - Receipt display
 *
 * Business Logic:
 * - Only available when users have signed a lease together
 * - One-time payment per successful roommate match
 * - Contributes to platform sustainability
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GooglePlayBillingService, {
  BillingProduct,
  PRODUCT_SKUS,
} from '../../services/billing/GooglePlayBillingService';

interface SuccessFeeScreenProps {
  matchId?: string;
  roommateNames?: string[];
  leaseSignedDate?: Date;
  onPaymentComplete?: () => void;
}

const SuccessFeeScreen: React.FC<SuccessFeeScreenProps> = ({
  matchId,
  roommateNames = [],
  leaseSignedDate,
  onPaymentComplete,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [product, setProduct] = useState<BillingProduct | null>(null);
  const [paymentComplete, setPaymentComplete] = useState<boolean>(false);

  useEffect(() => {
    initializeBilling();

    return () => {
      // Cleanup
    };
  }, []);

  const initializeBilling = async () => {
    try {
      setLoading(true);

      // Initialize billing
      await GooglePlayBillingService.initConnection();

      // Fetch success fee product
      const products = await GooglePlayBillingService.getProducts();
      if (products.length > 0) {
        setProduct(products[0]);
      }
    } catch (error: any) {
      console.error('Error initializing billing:', error);
      Alert.alert('Error', 'Failed to load payment information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaySuccessFee = async () => {
    Alert.alert(
      'Confirm Payment',
      `You're about to pay a one-time success fee of ${product?.localizedPrice || '$29.00'}. This fee helps us maintain the platform and provide quality service.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              setPurchasing(true);

              const result = await GooglePlayBillingService.purchaseProduct(
                PRODUCT_SKUS.SUCCESS_FEE,
              );

              if (result.success) {
                setPaymentComplete(true);
                Alert.alert(
                  'Payment Successful!',
                  'Thank you for your payment. Your receipt has been sent to your email.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        onPaymentComplete?.();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Payment Failed',
                  result.error || 'Unable to complete payment. Please try again.',
                );
              }
            } catch (error: any) {
              console.error('Payment error:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Success State */}
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={96} color="#4CAF50" />
            <Text style={styles.successTitle}>Payment Complete!</Text>
            <Text style={styles.successMessage}>
              Your success fee has been paid. Thank you for using CoNest!
            </Text>
            <View style={styles.receiptCard}>
              <Text style={styles.receiptTitle}>Receipt</Text>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount:</Text>
                <Text style={styles.receiptValue}>{product?.localizedPrice || '$29.00'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date:</Text>
                <Text style={styles.receiptValue}>{new Date().toLocaleDateString()}</Text>
              </View>
              {matchId && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Match ID:</Text>
                  <Text style={styles.receiptValue}>{matchId}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="hand-heart" size={64} color="#FF6B6B" />
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>You've found your perfect roommate</Text>
        </View>

        {/* Roommate Info (if provided) */}
        {roommateNames.length > 0 && (
          <View style={styles.roommateCard}>
            <Icon name="account-group" size={32} color="#FF6B6B" />
            <Text style={styles.roommateTitle}>Your New Household</Text>
            {roommateNames.map((name, index) => (
              <Text key={index} style={styles.roommateName}>
                {name}
              </Text>
            ))}
            {leaseSignedDate && (
              <Text style={styles.leaseDate}>
                Lease signed: {new Date(leaseSignedDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Success Fee Information */}
        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>Success Fee</Text>
          <Text style={styles.feeAmount}>{product?.localizedPrice || '$29.00'}</Text>
          <Text style={styles.feeDescription}>One-time payment</Text>

          <View style={styles.divider} />

          <Text style={styles.infoTitle}>What's this fee for?</Text>
          <View style={styles.infoItem}>
            <Icon name="check" size={20} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>Maintains platform quality and safety</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check" size={20} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>Supports verification and background checks</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check" size={20} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>Funds customer support and development</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check" size={20} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>Only paid once per successful match</Text>
          </View>
        </View>

        {/* Payment Button */}
        <TouchableOpacity
          style={[styles.payButton, purchasing && styles.payButtonDisabled]}
          onPress={handlePaySuccessFee}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="credit-card" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.payButtonText}>Pay Success Fee</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Information Section */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            This one-time fee is charged when you and your roommate sign a lease together.
          </Text>
          <Text style={styles.legalText}>
            The fee helps us provide free verification, matching, and support services.
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
    textAlign: 'center',
  },
  roommateCard: {
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
  roommateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  roommateName: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  leaseDate: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
  },
  feeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  feeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  feeAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  feeDescription: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666666',
    flex: 1,
  },
  payButton: {
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
  payButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  legalSection: {
    marginTop: 16,
  },
  legalText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 24,
  },
  successMessage: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  receiptLabel: {
    fontSize: 16,
    color: '#666666',
  },
  receiptValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});

export default SuccessFeeScreen;
