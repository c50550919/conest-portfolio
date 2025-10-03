/**
 * PII Tokenization Utilities
 * Provides tokenization for audit logs and non-sensitive contexts
 */

import crypto from 'crypto';

/**
 * Generate deterministic token for PII
 * Uses HMAC to create consistent tokens for the same input
 */
export function tokenizePII(pii: string, salt?: string): string {
  const secret = process.env.TOKENIZATION_SECRET || 'default-secret-change-me';
  const hmac = crypto.createHmac('sha256', secret);

  if (salt) {
    hmac.update(salt);
  }

  hmac.update(pii);
  return `token_${hmac.digest('hex').substring(0, 16)}`;
}

/**
 * Tokenize email address for logging
 * Preserves domain for debugging while hiding user identity
 */
export function tokenizeEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return tokenizePII(email);

  const token = tokenizePII(localPart);
  return `${token}@${domain}`;
}

/**
 * Tokenize phone number for logging
 * Preserves country code and last 4 digits
 */
export function tokenizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 4) {
    return tokenizePII(phone);
  }

  const last4 = cleaned.slice(-4);
  const countryCode = cleaned.length >= 10 ? cleaned.slice(0, cleaned.length - 10) : '';
  const token = tokenizePII(cleaned.slice(0, -4));

  return `${countryCode ? '+' + countryCode : ''}***${last4}`;
}

/**
 * Tokenize address for logging
 * Preserves city and state/country
 */
export function tokenizeAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): string {
  const parts = [];

  if (address.street) {
    parts.push(tokenizePII(address.street));
  }

  if (address.city) {
    parts.push(address.city);
  }

  if (address.state) {
    parts.push(address.state);
  }

  if (address.zipCode) {
    parts.push('***' + address.zipCode.slice(-2));
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.join(', ');
}

/**
 * Sanitize object for logging
 * Automatically tokenizes common PII fields
 */
export function sanitizeForLogging(obj: any, depth: number = 0): any {
  if (depth > 5) return '[MAX_DEPTH_REACHED]';

  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item, depth + 1));
  }

  if (typeof obj !== 'object') return obj;

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Remove sensitive fields entirely
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('ssn') ||
      lowerKey.includes('creditcard') ||
      lowerKey.includes('cvv')
    ) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Tokenize PII fields
    if (lowerKey.includes('email') && typeof value === 'string') {
      sanitized[key] = tokenizeEmail(value);
    } else if (lowerKey.includes('phone') && typeof value === 'string') {
      sanitized[key] = tokenizePhone(value);
    } else if (lowerKey.includes('address') && typeof value === 'object') {
      sanitized[key] = tokenizeAddress(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Mask credit card number
 * Shows only last 4 digits
 */
export function maskCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '****';

  return '**** **** **** ' + cleaned.slice(-4);
}

/**
 * Mask SSN
 * Shows only last 4 digits
 */
export function maskSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '***-**-****';

  return '***-**-' + cleaned.slice(-4);
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}
