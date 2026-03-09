/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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

type Step = 'disclosure' | 'fcra_disclosure' | 'consent' | 'signature' | 'submitted';

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
      setStep('fcra_disclosure');
    } else if (step === 'fcra_disclosure') {
      setStep('consent');
    } else if (step === 'consent' && allConsentsGiven) {
      setStep('signature');
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    if (step === 'fcra_disclosure') {
      setStep('disclosure');
    } else if (step === 'consent') {
      setStep('fcra_disclosure');
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

  // Rejected - Show FCRA-compliant adverse action notice
  if (isRejected) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, styles.iconError]}>
              <Icon name="shield-alert" size={48} color={colors.error} />
            </View>
            <Text style={styles.title}>Background Check Results</Text>
            <Text style={styles.subtitle}>
              We were unable to approve your background check at this time.
            </Text>
          </View>

          {/* FCRA Adverse Action Notice */}
          <View
            style={styles.adverseActionCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel="Important Notice: Pre-Adverse Action Disclosure under the Fair Credit Reporting Act"
          >
            <Text style={styles.adverseActionTitle}>
              Pre-Adverse Action Notice
            </Text>
            <Text style={styles.adverseActionText}>
              In accordance with the Fair Credit Reporting Act (FCRA), we are providing you with this
              notice because information in a consumer report obtained from a consumer reporting agency
              may be used in making a decision that affects you.
            </Text>
          </View>

          {/* Consumer Reporting Agency Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consumer Reporting Agency</Text>
            <Text style={styles.agencyText}>
              The background check was conducted by:
            </Text>
            <View style={styles.agencyInfo}>
              <Text style={styles.agencyName}>Certn</Text>
              <Text style={styles.agencyContact}>Website: www.certn.co</Text>
              <Text style={styles.agencyContact}>Email: support@certn.co</Text>
              <Text style={styles.agencyContact}>Phone: 1-888-902-3786</Text>
            </View>
            <Text style={[styles.agencyText, { marginTop: spacing.sm }]}>
              The consumer reporting agency did not make the decision to take this action and cannot
              provide you with the specific reasons why this action was taken.
            </Text>
          </View>

          {/* Your Rights Under FCRA */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Rights Under FCRA</Text>
            <View style={styles.rightItem}>
              <Icon name="file-document-outline" size={20} color={colors.primary} />
              <Text style={styles.rightText}>
                You have the right to obtain a free copy of your consumer report from the reporting
                agency within 60 days.
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Icon name="shield-check-outline" size={20} color={colors.primary} />
              <Text style={styles.rightText}>
                You have the right to dispute directly with the consumer reporting agency the accuracy
                or completeness of any information provided by them.
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Icon name="information-outline" size={20} color={colors.primary} />
              <Text style={styles.rightText}>
                A summary of your rights under FCRA is available from the Consumer Financial Protection
                Bureau at www.consumerfinance.gov/learnmore.
              </Text>
            </View>
          </View>

          {/* Appeal Instructions */}
          <View style={styles.appealCard}>
            <Icon name="message-text-outline" size={24} color={colors.info} />
            <View style={styles.appealContent}>
              <Text style={styles.appealTitle}>Need Help or Want to Appeal?</Text>
              <Text style={styles.appealText}>
                If you believe there is an error in your background check or would like to discuss your
                results, please contact our support team:
              </Text>
              <Text style={styles.appealContact}>Email: support@conest.app</Text>
              <Text style={styles.appealContact}>Phone: 1-800-CONEST-1</Text>
              <Text style={[styles.appealText, { marginTop: spacing.sm }]}>
                You may also resubmit your background check after resolving any discrepancies with the
                consumer reporting agency.
              </Text>
            </View>
          </View>

          <Button
            mode="contained"
            onPress={() => {
              // Reset to allow retry
              setStep('disclosure');
            }}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="refresh"
          >
            Try Again
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()} style={styles.backButton}>
            Go Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

  // CMP-13: Standalone FCRA Disclosure — 15 U.S.C. § 1681b(b)(2)(A)
  // This must be a document consisting SOLELY of the disclosure, separate from consent.
  if (step === 'fcra_disclosure') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Disclosure Regarding Background Investigation</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fcraDisclosureText}>
              CoNest, Inc. ("the Company") may obtain information about you from a third-party
              consumer reporting agency for housing eligibility purposes. Thus, you may be the
              subject of a "consumer report" which may include information about your character,
              general reputation, personal characteristics, and mode of living. These reports may
              contain information regarding your criminal history, social security verification,
              motor vehicle records, credit history, and other background information.
            </Text>

            <Text style={[styles.fcraDisclosureText, { marginTop: spacing.md }]}>
              The consumer report will be obtained from Certn, Inc. You may contact them at:
            </Text>
            <Text style={styles.fcraDisclosureText}>
              Certn, Inc.{'\n'}
              Website: www.certn.co{'\n'}
              Email: support@certn.co{'\n'}
              Phone: 1-888-902-3786
            </Text>

            <Text style={[styles.fcraDisclosureText, { marginTop: spacing.md }]}>
              Under the Fair Credit Reporting Act ("FCRA"), before we can obtain a consumer report
              about you for housing purposes, we must have your written authorization. By proceeding
              to the next step, you will be asked to provide that authorization.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            I Have Read This Disclosure
          </Button>
          <Button mode="text" onPress={handleBack} style={styles.backButton}>
            Back
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
  iconError: {
    backgroundColor: `${colors.error}15`,
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
  // FCRA Adverse Action Styles
  adverseActionCard: {
    backgroundColor: `${colors.error}10`,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  adverseActionTitle: {
    ...typography.body1,
    fontWeight: '700' as const,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  adverseActionText: {
    ...typography.body2,
    color: colors.text.primary,
    lineHeight: 20,
  },
  agencyText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  agencyInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  agencyName: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  agencyContact: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rightText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  appealCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.info}10`,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  appealContent: {
    flex: 1,
  },
  appealTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  appealText: {
    ...typography.body2,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  appealContact: {
    ...typography.body2,
    fontWeight: '500' as const,
    color: colors.info,
    marginTop: 4,
  },
  // CMP-13: FCRA standalone disclosure text style
  fcraDisclosureText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 24,
  },
});

export default BackgroundCheckScreen;
