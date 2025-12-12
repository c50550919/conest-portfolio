describe('Bookmark and SavedProfiles Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with test user', async () => {
    // Wait for login screen
    await waitFor(element(by.id('email-input')))
      .toBeVisible()
      .withTimeout(10000);

    // Login with test credentials
    await element(by.id('email-input')).typeText('testparent1@test.com');
    await element(by.id('password-input')).typeText('Test123!@#');
    await element(by.id('login-button')).tap();

    // Wait for home screen to load
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should navigate to Browse/Discover tab', async () => {
    // Tap on Discover tab
    await element(by.id('discover-tab')).tap();

    // Wait for browse screen to load
    await waitFor(element(by.id('browse-discovery-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should click bookmark icon on a profile', async () => {
    // Wait for profile cards to load
    await waitFor(element(by.id('profile-card-0')))
      .toBeVisible()
      .withTimeout(10000);

    // Click the bookmark icon on first profile
    await element(by.id('bookmark-icon-0')).tap();

    // Wait for folder selection modal to appear
    await waitFor(element(by.id('folder-selection-modal')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show folder selection modal with 4 options', async () => {
    // Verify all folder options are visible
    await expect(element(by.id('folder-top-choice'))).toBeVisible();
    await expect(element(by.id('folder-strong-maybe'))).toBeVisible();
    await expect(element(by.id('folder-considering'))).toBeVisible();
    await expect(element(by.id('folder-backup'))).toBeVisible();
  });

  it('should select Top Choice folder', async () => {
    // Click on Top Choice folder
    await element(by.id('folder-top-choice')).tap();

    // Modal should close
    await waitFor(element(by.id('folder-selection-modal')))
      .not.toBeVisible()
      .withTimeout(3000);

    // Success message should appear (alert or toast)
    // Note: Detox has limited alert support, so we'll verify by checking Saved tab
  });

  it('should navigate to Saved tab and verify profile is saved', async () => {
    // Tap on Saved tab
    await element(by.id('saved-tab')).tap();

    // Wait for saved profiles screen to load
    await waitFor(element(by.id('saved-profiles-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Check for 500 error - it should NOT appear
    await expect(element(by.text('Request failed with status code 500'))).not.toBeVisible();

    // Verify saved profile count is not "0 saved"
    await expect(element(by.text('/50 saved'))).toBeVisible();

    // Tap on Top Choice filter to see the saved profile
    await element(by.id('filter-top-choice')).tap();

    // Wait for profile list to load
    await waitFor(element(by.id('saved-profile-0')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should verify backend is returning data correctly', async () => {
    // This test will fail if backend returns 500 error
    // We're already on the Saved tab from previous test

    // Try to scroll the saved profiles list (only works if data loaded)
    await element(by.id('saved-profiles-flatlist')).scroll(100, 'down');
  });
});
