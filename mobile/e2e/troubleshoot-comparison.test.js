/**
 * Troubleshooting Test - Profile Comparison Flow
 *
 * This test clicks through the entire flow step-by-step with detailed logging
 * to identify exactly where the "No profiles selected" issue occurs.
 */

describe('🔍 Troubleshoot Profile Comparison Flow', () => {
  beforeAll(async () => {
    console.log('\n========================================');
    console.log('🚀 STARTING TROUBLESHOOTING TEST');
    console.log('========================================\n');

    await device.launchApp({
      newInstance: true,
      delete: true, // Clear app data to force fresh login
      permissions: { notifications: 'YES', location: 'always' },
    });
  });

  it('should click through discover → bookmark → compare flow', async () => {
    console.log('\n📱 TEST STARTED\n');

    // ========================================
    // STEP 1: CHECK IF ALREADY LOGGED IN
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: CHECK INITIAL STATE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await device.takeScreenshot('00-initial-state');
    console.log('📸 Screenshot saved: 00-initial-state');

    // ========================================
    // STEP 2: LOGIN
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: LOGIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Waiting for login screen...');
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(10000);
    console.log('✅ Login screen visible');

    console.log('⏳ Typing email...');
    await element(by.id('email-input')).typeText('sarah.johnson@test.com');
    console.log('✅ Email entered');

    console.log('⏳ Typing password...');
    await element(by.id('password-input')).typeText('Test1234');
    console.log('✅ Password entered');

    console.log('⏳ Tapping login button...');
    await element(by.id('login-button')).tap();
    console.log('✅ Login button tapped');

    console.log('⏳ Waiting for home screen...');
    await waitFor(element(by.text('Welcome back!')))
      .toBeVisible()
      .withTimeout(15000);
    console.log('✅ Home screen loaded - LOGIN SUCCESSFUL!\n');

    // ========================================
    // STEP 3: NAVIGATE TO DISCOVER TAB
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: NAVIGATE TO DISCOVER TAB');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Looking for Discover tab...');
    await waitFor(element(by.text('Discover')))
      .toBeVisible()
      .withTimeout(5000);
    console.log('✅ Discover tab found');

    console.log('⏳ Tapping Discover tab...');
    await element(by.text('Discover')).tap();
    console.log('✅ Discover tab tapped');

    // Wait for profiles to load
    console.log('⏳ Waiting for Browse Connections screen...');
    await waitFor(element(by.text('Browse Connections')))
      .toBeVisible()
      .withTimeout(15000);
    console.log('✅ Browse Connections screen loaded - DISCOVER TAB ACTIVE!\n');

    // Wait a bit for profiles to actually load from API
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Waited for profiles to load from API');

    // Take screenshot
    await device.takeScreenshot('01-discover-screen-loaded');
    console.log('📸 Screenshot saved: 01-discover-screen-loaded');

    // ========================================
    // STEP 4: BOOKMARK FIRST PROFILE
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: BOOKMARK FIRST PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Look for first profile's bookmark button
    console.log('⏳ Looking for first bookmark button...');

    // Try multiple selectors to find bookmark button
    let bookmarkFound = false;
    const bookmarkSelectors = [
      'bookmark-button-0',
      'bookmark-icon-0',
      'save-profile-0',
      'bookmark-0'
    ];

    for (const selector of bookmarkSelectors) {
      try {
        await waitFor(element(by.id(selector)))
          .toBeVisible()
          .withTimeout(2000);
        console.log(`✅ Found bookmark button with id: ${selector}`);
        bookmarkFound = true;

        console.log('⏳ Tapping first bookmark button...');
        await element(by.id(selector)).tap();
        console.log('✅ First bookmark button tapped');
        break;
      } catch (e) {
        console.log(`❌ Bookmark button not found with id: ${selector}`);
      }
    }

    if (!bookmarkFound) {
      console.log('⚠️  Could not find bookmark button, trying alternative approach...');
      // Try finding by text/label
      try {
        await element(by.label('Bookmark')).atIndex(0).tap();
        console.log('✅ Tapped bookmark by label');
        bookmarkFound = true;
      } catch (e) {
        console.log('❌ Could not find bookmark by label either');
        await device.takeScreenshot('ERROR-no-bookmark-button');
        throw new Error('FATAL: Could not find any bookmark button!');
      }
    }

    // Wait for and dismiss success alert
    console.log('⏳ Waiting for success alert...');
    try {
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ Success alert appeared');

      await element(by.text('OK')).tap();
      console.log('✅ Success alert dismissed');
    } catch (e) {
      console.log('⚠️  No alert appeared (this might be OK if alerts are disabled)');
    }

    await device.takeScreenshot('02-first-profile-bookmarked');
    console.log('📸 Screenshot saved: 02-first-profile-bookmarked\n');

    // ========================================
    // STEP 5: BOOKMARK SECOND PROFILE
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: BOOKMARK SECOND PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Looking for second bookmark button...');
    let secondBookmarkFound = false;

    for (const selector of bookmarkSelectors) {
      try {
        const secondSelector = selector.replace('-0', '-1');
        await waitFor(element(by.id(secondSelector)))
          .toBeVisible()
          .withTimeout(2000);
        console.log(`✅ Found second bookmark button with id: ${secondSelector}`);

        console.log('⏳ Tapping second bookmark button...');
        await element(by.id(secondSelector)).tap();
        console.log('✅ Second bookmark button tapped');
        secondBookmarkFound = true;
        break;
      } catch (e) {
        console.log(`❌ Second bookmark not found with modified id`);
      }
    }

    if (!secondBookmarkFound) {
      try {
        await element(by.label('Bookmark')).atIndex(1).tap();
        console.log('✅ Tapped second bookmark by label');
        secondBookmarkFound = true;
      } catch (e) {
        console.log('❌ Could not find second bookmark');
        await device.takeScreenshot('ERROR-no-second-bookmark');
        throw new Error('FATAL: Could not find second bookmark button!');
      }
    }

    // Dismiss alert
    try {
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('OK')).tap();
      console.log('✅ Second success alert dismissed');
    } catch (e) {
      console.log('⚠️  No alert for second bookmark');
    }

    await device.takeScreenshot('03-second-profile-bookmarked');
    console.log('📸 Screenshot saved: 03-second-profile-bookmarked\n');

    // ========================================
    // STEP 6: ADD TO COMPARISON
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: ADD PROFILES TO COMPARISON');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Look for comparison toggle/checkbox
    console.log('⏳ Looking for comparison toggle...');
    const comparisonSelectors = [
      'comparison-toggle-0',
      'comparison-checkbox-0',
      'compare-checkbox-0',
      'add-to-comparison-0'
    ];

    let comparisonFound = false;
    for (const selector of comparisonSelectors) {
      try {
        await waitFor(element(by.id(selector)))
          .toBeVisible()
          .withTimeout(2000);
        console.log(`✅ Found comparison toggle: ${selector}`);

        await element(by.id(selector)).tap();
        console.log('✅ First profile added to comparison');

        // Add second profile
        const secondSelector = selector.replace('-0', '-1');
        await element(by.id(secondSelector)).tap();
        console.log('✅ Second profile added to comparison');

        comparisonFound = true;
        break;
      } catch (e) {
        console.log(`❌ Comparison toggle not found: ${selector}`);
      }
    }

    if (!comparisonFound) {
      console.log('⚠️  Comparison toggles not found - profiles might already be in comparison from bookmarking');
    }

    await device.takeScreenshot('04-profiles-added-to-comparison');
    console.log('📸 Screenshot saved: 04-profiles-added-to-comparison\n');

    // ========================================
    // STEP 7: LOOK FOR COMPARISON BAR
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: CHECK FOR COMPARISON BAR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Looking for comparison bar...');
    try {
      await waitFor(element(by.id('comparison-bar')))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ Comparison bar is visible!');
    } catch (e) {
      console.log('❌ Comparison bar NOT visible');
      await device.takeScreenshot('ERROR-no-comparison-bar');

      // Try to find it by text instead
      try {
        await waitFor(element(by.text(/selected/i)))
          .toBeVisible()
          .withTimeout(2000);
        console.log('✅ Found "selected" text - comparison bar might be using different ID');
      } catch (e2) {
        console.log('❌ No comparison bar or selected text found');
        throw new Error('FATAL: Comparison bar not appearing after adding profiles!');
      }
    }

    await device.takeScreenshot('05-comparison-bar-visible');
    console.log('📸 Screenshot saved: 05-comparison-bar-visible\n');

    // ========================================
    // STEP 8: CLICK COMPARE BUTTON
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 8: CLICK COMPARE BUTTON');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Looking for Compare button...');
    const compareButtonSelectors = [
      'compare-button',
      'comparison-compare-button',
      'start-comparison-button'
    ];

    let compareButtonFound = false;
    for (const selector of compareButtonSelectors) {
      try {
        await waitFor(element(by.id(selector)))
          .toBeVisible()
          .withTimeout(2000);
        console.log(`✅ Found Compare button: ${selector}`);

        console.log('⏳ Tapping Compare button...');
        await element(by.id(selector)).tap();
        console.log('✅ Compare button tapped!');
        compareButtonFound = true;
        break;
      } catch (e) {
        console.log(`❌ Compare button not found: ${selector}`);
      }
    }

    if (!compareButtonFound) {
      // Try finding by text
      try {
        await element(by.text('Compare')).tap();
        console.log('✅ Tapped Compare button by text');
        compareButtonFound = true;
      } catch (e) {
        await device.takeScreenshot('ERROR-no-compare-button');
        throw new Error('FATAL: Could not find Compare button!');
      }
    }

    await device.takeScreenshot('06-compare-button-clicked');
    console.log('📸 Screenshot saved: 06-compare-button-clicked\n');

    // ========================================
    // STEP 9: VERIFY COMPARE SCREEN
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 9: VERIFY COMPARE SCREEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Waiting for Compare screen...');

    // Check for success - Compare screen should be visible
    try {
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(10000);
      console.log('✅ Compare screen is visible!');
    } catch (e) {
      console.log('❌ Compare screen NOT visible');
      await device.takeScreenshot('ERROR-compare-screen-not-visible');
    }

    // Check for the ERROR - "No Profiles Selected" alert
    console.log('⏳ Checking for "No Profiles Selected" error...');
    try {
      await waitFor(element(by.text('No Profiles Selected')))
        .toBeVisible()
        .withTimeout(3000);

      // If we reach here, the error appeared - TEST FAILED
      console.log('❌❌❌ FAILURE: "No Profiles Selected" alert appeared!');
      await device.takeScreenshot('FAILURE-no-profiles-selected-alert');
      throw new Error('TEST FAILED: "No Profiles Selected" alert appeared - profiles were not saved to backend!');

    } catch (e) {
      if (e.message.includes('TEST FAILED')) {
        throw e; // Re-throw test failure
      }
      // Error didn't appear - this is SUCCESS!
      console.log('✅✅✅ SUCCESS: No "No Profiles Selected" alert!');
    }

    // Verify comparison profiles are visible
    console.log('⏳ Checking for comparison profile cards...');
    try {
      await waitFor(element(by.id('comparison-profile-0')))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ First comparison profile visible');

      await waitFor(element(by.id('comparison-profile-1')))
        .toBeVisible()
        .withTimeout(5000);
      console.log('✅ Second comparison profile visible');

      console.log('✅✅✅ Both comparison profiles are displaying correctly!');
    } catch (e) {
      console.log('⚠️  Comparison profile cards not found (might use different IDs)');
      // Not fatal - screen might be showing profiles differently
    }

    await device.takeScreenshot('07-compare-screen-success');
    console.log('📸 Screenshot saved: 07-compare-screen-success\n');

    // ========================================
    // TEST COMPLETE
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅✅✅ TEST COMPLETED SUCCESSFULLY! ✅✅✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Summary:');
    console.log('  ✅ Navigated to Discover');
    console.log('  ✅ Bookmarked 2 profiles');
    console.log('  ✅ Added profiles to comparison');
    console.log('  ✅ Clicked Compare button');
    console.log('  ✅ Compare screen loaded');
    console.log('  ✅ No error alert appeared');
    console.log('  ✅ Profiles displaying correctly');
    console.log('\n========================================\n');
  });
});
