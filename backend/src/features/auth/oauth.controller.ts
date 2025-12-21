import { Request, Response } from 'express';
import { oauthService } from './oauth.service';
import { AuthSuccessResponse } from '../../types/oauth';

// Simplified error response type for controller
interface AuthErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * OAuth Controller
 *
 * Handles HTTP requests for OAuth authentication endpoints
 *
 * Endpoints:
 * - POST /api/auth/oauth/google - Google Sign In
 * - POST /api/auth/oauth/apple - Apple Sign In
 *
 * Constitution Compliance:
 * - Principle III (Security): Input validation, error handling
 * - Principle IV (Performance): <500ms response time target
 */

export class OAuthController {
  /**
   * POST /api/auth/oauth/google
   *
   * Google Sign In endpoint
   *
   * Request body:
   * - idToken: string (required) - Google ID token from client
   *
   * Response:
   * - 200: AuthSuccessResponse (user, tokens, isNew, linked flags)
   * - 400: Validation error
   * - 401: Unauthorized (invalid token, unverified email)
   * - 403: Forbidden (account suspended, email verification required for linking)
   * - 409: Conflict (OAuth provider mismatch)
   * - 429: Too many requests (rate limiting)
   * - 500: Internal server error
   */
  async googleSignIn(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { idToken } = req.body;

      if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: 'validation_error',
          message: 'idToken is required and must be a non-empty string',
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Verify Google token
      const profile = await oauthService.verifyGoogleToken(idToken);

      // Handle OAuth signin/signup
      const result = await oauthService.handleOAuthSignIn(profile);

      // Success response
      const successResponse: AuthSuccessResponse = {
        success: true,
        user: result.user,
        tokens: result.tokens,
        isNew: result.isNew,
        linked: result.linked,
      };

      res.status(200).json(successResponse);
    } catch (error) {
      this.handleOAuthError(error, res);
    }
  }

  /**
   * POST /api/auth/oauth/apple
   *
   * Apple Sign In endpoint
   *
   * Request body:
   * - identityToken: string (required) - Apple identity token from client
   * - nonce: string (required) - Nonce for replay attack prevention
   * - fullName: object (optional) - User's full name (only provided on first authorization)
   *   - givenName: string (optional)
   *   - familyName: string (optional)
   *
   * Response:
   * - 200: AuthSuccessResponse
   * - 400: Validation error
   * - 401: Unauthorized (invalid token, nonce mismatch, unverified email)
   * - 403: Forbidden (account suspended, email verification required for linking)
   * - 409: Conflict (OAuth provider mismatch)
   * - 429: Too many requests (rate limiting)
   * - 500: Internal server error
   */
  async appleSignIn(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { identityToken, nonce, fullName } = req.body;

      if (
        !identityToken ||
        typeof identityToken !== 'string' ||
        identityToken.trim() === ''
      ) {
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: 'validation_error',
          message: 'identityToken is required and must be a non-empty string',
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
        const errorResponse: AuthErrorResponse = {
          success: false,
          error: 'validation_error',
          message: 'nonce is required and must be a non-empty string',
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate fullName structure if provided
      if (fullName !== undefined && fullName !== null) {
        if (typeof fullName !== 'object') {
          const errorResponse: AuthErrorResponse = {
            success: false,
            error: 'validation_error',
            message: 'fullName must be an object with givenName and/or familyName',
          };
          res.status(400).json(errorResponse);
          return;
        }
      }

      // Verify Apple token
      const profile = await oauthService.verifyAppleToken(identityToken, nonce);

      // Handle OAuth signin/signup with fullName
      const result = await oauthService.handleOAuthSignIn(profile, fullName);

      // Success response
      const successResponse: AuthSuccessResponse = {
        success: true,
        user: result.user,
        tokens: result.tokens,
        isNew: result.isNew,
        linked: result.linked,
      };

      res.status(200).json(successResponse);
    } catch (error) {
      this.handleOAuthError(error, res);
    }
  }

  /**
   * Centralized OAuth error handling
   *
   * Maps service errors to appropriate HTTP status codes and error responses
   */
  private handleOAuthError(error: unknown, res: Response): void {
    console.error('[OAuth Error]', error);

    if (!(error instanceof Error)) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: 'internal_error',
        message: 'An unexpected error occurred',
      };
      res.status(500).json(errorResponse);
      return;
    }

    const errorMessage = error.message.toLowerCase();

    // Token verification errors (401 Unauthorized)
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('token') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('signature') ||
      errorMessage.includes('nonce mismatch') ||
      errorMessage.includes('email not verified') ||
      errorMessage.includes('missing email') ||
      errorMessage.includes('missing sub')
    ) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: 'unauthorized',
        message: error.message.includes('token verification failed')
          ? 'Invalid OAuth token'
          : error.message,
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Email verification required for linking (403 Forbidden)
    if (errorMessage.includes('email verification required')) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: 'forbidden',
        message: error.message,
      };
      res.status(403).json(errorResponse);
      return;
    }

    // Account status errors (403 Forbidden)
    if (
      errorMessage.includes('suspended') ||
      errorMessage.includes('deactivated')
    ) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: 'forbidden',
        message: error.message,
      };
      res.status(403).json(errorResponse);
      return;
    }

    // OAuth provider conflict (409 Conflict)
    if (errorMessage.includes('different oauth provider')) {
      const errorResponse: AuthErrorResponse = {
        success: false,
        error: 'conflict',
        message: error.message,
      };
      res.status(409).json(errorResponse);
      return;
    }

    // Default to 500 Internal Server Error
    const errorResponse: AuthErrorResponse = {
      success: false,
      error: 'internal_error',
      message: 'An error occurred during OAuth authentication',
    };
    res.status(500).json(errorResponse);
  }
}

// Export singleton instance
export const oauthController = new OAuthController();
