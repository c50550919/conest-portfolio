/**
 * OTPInput Component
 * Task: T020
 *
 * 6-digit OTP input with:
 * - Auto-advance cursor on digit entry
 * - Auto-submit when all digits entered
 * - Clipboard paste support (detect 6-digit string)
 * - iOS autofill support (textContentType="oneTimeCode")
 * - Backspace handling with focus management
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Clipboard,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { OTPInputProps, VERIFICATION_CONSTANTS } from '../../types/verification';

export const OTPInput: React.FC<OTPInputProps> = ({
  length = VERIFICATION_CONSTANTS.OTP_LENGTH,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  testID,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [localDigits, setLocalDigits] = useState<string[]>(Array(length).fill(''));

  // Sync external value with local state
  useEffect(() => {
    const digits = value.split('').slice(0, length);
    const paddedDigits = [...digits, ...Array(length - digits.length).fill('')];
    setLocalDigits(paddedDigits);
  }, [value, length]);

  // Focus first input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [disabled]);

  const handleChange = (text: string, index: number) => {
    // Check for paste (multi-character input)
    if (text.length > 1) {
      // Extract only digits
      const pastedDigits = text.replace(/\D/g, '').slice(0, length);

      if (pastedDigits.length === length) {
        // Full code pasted
        const newDigits = pastedDigits.split('');
        setLocalDigits(newDigits);
        onChange(pastedDigits);

        // Move focus to last input and trigger complete
        inputRefs.current[length - 1]?.focus();
        onComplete?.(pastedDigits);
        return;
      } else if (pastedDigits.length > 0) {
        // Partial paste - just take first character
        const digit = pastedDigits[0];
        updateDigit(digit, index);
        return;
      }
    }

    // Single character input
    const digit = text.replace(/\D/g, '');
    if (digit.length === 1) {
      updateDigit(digit, index);
    }
  };

  const updateDigit = (digit: string, index: number) => {
    const newDigits = [...localDigits];
    newDigits[index] = digit;
    setLocalDigits(newDigits);

    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check for completion
    if (newValue.length === length && !newValue.includes('')) {
      onComplete?.(newValue);
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!localDigits[index] && index > 0) {
        // Current field is empty, go to previous and clear it
        const newDigits = [...localDigits];
        newDigits[index - 1] = '';
        setLocalDigits(newDigits);
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current field
        const newDigits = [...localDigits];
        newDigits[index] = '';
        setLocalDigits(newDigits);
        onChange(newDigits.join(''));
      }
    }
  };

  const handleFocus = async (index: number) => {
    // Check clipboard for OTP code on first focus
    if (index === 0 && Platform.OS !== 'web') {
      try {
        const clipboardContent = await Clipboard.getString();
        if (clipboardContent && /^\d{6}$/.test(clipboardContent)) {
          handleChange(clipboardContent, 0);
        }
      } catch {
        // Clipboard access denied or unavailable
      }
    }
  };

  const getBorderColor = (index: number): string => {
    if (error) {
      return colors.error;
    }
    if (localDigits[index]) {
      return colors.primary;
    }
    return colors.border.medium;
  };

  return (
    <View style={styles.container} testID={testID}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            testID={testID ? `${testID}-input-${index}` : undefined}
            style={[
              styles.input,
              {
                borderColor: getBorderColor(index),
              },
              disabled && styles.inputDisabled,
            ]}
            value={localDigits[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={length} // Allow paste of full code
            editable={!disabled}
            selectTextOnFocus
            textContentType="oneTimeCode" // iOS autofill
            autoComplete={index === 0 ? 'sms-otp' : 'off'} // Android autofill
            accessibilityLabel={`Verification code digit ${index + 1} of ${length}`}
            accessibilityHint="Enter a single digit"
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    backgroundColor: colors.border.light,
    opacity: 0.6,
  },
});

export default OTPInput;
