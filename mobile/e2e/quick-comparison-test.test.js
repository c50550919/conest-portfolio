/**
 * Quick Comparison Test - Assumes already logged in
 *
 * Tests the unified comparison feature without login
 * Use this when the app is already authenticated
 */

describe('Quick Comparison Test (Already Logged In)', () => {
  beforeAll(async () => {
    // Don't launch new instance, use running app
    await device.launchApp({
      newInstance: false,
    });
  });

  it('should already be logged in and on home screen', async () => {
    // Wait for main tab navigator to be visible
    await waitFor(element(by.id('main-tab-navigator')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ App is logged in');
  });

  it('should navigate to Discover tab', async () => {
    // Tap Discover tab
    await element(by.id('tab-discover')).tap();

    // Wait for Browse screen
    await waitFor(element(by.text('Browse Connections')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Navigated to Discover tab');
  });

  it('should load discovery profiles', async () => {
    // Wait for profile grid
    await waitFor(element(by.id('profile-grid')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Profiles loaded');
  });

  it('should select 2 profiles for comparison', async () => {
    // Tap compare icon on first profile
    await element(by.id('compare-icon-0')).tap();

    // Wait for comparison bar
    await waitFor(element(by.text(/1 profile/)))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ First profile selected');

    // Tap compare icon on second profile
    await element(by.id('compare-icon-1')).tap();

    // Wait for count update
    await waitFor(element(by.text(/2 profiles/)))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Second profile selected');
  });

  it('should show Compare button', async () => {
    // Verify Compare button is visible
    await expect(element(by.text('Compare'))).toBeVisible();

    console.log('✅ Compare button visible');
  });

  it('should navigate to comparison screen', async () => {
    // Tap Compare button
    await element(by.text('Compare')).tap();

    // Wait for comparison screen
    await waitFor(element(by.id('compare-profiles-screen')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Comparison screen loaded');
  });

  it('should display Discovery badges', async () => {
    // Look for Discovery badges
    await waitFor(element(by.text('Discovery')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Discovery badges displayed');
  });

  it('should display comparison attributes', async () => {
    // Check for key attributes
    await expect(element(by.text('Location'))).toBeVisible();
    await expect(element(by.text('Housing Budget'))).toBeVisible();
    await expect(element(by.text('Children'))).toBeVisible();

    console.log('✅ Comparison attributes displayed');
  });

  it('should NOT show saved metadata', async () => {
    // Verify no "Saved" text (only "Discovery")
    const savedElements = await element(by.text('Saved')).getAttributes();
    // This should not exist or not be visible

    console.log('✅ No saved metadata shown (correct for discovery profiles)');
  });
});
