/**
 * BackgroundCheckScreen
 * Task: T029
 *
 * Background check with consent flow:
 * 1. Disclosure - Show what the check includes
 * 2. Consent - Get user agreement
 * 3. Signature - Capture electronic signature
 * 4. Submit - Send to Certn
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Button, Checkbox } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { SignaturePad } from '../../components/verification';
import {
  initiateBackgroundCheck,
  setConsentGiven,
  setSignatureData,
  fetchVerificationStatus,
  selectBackgroundCheck,
  selectVerificationStatus,
  selectVerificationLoading,
  selectVerificationError,
  clearError,
} from '../../store/slices/verificationSlice';
import {
  BackgroundCheckProps,
  BackgroundCheckState,
  ConsentCheckItem,
} from '../../types/verification';
import { AppDispatch } from '../../store';

const CONSENT_ITEMS: ConsentCheckItem[] = [
  {
    id: 'consent1',
    text: 'I authorize CoNest to obtain a consumer report (background check) about me.',
    checked: false,
    required: true,
  },
  {
    id: 'consent2',
    text: 'I understand that the report may include criminal history, identity verification, and other relevant information.',
    checked: false,
    required: true,
  },
  {
    id: 'consent3',
    text: 'I certify that the information I have provided is true and complete.',
    checked: false,
    required: true,
  },
  {
    id: 'consent4',
    text: 'I understand I can request a copy of the report and dispute any inaccuracies.',
    checked: false,
    required: true,
  },
];

type Step = 'disclosure' | 'consent' | 'signature' | 'submitted';

export const BackgroundCheckScreen: React.FC<BackgroundCheckProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const bgCheckState = useSelector(selectBackgroundCheck);
  const status = useSelector(selectVerificationStatus);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  const [step, setStep] = useState<Step>('disclosure');
  const [consentItems, setConsentItems] = useState(CONSENT_ITEMS);
  const [signature, setSignature] = useState<string | null>(null);

  const bgStatus = status?.background_check_status;
  const isApproved = bgStatus === 'approved';
  const isPending = bgStatus === 'pending';
  const isRejected = bgStatus === 'rejected' || bgStatus === 'consider';

  // Check all consents given
  const allConsentsGiven = consentItems.every((item) => !item.required || item.checked);

  // Toggle consent checkbox
  const toggleConsent = (id: string) => {
    setConsentItems((items) =>
      items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  // Handle signature capture
  const handleSignature = useCallback(
    (signatureData: string) => {
      setSignature(signatureData);
      dispatch(setSignatureData(signatureData));
    },
    [dispatch],
  );

  // Submit background check
  const handleSubmit = useCallback(async () => {
    if (!signature) {
      Alert.alert('Error', 'Please provide your signature');
      return;
    }

    dispatch(clearError());
    dispatch(setConsentGiven(true));

    const result = await dispatch(
      initiateBackgroundCheck({
        consentTimestamp: new Date().toISOString(),
        signatureData: signature,
      })
    );

    if (initiateBackgroundCheck.fulfilled.match(result)) {
      setStep('submitted');
      await dispatch(fetchVerificationStatus());
    } else {
      Alert.alert('Error', result.payload || 'Failed to submit background check');
    }
  }, [dispatch, signature]);

  // Navigate to next step
  const handleNext = () => {
    if (step === 'disclosure') {
      setStep('consent');
    } else if (step === 'consent' && allConsentsGiven) {
      setStep('signature');
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    if (step === 'consent') {
      setStep('disclosure');
    } else if (step === 'signature') {
      setStep('consent');
    } else {
      navigation.goBack();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Already approved
  if (isApproved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="shield-check" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>Background Check Approved!</Text>
            <Text style={styles.subtitle}>
              Your background check has been verified successfully.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Done
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Pending state
  if (isPending || step === 'submitted') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconPending]}>
              <Icon name="clock-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.title}>Background Check Pending</Text>
            <Text style={styles.subtitle}>
              Your background check has been submitted and is being processed.
              {bgCheckState.estimatedCompletion &&
                ` Estimated completion: ${bgCheckState.estimatedCompletion}`}
            </Text>
            <Button
              mode="outlined"
              onPress={() => dispatch(fetchVerificationStatus())}
              loading={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              icon="refresh"
            >
              Refresh Status
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()} style={styles.backButton}>
              Go Back
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Disclosure step
  if (step === 'disclosure') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="shield-search" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Background Check</Text>
            <Text style={styles.subtitle}>
              CoNest uses background checks to help ensure safety for all families.
            </Text>
          </View>

          {/* What's included */}
          <View
            style={styles.card}
            accessible
            accessibilityLabel="What's included: National Criminal Database Search, Sex Offender Registry Check, Identity Verification, Address History"
          >
            <Text style={styles.cardTitle}>What's Included</Text>
            <View style={styles.checkItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checkText}>National Criminal Database Search</Text>
            </View>
            <View style={styles.checkItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checkText}>Sex Offender Registry Check</Text>
            </View>
            <View style={styles.checkItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checkText}>Identity Verification</Text>
            </View>
            <View style={styles.checkItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.checkText}>Address History</Text>
            </View>
          </View>

          {/* Processing time */}
          <View
            style={styles.infoCard}
            accessible
            accessibilityLabel="Processing Time: Most checks complete within 24 hours. You'll be notified once results are available."
          >
            <Icon name="clock-outline" size={24} color={colors.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Processing Time</Text>
              <Text style={styles.infoText}>
                Most checks complete within 24 hours. You'll be notified once results are available.
              </Text>
            </View>
          </View>

          {isRejected && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>
                Your previous background check was not approved. You may try again.
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continue
          </Button>
          <Button mode="text" onPress={handleBack} style={styles.backButton}>
            Cancel
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Consent step
  if (step === 'consent') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Authorization & Consent</Text>
            <Text style={styles.subtitle}>Please review and agree to the following:</Text>
          </View>

          <View style={styles.consentList} accessibilityRole="list">
            {consentItems.map((item, index) => (
              <View
                key={item.id}
                style={styles.consentItem}
                accessible
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                accessibilityLabel={item.text}
                accessibilityHint={`Consent item ${index + 1} of ${consentItems.length}. Double tap to ${item.checked ? 'uncheck' : 'check'}.`}
              >
                <Checkbox
                  status={item.checked ? 'checked' : 'unchecked'}
                  onPress={() => toggleConsent(item.id)}
                  color={colors.primary}
                />
                <Text style={styles.consentText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!allConsentsGiven}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            I Agree - Continue
          </Button>
          <Button mode="text" onPress={handleBack} style={styles.backButton}>
            Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Signature step
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Electronic Signature</Text>
          <Text style={styles.subtitle}>Please sign below to authorize the background check.</Text>
        </View>

        <SignaturePad
          testID="signature-pad"
          onSignature={handleSignature}
          onClear={() => setSignature(null)}
        />

        {error && (
          <View style={[styles.errorContainer, { marginTop: spacing.md }]}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View
          style={styles.legalText}
          accessible
          accessibilityLabel="Legal notice: By signing above, I acknowledge that I have read and agree to the authorization and disclosure provided, and I authorize CoNest and its designated agents to obtain a consumer report (background check) about me."
        >
          <Text style={styles.legalTextContent}>
            By signing above, I acknowledge that I have read and agree to the authorization and
            disclosure provided, and I authorize CoNest and its designated agents to obtain a
            consumer report (background check) about me.
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={!signature || loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Submit Background Check
        </Button>
        <Button mode="text" onPress={handleBack} style={styles.backButton}>
          Back
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconSuccess: {
    backgroundColor: `${colors.success}15`,
  },
  iconPending: {
    backgroundColor: `${colors.warning}15`,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  checkText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.info}10`,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body2,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  infoText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  consentList: {
    marginBottom: spacing.lg,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  consentText: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
    marginTop: 2,
  },
  legalText: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  legalTextContent: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
  },
  button: {
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  buttonContent: {
    height: 56,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  statusContainer: {
    alignItems: 'center',
  },
});

export default BackgroundCheckScreen;
