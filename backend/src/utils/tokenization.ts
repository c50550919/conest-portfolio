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
  const secret = process.env.TOKENIZATION_SECRET;
  if (!secret) {
    throw new Error('TOKENIZATION_SECRET environment variable is not configured');
  }
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
  // Token generation for audit logging (prefix with underscore as currently unused)
  const _token = tokenizePII(cleaned.slice(0, -4));

  return `${countryCode ? `+${  countryCode}` : ''}***${last4}`;
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
    parts.push(`***${  address.zipCode.slice(-2)}`);
  }

  if (address.country) {
    parts.push(address.country);
  }

  return parts.join(', ');
}

/**
 * Sensitive field patterns that should be completely redacted
 */
const REDACTED_PATTERNS = ['password', 'token', 'secret', 'ssn', 'creditcard', 'cvv'];

/**
 * PII field handlers for tokenization
 * Each handler specifies the field pattern and how to tokenize it
 */
const PII_HANDLERS: Array<{
  pattern: string;
  handler: (value: any) => any;
  valueType: 'string' | 'object';
}> = [
  { pattern: 'email', handler: tokenizeEmail, valueType: 'string' },
  { pattern: 'phone', handler: tokenizePhone, valueType: 'string' },
  { pattern: 'address', handler: tokenizeAddress, valueType: 'object' },
];

/**
 * Check if field should be redacted
 */
function shouldRedact(lowerKey: string): boolean {
  return REDACTED_PATTERNS.some((pattern) => lowerKey.includes(pattern));
}

/**
 * Find matching PII handler for a field
 */
function findPIIHandler(lowerKey: string, value: any): ((v: any) => any) | null {
  const handler = PII_HANDLERS.find(
    (h) => lowerKey.includes(h.pattern) && typeof value === h.valueType,
  );
  return handler?.handler ?? null;
}

/**
 * Sanitize a single field value
 */
function sanitizeField(key: string, value: any, depth: number): any {
  const lowerKey = key.toLowerCase();

  // Check for redaction first
  if (shouldRedact(lowerKey)) return '[REDACTED]';

  // Check for PII tokenization
  const piiHandler = findPIIHandler(lowerKey, value);
  if (piiHandler) return piiHandler(value);

  // Recursively sanitize objects
  if (typeof value === 'object') return sanitizeForLogging(value, depth + 1);

  // Return primitive values as-is
  return value;
}

/**
 * Sanitize object for logging
 * Automatically tokenizes common PII fields
 * Refactored to reduce cyclomatic complexity using configuration-driven approach
 */
export function sanitizeForLogging(obj: any, depth: number = 0): any {
  if (depth > 5) return '[MAX_DEPTH_REACHED]';
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForLogging(item, depth + 1));
  if (typeof obj !== 'object') return obj;

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeField(key, value, depth);
  }
  return sanitized;
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}
