/**
 * DocumentUploader Component
 * Task: T022
 *
 * Handles document upload for income verification:
 * - Supports PDF, JPG, PNG, HEIC files
 * - 5MB max file size validation
 * - Pay stubs (2 files) or employment letter (1 file)
 * - Uses react-native-image-picker for file selection
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { colors, spacing, typography } from '../../theme';
import {
  DocumentUploaderProps,
  UploadedDocument,
  VERIFICATION_CONSTANTS,
} from '../../types/verification';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string): string => {
  if (type.includes('pdf')) {
    return 'file-pdf-box';
  }
  if (type.includes('image')) {
    return 'file-image';
  }
  return 'file-document';
};

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documentType,
  documents,
  onAddDocument,
  onRemoveDocument,
  maxDocuments,
  maxSizeBytes = VERIFICATION_CONSTANTS.MAX_DOCUMENT_SIZE_BYTES,
  disabled = false,
  testID,
}) => {
  const [error, setError] = useState<string | null>(null);

  const getDocumentTypeLabel = (): string => {
    return documentType === 'pay_stubs' ? 'Pay Stubs' : 'Employment Letter';
  };

  const getRequiredCountText = (): string => {
    const count = documentType === 'pay_stubs' ? 2 : 1;
    return `${count} ${count === 1 ? 'document' : 'documents'} required`;
  };

  const getRemainingText = (): string | null => {
    const remaining = maxDocuments - documents.length;
    if (remaining === 0) {
      return null;
    }
    return `${remaining} more needed`;
  };

  const validateFile = (asset: Asset): string | null => {
    // Check file size
    if (asset.fileSize && asset.fileSize > maxSizeBytes) {
      return `File too large. Maximum size is ${formatFileSize(maxSizeBytes)}`;
    }

    // Check file type
    const type = asset.type || '';
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
    if (!validTypes.some((t) => type.includes(t.split('/')[1]))) {
      return 'Invalid file type. Please upload PDF, JPG, PNG, or HEIC';
    }

    return null;
  };

  const handleAddDocument = useCallback(async () => {
    if (disabled) {
      return;
    }
    if (documents.length >= maxDocuments) {
      return;
    }

    setError(null);

    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 1,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        setError(result.errorMessage || 'Failed to select document');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        setError('No document selected');
        return;
      }

      // Validate file
      const validationError = validateFile(asset);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create document object
      const newDocument: UploadedDocument = {
        id: `doc-${Date.now()}`,
        uri: asset.uri,
        name: asset.fileName || `document-${Date.now()}`,
        size: asset.fileSize || 0,
        type: (asset.type as UploadedDocument['type']) || 'application/pdf',
        uploadStatus: 'pending',
      };

      onAddDocument(newDocument);
    } catch (err) {
      setError('Failed to select document');
    }
  }, [disabled, documents.length, maxDocuments, onAddDocument]);

  const handleRemoveDocument = (documentId: string) => {
    Alert.alert('Remove Document', 'Are you sure you want to remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemoveDocument(documentId),
      },
    ]);
  };

  const renderDocument = ({ item, index }: { item: UploadedDocument; index: number }) => {
    const getStatusIcon = (): { name: string; color: string } => {
      switch (item.uploadStatus) {
        case 'uploading':
          return { name: 'loading', color: colors.primary };
        case 'uploaded':
          return { name: 'check-circle', color: colors.success };
        case 'failed':
          return { name: 'alert-circle', color: colors.error };
        default:
          return { name: 'clock-outline', color: colors.text.secondary };
      }
    };

    const statusIcon = getStatusIcon();

    return (
      <View
        testID={testID ? `${testID}-doc-${index}` : undefined}
        style={styles.documentItem}
        accessibilityLabel={`${item.name}, ${formatFileSize(item.size)}, ${item.uploadStatus}`}
      >
        <Icon name={getFileIcon(item.type)} size={24} color={colors.primary} />

        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.documentSize}>{formatFileSize(item.size)}</Text>
        </View>

        {item.uploadStatus === 'uploading' ? (
          <View
            testID={testID ? `${testID}-doc-${index}-uploading` : undefined}
            style={styles.statusIndicator}
          >
            <Icon name={statusIcon.name} size={20} color={statusIcon.color} />
          </View>
        ) : (
          <Icon name={statusIcon.name} size={20} color={statusIcon.color} />
        )}

        {!disabled && (
          <TouchableOpacity
            testID={testID ? `${testID}-doc-${index}-remove` : undefined}
            onPress={() => handleRemoveDocument(item.id)}
            style={styles.removeButton}
            accessibilityLabel={`Remove ${item.name}`}
            accessibilityRole="button"
          >
            <Icon name="close-circle" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const canAddMore = documents.length < maxDocuments;

  return (
    <View testID={testID} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{getDocumentTypeLabel()}</Text>
        <Text style={styles.requirement}>{getRequiredCountText()}</Text>
      </View>

      {/* Document list */}
      {documents.length > 0 && (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.list}
        />
      )}

      {/* Add button */}
      {canAddMore && (
        <TouchableOpacity
          testID={testID ? `${testID}-add-button` : undefined}
          style={[styles.addButton, disabled && styles.addButtonDisabled]}
          onPress={handleAddDocument}
          disabled={disabled}
          accessibilityLabel="Add document"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityHint={`Select a ${getDocumentTypeLabel().toLowerCase()} to upload`}
        >
          <Icon
            name="plus-circle"
            size={24}
            color={disabled ? colors.text.disabled : colors.primary}
          />
          <Text style={[styles.addButtonText, disabled && styles.addButtonTextDisabled]}>
            Add Document
          </Text>
        </TouchableOpacity>
      )}

      {/* Remaining count */}
      {canAddMore && getRemainingText() && (
        <Text style={styles.remainingText}>{getRemainingText()}</Text>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* File type hints */}
      <Text style={styles.hint}>
        Accepted: PDF, JPG, PNG, HEIC (max {formatFileSize(maxSizeBytes)})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  requirement: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  list: {
    marginBottom: spacing.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    ...typography.body2,
    color: colors.text.primary,
  },
  documentSize: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statusIndicator: {
    marginRight: spacing.xs,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: `${colors.primary}10`,
    gap: spacing.sm,
  },
  addButtonDisabled: {
    borderColor: colors.border.medium,
    backgroundColor: colors.background,
  },
  addButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  addButtonTextDisabled: {
    color: colors.text.disabled,
  },
  remainingText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default DocumentUploader;
