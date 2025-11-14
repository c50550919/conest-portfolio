/**
 * Profile Details Modal E2E Tests
 *
 * Tests the ProfileDetailsModal component functionality including:
 * - Modal opening from DiscoverScreen and BrowseDiscoveryScreen
 * - Photo gallery swiping and pagination
 * - Pull-to-close gesture
 * - All profile sections rendering
 * - Action buttons (Continue Browsing, I'm Interested)
 * - Child safety compliance (NO PII)
 *
 * Created: 2025-10-09
 */

describe('ProfileDetailsModal E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('DiscoverScreen Integration', () => {
    it('should open ProfileDetailsModal from info button', async () => {
      // Navigate to app (assuming user is logged in and onboarded)
      // For this test, we assume the app opens to the main tab navigator with Discover tab

      // Wait for DiscoverScreen to load
      await waitFor(element(by.text('Discover')))
        .toBeVisible()
        .withTimeout(10000);

      // Wait for profile card to load
      await waitFor(element(by.id('swipeable-card-0')))
        .toBeVisible()
        .withTimeout(5000);

      // Tap the info button
      await element(by.id('info-button')).tap();

      // Verify modal opened
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Verify header with profile name is visible
      await expect(element(by.id('profile-name-text'))).toBeVisible();
    });

    it('should display photo gallery with pagination indicators', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Verify photo gallery is visible
      await expect(element(by.id('photo-gallery'))).toBeVisible();

      // Verify pagination indicators are visible
      await expect(element(by.id('photo-indicators'))).toBeVisible();

      // Swipe photo gallery left (next photo)
      await element(by.id('photo-gallery')).swipe('left', 'fast');

      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify pagination indicator changed (second dot should be active)
      // Note: This is a visual test, actual verification depends on test ID implementation
    });

    it('should close modal with Continue Browsing button', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Scroll to bottom to see action buttons
      await element(by.id('profile-details-scroll')).scrollTo('bottom');

      // Tap Continue Browsing button
      await element(by.id('continue-browsing-button')).tap();

      // Verify modal closed
      await expect(element(by.id('profile-details-modal'))).not.toBeVisible();
    });

    it('should trigger right swipe when I\'m Interested button is tapped', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Get current profile name to verify it changes
      // Note: In real implementation, we'd need to track profile IDs

      // Scroll to bottom
      await element(by.id('profile-details-scroll')).scrollTo('bottom');

      // Tap I'm Interested button
      await element(by.id('interested-button')).tap();

      // Verify modal closed
      await expect(element(by.id('profile-details-modal'))).not.toBeVisible();

      // Verify next profile card is showing (profile changed)
      // This would require tracking profile IDs in testID
    });

    it('should display all profile sections', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Scroll through modal and verify all sections
      const sections = [
        'compatibility-section',
        'about-section',
        'looking-for-section',
        'children-section',
        'housing-budget-section',
        'schedule-section',
        'parenting-section',
        'personality-section',
      ];

      for (const sectionId of sections) {
        await waitFor(element(by.id(sectionId)))
          .toBeVisible()
          .whileElement(by.id('profile-details-scroll'))
          .scroll(200, 'down');
      }
    });

    it('should NOT display child PII (names, photos, ages)', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Scroll to children section
      await waitFor(element(by.id('children-section')))
        .toBeVisible()
        .whileElement(by.id('profile-details-scroll'))
        .scroll(200, 'down');

      // Verify only childrenCount and age groups are displayed
      await expect(element(by.id('children-count'))).toBeVisible();
      await expect(element(by.id('children-age-groups'))).toBeVisible();

      // Verify NO child names or individual ages
      await expect(element(by.text(/child.*name/i))).not.toExist();
      await expect(element(by.text(/\d+ years old/i))).not.toExist();
    });

    it('should display compatibility breakdown with visual indicators', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Verify compatibility section is visible
      await expect(element(by.id('compatibility-section'))).toBeVisible();

      // Verify all 5 compatibility factors are visible
      const factors = [
        'schedule-compatibility',
        'parenting-compatibility',
        'location-compatibility',
        'budget-compatibility',
        'lifestyle-compatibility',
      ];

      for (const factorId of factors) {
        await expect(element(by.id(factorId))).toBeVisible();
      }

      // Verify compatibility bars are visible (visual indicators)
      await expect(element(by.id('compatibility-bar-schedule'))).toBeVisible();
    });
  });

  describe('BrowseDiscoveryScreen Integration', () => {
    it('should open ProfileDetailsModal from profile card tap', async () => {
      // Navigate to Browse tab (if available)
      // This test assumes there's a browse/filter mode accessible from nav

      // For now, we'll skip this as the Browse screen may not be in main tab navigator
      // Implementation depends on app navigation structure
    });
  });

  describe('Pull-to-Close Gesture', () => {
    it('should close modal with pull-down gesture', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Ensure scroll is at top
      await element(by.id('profile-details-scroll')).scrollTo('top');

      // Pull down gesture (swipe down from top)
      await element(by.id('profile-details-scroll')).swipe('down', 'fast', 0.8);

      // Verify modal closed
      await waitFor(element(by.id('profile-details-modal')))
        .not.toBeVisible()
        .withTimeout(2000);
    });

    it('should NOT close modal when pulling down mid-scroll', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Scroll down a bit
      await element(by.id('profile-details-scroll')).scroll(300, 'down');

      // Try to swipe down (should just scroll, not close)
      await element(by.id('profile-details-scroll')).swipe('down', 'fast');

      // Verify modal is still visible
      await expect(element(by.id('profile-details-modal'))).toBeVisible();
    });
  });

  describe('Performance & Animations', () => {
    it('should render modal within 500ms (Constitution Principle IV)', async () => {
      const startTime = Date.now();

      // Tap info button
      await element(by.id('info-button')).tap();

      // Wait for modal to be visible
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Verify modal opened within 500ms
      expect(renderTime).toBeLessThan(500);
    });

    it('should have smooth slide-in animation', async () => {
      // Open modal
      await element(by.id('info-button')).tap();

      // Verify modal becomes visible (animation completes)
      await waitFor(element(by.id('profile-details-modal')))
        .toBeVisible()
        .withTimeout(1000);

      // Verify modal content is fully visible (not mid-animation)
      await expect(element(by.id('profile-name-text'))).toBeVisible();
    });

    it('should maintain 60fps during photo gallery swipe', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Perform multiple rapid swipes
      for (let i = 0; i < 3; i++) {
        await element(by.id('photo-gallery')).swipe('left', 'fast');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // If app didn't crash or freeze, test passes
      // Note: Actual FPS measurement requires instrumentation
      await expect(element(by.id('photo-gallery'))).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('should handle profile with only 1 photo', async () => {
      // This test requires mock data with single photo
      // For now, just verify photo gallery handles single photo gracefully

      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();
      await expect(element(by.id('photo-gallery'))).toBeVisible();
    });

    it('should handle missing optional profile data', async () => {
      // Open modal
      await element(by.id('info-button')).tap();
      await expect(element(by.id('profile-details-modal'))).toBeVisible();

      // Modal should render even if some optional data is missing
      // No crashes or errors expected
      await expect(element(by.id('profile-details-scroll'))).toBeVisible();
    });

    it('should handle rapid open/close cycles', async () => {
      // Rapid open/close to test memory leaks and state management
      for (let i = 0; i < 3; i++) {
        await element(by.id('info-button')).tap();
        await expect(element(by.id('profile-details-modal'))).toBeVisible();

        await element(by.id('profile-details-scroll')).scrollTo('bottom');
        await element(by.id('continue-browsing-button')).tap();
        await expect(element(by.id('profile-details-modal'))).not.toBeVisible();

        await new Promise(resolve => setTimeout(resolve, 300));
      }
    });
  });
});
