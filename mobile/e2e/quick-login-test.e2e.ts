/**
 * E2E Test: Quick Login Test
 *
 * Purpose: Test login with real test credentials
 * Credentials: test@conest.com / Test1234!
 *
 * Created: 2025-10-09
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Quick Login Test', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  it('should successfully login with test credentials', async () => {
    console.log('🔍 Looking for email input field...');

    // Wait for login screen to appear
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Found email input field');

    // Clear any existing text
    await element(by.id('email-input')).clearText();
    await element(by.id('password-input')).clearText();

    console.log('📝 Entering credentials...');

    // Enter test credentials
    await element(by.id('email-input')).typeText('test@conest.com');
    await element(by.id('password-input')).typeText('Test1234');

    console.log('✅ Credentials entered');

    // Dismiss keyboard
    await element(by.id('password-input')).tapReturnKey();

    console.log('🔘 Tapping login button...');

    // Tap login button
    await element(by.id('login-button')).tap();

    console.log('⏳ Waiting for navigation to main app...');

    // Wait for navigation to main app
    // Look for tab bar or home screen
    await waitFor(element(by.text(/Discover|Home|Profile/i)))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Login successful! Main app screen visible');
  });
});
