/**
 * E2E Test: Complete CoNest Demo - Two Moms Housing Story
 *
 * Purpose: Walk through the COMPLETE app experience as Sarah Chen,
 * showing all screens and matching with Maria Garcia. Two single moms
 * finding safe, affordable shared housing for their families.
 *
 * Credentials:
 *   Login as: demo.sarah@conest.app / Demo1234!
 *   Match with: Maria Garcia (fellow single mom)
 *
 * Usage:
 *   npx detox test --configuration ios.sim.debug -f demo-matching-flow
 *
 * Recording:
 *   Run separately: xcrun simctl io booted recordVideo demo-matching.mp4
 *   Stop with Ctrl+C when test completes
 *
 * Created: 2026-03-01
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

const DEMO_CREDENTIALS = {
  email: 'demo.sarah@conest.app',
  password: 'Demo1234!',
};

const TIMEOUTS = {
  short: 3000,
  medium: 5000,
  long: 10000,
  veryLong: 15000,
};

/**
 * Helper: Pause for visual recording clarity
 */
async function pause(ms: number = 1500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper: Dismiss any system alerts/dialogs that may be blocking
 */
async function dismissAlerts(): Promise<void> {
  const alertTexts = ['Allow', 'OK', 'Dismiss', 'Close', 'Got it', 'Not Now', "Don't Allow"];
  for (const text of alertTexts) {
    try {
      await element(by.text(text)).tap();
      await pause(300);
    } catch {
      // Alert not present
    }
  }
}

describe('CoNest Demo: Sarah & Maria - Two Moms Find a Home', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: 'YES' },
    });
    // Clear Keychain to ensure fresh login (tokens persist across reinstalls on simulator)
    await device.clearKeychain();
    await device.terminateApp();
    await device.launchApp({ newInstance: true });
    await pause(2000);
  });

  afterAll(async () => {
    await device.takeScreenshot('demo-final');
  });

  // ─────────────────────────────────────────────
  // ACT 1: Login as Sarah Chen
  // ─────────────────────────────────────────────
  it('Act 1: Login as Sarah Chen', async () => {
    let alreadyLoggedIn = false;
    try {
      await waitFor(element(by.id('tab-home')))
        .toBeVisible()
        .withTimeout(5000);
      alreadyLoggedIn = true;
    } catch {
      // Not logged in
    }

    if (!alreadyLoggedIn) {
      await waitFor(element(by.id('email-input')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.long);

      await device.takeScreenshot('01-login-screen');
      await pause(1500);

      await element(by.id('email-input')).clearText();
      await element(by.id('email-input')).typeText(DEMO_CREDENTIALS.email);
      await pause(500);

      await element(by.id('password-input')).clearText();
      await element(by.id('password-input')).typeText(DEMO_CREDENTIALS.password);
      await pause(500);

      await element(by.id('password-input')).tapReturnKey();
      await pause(500);

      await device.takeScreenshot('02-credentials-entered');

      await element(by.id('login-button')).tap();

      try {
        await waitFor(element(by.id('tab-home')))
          .toBeVisible()
          .withTimeout(TIMEOUTS.veryLong);
      } catch {
        await waitFor(element(by.id('tab-discover')))
          .toBeVisible()
          .withTimeout(TIMEOUTS.medium);
      }
    }

    await dismissAlerts();
    await device.takeScreenshot('03-logged-in');
    await pause(2000);
  });

  // ─────────────────────────────────────────────
  // ACT 2: Explore the Home Screen
  // ─────────────────────────────────────────────
  it('Act 2: Explore the Home Screen', async () => {
    try {
      await element(by.id('tab-home')).tap();
    } catch {
      // Already on home
    }

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUTS.medium);

    await device.takeScreenshot('04-home-screen');
    await pause(2000);

    await device.takeScreenshot('05-home-stats');
    await pause(1500);
  });

  // ─────────────────────────────────────────────
  // ACT 3: View Sarah's own Profile
  // ─────────────────────────────────────────────
  it("Act 3: View Sarah's Profile", async () => {
    try {
      await element(by.id('tab-profile')).tap();
    } catch {
      await element(by.text('Profile')).tap();
    }

    await waitFor(element(by.id('profile-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUTS.medium);

    await device.takeScreenshot('06-sarah-profile');
    await pause(2000);

    try {
      await waitFor(element(by.id('manage-verification-button')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.short);
      await device.takeScreenshot('07-verification-badges');
      await pause(1500);
    } catch {
      // Verification section may not be visible
    }

    await device.takeScreenshot('08-profile-details');
    await pause(1500);
  });

  // ─────────────────────────────────────────────
  // ACT 4: Browse Discovery - Find Maria
  // ─────────────────────────────────────────────
  it('Act 4: Navigate to Discovery and find Maria', async () => {
    try {
      await element(by.id('tab-discover')).tap();
    } catch {
      await element(by.text('Discover')).tap();
    }

    await waitFor(element(by.id('discovery-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUTS.medium);

    await dismissAlerts();

    // Wait for the initial API fetch to complete after screen mounts
    await pause(5000);
    await device.takeScreenshot('09-discovery-screen-initial');

    // Check if Maria is already visible from the initial fetch
    let hasProfiles = false;
    try {
      await waitFor(element(by.text(/Maria/)))
        .toBeVisible()
        .withTimeout(TIMEOUTS.short);
      hasProfiles = true;
    } catch {
      // Not visible yet — pull-to-refresh to force re-fetch
    }

    // Pull-to-refresh if profiles didn't load initially
    if (!hasProfiles) {
      try {
        await element(by.id('discovery-screen')).swipe('down', 'slow', 0.5);
        await pause(5000); // Wait for API response
      } catch {
        console.log('Pull-to-refresh gesture failed');
      }

      await device.takeScreenshot('10-discovery-after-refresh');

      try {
        await waitFor(element(by.text(/Maria/)))
          .toBeVisible()
          .withTimeout(TIMEOUTS.long);
        hasProfiles = true;
      } catch {
        // Try a second refresh
        try {
          await element(by.id('discovery-screen')).swipe('down', 'slow', 0.5);
          await pause(5000);
        } catch {
          // Swipe failed
        }
      }
    }

    // Final attempt with longest timeout
    if (!hasProfiles) {
      try {
        await waitFor(element(by.text(/Maria/)))
          .toBeVisible()
          .withTimeout(TIMEOUTS.veryLong);
        hasProfiles = true;
      } catch {
        console.log('Maria not found after all refresh attempts');
      }
    }

    await device.takeScreenshot('11-discovery-profiles');
    await pause(2000);
  });

  it("Act 5: Open Maria's Profile Card", async () => {
    // Tap Maria's profile card. The card renders "{firstName}, {age}" text.
    let profileOpened = false;

    // Try "Maria, 35" (exact card text format)
    try {
      await element(by.text('Maria, 35')).tap();
      profileOpened = true;
    } catch {
      console.log('"Maria, 35" not found');
    }

    // Fallback: try partial match
    if (!profileOpened) {
      try {
        await element(by.text(/Maria/)).atIndex(0).tap();
        profileOpened = true;
      } catch {
        console.log('Regex Maria not found');
      }
    }

    // Fallback: try just "Maria"
    if (!profileOpened) {
      try {
        await element(by.text('Maria')).tap();
        profileOpened = true;
      } catch {
        console.log('"Maria" text not found');
      }
    }

    await pause(1500);
    await device.takeScreenshot('12-tapped-maria-card');

    // Wait for profile details modal
    try {
      await waitFor(element(by.id('profile-details-modal')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.medium);
      await device.takeScreenshot('13-maria-profile-modal');
      await pause(2000);
    } catch {
      console.log('Profile modal not visible after tapping card');
      await pause(1000);
    }
  });

  it("Act 6: Explore Maria's Full Profile", async () => {
    try {
      await waitFor(element(by.id('profile-details-scroll')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.short);

      await device.takeScreenshot('14-maria-profile-top');
      await pause(1500);

      // Scroll through profile sections
      await element(by.id('profile-details-scroll')).scroll(200, 'down');
      await pause(1000);
      await device.takeScreenshot('15-maria-compatibility');

      await element(by.id('profile-details-scroll')).scroll(200, 'down');
      await pause(1000);
      await device.takeScreenshot('16-maria-housing-details');

      await element(by.id('profile-details-scroll')).scroll(200, 'down');
      await pause(1000);
      await device.takeScreenshot('17-maria-lifestyle');

      await element(by.id('profile-details-scroll')).scroll(300, 'down');
      await pause(1000);
      await device.takeScreenshot('18-maria-action-buttons');
    } catch {
      console.log('Could not scroll profile details');
      await device.takeScreenshot('14-maria-profile-fallback');
      await pause(1000);
    }
  });

  // ─────────────────────────────────────────────
  // ACT 7: Express Interest - The Connection
  // ─────────────────────────────────────────────
  it('Act 7: Express Interest in Maria', async () => {
    await dismissAlerts();

    let interested = false;

    // Primary: tap the "I'm Interested" button
    try {
      await waitFor(element(by.id('interested-button')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.short);
      await device.takeScreenshot('19-before-interested');
      await pause(1000);
      await element(by.id('interested-button')).tap();
      interested = true;
    } catch {
      console.log('interested-button not directly visible');
    }

    // Fallback: scroll to bottom of modal to find button
    if (!interested) {
      try {
        await element(by.id('profile-details-scroll')).scrollTo('bottom');
        await pause(500);
        await waitFor(element(by.id('interested-button')))
          .toBeVisible()
          .withTimeout(TIMEOUTS.short);
        await element(by.id('interested-button')).tap();
        interested = true;
      } catch {
        console.log('interested-button not found after scrolling to bottom');
      }
    }

    // Fallback: try text
    if (!interested) {
      try {
        await element(by.text("I'm Interested")).tap();
        interested = true;
      } catch {
        console.log("Text \"I'm Interested\" not found");
      }
    }

    await pause(2000);
    await device.takeScreenshot('20-after-interested');

    // Handle the "Request Sent!" alert
    try {
      await waitFor(element(by.text('Request Sent!')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.medium);
      await device.takeScreenshot('21-request-sent-alert');
      await pause(2000);
      await element(by.text('OK')).tap();
      await pause(500);
    } catch {
      // Dismiss any other alerts
      await dismissAlerts();
    }

    // Close the profile modal if still open
    try {
      await element(by.id('continue-browsing-button')).tap();
      await pause(500);
    } catch {
      // Modal may have auto-closed
    }
  });

  // ─────────────────────────────────────────────
  // ACT 8: Check Saved Profiles
  // ─────────────────────────────────────────────
  it('Act 8: Check Saved Profiles', async () => {
    await dismissAlerts();

    try {
      await element(by.id('tab-saved')).tap();
      await pause(2000);
      await device.takeScreenshot('22-saved-profiles');
    } catch {
      console.log('Saved tab not accessible');
    }

    await pause(1500);
  });

  // ─────────────────────────────────────────────
  // ACT 9: Check Messages
  // ─────────────────────────────────────────────
  it('Act 9: Check Messages', async () => {
    await dismissAlerts();

    try {
      await element(by.id('tab-messages')).tap();
      await pause(2000);
      await device.takeScreenshot('23-messages-screen');
    } catch {
      console.log('Messages tab not accessible');
    }

    await pause(1500);
  });

  // ─────────────────────────────────────────────
  // ACT 10: Explore Household
  // ─────────────────────────────────────────────
  it('Act 10: Explore Household Screen', async () => {
    await dismissAlerts();

    try {
      await element(by.id('tab-household')).tap();

      await waitFor(element(by.id('household-screen')))
        .toBeVisible()
        .withTimeout(TIMEOUTS.medium);

      await device.takeScreenshot('24-household-screen');
      await pause(2000);

      try {
        await waitFor(element(by.id('empty-household-state')))
          .toBeVisible()
          .withTimeout(TIMEOUTS.short);
        await device.takeScreenshot('25-household-empty-state');
        await pause(1500);
      } catch {
        await device.takeScreenshot('25-household-existing');
        await pause(1500);
      }
    } catch {
      console.log('Household tab not accessible');
    }
  });

  // ─────────────────────────────────────────────
  // ACT 11: Return Home - Complete the Story
  // ─────────────────────────────────────────────
  it('Act 11: Return to Home - Story Complete', async () => {
    // Dismiss all possible alerts/modals before navigating
    await dismissAlerts();
    await pause(500);

    // Try tab-home by testID first
    let navigated = false;
    try {
      await element(by.id('tab-home')).tap();
      navigated = true;
    } catch {
      console.log('tab-home not hittable, trying alternatives');
    }

    // If blocked, dismiss more aggressively then retry
    if (!navigated) {
      await dismissAlerts();
      await pause(1000);
      try {
        await element(by.id('tab-home')).tap();
        navigated = true;
      } catch {
        console.log('tab-home still not hittable after dismissing alerts');
      }
    }

    // Final fallback: just take screenshot of wherever we are
    if (navigated) {
      try {
        await waitFor(element(by.id('home-screen')))
          .toBeVisible()
          .withTimeout(TIMEOUTS.medium);
      } catch {
        // Home screen might not have loaded
      }
    }

    await device.takeScreenshot('26-home-final');
    await pause(3000);
    await device.takeScreenshot('27-demo-complete');
  });
});
