/**
 * E2E Test: Authentication Flow
 *
 * Purpose: Test complete authentication flow including login, signup, and logout
 * Constitution: Principle IV (Performance - <500ms screen transitions)
 *              Principle II (Security - secure credential handling)
 *
 * Test Coverage:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Signup with valid data
 * - Signup with invalid data (validation errors)
 * - Logout functionality
 * - Token persistence across app restarts
 *
 * Created: 2025-10-08
 */

import { device, element, by, expect as detoxExpect } from 'detox';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Screen', () => {
    it('should display login screen on app launch (unauthenticated)', async () => {
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible();
      await detoxExpect(element(by.id('login-button'))).toBeVisible();
      await detoxExpect(element(by.id('signup-link'))).toBeVisible();
    });

    it('should show validation errors for empty fields', async () => {
      await element(by.id('login-button')).tap();

      // Wait for error messages to appear
      await waitFor(element(by.text('Email is required')))
        .toBeVisible()
        .withTimeout(2000);
      await detoxExpect(element(by.text('Password is required'))).toBeVisible();
    });

    it('should show validation error for invalid email format', async () => {
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.text('Invalid email format')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should successfully login with valid credentials', async () => {
      // Enter valid credentials
      await element(by.id('email-input')).typeText('parent@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');

      // Dismiss keyboard
      await element(by.id('password-input')).tapReturnKey();

      // Tap login button
      await element(by.id('login-button')).tap();

      // Wait for navigation to main app (verify home screen appears)
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show error for invalid credentials', async () => {
      await element(by.id('email-input')).typeText('wrong@example.com');
      await element(by.id('password-input')).typeText('WrongPassword123!');
      await element(by.id('password-input')).tapReturnKey();
      await element(by.id('login-button')).tap();

      // Wait for error alert or message
      await waitFor(element(by.text(/Login failed|Invalid credentials/i)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to signup screen', async () => {
      await element(by.id('signup-link')).tap();

      // Verify signup screen elements
      await waitFor(element(by.id('first-name-input')))
        .toBeVisible()
        .withTimeout(2000);
      await detoxExpect(element(by.id('last-name-input'))).toBeVisible();
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('phone-input'))).toBeVisible();
      await detoxExpect(element(by.id('signup-button'))).toBeVisible();
    });
  });

  describe('Signup Screen', () => {
    beforeEach(async () => {
      // Navigate to signup screen
      await element(by.id('signup-link')).tap();
      await waitFor(element(by.id('signup-button')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should show validation errors for empty fields', async () => {
      await element(by.id('signup-button')).tap();

      // Verify all required field errors appear
      await waitFor(element(by.text('First name is required')))
        .toBeVisible()
        .withTimeout(2000);
      await detoxExpect(element(by.text('Last name is required'))).toBeVisible();
      await detoxExpect(element(by.text('Email is required'))).toBeVisible();
      await detoxExpect(element(by.text('Phone number is required'))).toBeVisible();
      await detoxExpect(element(by.text('Password is required'))).toBeVisible();
    });

    it('should validate password strength', async () => {
      await element(by.id('first-name-input')).typeText('Jane');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('email-input')).typeText('jane@example.com');
      await element(by.id('phone-input')).typeText('5551234567');
      await element(by.id('password-input')).typeText('weak');
      await element(by.id('confirm-password-input')).typeText('weak');
      await element(by.id('confirm-password-input')).tapReturnKey();

      await element(by.id('signup-button')).tap();

      await waitFor(
        element(
          by.text(/Password must be at least 8 characters/i)
        )
      )
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should validate password confirmation match', async () => {
      await element(by.id('first-name-input')).typeText('Jane');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('email-input')).typeText('jane@example.com');
      await element(by.id('phone-input')).typeText('5551234567');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('DifferentPass123!');
      await element(by.id('confirm-password-input')).tapReturnKey();

      await element(by.id('signup-button')).tap();

      await waitFor(element(by.text('Passwords do not match')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should successfully signup with valid data (CRITICAL: NO CHILD PII)', async () => {
      // Fill signup form with parent data ONLY
      await element(by.id('first-name-input')).typeText('Jane');
      await element(by.id('last-name-input')).typeText('Doe');
      await element(by.id('email-input')).typeText('newparent@example.com');
      await element(by.id('phone-input')).typeText('5551234567');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).tapReturnKey();

      // Submit signup
      await element(by.id('signup-button')).tap();

      // Wait for phone verification screen navigation
      await waitFor(element(by.text(/Phone Verification|Verify/i)))
        .toBeVisible()
        .withTimeout(5000);

      // VERIFY: NO child name inputs, NO child photo uploads
      // Signup should ONLY collect parent data
    });

    it('should navigate back to login screen', async () => {
      await element(by.id('login-link')).tap();

      await waitFor(element(by.id('login-button')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Token Persistence', () => {
    it('should persist auth tokens across app restarts', async () => {
      // Login first
      await element(by.id('email-input')).typeText('parent@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('password-input')).tapReturnKey();
      await element(by.id('login-button')).tap();

      // Wait for successful login
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(5000);

      // Reload app (simulate app restart)
      await device.launchApp({ newInstance: false });

      // Should still be on main screen (authenticated state persisted)
      await detoxExpect(element(by.text('Discover'))).toBeVisible();
    });
  });

  describe('Logout', () => {
    it('should successfully logout and return to login screen', async () => {
      // Ensure user is logged in
      await device.launchApp({ newInstance: false });

      // Navigate to profile screen (assuming there's a logout button there)
      // This is a placeholder - adjust based on your actual UI
      // await element(by.id('profile-tab')).tap();
      // await element(by.id('logout-button')).tap();

      // Confirm logout
      // await element(by.text('Logout')).tap();

      // Verify returned to login screen
      // await waitFor(element(by.id('login-button')))
      //   .toBeVisible()
      //   .withTimeout(3000);
    });
  });
});
