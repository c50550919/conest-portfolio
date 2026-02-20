/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * SignaturePad Component
 * Task: T021
 *
 * Captures user signature using react-native-signature-capture.
 * Returns base64-encoded PNG image for background check consent.
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import SignatureCapture from 'react-native-signature-capture';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { SignaturePadProps } from '../../types/verification';

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignature,
  onClear,
  strokeColor = colors.text.primary,
  strokeWidth = 2,
  testID,
}) => {
  const signatureRef = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleSave = () => {
    if (signatureRef.current) {
      signatureRef.current.saveImage();
    }
  };

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.resetImage();
    }
    setHasSignature(false);
    onClear?.();
  };

  const handleSaveEvent = (result: { encoded: string; pathName: string }) => {
    if (result.encoded) {
      onSignature(result.encoded);
    }
  };

  const handleDragEvent = () => {
    setHasSignature(true);
  };

  return (
    <View testID={testID} style={styles.container}>
      {/* Instructions */}
      <View style={styles.header}>
        <Icon name="draw" size={20} color={colors.text.secondary} />
        <Text style={styles.instructions}>Sign in the box below</Text>
      </View>

      {/* Signature Canvas */}
      <View style={styles.canvasContainer}>
        <SignatureCapture
          ref={signatureRef}
          style={styles.canvas}
          onSaveEvent={handleSaveEvent}
          onDragEvent={handleDragEvent}
          saveImageFileInExtStorage={false}
          showNativeButtons={false}
          showTitleLabel={false}
          viewMode="portrait"
          strokeColor={strokeColor}
          minStrokeWidth={strokeWidth}
          maxStrokeWidth={strokeWidth + 1}
        />

        {/* Placeholder when empty */}
        {!hasSignature && (
          <View style={styles.placeholder} pointerEvents="none">
            <Icon name="signature-freehand" size={48} color={colors.text.disabled} />
            <Text style={styles.placeholderText}>Draw your signature here</Text>
          </View>
        )}

        {/* Signature line */}
        <View style={styles.signatureLine} />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID={testID ? `${testID}-clear` : undefined}
          style={styles.clearButton}
          onPress={handleClear}
          accessibilityLabel="Clear signature"
          accessibilityRole="button"
        >
          <Icon name="eraser" size={20} color={colors.text.secondary} />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID={testID ? `${testID}-save` : undefined}
          style={[styles.saveButton, !hasSignature && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasSignature}
          accessibilityLabel="Save signature"
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasSignature }}
        >
          <Icon
            name="check"
            size={20}
            color={hasSignature ? colors.surface : colors.text.disabled}
          />
          <Text style={[styles.saveButtonText, !hasSignature && styles.saveButtonTextDisabled]}>
            Save Signature
          </Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  instructions: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  canvasContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body2,
    color: colors.text.disabled,
    marginTop: spacing.sm,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    height: 1,
    backgroundColor: colors.border.light,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  clearButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  saveButtonTextDisabled: {
    color: colors.text.disabled,
  },
});

export default SignaturePad;
