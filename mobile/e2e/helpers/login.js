/**
 * Detox E2E login helper
 *
 * This helper function handles the login flow for E2E tests,
 * including a retry mechanism for authentication failures.
 */

/**
 * Logs in a test user. If the user is already logged in,
 * the function will skip the login process. If the login
 * fails, it will relaunch the app and try again.
 *
 * @param {string} email The user's email address.
 * @param {string} password The user's password.
 * @param {number} retries The number of times to retry the login.
 */
async function login(email, password, retries = 1) {
  for (let i = 0; i < retries; i++) {
    try {
      // Check if the user is already logged in
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ User is already logged in.');
      return;
    } catch (e) {
      // User is not logged in, so proceed with login
      console.log('🔐 User is not logged in. Attempting to log in...');
    }

    try {
      // Wait for the login screen to be visible
      await waitFor(element(by.id('email-input')))
        .toBeVisible()
        .withTimeout(10000);

      // Enter the user's credentials
      await element(by.id('email-input')).clearText();
      await element(by.id('email-input')).typeText(email);
      await element(by.id('password-input')).clearText();
      await element(by.id('password-input')).typeText(password);

      // Tap the login button
      await element(by.id('login-button')).tap();

      // Wait for the main tab navigator to be visible
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(15000);
      console.log('✅ Login successful.');
      return;
    } catch (e) {
      console.log(`🚨 Login attempt ${i + 1} failed. Relaunching app and trying again...`);
      await device.launchApp({ newInstance: true });
    }
  }

  throw new Error(`🚨 Login failed after ${retries} attempts.`);
}

module.exports = {
  login,
};
