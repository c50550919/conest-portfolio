/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * IncomeVerificationScreen
 * Task: T030
 *
 * Income verification via document upload:
 * 1. Select document type (pay stubs or employment letter)
 * 2. Upload required documents
 * 3. Submit for verification
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, RadioButton } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { colors, spacing, typography } from '../../theme';
import { DocumentUploader } from '../../components/verification';
import {
  uploadIncomeDocuments,
  setDocumentType,
  addDocument,
  removeDocument,
  fetchVerificationStatus,
  selectIncomeVerification,
  selectVerificationStatus,
  selectVerificationLoading,
  selectVerificationError,
  clearError,
} from '../../store/slices/verificationSlice';
import {
  IncomeVerificationProps,
  UploadedDocument,
  IncomeVerificationDocument,
  VERIFICATION_CONSTANTS,
} from '../../types/verification';
import { AppDispatch } from '../../store';

type DocumentType = 'pay_stubs' | 'employment_letter';

export const IncomeVerificationScreen: React.FC<IncomeVerificationProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const incomeState = useSelector(selectIncomeVerification);
  const status = useSelector(selectVerificationStatus);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  const [selectedType, setSelectedType] = useState<DocumentType | null>(incomeState.documentType);

  const incomeStatus = status?.income_verification_status;
  const isVerified = incomeStatus === 'verified';
  const isPending = incomeStatus === 'pending';
  const isRejected = incomeStatus === 'rejected';

  // Determine max documents based on type
  const maxDocuments = useMemo(() => {
    if (selectedType === 'pay_stubs') {
      return VERIFICATION_CONSTANTS.PAY_STUBS_COUNT;
    }
    return VERIFICATION_CONSTANTS.EMPLOYMENT_LETTER_COUNT;
  }, [selectedType]);

  // Check if ready to submit
  const canSubmit = useMemo(() => {
    if (!selectedType) {
      return false;
    }
    if (incomeState.documents.length === 0) {
      return false;
    }

    const requiredCount =
      selectedType === 'pay_stubs'
        ? VERIFICATION_CONSTANTS.PAY_STUBS_COUNT
        : VERIFICATION_CONSTANTS.EMPLOYMENT_LETTER_COUNT;

    return incomeState.documents.length >= requiredCount;
  }, [selectedType, incomeState.documents]);

  // Handle document type selection
  const handleTypeSelect = (type: DocumentType) => {
    setSelectedType(type);
    dispatch(setDocumentType(type));
  };

  // Handle document addition
  const handleAddDocument = useCallback(
    (document: UploadedDocument) => {
      dispatch(addDocument(document));
    },
    [dispatch]
  );

  // Handle document removal
  const handleRemoveDocument = useCallback(
    (documentId: string) => {
      dispatch(removeDocument(documentId));
    },
    [dispatch]
  );

  // Convert document to base64 for upload
  const convertToBase64 = async (doc: UploadedDocument): Promise<IncomeVerificationDocument> => {
    try {
      // Read file and convert to base64
      const base64Data = await RNFS.readFile(doc.uri, 'base64');

      return {
        filename: doc.name,
        contentType: doc.type,
        data: base64Data,
      };
    } catch (err) {
      throw new Error(`Failed to read file: ${doc.name}`);
    }
  };

  // Submit documents
  const handleSubmit = useCallback(async () => {
    if (!selectedType || incomeState.documents.length === 0) {
      Alert.alert('Error', 'Please select document type and upload required documents');
      return;
    }

    dispatch(clearError());

    try {
      // Convert all documents to base64
      const documentPromises = incomeState.documents.map(convertToBase64);
      const documents = await Promise.all(documentPromises);

      const result = await dispatch(
        uploadIncomeDocuments({
          documentType: selectedType,
          documents,
        })
      );

      if (uploadIncomeDocuments.fulfilled.match(result)) {
        await dispatch(fetchVerificationStatus());
        Alert.alert(
          'Documents Submitted',
          'Your income documents have been submitted for review.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.payload || 'Failed to upload documents');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process documents');
    }
  }, [dispatch, selectedType, incomeState.documents, navigation]);

  // Cleanup
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Already verified
  if (isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="currency-usd" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>Income Verified!</Text>
            <Text style={styles.subtitle}>Your income has been successfully verified.</Text>
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
  if (isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.iconContainer, styles.iconPending]}>
              <Icon name="clock-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.title}>Verification Pending</Text>
            <Text style={styles.subtitle}>
              Your income documents are being reviewed. This usually takes 1-2 business days.
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, isRejected && styles.iconError]}>
            <Icon
              name="currency-usd"
              size={48}
              color={isRejected ? colors.error : colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {isRejected ? 'Verification Not Approved' : 'Verify Your Income'}
          </Text>
          <Text style={styles.subtitle}>
            {isRejected
              ? 'Your previous submission was not approved. Please try again with valid documents.'
              : 'Upload proof of income to verify your financial stability. This is optional but helps build trust.'}
          </Text>
        </View>

        {/* Document type selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Document Type</Text>

          <TouchableOpacity
            style={[styles.typeOption, selectedType === 'pay_stubs' && styles.typeOptionSelected]}
            onPress={() => handleTypeSelect('pay_stubs')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedType === 'pay_stubs' }}
            accessibilityLabel="Recent Pay Stubs. Upload your 2 most recent pay stubs."
          >
            <RadioButton
              value="pay_stubs"
              status={selectedType === 'pay_stubs' ? 'checked' : 'unchecked'}
              onPress={() => handleTypeSelect('pay_stubs')}
              color={colors.primary}
            />
            <View style={styles.typeContent}>
              <Text style={styles.typeTitle}>Recent Pay Stubs</Text>
              <Text style={styles.typeDescription}>Upload your 2 most recent pay stubs</Text>
            </View>
            <Icon
              name="file-document-multiple"
              size={24}
              color={selectedType === 'pay_stubs' ? colors.primary : colors.text.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              selectedType === 'employment_letter' && styles.typeOptionSelected,
            ]}
            onPress={() => handleTypeSelect('employment_letter')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedType === 'employment_letter' }}
            accessibilityLabel="Employment Letter. Upload official employment verification letter."
          >
            <RadioButton
              value="employment_letter"
              status={selectedType === 'employment_letter' ? 'checked' : 'unchecked'}
              onPress={() => handleTypeSelect('employment_letter')}
              color={colors.primary}
            />
            <View style={styles.typeContent}>
              <Text style={styles.typeTitle}>Employment Letter</Text>
              <Text style={styles.typeDescription}>
                Upload official employment verification letter
              </Text>
            </View>
            <Icon
              name="file-certificate"
              size={24}
              color={selectedType === 'employment_letter' ? colors.primary : colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Document uploader */}
        {selectedType && (
          <DocumentUploader
            testID="document-uploader"
            documentType={selectedType}
            documents={incomeState.documents}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            maxDocuments={maxDocuments}
            disabled={loading}
          />
        )}

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Privacy note */}
        <View
          style={styles.privacyNote}
          accessible
          accessibilityLabel="Privacy notice: Your documents are encrypted and only used for verification purposes. They are not shared with other users."
        >
          <Icon name="lock-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.privacyText}>
            Your documents are encrypted and only used for verification purposes. They are not
            shared with other users.
          </Text>
        </View>

        {/* Submit button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit || loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          testID="submit-button"
        >
          Submit for Verification
        </Button>

        {/* Back button */}
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="back-button"
        >
          Cancel
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
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  typeContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  typeTitle: {
    ...typography.body2,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  typeDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  privacyText: {
    ...typography.caption,
    color: colors.text.secondary,
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

export default IncomeVerificationScreen;
