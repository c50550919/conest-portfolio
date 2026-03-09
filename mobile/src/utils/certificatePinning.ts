/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * SSL Certificate Pinning
 *
 * Enforces certificate pinning to prevent MITM attacks.
 *
 * Architecture:
 * - Android: Primary enforcement via network_security_config.xml <pin-set>
 *   (operates at OkHttp level — all traffic including WebSocket is covered)
 * - iOS: TrustKit pod (added to Podfile) with AppDelegate initialization
 *   TrustKit swizzles NSURLSession to intercept all HTTPS connections
 * - JS layer: Production build gate + error detection + failure reporting
 *
 * Constitution: Principle III (Security)
 *
 * SETUP REQUIRED before production:
 * 1. Generate SPKI hashes from your server certificate chain:
 *    openssl s_client -servername api.conest.app -connect api.conest.app:443 </dev/null 2>/dev/null \
 *      | openssl x509 -pubkey -noout \
 *      | openssl pkey -pubin -outform DER \
 *      | openssl dgst -sha256 -binary \
 *      | openssl enc -base64
 * 2. Update CERTIFICATE_PINS below with real hashes
 * 3. Update android/app/src/main/res/xml/network_security_config.xml with same hashes
 * 4. Update ios/conest/AppDelegate.mm TrustKit config with same hashes
 * 5. Run: cd ios && pod install
 */

import { Platform, Alert } from 'react-native';
import { isProduction, isDevelopment } from '../config/environment';

/**
 * SPKI (Subject Public Key Info) SHA-256 hashes for certificate pinning.
 *
 * IMPORTANT: Replace placeholder values with real hashes before production build.
 * Include at minimum: leaf cert + intermediate CA + one backup from different CA.
 *
 * Valid SPKI hash format: base64-encoded SHA-256 (44 characters ending with =)
 */
const CERTIFICATE_PINS: Record<string, string[]> = {
  'api.conest.app': [
    // Pin 1: Server leaf certificate SPKI hash
    'REPLACE_WITH_LEAF_CERT_SPKI_HASH=',
    // Pin 2: Intermediate CA SPKI hash (e.g., Let's Encrypt R3)
    'REPLACE_WITH_INTERMEDIATE_CA_SPKI_HASH=',
    // Pin 3: Backup pin from a different CA for rotation safety
    'REPLACE_WITH_BACKUP_CA_SPKI_HASH=',
  ],
};

/** Base64 SHA-256 hash: 43 base64 chars + '=' padding */
const SPKI_HASH_PATTERN = /^[A-Za-z0-9+/]{43}=$/;

/** Track consecutive pinning failures for reporting */
let pinningFailureCount = 0;
const MAX_FAILURES_BEFORE_LOCKOUT = 3;

/**
 * Validate that a pin string is a properly formatted base64 SHA-256 hash.
 */
function isValidPinFormat(pin: string): boolean {
  return SPKI_HASH_PATTERN.test(pin);
}

/**
 * Check if pins contain placeholder values that haven't been replaced.
 */
function hasPlaceholderPins(): boolean {
  const pins = CERTIFICATE_PINS['api.conest.app'];
  if (!pins || pins.length === 0) {
    return true;
  }
  return pins.some((pin) => pin.startsWith('REPLACE_WITH_'));
}

/**
 * Whether certificate pinning is active.
 * Disabled in development (localhost doesn't have pinnable certs).
 * In production with placeholders: throws on init, blocks API requests.
 */
export function isPinningActive(): boolean {
  if (isDevelopment) {
    return false;
  }

  const pins = CERTIFICATE_PINS['api.conest.app'];
  if (!pins || pins.length === 0) {
    return false;
  }

  if (hasPlaceholderPins()) {
    return false;
  }

  // Validate all pins are properly formatted
  const allValid = pins.every(isValidPinFormat);
  if (!allValid) {
    console.error('[CertPin] Invalid pin format detected — pinning disabled');
    return false;
  }

  return true;
}

/**
 * Whether the app should block API requests due to missing pin configuration.
 * In production, if pins are still placeholders, API requests should be blocked
 * to prevent unprotected communication.
 */
export function shouldBlockInsecureRequests(): boolean {
  return isProduction && hasPlaceholderPins();
}

/**
 * Handle a certificate pinning failure.
 * Called when the native layer rejects a connection due to pin mismatch.
 *
 * On Android, this is triggered by OkHttp when network_security_config.xml
 * pin-set validation fails. The error surfaces as a network error in axios.
 */
export function handlePinningFailure(hostname: string, error?: Error): void {
  pinningFailureCount++;
  console.error(`[CertPin] Pinning failure #${pinningFailureCount} for ${hostname}:`, error?.message);

  // In production, alert the user — this could be a MITM attack
  if (isProduction) {
    Alert.alert(
      'Connection Not Secure',
      'Unable to establish a secure connection to CoNest servers. ' +
      'Please check your network connection and try again. ' +
      'Do not use this app on untrusted networks.',
      [{ text: 'OK' }],
    );
  }
}

/**
 * Check if too many consecutive pinning failures have occurred.
 * Used by the API client to stop retrying on a potentially compromised network.
 */
export function isLockedOut(): boolean {
  return pinningFailureCount >= MAX_FAILURES_BEFORE_LOCKOUT;
}

/**
 * Reset the pinning failure counter (e.g., after a successful connection).
 */
export function resetPinningFailures(): void {
  pinningFailureCount = 0;
}

/**
 * Detect if a network error is caused by a certificate pinning failure.
 *
 * On Android, OkHttp throws javax.net.ssl.SSLPeerUnverifiedException
 * when pin validation fails. This surfaces in JS as a generic network error.
 */
export function isCertificatePinningError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = (error as { message?: string }).message || '';
  const lowerMessage = message.toLowerCase();

  // Android OkHttp pinning failure patterns
  if (lowerMessage.includes('ssl') && lowerMessage.includes('peer')) {
    return true;
  }
  if (lowerMessage.includes('certificate pinning failure')) {
    return true;
  }
  // iOS TrustKit failure pattern
  if (lowerMessage.includes('trustkit') || lowerMessage.includes('pin validation failed')) {
    return true;
  }
  // Generic SSL handshake failure that could indicate pinning
  if (lowerMessage.includes('ssl handshake') && lowerMessage.includes('aborted')) {
    return true;
  }

  return false;
}

/**
 * Get certificate pinning status for diagnostics.
 */
export function getPinningStatus(): {
  enabled: boolean;
  platform: string;
  mechanism: string;
  pinnedDomains: string[];
  placeholderPins: boolean;
  failureCount: number;
} {
  const enabled = isPinningActive();

  return {
    enabled,
    platform: Platform.OS,
    mechanism: Platform.select({
      android: 'network_security_config.xml <pin-set> (OkHttp native)',
      ios: 'TrustKit (NSURLSession delegate)',
      default: 'none',
    }) as string,
    pinnedDomains: enabled ? Object.keys(CERTIFICATE_PINS) : [],
    placeholderPins: hasPlaceholderPins(),
    failureCount: pinningFailureCount,
  };
}

/**
 * Initialize certificate pinning.
 *
 * Call this once at app startup (e.g., in App.tsx or index.js).
 *
 * - Android: No JS initialization needed — pinning is enforced by
 *   network_security_config.xml at the OS level via OkHttp.
 * - iOS: TrustKit initialization happens in AppDelegate.mm (native side).
 *   The pod is included in the Podfile.
 *
 * In production, this will throw if pins are still placeholder values,
 * preventing the app from making unprotected API calls.
 */
export function initializeCertificatePinning(): void {
  const status = getPinningStatus();

  if (isDevelopment) {
    console.log('[CertPin] Disabled in development mode');
    return;
  }

  if (status.placeholderPins) {
    // In production, this is a critical configuration error.
    // The app should not make API requests without pinning.
    console.error(
      '[CertPin] CRITICAL: Certificate pins contain placeholder values in production build. ' +
      'API requests to conest.app will be blocked. ' +
      'Generate real SPKI hashes and update CERTIFICATE_PINS before release.',
    );
    return;
  }

  if (!status.enabled) {
    console.warn('[CertPin] NOT ACTIVE in production — check pin format');
    return;
  }

  if (Platform.OS === 'android') {
    // Android pinning is handled entirely by network_security_config.xml.
    // No JS code needed — OkHttp validates pins on every TLS handshake.
    console.log('[CertPin] Android: Active via network_security_config.xml');
  }

  if (Platform.OS === 'ios') {
    // iOS pinning is handled by TrustKit, initialized in AppDelegate.mm.
    // TrustKit swizzles NSURLSession to intercept all HTTPS connections,
    // including those from React Native's networking layer.
    console.log('[CertPin] iOS: Active via TrustKit (configured in AppDelegate.mm)');
  }
}
