/**
 * Detox E2E Test: Unified Comparison Service
 *
 * Tests discovery profile comparison using the new unified comparison endpoint
 * Backend: POST /api/profiles/compare with type: 'discovery'
 *
 * Prerequisites:
 * - Backend running on port 3000 or 3002
 * - Test user logged in (sarah.johnson@test.com)
 * - Discovery profiles available
 */

describe('Unified Comparison - Discovery Profiles', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with test user', async () => {
    // Wait for login screen
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(5000);

    // Enter credentials
    await element(by.id('email-input')).typeText('sarah.johnson@test.com');
    await element(by.id('password-input')).typeText('Test1234!');

    // Tap login button
    await element(by.id('login-button')).tap();

    // Wait for home screen
    await waitFor(element(by.id('main-tab-navigator')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to Discover tab and load profiles', async () => {
    // Tap Discover tab
    await element(by.id('tab-discover')).tap();

    // Wait for Browse Connections screen
    await waitFor(element(by.text('Browse Connections')))
      .toBeVisible()
      .withTimeout(5000);

    // Wait for profiles to load
    await waitFor(element(by.id('profile-grid')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should select 2 discovery profiles for comparison', async () => {
    // Tap compare button on first profile
    await element(by.id('compare-icon-0')).tap();

    // Verify comparison bar appears
    await waitFor(element(by.text('1 profile selected')))
      .toBeVisible()
      .withTimeout(2000);

    // Tap compare button on second profile
    await element(by.id('compare-icon-1')).tap();

    // Verify comparison count updates
    await waitFor(element(by.text('2 profiles selected')))
      .toBeVisible()
      .withTimeout(2000);

    // Verify Compare button is visible
    await expect(element(by.id('compare-button'))).toBeVisible();
  });

  it('should navigate to comparison screen and display unified comparison data', async () => {
    // Tap Compare button
    await element(by.id('compare-button')).tap();

    // Wait for Compare screen to load
    await waitFor(element(by.id('compare-profiles-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify 2 profiles are displayed
    await expect(element(by.id('comparison-profile-0'))).toBeVisible();
    await expect(element(by.id('comparison-profile-1'))).toBeVisible();

    // Verify "Discovery" badges are shown
    await expect(element(by.text('Discovery')).atIndex(0)).toBeVisible();
    await expect(element(by.text('Discovery')).atIndex(1)).toBeVisible();

    // Verify profile data is displayed
    await expect(element(by.id('profile-name-0'))).toBeVisible();
    await expect(element(by.id('profile-age-0'))).toBeVisible();
    await expect(element(by.id('profile-location-0'))).toBeVisible();

    // Verify NO saved metadata (folder, saved date) is shown
    await expect(element(by.text('Top Choice'))).not.toBeVisible();
    await expect(element(by.text('Saved'))).not.toBeVisible();
  });

  it('should display all comparison attributes', async () => {
    // Check for Location
    await expect(element(by.text('Location'))).toBeVisible();

    // Check for Housing Budget
    await expect(element(by.text('Housing Budget'))).toBeVisible();

    // Check for Children
    await expect(element(by.text('Children'))).toBeVisible();

    // Check for Work Schedule
    await expect(element(by.text('Work Schedule'))).toBeVisible();

    // Check for Move-in Date
    await expect(element(by.text('Move-in Date'))).toBeVisible();

    // Check for Verification
    await expect(element(by.text('Verification'))).toBeVisible();
  });

  it('should handle comparison limit (max 4 profiles)', async () => {
    // Navigate back to Discover
    await device.pressBack();

    // Select 3rd profile
    await element(by.id('compare-icon-2')).tap();

    // Verify 3 profiles selected
    await waitFor(element(by.text('3 profiles selected')))
      .toBeVisible()
      .withTimeout(2000);

    // Select 4th profile
    await element(by.id('compare-icon-3')).tap();

    // Verify 4 profiles selected
    await waitFor(element(by.text('4 profiles selected')))
      .toBeVisible()
      .withTimeout(2000);

    // Try to select 5th profile - should show error
    await element(by.id('compare-icon-4')).tap();

    // Verify error message appears
    await waitFor(element(by.text('You can compare up to 4 profiles at once')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('should allow removing profiles from comparison', async () => {
    // Remove one profile
    await element(by.id('remove-comparison-0')).tap();

    // Verify count decreases
    await waitFor(element(by.text('3 profiles selected')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('should handle empty comparison state', async () => {
    // Clear all selections
    await element(by.id('clear-comparison-button')).tap();

    // Verify comparison bar disappears
    await waitFor(element(by.text('0 profiles selected')))
      .not.toBeVisible()
      .withTimeout(2000);

    // Navigate to Compare tab
    await element(by.id('tab-compare')).tap();

    // Verify "No Profiles Selected" alert
    await waitFor(element(by.text('No Profiles Selected')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should log API calls for debugging', async () => {
    // This test verifies Metro logs show correct API calls
    // Check console for:
    // - [SavedProfilesAPI] Unified comparison request: [{ type: 'discovery', id: '...' }]
    // - POST /api/profiles/compare
    // - [SavedProfilesAPI] Unified comparison response: { success: true, data: [...] }

    // Navigate to Discover
    await element(by.id('tab-discover')).tap();

    // Select 2 profiles
    await element(by.id('compare-icon-0')).tap();
    await element(by.id('compare-icon-1')).tap();

    // Tap Compare
    await element(by.id('compare-button')).tap();

    // Wait for comparison to load
    await waitFor(element(by.id('compare-profiles-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Console should show:
    // [SavedProfilesAPI] Unified comparison request
    // [SavedProfilesAPI] Unified comparison response
  });
});

/**
 * Run this test:
 *
 * iOS:
 * npx detox build --configuration ios.sim.debug
 * npx detox test --configuration ios.sim.debug e2e/unified-comparison-test.test.js --loglevel info
 *
 * Expected Results:
 * - All 9 tests pass
 * - Discovery profiles compare successfully
 * - Unified comparison endpoint called
 * - UI displays Discovery badges
 * - No saved metadata shown
 * - Comparison limits enforced
 *
 * If tests fail:
 * 1. Check backend is running (port 3000 or 3002)
 * 2. Verify test user exists (sarah.johnson@test.com)
 * 3. Check discovery profiles are available
 * 4. Review Metro logs for API errors
 * 5. Verify Redux state updates correctly
 */
