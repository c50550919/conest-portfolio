/**
 * Comparison Tool E2E Tests
 *
 * Comprehensive end-to-end tests for the profile comparison feature
 * Tests the complete user workflow from login through comparison viewing
 *
 * Test Coverage:
 * - Authentication flow
 * - Profile selection from Discover tab
 * - Comparison bar interaction
 * - Navigate to Compare tab
 * - Side-by-side comparison view
 * - Remove profile from comparison
 * - Edge cases and error states
 *
 * Created: 2025-10-19
 */

describe('Profile Comparison Tool - Complete Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    // Optional: cleanup
  });

  /**
   * Test 1: Login and verify user authentication
   */
  describe('Authentication', () => {
    it('should log in successfully with test credentials', async () => {
      // Verify login screen is visible
      await expect(element(by.text('Welcome back'))).toBeVisible();

      // Enter credentials
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');

      // Tap login button
      await element(by.id('login-button')).tap();

      // Wait for and verify home screen loads
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.id('tab-home'))).toBeVisible();
    });

    it('should show user profile information in Profile tab', async () => {
      // Login first
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to Profile tab
      await element(by.id('tab-profile')).tap();

      // Verify profile screen loads
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify user information is displayed
      await expect(element(by.id('profile-name'))).toBeVisible();
      await expect(element(by.id('profile-photo'))).toBeVisible();
    });
  });

  /**
   * Test 2: Compare tab visibility and initial state
   */
  describe('Compare Tab - Initial State', () => {
    beforeEach(async () => {
      // Login for each test
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display Compare tab in navigation bar', async () => {
      await expect(element(by.id('tab-compare'))).toBeVisible();
    });

    it('should show empty state when no profiles selected', async () => {
      // Navigate to Compare tab
      await element(by.id('tab-compare')).tap();

      // Verify empty state is shown
      await waitFor(element(by.text('No Profiles to Compare')))
        .toBeVisible()
        .withTimeout(2000);

      await expect(
        element(
          by.text(
            'Please select 2-4 profiles from the Discover or Saved Profiles screens to compare.',
          ),
        )
      ).toBeVisible();
    });
  });

  /**
   * Test 3: Profile selection from Discover tab
   */
  describe('Profile Selection from Discover', () => {
    beforeEach(async () => {
      // Login for each test
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to Discover tab and load profiles', async () => {
      // Navigate to Discover tab
      await element(by.id('tab-discover')).tap();

      // Wait for profiles to load
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should add profiles to comparison by tapping compare icon', async () => {
      // Navigate to Discover tab
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);

      // Tap compare icon on first profile
      await element(by.id('compare-icon-0')).tap();

      // Verify comparison bar appears
      await waitFor(element(by.text(/1 profile selected/)))
        .toBeVisible()
        .withTimeout(2000);

      // Tap compare icon on second profile
      await element(by.id('compare-icon-1')).tap();

      // Verify comparison bar updates
      await waitFor(element(by.text(/2 profiles selected/)))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should show comparison bar with correct count', async () => {
      // Navigate to Discover tab
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);

      // Add 3 profiles to comparison
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();
      await element(by.id('compare-icon-2')).tap();

      // Verify comparison bar shows correct count
      await expect(element(by.text('3 profiles selected'))).toBeVisible();

      // Verify Compare button is visible
      await expect(element(by.text('Compare'))).toBeVisible();
    });

    it('should prevent adding more than 4 profiles to comparison', async () => {
      // Navigate to Discover tab
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);

      // Add 4 profiles to comparison
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();
      await element(by.id('compare-icon-2')).tap();
      await element(by.id('compare-icon-3')).tap();

      // Try to add 5th profile - should show alert
      await element(by.id('compare-icon-4')).tap();

      // Verify alert is shown
      await expect(element(by.text('Comparison Limit'))).toBeVisible();
      await expect(element(by.text('You can compare up to 4 profiles at a time'))).toBeVisible();
    });
  });

  /**
   * Test 4: Navigate to Compare tab and view comparison
   */
  describe('Comparison View', () => {
    beforeEach(async () => {
      // Login for each test
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to Discover and add 2 profiles to comparison
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();
    });

    it('should navigate to Compare tab when Compare button is tapped', async () => {
      // Tap Compare button in comparison bar
      await element(by.text('Compare')).tap();

      // Verify Compare tab is active
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should display comparison header with profile count', async () => {
      await element(by.text('Compare')).tap();
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify header shows correct count
      await expect(element(by.text(/2 profiles selected/))).toBeVisible();
      await expect(element(by.text('Compare Profiles'))).toBeVisible();
    });

    it('should display attribute labels column', async () => {
      await element(by.text('Compare')).tap();
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify attribute labels are visible
      await expect(element(by.text('Location'))).toBeVisible();
      await expect(element(by.text('Housing Budget'))).toBeVisible();
      await expect(element(by.text('Children'))).toBeVisible();
      await expect(element(by.text('Work Schedule'))).toBeVisible();
      await expect(element(by.text('Move-in Date'))).toBeVisible();
    });

    it('should display profile cards with names and avatars', async () => {
      await element(by.text('Compare')).tap();
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify profile cards are visible
      // Note: Actual profile names will depend on mock data
      await expect(element(by.id('profile-card-0'))).toBeVisible();
      await expect(element(by.id('profile-card-1'))).toBeVisible();
    });

    it('should allow horizontal scrolling to view all profiles', async () => {
      // Add 3 profiles to comparison
      await element(by.id('compare-icon-2')).tap();
      await element(by.text('Compare')).tap();
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Scroll horizontally to view third profile
      await element(by.id('horizontal-scroll')).scroll(200, 'right');

      // Verify third profile card is visible
      await expect(element(by.id('profile-card-2'))).toBeVisible();
    });
  });

  /**
   * Test 5: Remove profile from comparison
   */
  describe('Remove Profile', () => {
    beforeEach(async () => {
      // Login and setup comparison with 3 profiles
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();
      await element(by.id('compare-icon-2')).tap();
      await element(by.text('Compare')).tap();
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should remove profile when remove button is tapped', async () => {
      // Verify 3 profiles are shown
      await expect(element(by.text('3 profiles selected'))).toBeVisible();

      // Tap remove button on first profile
      await element(by.id('remove-profile-0')).tap();

      // Verify profile count updated
      await waitFor(element(by.text('2 profiles selected')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should show alert when trying to remove profile leaving less than 2', async () => {
      // Remove profiles until only 2 remain
      await element(by.id('remove-profile-0')).tap();
      await waitFor(element(by.text('2 profiles selected')))
        .toBeVisible()
        .withTimeout(2000);

      // Try to remove another profile
      await element(by.id('remove-profile-0')).tap();

      // Verify alert is shown
      await expect(element(by.text('Minimum Profiles Required'))).toBeVisible();
      await expect(element(by.text('You need at least 2 profiles to compare.'))).toBeVisible();
    });
  });

  /**
   * Test 6: Error states and edge cases
   */
  describe('Error States', () => {
    it('should handle network errors gracefully', async () => {
      // This test requires network manipulation
      // Placeholder for future implementation
    });

    it('should show loading state while fetching comparison data', async () => {
      // Login
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);

      // Add profiles and navigate to comparison
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();
      await element(by.text('Compare')).tap();

      // Loading state should briefly appear
      // Note: May be too fast to catch in some cases
      await expect(element(by.text('Loading comparison...'))).toBeVisible();
    });
  });

  /**
   * Test 7: Tab navigation integration
   */
  describe('Tab Navigation', () => {
    beforeEach(async () => {
      // Login
      await element(by.id('email-input')).replaceText('sarah.johnson@test.com');
      await element(by.id('password-input')).replaceText('Test1234');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('main-tab-navigator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should maintain comparison state when switching tabs', async () => {
      // Add profiles to comparison
      await element(by.id('tab-discover')).tap();
      await waitFor(element(by.id('profile-grid')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('compare-icon-0')).tap();
      await element(by.id('compare-icon-1')).tap();

      // Switch to Home tab
      await element(by.id('tab-home')).tap();

      // Switch back to Discover tab
      await element(by.id('tab-discover')).tap();

      // Verify comparison bar still shows 2 profiles
      await expect(element(by.text('2 profiles selected'))).toBeVisible();
    });

    it('should access Compare tab directly from tab bar', async () => {
      // Tap Compare tab from tab bar
      await element(by.id('tab-compare')).tap();

      // Verify Compare screen loads
      await waitFor(element(by.id('compare-profiles-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });
});
