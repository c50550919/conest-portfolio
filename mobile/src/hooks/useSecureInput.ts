/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Secure Input Hook
 * Handles secure text input with validation and sanitization
 */

import { useState, useCallback } from 'react';

interface SecureInputOptions {
  maxLength?: number;
  minLength?: number;
  allowedCharacters?: RegExp;
  sanitize?: boolean;
  validateOnChange?: boolean;
}

interface SecureInputReturn {
  value: string;
  error: string | null;
  isValid: boolean;
  setValue: (value: string) => void;
  clear: () => void;
  validate: () => boolean;
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check for malicious patterns
 */
function hasMaliciousPattern(input: string): boolean {
  const patterns = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Hook for secure text input
 */
export function useSecureInput(options: SecureInputOptions = {}): SecureInputReturn {
  const {
    maxLength,
    minLength,
    allowedCharacters,
    sanitize = true,
    validateOnChange = true,
  } = options;

  const [value, setValueState] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    setError(null);

    // Check for malicious patterns
    if (hasMaliciousPattern(value)) {
      setError('Invalid characters detected');
      return false;
    }

    // Check length constraints
    if (maxLength && value.length > maxLength) {
      setError(`Maximum length is ${maxLength} characters`);
      return false;
    }

    if (minLength && value.length < minLength) {
      setError(`Minimum length is ${minLength} characters`);
      return false;
    }

    // Check allowed characters
    if (allowedCharacters && !allowedCharacters.test(value)) {
      setError('Contains invalid characters');
      return false;
    }

    return true;
  }, [value, maxLength, minLength, allowedCharacters]);

  const setValue = useCallback(
    (newValue: string) => {
      let processedValue = newValue;

      // Sanitize if enabled
      if (sanitize) {
        processedValue = sanitizeInput(processedValue);
      }

      // Apply max length constraint immediately
      if (maxLength && processedValue.length > maxLength) {
        processedValue = processedValue.slice(0, maxLength);
      }

      setValueState(processedValue);

      // Validate on change if enabled
      if (validateOnChange) {
        // Use a temporary value for validation
        const tempValue = value;
        setValueState(processedValue);
        validate();
        if (error) {
          setValueState(tempValue);
        }
      }
    },
    [sanitize, maxLength, validateOnChange, validate, value, error]
  );

  const clear = useCallback(() => {
    setValueState('');
    setError(null);
  }, []);

  return {
    value,
    error,
    isValid: !error && value.length > 0,
    setValue,
    clear,
    validate,
  };
}

/**
 * Hook for password input with strength validation
 */
export function useSecurePasswordInput() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const calculateStrength = useCallback((pwd: string): number => {
    let score = 0;

    if (pwd.length >= 8) {
      score += 20;
    }
    if (pwd.length >= 12) {
      score += 20;
    }
    if (/[a-z]/.test(pwd)) {
      score += 15;
    }
    if (/[A-Z]/.test(pwd)) {
      score += 15;
    }
    if (/\d/.test(pwd)) {
      score += 15;
    }
    if (/[^a-zA-Z0-9]/.test(pwd)) {
      score += 15;
    }

    return Math.min(100, score);
  }, []);

  const setPasswordValue = useCallback(
    (value: string) => {
      setPassword(value);
      setStrength(calculateStrength(value));

      if (confirmPassword && value !== confirmPassword) {
        setError('Passwords do not match');
      } else {
        setError(null);
      }
    },
    [confirmPassword, calculateStrength]
  );

  const setConfirmPasswordValue = useCallback(
    (value: string) => {
      setConfirmPassword(value);

      if (password && value !== password) {
        setError('Passwords do not match');
      } else {
        setError(null);
      }
    },
    [password]
  );

  const validate = useCallback((): boolean => {
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (strength < 60) {
      setError('Password is too weak');
      return false;
    }

    setError(null);
    return true;
  }, [password, confirmPassword, strength]);

  return {
    password,
    confirmPassword,
    strength,
    error,
    isValid: !error && password === confirmPassword && strength >= 60,
    setPassword: setPasswordValue,
    setConfirmPassword: setConfirmPasswordValue,
    validate,
  };
}

/**
 * Hook for email input with validation
 */
export function useSecureEmailInput() {
  const secureInput = useSecureInput({
    sanitize: true,
    validateOnChange: true,
  });

  const validateEmail = useCallback((): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(secureInput.value)) {
      return false;
    }

    return secureInput.validate();
  }, [secureInput]);

  return {
    ...secureInput,
    validate: validateEmail,
  };
}
