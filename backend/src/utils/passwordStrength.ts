/**
 * Password Strength Validation
 * Enforces strong password requirements and checks against common passwords
 */

import { securityConfig, commonPasswords } from '../config/security';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
  suggestions: string[];
}

/**
 * Validate password strength against security requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const config = securityConfig.password;

  // Check minimum length
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  } else {
    score += 20;
  }

  // Check maximum length
  if (password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }

  // Check for uppercase letters
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (config.requireUppercase) {
    score += 15;
  }

  // Check for lowercase letters
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (config.requireLowercase) {
    score += 15;
  }

  // Check for numbers
  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (config.requireNumbers) {
    score += 15;
  }

  // Check for special characters
  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (config.requireSpecialChars) {
    score += 15;
  }

  // Check against common passwords
  if (isCommonPassword(password)) {
    errors.push('Password is too common. Please choose a more unique password');
    score = Math.max(0, score - 30);
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeating characters');
    score -= 10;
  }

  // Check for sequential characters
  if (hasSequentialChars(password)) {
    suggestions.push('Avoid sequential characters (e.g., abc, 123)');
    score -= 10;
  }

  // Check for keyboard patterns
  if (hasKeyboardPattern(password)) {
    suggestions.push('Avoid keyboard patterns (e.g., qwerty, asdf)');
    score -= 10;
  }

  // Bonus for length beyond minimum
  if (password.length > config.minLength) {
    const bonus = Math.min(20, (password.length - config.minLength) * 2);
    score += bonus;
  }

  // Bonus for character diversity
  const uniqueChars = new Set(password).size;
  const diversityRatio = uniqueChars / password.length;
  if (diversityRatio > 0.7) {
    score += 10;
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  // Add suggestions based on score
  if (score < 60) {
    suggestions.push('Consider using a longer password with more variety');
    suggestions.push('Use a mix of words, numbers, and symbols');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score,
    suggestions,
  };
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return commonPasswords.some(common => lowerPassword.includes(common.toLowerCase()));
}

/**
 * Check for sequential characters (abc, 123, etc.)
 */
function hasSequentialChars(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    '0123456789',
    '9876543210',
  ];

  const lowerPassword = password.toLowerCase();

  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 3; i++) {
      const subseq = sequence.substring(i, i + 3);
      if (lowerPassword.includes(subseq)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check for common keyboard patterns
 */
function hasKeyboardPattern(password: string): boolean {
  const patterns = [
    'qwerty', 'asdfgh', 'zxcvbn',
    'qwertz', 'azerty', // International keyboards
    'qweasd', 'asdzxc', // Vertical patterns
  ];

  const lowerPassword = password.toLowerCase();
  return patterns.some(pattern => lowerPassword.includes(pattern));
}

/**
 * Generate password strength message
 */
export function getPasswordStrengthMessage(score: number): string {
  if (score >= 80) return 'Strong password';
  if (score >= 60) return 'Good password';
  if (score >= 40) return 'Fair password';
  if (score >= 20) return 'Weak password';
  return 'Very weak password';
}

/**
 * Estimate password cracking time
 */
export function estimateCrackingTime(password: string): string {
  const entropy = calculateEntropy(password);

  // Assuming 1 billion guesses per second
  const guessesPerSecond = 1_000_000_000;
  const possibleCombinations = Math.pow(2, entropy);
  const secondsToCrack = possibleCombinations / (2 * guessesPerSecond);

  if (secondsToCrack < 1) return 'Instantly';
  if (secondsToCrack < 60) return 'Less than a minute';
  if (secondsToCrack < 3600) return 'Less than an hour';
  if (secondsToCrack < 86400) return 'Less than a day';
  if (secondsToCrack < 2592000) return 'Less than a month';
  if (secondsToCrack < 31536000) return 'Less than a year';
  if (secondsToCrack < 3153600000) return 'Several years';
  return 'Centuries';
}

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  let charsetSize = 0;

  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/\d/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

  return password.length * Math.log2(charsetSize);
}
