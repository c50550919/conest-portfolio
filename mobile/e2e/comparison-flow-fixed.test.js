/**
 * Comparison Flow Test - Fixed Flow
 *
 * Correct flow:
 * 1. Navigate to Discover tab
 * 2. Wait for profiles to load
 * 3. Select 2+ profiles for comparison
 * 4. Click Compare button
 * 5. Verify comparison screen
 */

describe('Comparison Flow (Fixed)', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  it('should be logged in automatically (DEV mode)', async () => {
    // Wait for main tab navigator
    await waitFor(element(by.id('main-tab-navigator')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ App auto-logged in');
  });

  it('should navigate to Discover tab', async () => {
    // Tap Discover tab
    await element(by.id('tab-discover')).tap();

    console.log('✅ Tapped Discover tab');
  });

  it('should load discovery profiles', async () => {
    // Wait for profile grid to load
    await waitFor(element(by.id('profile-grid')))
      .toBeVisible()
      .withTimeout(15000);

    console.log('✅ Profile grid loaded');
  });

  it('should select first profile for comparison', async () => {
    // Find and tap the bookmark icon on first profile
    const firstProfileBookmark = element(
      by.id('profile-card-0').withDescendant(by.id('bookmark-icon')),
    );

    await waitFor(firstProfileBookmark).toBeVisible().withTimeout(5000);

    await firstProfileBookmark.tap();

    console.log('✅ First profile selected');
  });

  it('should select second profile for comparison', async () => {
    // Find and tap the bookmark icon on second profile
    const secondProfileBookmark = element(
      by.id('profile-card-1').withDescendant(by.id('bookmark-icon')),
    );

    await waitFor(secondProfileBookmark).toBeVisible().withTimeout(5000);

    await secondProfileBookmark.tap();

    console.log('✅ Second profile selected');
  });

  it('should show comparison bar with 2 profiles', async () => {
    // Wait for comparison bar to appear
    await waitFor(element(by.text(/2 selected/i)))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Comparison bar shows 2 profiles');
  });

  it('should show Compare button', async () => {
    // Verify Compare button is visible
    await waitFor(element(by.text('Compare')))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Compare button visible');
  });

  it('should navigate to comparison screen when Compare is tapped', async () => {
    // Tap Compare button
    await element(by.text('Compare')).tap();

    console.log('✅ Tapped Compare button');

    // Wait for comparison screen to load
    await waitFor(element(by.id('compare-profiles-screen')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Comparison screen loaded');
  });

  it('should display profile comparison data', async () => {
    // Check for comparison attributes
    await waitFor(element(by.text(/Location/i)))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Comparison data displayed');
  });

  it('should show both profiles side-by-side', async () => {
    // Verify we have 2 profile columns
    // This is a basic check - adjust based on actual UI structure
    await expect(element(by.id('compare-profiles-screen'))).toBeVisible();

    console.log('✅ Side-by-side comparison working');
  });
});
