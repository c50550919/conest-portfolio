/**
 * Utility helper functions for the SafeNest API
 */

/**
 * Format currency amount in cents to dollars
 */
export const formatCurrency = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/**
 * Parse currency string to cents
 */
export const parseCurrency = (dollarString: string): number => {
  const amount = parseFloat(dollarString.replace(/[$,]/g, ''));
  return Math.round(amount * 100);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (US format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

/**
 * Format phone number to E.164 format
 */
export const formatPhoneE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }
  return phone;
};

/**
 * Generate random verification code
 */
export const generateVerificationCode = (length: number = 6): string => {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => input
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;')
  .replace(/\//g, '&#x2F;');

/**
 * Generate slug from string
 */
export const generateSlug = (text: string): string => text
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/--+/g, '-')
  .trim();

/**
 * Check if date is in the past
 */
export const isPastDate = (date: Date): boolean => new Date(date) < new Date();

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: Date): boolean => new Date(date) > new Date();

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => new Date(date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * Delay function for testing/rate limiting
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Safely parse JSON with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
