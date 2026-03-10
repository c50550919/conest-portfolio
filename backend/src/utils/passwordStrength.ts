/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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
 * Password validation rule definition
 */
interface PasswordRule {
  test: (password: string, config: typeof securityConfig.password) => boolean;
  error: string | ((config: typeof securityConfig.password) => string);
  scoreOnPass: number;
  enabled?: (config: typeof securityConfig.password) => boolean;
}

/**
 * Data-driven password validation rules
 * Each rule is independent, reducing cyclomatic complexity
 */
const PASSWORD_RULES: PasswordRule[] = [
  {
    test: (pwd, cfg) => pwd.length >= cfg.minLength,
    error: (cfg) => `Password must be at least ${cfg.minLength} characters long`,
    scoreOnPass: 20,
  },
  {
    test: (pwd, cfg) => pwd.length <= cfg.maxLength,
    error: (cfg) => `Password must not exceed ${cfg.maxLength} characters`,
    scoreOnPass: 0,
  },
  {
    test: (pwd) => /[A-Z]/.test(pwd),
    error: 'Password must contain at least one uppercase letter',
    scoreOnPass: 15,
    enabled: (cfg) => cfg.requireUppercase,
  },
  {
    test: (pwd) => /[a-z]/.test(pwd),
    error: 'Password must contain at least one lowercase letter',
    scoreOnPass: 15,
    enabled: (cfg) => cfg.requireLowercase,
  },
  {
    test: (pwd) => /\d/.test(pwd),
    error: 'Password must contain at least one number',
    scoreOnPass: 15,
    enabled: (cfg) => cfg.requireNumbers,
  },
  {
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    error: 'Password must contain at least one special character',
    scoreOnPass: 15,
    enabled: (cfg) => cfg.requireSpecialChars,
  },
];

/**
 * Quality checks that affect score but don't fail validation
 */
const QUALITY_CHECKS = [
  {
    test: isCommonPassword,
    suggestion: 'Password is too common. Please choose a more unique password',
    scorePenalty: 30,
    isError: true,
  },
  {
    test: (pwd: string) => /(.)\1{2,}/.test(pwd),
    suggestion: 'Avoid repeating characters',
    scorePenalty: 10,
    isError: false,
  },
  {
    test: hasSequentialChars,
    suggestion: 'Avoid sequential characters (e.g., abc, 123)',
    scorePenalty: 10,
    isError: false,
  },
  {
    test: hasKeyboardPattern,
    suggestion: 'Avoid keyboard patterns (e.g., qwerty, asdf)',
    scorePenalty: 10,
    isError: false,
  },
];

/**
 * Validate password strength against security requirements
 * Refactored to use data-driven validation (reduced cyclomatic complexity)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const config = securityConfig.password;
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Apply validation rules
  for (const rule of PASSWORD_RULES) {
    if (rule.enabled && !rule.enabled(config)) continue;

    if (rule.test(password, config)) {
      score += rule.scoreOnPass;
    } else {
      const errorMsg = typeof rule.error === 'function' ? rule.error(config) : rule.error;
      errors.push(errorMsg);
    }
  }

  // Apply quality checks
  for (const check of QUALITY_CHECKS) {
    if (check.test(password)) {
      score -= check.scorePenalty;
      if (check.isError) {
        errors.push(check.suggestion);
      } else {
        suggestions.push(check.suggestion);
      }
    }
  }

  // Bonus calculations
  score += calculateLengthBonus(password.length, config.minLength);
  score += calculateDiversityBonus(password);

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  // Add suggestions for low scores
  if (score < 60) {
    suggestions.push('Consider using a longer password with more variety');
    suggestions.push('Use a mix of words, numbers, and symbols');
  }

  return { isValid: errors.length === 0, errors, score, suggestions };
}

/**
 * Calculate bonus for password length beyond minimum
 */
function calculateLengthBonus(length: number, minLength: number): number {
  return length > minLength ? Math.min(20, (length - minLength) * 2) : 0;
}

/**
 * Calculate bonus for character diversity
 */
function calculateDiversityBonus(password: string): number {
  const uniqueChars = new Set(password).size;
  const diversityRatio = uniqueChars / password.length;
  return diversityRatio > 0.7 ? 10 : 0;
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return commonPasswords.some((common) => lowerPassword.includes(common.toLowerCase()));
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
    'qwerty',
    'asdfgh',
    'zxcvbn',
    'qwertz',
    'azerty', // International keyboards
    'qweasd',
    'asdzxc', // Vertical patterns
  ];

  const lowerPassword = password.toLowerCase();
  return patterns.some((pattern) => lowerPassword.includes(pattern));
}
