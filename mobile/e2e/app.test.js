/**
 * Detox E2E Tests for CoNest Mobile App
 * Tests the complete user flow through onboarding and main features
 */

describe('CoNest App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Onboarding Flow', () => {
    it('should show welcome screen on launch', async () => {
      await expect(element(by.text('Welcome to CoNest'))).toBeVisible();
      await expect(element(by.id('get-started-button'))).toBeVisible();
    });

    it('should navigate to phone verification when Get Started is tapped', async () => {
      await element(by.id('get-started-button')).tap();
      await expect(element(by.text('Phone Verification'))).toBeVisible();
      await expect(element(by.id('skip-to-main-button'))).toBeVisible();
    });

    it('should skip to main app when skip button is tapped', async () => {
      await element(by.id('get-started-button')).tap();
      await element(by.id('skip-to-main-button')).tap();
      // Wait for navigation to complete
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Discover Screen', () => {
    beforeEach(async () => {
      // Navigate to main app
      await element(by.id('get-started-button')).tap();
      await element(by.id('skip-to-main-button')).tap();
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show Discover screen with swipeable cards', async () => {
      await expect(element(by.text('Discover'))).toBeVisible();
      await expect(element(by.text('Swipe right to like, left to pass'))).toBeVisible();
    });

    it('should show parent cards with compatibility scores', async () => {
      // Check for first mock parent
      await expect(element(by.text('Sarah Johnson'))).toBeVisible();
      await expect(element(by.text('San Francisco, CA'))).toBeVisible();
    });

    it('should show action buttons', async () => {
      await expect(element(by.id('pass-button'))).toBeVisible();
      await expect(element(by.id('like-button'))).toBeVisible();
    });

    it('should swipe card when like button is tapped', async () => {
      const initialCard = element(by.text('Sarah Johnson'));
      await expect(initialCard).toBeVisible();

      await element(by.id('like-button')).tap();

      // Wait for card animation and next card to appear
      await waitFor(element(by.text('Maria Garcia')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should swipe card when pass button is tapped', async () => {
      const initialCard = element(by.text('Sarah Johnson'));
      await expect(initialCard).toBeVisible();

      await element(by.id('pass-button')).tap();

      // Wait for card animation and next card to appear
      await waitFor(element(by.text('Maria Garcia')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Messages Screen', () => {
    beforeEach(async () => {
      // Navigate to main app
      await element(by.id('get-started-button')).tap();
      await element(by.id('skip-to-main-button')).tap();
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(3000);

      // Navigate to Messages tab
      await element(by.text('Messages')).tap();
    });

    it('should show Messages screen with conversation list', async () => {
      await expect(element(by.text('Messages'))).toBeVisible();
    });

    it('should show mock conversations', async () => {
      await expect(element(by.text('Sarah Johnson'))).toBeVisible();
      await expect(
        element(by.text('That sounds great! When can we schedule a tour?')),
      ).toBeVisible();
    });

    it('should open chat when conversation is tapped', async () => {
      await element(by.text('Sarah Johnson')).atIndex(0).tap();

      // Wait for chat interface to load
      await waitFor(element(by.id('chat-input')))
        .toBeVisible()
        .withTimeout(2000);

      await expect(element(by.text('Sarah Johnson'))).toBeVisible();
    });

    it('should show message bubbles in chat', async () => {
      await element(by.text('Sarah Johnson')).atIndex(0).tap();

      await waitFor(
        element(by.text('Hello! I saw your profile and we seem to have similar schedules.')),
      )
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should navigate back to conversation list', async () => {
      await element(by.text('Sarah Johnson')).atIndex(0).tap();
      await waitFor(element(by.id('chat-input')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('back-to-messages-button')).tap();

      await expect(element(by.text('Messages'))).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      await element(by.id('get-started-button')).tap();
      await element(by.id('skip-to-main-button')).tap();
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should switch between Discover and Messages tabs', async () => {
      await expect(element(by.text('Discover'))).toBeVisible();

      await element(by.text('Messages')).tap();
      await expect(element(by.text('Messages'))).toBeVisible();

      await element(by.text('Discover')).tap();
      await expect(element(by.text('Discover'))).toBeVisible();
    });

    it('should switch to Home tab', async () => {
      await element(by.text('Home')).tap();
      await expect(element(by.text('Home'))).toBeVisible();
    });

    it('should switch to Household tab', async () => {
      await element(by.text('Household')).tap();
      await expect(element(by.text('Household'))).toBeVisible();
    });

    it('should switch to Profile tab', async () => {
      await element(by.text('Profile')).tap();
      await expect(element(by.text('Profile'))).toBeVisible();
    });
  });
});
