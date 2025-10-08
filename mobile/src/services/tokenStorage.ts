/**
 * Token Storage Service
 *
 * Purpose: Secure storage for authentication tokens using react-native-keychain
 * Constitution: Principle IV (Performance - fast secure storage)
 *
 * Methods:
 * - saveTokens(): Store JWT access and refresh tokens securely
 * - getTokens(): Retrieve stored tokens
 * - clearTokens(): Remove all tokens (logout)
 * - hasTokens(): Check if tokens exist
 *
 * Created: 2025-10-08
 */

import * as Keychain from 'react-native-keychain';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

/**
 * Token Storage Service
 * Uses react-native-keychain for secure, encrypted token storage
 */
class TokenStorageService {
  private readonly SERVICE_NAME = 'conest-auth';
  private readonly USERNAME = 'user-tokens';

  /**
   * Save authentication tokens to secure storage
   * @param tokens - Access and refresh tokens with user ID
   * @returns Success status
   */
  async saveTokens(tokens: AuthTokens): Promise<boolean> {
    try {
      const tokenData = JSON.stringify(tokens);

      await Keychain.setGenericPassword(
        this.USERNAME,
        tokenData,
        {
          service: this.SERVICE_NAME,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );

      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to save tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve authentication tokens from secure storage
   * @returns Tokens or null if not found
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
      });

      if (!credentials) {
        return null;
      }

      const tokens: AuthTokens = JSON.parse(credentials.password);
      return tokens;
    } catch (error) {
      console.error('[TokenStorage] Failed to get tokens:', error);
      return null;
    }
  }

  /**
   * Clear all authentication tokens (logout)
   * @returns Success status
   */
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({
        service: this.SERVICE_NAME,
      });

      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * Check if tokens exist in storage
   * @returns True if tokens exist
   */
  async hasTokens(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
      });

      return !!credentials;
    } catch (error) {
      console.error('[TokenStorage] Failed to check tokens:', error);
      return false;
    }
  }

  /**
   * Get access token only (for API calls)
   * @returns Access token or null
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get refresh token only (for token refresh)
   * @returns Refresh token or null
   */
  async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Get user ID only
   * @returns User ID or null
   */
  async getUserId(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.userId || null;
  }
}

export default new TokenStorageService();
