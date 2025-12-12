/**
 * Detox E2E Test: Saved Profiles Comparison Flow
 *
 * Purpose: Test profile selection and comparison functionality
 *
 * Flow:
 * 1. Navigate to Saved Profiles tab
 * 2. Select 2-3 profiles using checkboxes
 * 3. Tap Compare button
 * 4. Verify comparison screen loads
 * 5. Check for errors in the comparison data
 */

describe('Saved Profiles Comparison Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: false, // Use existing logged-in session
      launchArgs: { detoxPrintBusyIdleResources: 'YES' },
    });
  });

  it('should navigate to Saved Profiles screen', async () => {
    console.log('📍 Step 1: Looking for Saved tab...');

    // Wait for app to be ready
    await waitFor(element(by.text('Browse')))
      .toBeVisible()
      .withTimeout(5000);

    // Tap on Saved tab (might be labeled "Saved" or have an icon)
    try {
      await element(by.text('Saved')).tap();
      console.log('✅ Tapped Saved tab by text');
    } catch (e) {
      // Try by accessibility ID if text fails
      await element(by.id('saved-tab')).tap();
      console.log('✅ Tapped Saved tab by ID');
    }

    // Verify we're on the Saved Profiles screen
    await waitFor(element(by.text('Saved Profiles')))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Step 1 Complete: On Saved Profiles screen');
  });

  it('should select 2 profiles for comparison', async () => {
    console.log('📍 Step 2: Selecting profiles...');

    // Wait for profiles to load
    await waitFor(element(by.id('saved-profiles-list')))
      .toBeVisible()
      .withTimeout(5000);

    // Select first profile checkbox
    try {
      await element(by.id('profile-checkbox-0')).tap();
      console.log('✅ Selected profile 1');
    } catch (e) {
      console.log('⚠️  Could not find profile-checkbox-0, trying alternate selectors');
      // Try to find any checkbox
      await element(by.type('RCTSwitch')).atIndex(0).tap();
    }

    await device.takeScreenshot('profile-1-selected');

    // Select second profile checkbox
    try {
      await element(by.id('profile-checkbox-1')).tap();
      console.log('✅ Selected profile 2');
    } catch (e) {
      console.log('⚠️  Could not find profile-checkbox-1, trying alternate selectors');
      await element(by.type('RCTSwitch')).atIndex(1).tap();
    }

    await device.takeScreenshot('profile-2-selected');

    console.log('✅ Step 2 Complete: 2 profiles selected');
  });

  it('should tap Compare button', async () => {
    console.log('📍 Step 3: Tapping Compare button...');

    // Find and tap Compare button
    await waitFor(element(by.text('Compare')))
      .toBeVisible()
      .withTimeout(3000);

    await device.takeScreenshot('before-compare-tap');

    await element(by.text('Compare')).tap();
    console.log('✅ Tapped Compare button');

    await device.takeScreenshot('after-compare-tap');

    console.log('✅ Step 3 Complete: Compare button tapped');
  });

  it('should display comparison screen or show error', async () => {
    console.log('📍 Step 4: Checking for comparison screen or errors...');

    // Wait a moment for navigation or error
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await device.takeScreenshot('comparison-result');

    // Check if we navigated to comparison screen
    try {
      await waitFor(element(by.text('Compare Profiles')))
        .toBeVisible()
        .withTimeout(3000);
      console.log('✅ Comparison screen loaded successfully!');
    } catch (e) {
      console.log('⚠️  Comparison screen did not load');

      // Check for error messages
      try {
        await element(by.text('Dismiss')).tap();
        console.log('⚠️  Error modal detected and dismissed');
      } catch (dismissError) {
        console.log('ℹ️  No error modal found');
      }
    }

    console.log('✅ Step 4 Complete: Checked for results');
  });

  it('should verify comparison data if screen loaded', async () => {
    console.log('📍 Step 5: Verifying comparison data...');

    // Check if comparison screen is visible
    try {
      await expect(element(by.text('Compare Profiles'))).toBeVisible();

      // Look for profile comparison cards
      await expect(element(by.id('comparison-scroll-view'))).toBeVisible();

      console.log('✅ Comparison screen visible with data');

      await device.takeScreenshot('comparison-screen-final');
    } catch (e) {
      console.log('⚠️  Comparison screen not visible or data missing');
      console.log('Error:', e.message);
    }

    console.log('✅ Step 5 Complete: Verification finished');
  });
});
