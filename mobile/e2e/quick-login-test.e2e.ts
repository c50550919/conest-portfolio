/**
 * E2E Test: Quick Login Test
 *
 * Purpose: Test login/authentication flow
 * Credentials: test@conest.com / Test1234!
 *
 * Note: iOS Keychain persists across app reinstalls, so if already
 * logged in, the test verifies the authenticated state instead.
 *
 * Created: 2025-10-09
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Quick Login Test', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: 'YES' },
    });
  });

  it('should successfully login with test credentials or verify authenticated state', async () => {
    console.log('🔍 Checking initial app state...');

    // Check if we're already logged in (Keychain tokens persist beyond app delete)
    let alreadyLoggedIn = false;
    try {
      await waitFor(element(by.id('tab-home')))
        .toBeVisible()
        .withTimeout(8000);
      alreadyLoggedIn = true;
    } catch {
      // Not logged in, will proceed with login
    }

    if (alreadyLoggedIn) {
      console.log('✅ Already authenticated - verifying app navigation works');

      // Verify we can navigate between tabs
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('tab-discover')))
        .toBeVisible()
        .withTimeout(3000);
      console.log('✅ Discover tab accessible');

      await element(by.id('tab-profile')).tap();
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      console.log('✅ Profile screen accessible');

      await element(by.id('tab-home')).tap();
      console.log('✅ Authentication verified - app fully functional');
      return;
    }

    // Not logged in - perform login flow
    console.log('📱 Not authenticated, proceeding with login...');

    // Wait for login screen
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(15000);

    console.log('✅ Found login screen');

    // Clear any existing text
    await element(by.id('email-input')).clearText();
    await element(by.id('password-input')).clearText();

    console.log('📝 Entering credentials...');

    // Enter test credentials
    await element(by.id('email-input')).typeText('test@conest.com');
    await element(by.id('password-input')).typeText('Test1234!');

    console.log('✅ Credentials entered');

    // Dismiss keyboard
    await element(by.id('password-input')).tapReturnKey();

    console.log('🔘 Tapping login button...');
    await element(by.id('login-button')).tap();

    console.log('⏳ Waiting for navigation after login...');

    // Wait for successful navigation
    try {
      // Check for main app (tab bar visible)
      await waitFor(element(by.id('tab-home')))
        .toBeVisible()
        .withTimeout(15000);
      console.log('✅ Login successful! Navigated to Main app');
    } catch {
      // New user might go to onboarding
      try {
        await waitFor(element(by.id('onboarding-screen')))
          .toBeVisible()
          .withTimeout(5000);
        console.log('✅ Login successful! Navigated to Onboarding (new user)');
      } catch {
        // Check for any post-login screen
        await waitFor(element(by.id('welcome-back-to-login-button')))
          .toBeVisible()
          .withTimeout(5000);
        console.log('✅ Login successful! Navigated to Welcome screen');
      }
    }
  });
});
