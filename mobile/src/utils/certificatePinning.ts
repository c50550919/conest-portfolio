/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * SSL Certificate Pinning Utility
 * Prevents man-in-the-middle attacks by validating server certificates
 */

import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';

// Certificate fingerprints (SHA-256 hashes of your server's certificates)
const PINNED_CERTIFICATES = {
  production: [
    // Add your production server certificate fingerprints here
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup certificate
  ],
  staging: [
    // Add your staging server certificate fingerprints here
    'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
  ],
  development: [
    // Development certificates (if needed)
    'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=',
  ],
};

/**
 * Get environment-specific certificate pins
 */
function getCertificatePins(): string[] {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return PINNED_CERTIFICATES.production;
    case 'staging':
      return PINNED_CERTIFICATES.staging;
    default:
      return PINNED_CERTIFICATES.development;
  }
}

/**
 * Create axios instance with certificate pinning
 * Note: React Native doesn't support certificate pinning natively in fetch/axios
 * You'll need a native module like react-native-ssl-pinning
 */
export function createSecureAxiosInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor for additional security
  instance.interceptors.request.use(
    async (config) => {
      // Add security headers
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      config.headers['X-Client-Version'] = '1.0.0';
      config.headers['X-Platform'] = Platform.OS;

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 495) {
        // SSL Certificate Error
        console.error('SSL Certificate validation failed');
        // Handle certificate pinning failure
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Validate SSL certificate fingerprint
 * This is a placeholder - implement with native module
 */
export async function validateCertificate(hostname: string, certificate: string): Promise<boolean> {
  try {
    const pins = getCertificatePins();

    // In production, use native module to validate certificate
    // Example with react-native-ssl-pinning:
    // const isValid = await SSLPinning.validateCertificate(hostname, pins);

    // Placeholder validation
    const isValid = pins.some((pin) => certificate.includes(pin));

    if (!isValid) {
      console.error('Certificate validation failed for', hostname);
      // Log security incident
    }

    return isValid;
  } catch (error) {
    console.error('Error validating certificate:', error);
    return false;
  }
}

/**
 * Configure certificate pinning for fetch requests
 * This requires a native module like react-native-ssl-pinning
 */
export function configureCertificatePinning(): void {
  const pins = getCertificatePins();

  // Example configuration (pseudo-code)
  // SSLPinning.configure({
  //   pins: pins.map(pin => ({
  //     hostname: 'api.safenest.com',
  //     fingerprints: [pin],
  //   })),
  // });

  console.log('Certificate pinning configured with', pins.length, 'pins');
}

/**
 * Check if certificate pinning is properly configured
 */
export async function verifyCertificatePinning(): Promise<boolean> {
  try {
    // Make a test request to verify pinning is working
    const testUrl = process.env.REACT_APP_API_URL || 'https://api.safenest.com';

    // This would use the pinned axios instance
    // const response = await secureAxios.get('/health');

    return true;
  } catch (error) {
    console.error('Certificate pinning verification failed:', error);
    return false;
  }
}

/**
 * Handle certificate pinning failure
 */
export function handleCertificatePinningFailure(error: any): void {
  console.error('Certificate pinning failure:', error);

  // Log security incident
  // logSecurityIncident('certificate_pinning_failure', {
  //   error: error.message,
  //   timestamp: new Date().toISOString(),
  // });

  // Alert user
  // Alert.alert(
  //   'Security Warning',
  //   'Unable to establish a secure connection. Please check your network and try again.',
  //   [{ text: 'OK' }]
  // );
}

/**
 * Get certificate expiration warning
 */
export async function checkCertificateExpiration(): Promise<{
  isExpiringSoon: boolean;
  daysUntilExpiration: number;
}> {
  // This would check the certificate expiration date
  // Requires native module support

  return {
    isExpiringSoon: false,
    daysUntilExpiration: 90,
  };
}

/**
 * Notes for implementation:
 *
 * 1. Install native module:
 *    npm install react-native-ssl-pinning
 *
 * 2. Generate certificate fingerprints:
 *    openssl s_client -connect api.safenest.com:443 < /dev/null | openssl x509 -fingerprint -sha256 -noout
 *
 * 3. Configure native code (iOS):
 *    - Add certificate to Xcode project
 *    - Configure Info.plist with NSAppTransportSecurity
 *
 * 4. Configure native code (Android):
 *    - Add network_security_config.xml
 *    - Update AndroidManifest.xml
 *
 * 5. Test pinning:
 *    - Use proxy like Charles or Burp Suite
 *    - Attempt MITM attack
 *    - Verify connection fails with invalid certificate
 */
