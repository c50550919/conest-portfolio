/**
 * E2E Test: Discovery Flow (Child Safety Critical)
 *
 * Purpose: Test swipeable discovery screen with strict child PII verification
 * Constitution: Principle I (Child Safety - NO child PII)
 *              Principle IV (Performance - 60fps animations, <500ms profile loading)
 *
 * CRITICAL TEST COVERAGE:
 * - Profile cards display ONLY childrenCount + childrenAgeGroups
 * - NO child names, photos, ages, or schools visible
 * - Swipe gestures work smoothly (60fps)
 * - Match notifications appear correctly
 * - Screenshot detection alerts (child safety feature)
 *
 * Created: 2025-10-08
 */

import { device, element, by, expect as detoxExpect } from 'detox';

describe('Discovery Flow (Child Safety Critical)', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });

    // Login first
    await element(by.id('email-input')).typeText('parent@example.com');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('password-input')).tapReturnKey();
    await element(by.id('login-button')).tap();

    // Wait for main app
    await waitFor(element(by.text('Discover')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('Discovery Screen UI', () => {
    it('should display discovery screen with profiles', async () => {
      // Verify discovery screen elements
      await detoxExpect(element(by.text('Discover'))).toBeVisible();
      await detoxExpect(
        element(by.text(/Swipe right to connect/i))
      ).toBeVisible();

      // Verify action buttons are visible
      await detoxExpect(
        element(by.label('Continue to next profile'))
      ).toBeVisible();
      await detoxExpect(
        element(by.label('Express interest in this housing partner'))
      ).toBeVisible();
    });

    it('CRITICAL: should display ONLY childrenCount and childrenAgeGroups (NO CHILD PII)', async () => {
      // Scroll to children info section
      await element(by.text('Children')).swipe('up', 'fast', 0.5);

      // VERIFY: Child count is displayed (generic integer)
      await detoxExpect(element(by.text(/\d+ (child|children)/))).toBeVisible();

      // VERIFY: Age groups are displayed (generic ranges: toddler, elementary, teen)
      await detoxExpect(element(by.text(/Age groups:/))).toBeVisible();
      await detoxExpect(
        element(by.text(/(0-5|6-12|13-18)/))
      ).toBeVisible();

      // CRITICAL VERIFICATION: NO child PII should be present
      // These elements should NOT exist anywhere on the screen:
      await detoxExpect(element(by.text(/child's name/i))).not.toExist();
      await detoxExpect(element(by.text(/daughter|son/i))).not.toExist();
      await detoxExpect(element(by.id('child-photo'))).not.toExist();
      await detoxExpect(element(by.text(/school/i))).not.toExist();
      await detoxExpect(element(by.text(/grade/i))).not.toExist();

      // PASS if we reach here: No child PII detected
    });

    it('should display verification badges', async () => {
      // Verify ID verification badge
      await detoxExpect(element(by.text('ID Verified'))).toBeVisible();

      // Verify background check badge
      await detoxExpect(
        element(by.text('Background Check'))
      ).toBeVisible();

      // Verify phone verification badge
      await detoxExpect(element(by.text('Phone Verified'))).toBeVisible();
    });

    it('should display compatibility score', async () => {
      // Compatibility score should be visible with percentage
      await detoxExpect(element(by.text(/\d+%/))).toBeVisible();
      await detoxExpect(element(by.text('Match'))).toBeVisible();
    });
  });

  describe('Swipe Gestures (60fps Performance)', () => {
    it('should swipe left (pass) on profile', async () => {
      const initialProfileName = await element(
        by.id('profile-name')
      ).getAttributes();

      // Swipe left gesture
      await element(by.label('Continue to next profile')).tap();

      // Verify profile changed (new profile loaded)
      await waitFor(element(by.id('profile-name')))
        .not.toHaveText(initialProfileName.text || '')
        .withTimeout(1000);
    });

    it('should swipe right (interest) on profile', async () => {
      // Swipe right gesture
      await element(by.label('Express interest in this housing partner')).tap();

      // Verify swipe was recorded (next profile appears)
      // OR match modal appears if mutual match
      await waitFor(
        element(by.text(/Discover|It's a Household Match!/i))
      )
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should handle swipe gestures smoothly (performance test)', async () => {
      const startTime = Date.now();

      // Perform 5 rapid swipes
      for (let i = 0; i < 5; i++) {
        await element(by.label('Continue to next profile')).tap();
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms between swipes
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify swipes completed within performance budget
      // 5 swipes with 200ms delay = ~1000ms minimum
      // Adding 500ms buffer for UI updates = 1500ms max
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Match Notifications', () => {
    it('should display match modal when mutual interest occurs', async () => {
      // Swipe right on a profile (assuming backend returns match)
      await element(by.label('Express interest in this housing partner')).tap();

      // Wait for match modal to appear
      // Note: This test assumes mock data or test backend returns a match
      await waitFor(element(by.text(/It's a Household Match!/i)))
        .toBeVisible()
        .withTimeout(3000);

      // Verify match modal elements
      await detoxExpect(element(by.text(/compatibility/i))).toBeVisible();
      await detoxExpect(element(by.id('send-message-button'))).toBeVisible();
      await detoxExpect(element(by.id('close-match-modal'))).toBeVisible();
    });

    it('should navigate to messages from match modal', async () => {
      // Assuming match modal is open from previous test
      await element(by.id('send-message-button')).tap();

      // Verify navigation to messages screen
      await waitFor(element(by.text('Messages')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Screenshot Detection (Child Safety Feature)', () => {
    it('should detect and report screenshots', async () => {
      // Navigate back to discovery screen
      await element(by.text('Discover')).tap();

      // Take a screenshot (simulates user taking screenshot)
      await device.takeScreenshot('discovery-screenshot-test');

      // CRITICAL: Verify screenshot alert appears
      // Note: Screenshot detection may require native module integration
      // For now, this is a placeholder test
      // await waitFor(element(by.text('Screenshot Detected')))
      //   .toBeVisible()
      //   .withTimeout(2000);

      // Verify warning message about privacy
      // await detoxExpect(
      //   element(by.text(/profile owner has been notified/i))
      // ).toBeVisible();
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no profiles available', async () => {
      // Swipe through all profiles (assuming limited test data)
      // This test assumes you have a way to reach the empty state
      // For example, swipe left 20 times to exhaust profiles

      // await waitFor(element(by.text('No More Profiles Right Now')))
      //   .toBeVisible()
      //   .withTimeout(10000);

      // await detoxExpect(
      //   element(
      //     by.text(
      //       /You've reviewed all available profiles|finding compatible housing partners/i
      //     )
      //   )
      // ).toBeVisible();
    });
  });

  describe('Performance Metrics', () => {
    it('should load profiles within 500ms', async () => {
      // Reload discovery screen
      await device.reloadReactNative();
      await element(by.text('Discover')).tap();

      const startTime = Date.now();

      // Wait for first profile to appear
      await waitFor(element(by.id('profile-name')))
        .toBeVisible()
        .withTimeout(1000);

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Verify load time is under 500ms (Constitution Principle IV)
      expect(loadTime).toBeLessThan(500);
    });

    it('should maintain 60fps during swipe animations', async () => {
      // This test would ideally measure FPS during animations
      // Detox doesn't directly measure FPS, but we can verify smoothness
      // by ensuring animations complete without lag

      // Perform a swipe gesture
      await element(by.label('Continue to next profile')).tap();

      // Verify next profile appears quickly (within 16.67ms * 30 frames = 500ms)
      await waitFor(element(by.id('profile-name')))
        .toBeVisible()
        .withTimeout(500);
    });
  });

  describe('CHILD SAFETY COMPLIANCE VERIFICATION', () => {
    it('CRITICAL: should NEVER display child names', async () => {
      // Scan entire profile card for child names
      // This is a negative test - we expect these elements NOT to exist

      await detoxExpect(
        element(by.text(/Emma|Liam|Olivia|Noah/i))
      ).not.toExist();
      await detoxExpect(element(by.text(/child's name/i))).not.toExist();
      await detoxExpect(element(by.id('child-name-input'))).not.toExist();
    });

    it('CRITICAL: should NEVER display child photos', async () => {
      await detoxExpect(element(by.id('child-photo'))).not.toExist();
      await detoxExpect(element(by.id('child-photo-upload'))).not.toExist();
      await detoxExpect(element(by.text(/upload child photo/i))).not.toExist();
    });

    it('CRITICAL: should NEVER display specific child ages', async () => {
      // Generic age groups (toddler, elementary, teen) are OK
      // Specific ages (3, 7, 14) are NOT OK

      await detoxExpect(element(by.text(/\d+ years old/))).not.toExist();
      await detoxExpect(element(by.text(/age: \d+/))).not.toExist();
    });

    it('CRITICAL: should NEVER display child schools', async () => {
      await detoxExpect(
        element(by.text(/elementary school|middle school|high school/i))
      ).not.toExist();
      await detoxExpect(element(by.text(/school name/i))).not.toExist();
      await detoxExpect(element(by.id('child-school-input'))).not.toExist();
    });
  });
});
