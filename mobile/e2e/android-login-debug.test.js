/**
 * Android Login Debug Test
 * Purpose: Diagnose login issues on Android with detailed logging
 */

describe('Android Login Debug', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on launch', async () => {
    console.log('[TEST] Checking for login screen...');

    // Wait for login screen to appear
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('[TEST] ✓ Login screen visible');
  });

  it('should have email and password inputs', async () => {
    console.log('[TEST] Checking for login form elements...');

    await expect(element(by.id('email-input'))).toBeVisible();
    console.log('[TEST] ✓ Email input visible');

    await expect(element(by.id('password-input'))).toBeVisible();
    console.log('[TEST] ✓ Password input visible');

    await expect(element(by.id('login-button'))).toBeVisible();
    console.log('[TEST] ✓ Login button visible');
  });

  it('should attempt login with test credentials', async () => {
    console.log('[TEST] Starting login attempt...');

    // Fill in credentials
    console.log('[TEST] Filling email: sarah.johnson@test.com');
    await element(by.id('email-input')).typeText('sarah.johnson@test.com');

    console.log('[TEST] Filling password: Test1234');
    await element(by.id('password-input')).typeText('Test1234');

    // Hide keyboard
    console.log('[TEST] Hiding keyboard...');
    await element(by.id('password-input')).tapReturnKey();

    // Wait a moment for keyboard to hide
    await new Promise(resolve => setTimeout(resolve, 500));

    // Tap login button
    console.log('[TEST] Tapping login button...');
    await element(by.id('login-button')).tap();

    console.log('[TEST] Login button tapped, waiting for response...');

    // Wait up to 20 seconds for either success or error
    try {
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(20000);

      console.log('[TEST] ✓✓✓ LOGIN SUCCESS! Home screen visible');
    } catch (error) {
      console.log('[TEST] ✗✗✗ LOGIN FAILED - Home screen not visible after 20s');
      console.log('[TEST] Error:', error.message);

      // Check if error message is displayed
      try {
        const errorElement = element(by.id('error-message'));
        await expect(errorElement).toBeVisible();
        console.log('[TEST] Error message is visible on screen');
      } catch (e) {
        console.log('[TEST] No error message visible');
      }

      // Take a screenshot for debugging
      await device.takeScreenshot('login-failure');
      console.log('[TEST] Screenshot saved as login-failure.png');

      throw error;
    }
  });

  it('should show error for network timeout', async () => {
    console.log('[TEST] Testing network error handling...');

    // Fill in credentials
    await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
    await element(by.id('password-input')).replaceText('Test1234');
    await element(by.id('password-input')).tapReturnKey();

    await new Promise(resolve => setTimeout(resolve, 500));

    // Tap login
    await element(by.id('login-button')).tap();

    console.log('[TEST] Waiting for timeout or error message...');

    // Wait for error message (20 second timeout)
    try {
      await waitFor(element(by.text(/network|timeout|connection|failed/i)))
        .toBeVisible()
        .withTimeout(20000);

      console.log('[TEST] ✓ Error message displayed for network issue');
    } catch (error) {
      console.log('[TEST] ✗ No error message after 20s - possible silent failure');
      await device.takeScreenshot('no-error-message');
      throw new Error('Expected error message but none appeared');
    }
  });
});
