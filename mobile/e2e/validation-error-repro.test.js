/**
 * Detox E2E Test: Reproduce Validation Failed Error
 *
 * Test Flow:
 * 1. Click Discover tab
 * 2. Click second row (Jessica or Amanda profile)
 * 3. Click bookmark icon to save
 * 4. Navigate to Saved tab
 * 5. Verify no validation errors
 */

describe('Validation Error Reproduction', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always', notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should click Discover tab, save second row profile, navigate to Saved tab', async () => {
    // Step 1: Click Discover tab
    await element(by.text('Discover')).tap();
    await waitFor(element(by.text('Browse Connections')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Step 1: Discover tab clicked');

    // Step 2: Wait for profiles to load
    await waitFor(element(by.text('Jessica, 29')).or(element(by.text('Amanda, 34'))))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Step 2: Profiles loaded');

    // Step 3: Click on Jessica's profile card (second row, first column)
    try {
      await element(by.text('Jessica, 29')).tap();
      console.log('✅ Step 3: Clicked Jessica profile');
    } catch (error) {
      console.log('⚠️  Jessica not found, trying Amanda...');
      await element(by.text('Amanda, 34')).tap();
      console.log('✅ Step 3: Clicked Amanda profile');
    }

    // Step 4: Wait for bookmark icon to be visible
    await waitFor(element(by.id('bookmark-icon')))
      .toBeVisible()
      .withTimeout(3000);

    // Step 5: Click bookmark icon
    await element(by.id('bookmark-icon')).tap();
    console.log('✅ Step 4: Bookmark icon clicked');

    // Step 6: Wait for folder selection modal
    await waitFor(element(by.id('folder-selection-modal')))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Step 5: Folder modal appeared');

    // Step 7: Select "Top Choice" folder
    await element(by.id('folder-top-choice')).tap();
    console.log('✅ Step 6: Top Choice selected');

    // Wait for modal to close
    await waitFor(element(by.id('folder-selection-modal')))
      .not.toBeVisible()
      .withTimeout(3000);

    // Step 8: Navigate to Saved tab
    await element(by.text('Saved')).tap();
    console.log('✅ Step 7: Saved tab clicked');

    // Step 9: Wait for Saved screen to load
    await waitFor(element(by.text('Saved Profiles')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Step 8: Saved Profiles screen loaded');

    // Step 10: Check for validation errors
    try {
      // This should NOT be visible if everything works
      await expect(element(by.text('Validation failed'))).not.toBeVisible();
      console.log('✅ Step 9: No validation errors');
    } catch (error) {
      console.log('❌ VALIDATION ERROR DETECTED:', error.message);

      // Capture screenshot for debugging
      await device.takeScreenshot('validation-error');

      // Check for API error message
      try {
        const apiError = await element(by.text('[SavedProfilesAPI] Response error:')).isVisible();
        if (apiError) {
          console.log('❌ API ERROR DETECTED');
        }
      } catch (e) {
        // No API error visible
      }

      throw new Error('Validation failed error appeared');
    }

    // Step 11: Verify saved profile appears in the list
    try {
      await waitFor(element(by.text('Jessica, 29')).or(element(by.text('Amanda, 34'))))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ Step 10: Saved profile visible in list');
    } catch (error) {
      console.log('❌ Saved profile not visible');
      throw error;
    }
  });

  it('should handle validation errors gracefully', async () => {
    // Navigate to Saved tab directly
    await element(by.text('Saved')).tap();

    // Wait for loading to complete
    await waitFor(element(by.text('Saved Profiles')))
      .toBeVisible()
      .withTimeout(5000);

    // Check if error dialog appears
    const errorVisible = await element(by.text('Validation failed')).isVisible().catch(() => false);

    if (errorVisible) {
      console.log('❌ Validation error on Saved tab load');

      // Click OK to dismiss
      await element(by.text('OK')).tap();

      // Screenshot for debugging
      await device.takeScreenshot('saved-tab-validation-error');
    } else {
      console.log('✅ No validation error on Saved tab');
    }
  });
});
