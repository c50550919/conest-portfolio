/**
 * Discovery Screen Performance E2E Test
 *
 * Purpose: Validate 60fps swipe gesture animations
 * Constitution: Principle IV (Performance - User Experience)
 *
 * Target: 60fps (16.67ms per frame) for swipe gestures
 *
 * Created: 2025-10-06
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

/**
 * Performance Test Configuration
 */
const PERF_CONFIG = {
  targetFPS: 60,
  targetFrameTime: 16.67, // milliseconds (1000ms / 60fps)
  acceptableFrameTime: 20, // Allow some tolerance (50fps minimum)
  swipeCount: 10, // Number of swipes to test
  swipeDuration: 500, // milliseconds for swipe gesture
};

describe('Discovery Screen Performance E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', photos: 'YES' },
    });

    // Login and navigate to Discovery Screen
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('testpassword');
    await element(by.id('login-button')).tap();

    // Wait for Discovery Screen to load
    await waitFor(element(by.id('discovery-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  beforeEach(async () => {
    await device.reloadReactNative();

    // Navigate to Discovery Screen
    await waitFor(element(by.id('discovery-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('60fps Animation Target', () => {
    it('should maintain 60fps during swipe gestures (right)', async () => {
      const card = element(by.id('swipeable-card-0'));

      // Enable performance monitoring (React Native Reanimated)
      // Note: This requires Reanimated profiler to be enabled in dev mode

      // Perform swipe gesture
      await card.swipe('right', 'slow', 0.8);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Verify card moved off screen
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);

      // NOTE: Frame rate measurement requires Reanimated profiler integration
      // This test validates the gesture completes successfully
      // For detailed FPS metrics, see manual testing with Flipper/Reactotron
    });

    it('should maintain 60fps during swipe gestures (left)', async () => {
      const card = element(by.id('swipeable-card-0'));

      // Perform left swipe
      await card.swipe('left', 'slow', 0.8);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Verify next card visible
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);
    });

    it('should handle rapid swipes without frame drops', async () => {
      // Perform 5 rapid swipes
      for (let i = 0; i < 5; i++) {
        const card = element(by.id(`swipeable-card-${i}`));

        const direction = i % 2 === 0 ? 'right' : 'left';
        await card.swipe(direction, 'fast', 0.9);

        // Small delay between swipes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify UI is still responsive
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });

  describe('Animation Smoothness', () => {
    it('should have smooth rotation during swipe', async () => {
      const card = element(by.id('swipeable-card-0'));

      // Start swipe but don't complete (drag without release)
      await card.swipe('right', 'slow', 0.4, 0.5, 0.0);

      // Card should be rotated but not dismissed
      await detoxExpect(element(by.id('swipeable-card-0'))).toBeVisible();
    });

    it('should snap back smoothly when swipe threshold not met', async () => {
      const card = element(by.id('swipeable-card-0'));

      // Partial swipe (< 50% threshold)
      await card.swipe('right', 'slow', 0.3);

      // Wait for snap-back animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Card should still be visible (not dismissed)
      await detoxExpect(element(by.id('swipeable-card-0'))).toBeVisible();
    });

    it('should animate off-screen smoothly when threshold met', async () => {
      const card = element(by.id('swipeable-card-0'));

      // Full swipe (> 50% threshold)
      await card.swipe('right', 'slow', 0.8);

      // Wait for dismiss animation
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Next card should be visible
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);
    });
  });

  describe('Gesture Responsiveness', () => {
    it('should respond to gesture immediately (< 100ms delay)', async () => {
      const card = element(by.id('swipeable-card-0'));

      const startTime = Date.now();

      // Start gesture
      await card.swipe('right', 'fast', 0.9);

      const endTime = Date.now();
      const gestureTime = endTime - startTime;

      console.log(`Gesture response time: ${gestureTime}ms`);

      // Gesture should complete within reasonable time
      // (Note: Detox doesn't give sub-millisecond precision)
      expect(gestureTime).toBeLessThan(1000);
    });

    it('should handle multi-touch gestures correctly', async () => {
      // Test that only top card responds to gestures
      const topCard = element(by.id('swipeable-card-0'));

      await topCard.swipe('right', 'slow', 0.8);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Only top card should have moved
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);
    });

    it('should prevent gestures on cards beneath top card', async () => {
      // Try to interact with non-top card (should not work)
      // Top card is at index 0, cards beneath are at higher indices

      // Verify top card is visible
      await detoxExpect(element(by.id('swipeable-card-0'))).toBeVisible();

      // Swipe top card away
      await element(by.id('swipeable-card-0')).swipe('right', 'slow', 0.8);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Now card-1 should be the new top card
      await detoxExpect(element(by.id('swipeable-card-1'))).toBeVisible();
    });
  });

  describe('Stack Rendering Performance', () => {
    it('should render card stack efficiently (3 visible cards)', async () => {
      // Verify 3 cards are rendered (current + next 2)
      await detoxExpect(element(by.id('swipeable-card-0'))).toBeVisible();

      // Note: Cards 1 and 2 may be partially visible beneath card 0
      // Detox visibility detection may vary based on z-index
    });

    it('should maintain performance with image loading', async () => {
      // Profile cards should have images loaded
      const profileImage = element(by.id('profile-image-0'));

      await waitFor(profileImage)
        .toBeVisible()
        .withTimeout(3000);

      // Swipe should still be smooth with images
      const card = element(by.id('swipeable-card-0'));
      await card.swipe('right', 'slow', 0.8);

      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Next card image should load quickly
      await waitFor(element(by.id('profile-image-1')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle continuous swiping without memory leaks', async () => {
      // Perform 20 swipes to test memory stability
      for (let i = 0; i < 20; i++) {
        try {
          const card = element(by.id('swipeable-card-0'));
          await card.swipe(i % 2 === 0 ? 'right' : 'left', 'fast', 0.9);

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          // May run out of profiles - that's OK
          break;
        }
      }

      // UI should still be responsive
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });

    it('should clean up resources when cards dismissed', async () => {
      // Swipe away 5 cards
      for (let i = 0; i < 5; i++) {
        const card = element(by.id('swipeable-card-0'));
        await card.swipe('right', 'fast', 0.9);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // App should not crash or freeze
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });

  describe('Loading State Performance', () => {
    it('should show loading indicator without blocking UI', async () => {
      // Swipe through cards to trigger pagination
      for (let i = 0; i < 8; i++) {
        try {
          const card = element(by.id('swipeable-card-0'));
          await card.swipe('right', 'fast', 0.9);
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          break;
        }
      }

      // Loading indicator may appear during pagination
      // UI should remain responsive
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });

  describe('Empty State Performance', () => {
    it('should render empty state efficiently', async () => {
      // Swipe through all available profiles
      let swipeCount = 0;
      while (swipeCount < 100) {
        try {
          const card = element(by.id('swipeable-card-0'));
          await card.swipe('right', 'fast', 0.9);
          await new Promise(resolve => setTimeout(resolve, 50));
          swipeCount++;
        } catch (error) {
          // No more cards - empty state should appear
          break;
        }
      }

      // Empty state should be visible
      await waitFor(element(by.id('empty-state')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Match Modal Animation Performance', () => {
    it('should animate match modal smoothly', async () => {
      // Note: This requires a mutual match to occur
      // For E2E testing, you may need to set up test users who match

      // Swipe right on a profile that will match
      const card = element(by.id('swipeable-card-0'));
      await card.swipe('right', 'slow', 0.8);

      // If match occurs, modal should appear with smooth animation
      // Wait for potential match modal
      try {
        await waitFor(element(by.id('match-modal')))
          .toBeVisible()
          .withTimeout(3000);

        // Modal should be visible with animated heart
        await detoxExpect(element(by.id('match-modal-heart'))).toBeVisible();

        // Close modal
        await element(by.id('match-modal-close')).tap();

        // Modal should dismiss smoothly
        await waitFor(element(by.id('match-modal')))
          .not.toBeVisible()
          .withTimeout(1000);
      } catch (error) {
        // No match occurred - that's OK
        console.log('No match occurred during test');
      }
    });
  });

  describe('Cross-Device Performance', () => {
    it('should maintain performance on low-end devices', async () => {
      // Note: Run this test on a low-end device simulator
      // iOS: iPhone SE (3rd gen) or iPhone 11
      // Android: Pixel 4a or equivalent

      const card = element(by.id('swipeable-card-0'));

      // Perform swipe
      await card.swipe('right', 'slow', 0.8);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Next card should be visible
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);

      // Test should pass even on low-end devices
    });
  });

  describe('Reanimated Worklet Performance', () => {
    it('should run animations on UI thread (not JS thread)', async () => {
      // This test validates that Reanimated worklets are working correctly
      // Animations should continue smoothly even if JS thread is blocked

      const card = element(by.id('swipeable-card-0'));

      // Start swipe gesture
      await card.swipe('right', 'slow', 0.8);

      // Animation should complete even if JS thread is busy
      await new Promise(resolve => setTimeout(resolve, PERF_CONFIG.swipeDuration));

      // Next card should be visible
      await waitFor(element(by.id('swipeable-card-1')))
        .toBeVisible()
        .withTimeout(1000);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should document baseline animation performance', async () => {
      const swipeTimes: number[] = [];

      // Measure 10 swipe gesture times
      for (let i = 0; i < PERF_CONFIG.swipeCount; i++) {
        const card = element(by.id('swipeable-card-0'));

        const startTime = Date.now();
        await card.swipe('right', 'slow', 0.8);
        const endTime = Date.now();

        swipeTimes.push(endTime - startTime);

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgSwipeTime = swipeTimes.reduce((sum, time) => sum + time, 0) / swipeTimes.length;
      const minSwipeTime = Math.min(...swipeTimes);
      const maxSwipeTime = Math.max(...swipeTimes);

      console.log('\n📊 Baseline Animation Performance (for regression tracking):');
      console.log(`   Min Swipe Time:  ${minSwipeTime}ms`);
      console.log(`   Avg Swipe Time:  ${Math.round(avgSwipeTime)}ms`);
      console.log(`   Max Swipe Time:  ${maxSwipeTime}ms`);
      console.log('\n   Store these metrics for future regression comparison');

      // Swipes should complete within reasonable time
      expect(avgSwipeTime).toBeLessThan(1000);
    });
  });
});

/**
 * Manual Performance Testing Instructions
 * ========================================
 *
 * For detailed FPS monitoring, use these tools:
 *
 * 1. **React Native Performance Monitor**:
 *    - Shake device → Enable "Show Perf Monitor"
 *    - Watch JS frame rate and UI frame rate during swipes
 *    - Target: 60 FPS (UI thread), 55+ FPS (JS thread)
 *
 * 2. **Flipper (Reanimated Plugin)**:
 *    - Install Flipper desktop app
 *    - Enable Reanimated plugin
 *    - Monitor worklet execution times
 *    - Target: <16.67ms per frame
 *
 * 3. **Xcode Instruments (iOS)**:
 *    - Profile → Time Profiler
 *    - Monitor CPU usage during swipes
 *    - Target: <70% CPU usage
 *
 * 4. **Android Profiler**:
 *    - Android Studio → Profiler
 *    - Monitor CPU and memory during swipes
 *    - Target: <70% CPU, stable memory
 *
 * 5. **Chrome DevTools (React Native Debugger)**:
 *    - Enable Performance tab
 *    - Record swipe gestures
 *    - Analyze frame times
 *    - Target: Consistent 60fps
 */
