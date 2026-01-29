/**
 * HouseholdSafetyDisclosureScreen
 *
 * Mandatory disclosure flow for household safety attestation.
 * Parents must complete this before participating in matching.
 *
 * Steps:
 * 1. Education - Explain what the disclosure covers and why
 * 2. Attestation - 4 required checkbox questions
 * 3. Signature - Electronic signature capture
 * 4. Confirmation - Success state with expiration info
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Button, Checkbox } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../theme';
import { SignaturePad } from '../../components/verification';
import {
  fetchQuestions,
  fetchDisclosureStatus,
  submitAttestation,
  setResponse,
  setSignatureData,
  clearError,
  resetForm,
  selectQuestions,
  selectResponses,
  selectSignatureData,
  selectDisclosureStatus,
  selectLoading,
  selectSubmitting,
  selectError,
  selectHasValidDisclosure,
  selectAllQuestionsAnswered,
  selectReadyToSubmit,
} from '../../store/slices/householdSafetySlice';
import { AppDispatch } from '../../store';
import { AttestationResponse } from '../../services/api/householdSafetyAPI';

type Step = 'education' | 'attestation' | 'signature' | 'confirmed';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export const HouseholdSafetyDisclosureScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const questions = useSelector(selectQuestions);
  const responses = useSelector(selectResponses);
  const signatureData = useSelector(selectSignatureData);
  const status = useSelector(selectDisclosureStatus);
  const loading = useSelector(selectLoading);
  const submitting = useSelector(selectSubmitting);
  const error = useSelector(selectError);
  const hasValidDisclosure = useSelector(selectHasValidDisclosure);
  const allQuestionsAnswered = useSelector(selectAllQuestionsAnswered);
  const readyToSubmit = useSelector(selectReadyToSubmit);

  // Local state
  const [step, setStep] = useState<Step>('education');
  const [localSignature, setLocalSignature] = useState<string | null>(null);

  // Fetch questions and status on mount
  useEffect(() => {
    dispatch(fetchQuestions());
    dispatch(fetchDisclosureStatus());
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Handle signature capture
  const handleSignature = useCallback(
    (signature: string) => {
      setLocalSignature(signature);
      dispatch(setSignatureData(signature));
    },
    [dispatch]
  );

  // Handle attestation checkbox toggle
  const handleToggleResponse = useCallback(
    (questionId: string) => {
      const currentResponse = responses[questionId];
      dispatch(setResponse({ questionId, response: !currentResponse }));
    },
    [dispatch, responses]
  );

  // Submit attestation
  const handleSubmit = useCallback(async () => {
    if (!localSignature) {
      Alert.alert('Error', 'Please provide your signature');
      return;
    }

    dispatch(clearError());

    const attestationResponses: AttestationResponse[] = questions.map((q) => ({
      questionId: q.id,
      response: responses[q.id] ?? false,
      answeredAt: new Date().toISOString(),
    }));

    const result = await dispatch(
      submitAttestation({
        attestationResponses,
        signatureData: localSignature,
      })
    );

    if (submitAttestation.fulfilled.match(result)) {
      setStep('confirmed');
    } else {
      Alert.alert('Submission Failed', result.payload || 'Please try again');
    }
  }, [dispatch, questions, responses, localSignature]);

  // Navigation helpers
  const handleNext = () => {
    if (step === 'education') {
      setStep('attestation');
    } else if (step === 'attestation' && allQuestionsAnswered) {
      setStep('signature');
    }
  };

  const handleBack = () => {
    if (step === 'attestation') {
      setStep('education');
    } else if (step === 'signature') {
      setStep('attestation');
    } else {
      navigation.goBack();
    }
  };

  // Already has valid disclosure - show success state
  if (hasValidDisclosure && step !== 'confirmed') {
    const expiresIn = status?.expiresIn ?? 0;
    const needsRenewal = status?.needsRenewal ?? false;

    return (
      <SafeAreaView style={styles.container} testID="disclosure-screen">
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="shield-check" size={48} color={colors.success} />
            </View>
            <Text style={styles.title} testID="disclosure-complete-title">Disclosure Complete</Text>
            <Text style={styles.subtitle}>
              Your household safety disclosure is on file and valid.
            </Text>
            {needsRenewal && (
              <View style={styles.renewalWarning} testID="renewal-warning">
                <Icon name="clock-alert-outline" size={20} color={colors.warning} />
                <Text style={styles.renewalText} testID="expiration-date">
                  Expires in {expiresIn} days. Please renew soon.
                </Text>
              </View>
            )}
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
              contentStyle={styles.buttonContent}
              testID="done-button"
            >
              Done
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Confirmed step - show success
  if (step === 'confirmed') {
    return (
      <SafeAreaView style={styles.container} testID="disclosure-screen">
        <View style={styles.content} testID="confirmation-success">
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="shield-check" size={48} color={colors.success} />
            </View>
            <Text style={styles.title} testID="confirmation-title">Disclosure Submitted!</Text>
            <Text style={styles.subtitle} testID="expiration-date">
              Thank you for completing the household safety disclosure.
              Your attestation is valid for 1 year.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
              contentStyle={styles.buttonContent}
              testID="done-button"
            >
              Continue
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Education step
  if (step === 'education') {
    return (
      <SafeAreaView style={styles.container} testID="disclosure-screen">
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} testID="education-content">
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="shield-home" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title} testID="education-title">Household Safety Disclosure</Text>
            <Text style={styles.subtitle}>
              CoNest prioritizes child safety. This disclosure helps protect all families
              using our platform.
            </Text>
          </View>

          {/* Why this matters */}
          <View
            style={styles.card}
            accessible
            accessibilityLabel="Why this disclosure matters"
          >
            <Text style={styles.cardTitle}>Why This Matters</Text>
            <View style={styles.bulletPoint}>
              <Icon name="check-circle" size={20} color={colors.primary} />
              <Text style={styles.bulletText}>
                Ensures all households meet our safety standards
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Icon name="check-circle" size={20} color={colors.primary} />
              <Text style={styles.bulletText}>
                Protects children in shared living arrangements
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Icon name="check-circle" size={20} color={colors.primary} />
              <Text style={styles.bulletText}>
                Creates accountability and trust between families
              </Text>
            </View>
          </View>

          {/* What you'll attest to */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What You'll Confirm</Text>
            <Text style={styles.cardText}>
              You will be asked to confirm the following about your household:
            </Text>
            <View style={styles.bulletPoint}>
              <Icon name="shield-alert-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.bulletText}>
                No juvenile legal history involving serious offenses
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Icon name="gavel" size={20} color={colors.text.secondary} />
              <Text style={styles.bulletText}>
                No active court orders restricting contact with minors
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Icon name="account-child" size={20} color={colors.text.secondary} />
              <Text style={styles.bulletText}>
                No substantiated CPS findings in the past 5 years
              </Text>
            </View>
          </View>

          {/* Legal notice */}
          <View style={[styles.card, styles.legalCard]}>
            <Icon name="information" size={20} color={colors.info} />
            <Text style={styles.legalText}>
              This disclosure is made under penalty of perjury. Providing false information
              may result in account termination and potential legal liability.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
            loading={loading}
            testID="education-continue-button"
          >
            I Understand - Continue
          </Button>
          <Button mode="text" onPress={handleBack} style={styles.backButton} testID="back-button">
            Go Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Attestation step
  if (step === 'attestation') {
    return (
      <SafeAreaView style={styles.container} testID="disclosure-screen">
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} testID="attestation-content">
          <View style={styles.header}>
            <Text style={styles.stepIndicator} testID="step-indicator">Step 2 of 3</Text>
            <Text style={styles.title} testID="attestation-title">Household Attestation</Text>
            <Text style={styles.subtitle}>
              Please answer each question truthfully. All questions must be answered.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading questions...</Text>
            </View>
          ) : (
            questions.map((question, index) => (
              <View
                key={question.id}
                style={[
                  styles.questionCard,
                  responses[question.id] === question.expectedAnswer && styles.questionAnswered,
                ]}
                testID={`attestation-question-${question.id}`}
              >
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>{index + 1}.</Text>
                  <Text style={styles.questionText}>{question.text}</Text>
                </View>
                {question.helpText && (
                  <Text style={styles.helpText}>{question.helpText}</Text>
                )}
                <View style={styles.responseRow}>
                  <Checkbox.Item
                    label={question.expectedAnswer ? 'I confirm' : 'No'}
                    status={responses[question.id] === question.expectedAnswer ? 'checked' : 'unchecked'}
                    onPress={() => handleToggleResponse(question.id)}
                    mode="android"
                    position="leading"
                    labelStyle={styles.checkboxLabel}
                    style={styles.checkbox}
                    accessibilityLabel={question.text}
                    testID={`question-checkbox-${question.id}`}
                  />
                </View>
              </View>
            ))
          )}

          {error && (
            <View style={styles.errorCard} testID="error-message">
              <Icon name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
            disabled={!allQuestionsAnswered}
            testID="attestation-continue-button"
          >
            Continue to Signature
          </Button>
          <Button mode="text" onPress={handleBack} style={styles.backButton} testID="back-button">
            Go Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Signature step
  if (step === 'signature') {
    return (
      <SafeAreaView style={styles.container} testID="disclosure-screen">
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} testID="signature-content">
          <View style={styles.header}>
            <Text style={styles.stepIndicator} testID="step-indicator">Step 3 of 3</Text>
            <Text style={styles.title} testID="signature-title">Electronic Signature</Text>
            <Text style={styles.subtitle}>
              Please provide your signature to complete the disclosure.
            </Text>
          </View>

          {/* Legal attestation text */}
          <View style={styles.legalAttestation} testID="legal-attestation">
            <Text style={styles.legalAttestationText}>
              By signing below, I certify under penalty of perjury that all information
              provided in this disclosure is true, accurate, and complete to the best
              of my knowledge. I understand that providing false information may result
              in immediate account termination and potential civil liability for any
              damages caused to other users.
            </Text>
          </View>

          {/* Signature pad */}
          <View style={styles.signatureContainer} testID="signature-pad">
            <SignaturePad
              onSignature={handleSignature}
              onClear={() => {
                setLocalSignature(null);
                dispatch(setSignatureData(''));
              }}
            />
          </View>

          {localSignature && (
            <View style={styles.signatureConfirm} testID="signature-captured">
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.signatureConfirmText}>Signature captured</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorCard} testID="error-message">
              <Icon name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            contentStyle={styles.buttonContent}
            loading={submitting}
            disabled={!localSignature || submitting}
            testID="submit-button"
          >
            Submit Disclosure
          </Button>
          <Button
            mode="text"
            onPress={handleBack}
            style={styles.backButton}
            disabled={submitting}
            testID="back-button"
          >
            Go Back
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepIndicator: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconSuccess: {
    backgroundColor: `${colors.success}20`,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletText: {
    ...typography.body1,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  legalCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.info}10`,
    borderColor: colors.info,
  },
  legalText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
    marginLeft: spacing.sm,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  questionAnswered: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}05`,
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  questionNumber: {
    ...typography.h4,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  questionText: {
    ...typography.body1,
    color: colors.text.primary,
    flex: 1,
  },
  helpText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },
  responseRow: {
    marginTop: spacing.sm,
  },
  checkbox: {
    paddingLeft: 0,
  },
  checkboxLabel: {
    ...typography.body1,
    color: colors.text.primary,
  },
  legalAttestation: {
    backgroundColor: `${colors.warning}10`,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  legalAttestationText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
  },
  signatureContainer: {
    marginBottom: spacing.lg,
  },
  signatureConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  signatureConfirmText: {
    ...typography.body1,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}10`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    flex: 1,
    marginLeft: spacing.sm,
  },
  renewalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  renewalText: {
    ...typography.body1,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});

export default HouseholdSafetyDisclosureScreen;
