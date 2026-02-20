/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Sentry Error Tracking Configuration
 *
 * Provides centralized error tracking and monitoring for production.
 *
 * Setup Instructions:
 * 1. Install: npm install @sentry/node
 * 2. Set SENTRY_DSN in environment variables
 * 3. Sentry will auto-initialize on server start
 *
 * Constitution Principles:
 * - Principle III: Security (no PII in error reports)
 * - Principle IV: Performance (sampling for high-traffic)
 */

import logger from './logger';

// Type definitions for optional Sentry import
interface SentryType {
  init: (options: SentryOptions) => void;
  Handlers: {
    requestHandler: () => any;
    errorHandler: () => any;
  };
  captureException: (error: Error, context?: any) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, any>) => void;
}

interface SentryOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  beforeSend?: (event: any) => any;
}

// Sentry module (loaded dynamically)
let Sentry: SentryType | null = null;
let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 * Only initializes if SENTRY_DSN is configured and @sentry/node is installed
 */
export function initializeSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info('Sentry: Disabled (SENTRY_DSN not configured)');
    return false;
  }

  try {
    // Dynamic import to avoid errors if @sentry/node is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('@sentry/node') as SentryType;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || 'unknown',

      // Sample 10% of transactions for performance monitoring
      // Adjust based on traffic volume
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Filter sensitive data before sending to Sentry
      beforeSend(event) {
        // Remove PII from error reports
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }

        // Filter request body for sensitive fields
        if (event.request?.data) {
          const sensitiveFields = ['password', 'token', 'refreshToken', 'ssn', 'creditCard'];
          for (const field of sensitiveFields) {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]';
            }
          }
        }

        return event;
      },
    });

    sentryInitialized = true;
    logger.info('Sentry: Initialized successfully', { environment: process.env.NODE_ENV });
    return true;
  } catch (error) {
    logger.warn('Sentry: Not available (@sentry/node not installed)', { error });
    return false;
  }
}

/**
 * Get Sentry request handler middleware
 * Returns a no-op middleware if Sentry is not initialized
 */
export function getSentryRequestHandler(): any {
  if (Sentry && sentryInitialized) {
    return Sentry.Handlers.requestHandler();
  }
  // No-op middleware
  return (_req: any, _res: any, next: any) => next();
}

/**
 * Get Sentry error handler middleware
 * Returns a no-op middleware if Sentry is not initialized
 */
export function getSentryErrorHandler(): any {
  if (Sentry && sentryInitialized) {
    return Sentry.Handlers.errorHandler();
  }
  // No-op middleware
  return (_err: any, _req: any, _res: any, next: any) => next(_err);
}

/**
 * Capture an exception to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (Sentry && sentryInitialized) {
    Sentry.captureException(error, context);
  }
  // Always log to local logger
  logger.error('Exception captured', { error: error.message, stack: error.stack, ...context });
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (Sentry && sentryInitialized) {
    Sentry.captureMessage(message, level);
  }
  logger[level](message);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (Sentry && sentryInitialized) {
    // Only send user ID, not email (PII protection)
    Sentry.setUser(user ? { id: user.id } : null);
  }
}

/**
 * Set a tag on the current Sentry scope
 */
export function setTag(key: string, value: string): void {
  if (Sentry && sentryInitialized) {
    Sentry.setTag(key, value);
  }
}

/**
 * Set context on the current Sentry scope
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (Sentry && sentryInitialized) {
    Sentry.setContext(name, context);
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}

export default {
  initializeSentry,
  getSentryRequestHandler,
  getSentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  setTag,
  setContext,
  isSentryInitialized,
};
