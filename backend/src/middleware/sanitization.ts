/**
 * Advanced Input Sanitization Middleware
 * Prevents SQL injection, XSS, and other injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Sanitize string for SQL (used with parameterized queries)
 */
export function sanitizeSQL(input: string): string {
  // Remove SQL comment markers
  let sanitized = input.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  // Remove semicolons at the end (prevent command chaining)
  sanitized = sanitized.replace(/;\s*$/g, '');

  return sanitized;
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return validator.escape(input);
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return validator.normalizeEmail(email, {
    all_lowercase: true,
    gmail_remove_dots: false,
  }) || '';
}

/**
 * Validate and sanitize phone number to E.164 format
 */
export function sanitizePhone(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Add + prefix if not present
  return digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  const sanitized = validator.trim(url);

  if (!validator.isURL(sanitized, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })) {
    return null;
  }

  return sanitized;
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > 10) return obj; // Prevent infinite recursion

  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const sanitizedKey = sanitizeHTML(key);

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeHTML(value);
      } else if (typeof value === 'object') {
        sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }

  return obj;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
export function sanitizeQuery(req: Request, res: Response, next: NextFunction): void {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Middleware to sanitize URL parameters
 */
export function sanitizeParams(req: Request, res: Response, next: NextFunction): void {
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Combined sanitization middleware
 */
export function sanitizeAll(req: Request, res: Response, next: NextFunction): void {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, () => {
      sanitizeParams(req, res, next);
    });
  });
}

/**
 * Validate email format (RFC 5322 compliant)
 */
export function validateEmail(email: string): boolean {
  return validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: true,
  });
}

/**
 * Validate phone number (E.164 format)
 */
export function validatePhone(phone: string): boolean {
  const e164Pattern = /^\+[1-9]\d{1,14}$/;
  return e164Pattern.test(phone);
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): boolean {
  return validator.isUUID(uuid);
}

/**
 * Check for SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION.*SELECT)/i,
    /(OR\s+1\s*=\s*1)/i,
    /(;.*--)/,
    /('.*OR.*'.*=.*')/i,
    /(\/\*|\*\/|--)/,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function hasXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Middleware to detect and block malicious input
 */
export function detectMaliciousInput(req: Request, res: Response, next: NextFunction): void {
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      if (hasSQLInjection(value) || hasXSS(value)) {
        return true;
      }
    } else if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const isMalicious =
    checkValue(req.body) ||
    checkValue(req.query) ||
    checkValue(req.params);

  if (isMalicious) {
    return res.status(400).json({
      error: 'Malicious input detected',
      code: 'MALICIOUS_INPUT',
    });
  }

  next();
}
