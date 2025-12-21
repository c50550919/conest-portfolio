/**
 * Auth Feature Module
 *
 * Barrel file exporting all auth feature components.
 * This allows clean imports: import { AuthService, AuthController } from './features/auth';
 */

export { AuthService } from './auth.service';
export type { RegisterData, LoginData, TokenPair, AuthResponse } from './auth.service';

export { AuthController } from './auth.controller';

export {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenSchema,
  VerifyPhoneSchema,
} from './auth.schemas';
export type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  VerifyPhoneRequest,
} from './auth.schemas';

export { default as authRoutes } from './auth.routes';

// OAuth exports
export { OAuthService, oauthService } from './oauth.service';
export { OAuthController, oauthController } from './oauth.controller';
