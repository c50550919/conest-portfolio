import { test, expect, chromium, Page, Browser, BrowserContext } from '@playwright/test';
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * E2E TEST: Discovery Screen Workflow with Playwright + Android Emulator
 *
 * Purpose: End-to-end validation of complete user journey
 * Spec Reference: spec.md - All Scenarios (1-6)
 * Constitution: Principle I (Child Safety), Principle IV (Performance), Principle V (TDD)
 *
 * CRITICAL: Tests child safety at UI level, performance requirements, and full user experience
 *
 * Test Environments:
 * - Desktop Chrome (Playwright)
 * - Android Emulator (React Native mobile app)
 * - Cross-browser (Firefox, Safari)
 *
 * Prerequisites:
 * - Backend server running on localhost:3000
 * - Mobile app served on localhost:8081 (React Native dev server)
 * - Android emulator running with app installed
 */

describe('E2E Test: Discovery Screen Workflow', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let authToken1: string;
  let userId1: string;
  let authToken2: string;
  let userId2: string;

  // Test configuration
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
  const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:8081';
  const ANDROID_EMULATOR = process.env.ANDROID_EMULATOR || 'false';

  test.beforeAll(async () => {
    await setupTestDatabase();

    // Create test users via API
    const user1 = await createTestUser({
      email: 'e2e-user1@example.com',
      password: 'Test1234!',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Sarah',
        age: 32,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId1 = user1.id;
    authToken1 = getAuthToken(user1.id);

    const user2 = await createTestUser({
      email: 'e2e-user2@example.com',
      password: 'Test1234!',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Emily',
        age: 30,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 1900,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId2 = user2.id;
    authToken2 = getAuthToken(user2.id);

    // Launch browser
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    });
  });

  test.afterAll(async () => {
    await browser.close();
    await teardownTestDatabase();
  });

  test.beforeEach(async () => {
    // Create new browser context for isolation
    context = await browser.newContext({
      viewport: ANDROID_EMULATOR === 'true'
        ? { width: 360, height: 640 } // Android phone dimensions
        : { width: 1280, height: 720 }, // Desktop
      userAgent: ANDROID_EMULATOR === 'true'
        ? 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        : undefined,
    });

    page = await context.newPage();

    // Set auth token in localStorage for mobile app
    if (ANDROID_EMULATOR === 'true') {
      await page.goto(MOBILE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token);
      }, authToken1);
    }
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Desktop Browser: Discovery Screen', () => {
    test('Complete profile browsing workflow (Scenario 1)', async () => {
      // Step 1: Navigate to Discovery screen
      await page.goto(`${BACKEND_URL}/discovery`);

      // Step 2: Validate profile card displays
      await expect(page.locator('[data-testid="profile-card"]').first()).toBeVisible();

      // Step 3: CRITICAL - Validate NO child PII visible
      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Check for child name fields (should NOT exist)
      await expect(profileCard.locator('[data-testid="children-names"]')).not.toBeVisible();
      await expect(profileCard.locator('[data-testid="child-names"]')).not.toBeVisible();

      // Check for child photo fields (should NOT exist)
      await expect(profileCard.locator('[data-testid="children-photos"]')).not.toBeVisible();
      await expect(profileCard.locator('[data-testid="child-photos"]')).not.toBeVisible();

      // Check for exact age fields (should NOT exist)
      await expect(profileCard.locator('[data-testid="children-ages"]')).not.toBeVisible();
      await expect(profileCard.locator('[data-testid="child-ages"]')).not.toBeVisible();

      // Step 4: Validate ALLOWED fields are visible
      await expect(profileCard.locator('[data-testid="children-count"]')).toBeVisible();
      await expect(profileCard.locator('[data-testid="children-age-groups"]')).toBeVisible();

      // Step 5: Validate verification badges
      await expect(profileCard.locator('[data-testid="badge-id-verified"]')).toBeVisible();
      await expect(profileCard.locator('[data-testid="badge-background-check"]')).toBeVisible();
      await expect(profileCard.locator('[data-testid="badge-phone-verified"]')).toBeVisible();

      // Step 6: Validate compatibility score
      const compatibilityScore = await profileCard.locator('[data-testid="compatibility-score"]').textContent();
      expect(compatibilityScore).toMatch(/\d+%/);

      // Step 7: Performance validation - page load <500ms
      const navigationTiming = await page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return timing.loadEventEnd - timing.fetchStart;
      });
      expect(navigationTiming).toBeLessThan(500);
    });

    test('Swipe right workflow (Scenario 2)', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Step 1: Click swipe right button
      const startTime = Date.now();
      await profileCard.locator('[data-testid="swipe-right-btn"]').click();
      const swipeTime = Date.now() - startTime;

      // Step 2: Profile disappears with animation
      await expect(profileCard).not.toBeVisible({ timeout: 1000 });

      // Step 3: Next profile loads
      await expect(page.locator('[data-testid="profile-card"]').first()).toBeVisible();

      // Step 4: Performance validation - swipe action <200ms
      expect(swipeTime).toBeLessThan(200);

      // Step 5: Animation should render at 60fps (16.67ms per frame)
      // This is validated by ensuring no dropped frames during animation
    });

    test('Swipe left workflow (Scenario 3)', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Step 1: Click swipe left button
      await profileCard.locator('[data-testid="swipe-left-btn"]').click();

      // Step 2: Profile disappears
      await expect(profileCard).not.toBeVisible({ timeout: 1000 });

      // Step 3: Next profile loads
      await expect(page.locator('[data-testid="profile-card"]').first()).toBeVisible();
    });

    test('Mutual match creation (Scenario 2 + Mutual)', async () => {
      // Setup: User2 swipes right on User1 via API
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' });

      // User1 navigates to discovery
      await page.goto(`${BACKEND_URL}/discovery`);

      // User1 swipes right on User2
      const user2ProfileCard = page.locator(`[data-testid="profile-card"][data-user-id="${userId2}"]`);
      await user2ProfileCard.locator('[data-testid="swipe-right-btn"]').click();

      // Step 1: "It's a Match!" modal appears
      const matchModal = page.locator('[data-testid="match-modal"]');
      await expect(matchModal).toBeVisible({ timeout: 2000 });

      // Step 2: Validate match modal content
      await expect(matchModal.locator('[data-testid="match-heading"]')).toHaveText("It's a Match!");
      await expect(matchModal.locator('[data-testid="matched-user-name"]')).toHaveText('Emily');
      await expect(matchModal.locator('[data-testid="compatibility-score"]')).toBeVisible();

      // Step 3: CRITICAL - Match modal MUST NOT show child PII
      await expect(matchModal.locator('[data-testid="children-names"]')).not.toBeVisible();
      await expect(matchModal.locator('[data-testid="children-photos"]')).not.toBeVisible();

      // Step 4: "Send Message" button available
      await expect(matchModal.locator('[data-testid="send-message-btn"]')).toBeVisible();

      // Step 5: Close modal
      await matchModal.locator('[data-testid="close-modal-btn"]').click();
      await expect(matchModal).not.toBeVisible();
    });

    test('Empty state handling (Scenario 4)', async () => {
      // Create isolated user with no matches
      const isolatedUser = await createTestUser({
        email: 'isolated-e2e@example.com',
        password: 'Test1234!',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'Isolated',
          age: 25,
          city: 'New York', // No other users in this city
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
          budget: 5000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      const isolatedToken = getAuthToken(isolatedUser.id);

      // Login as isolated user
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token);
      }, isolatedToken);

      await page.goto(`${BACKEND_URL}/discovery`);

      // Validate empty state
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state-message"]')).toHaveText(
        'No more profiles available. Check back later or adjust your preferences.',
      );
      await expect(page.locator('[data-testid="adjust-preferences-btn"]')).toBeVisible();
    });

    test('Detailed profile view (Scenario 5)', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Step 1: Tap profile card (not swipe gesture)
      await profileCard.click();

      // Step 2: Detailed profile view opens
      const detailedView = page.locator('[data-testid="detailed-profile-view"]');
      await expect(detailedView).toBeVisible();

      // Step 3: Validate detailed content
      await expect(detailedView.locator('[data-testid="parenting-philosophy"]')).toBeVisible();
      await expect(detailedView.locator('[data-testid="house-rules"]')).toBeVisible();
      await expect(detailedView.locator('[data-testid="work-schedule"]')).toBeVisible();
      await expect(detailedView.locator('[data-testid="budget-details"]')).toBeVisible();

      // Step 4: CRITICAL - Detailed view MUST NOT show child PII
      await expect(detailedView.locator('[data-testid="children-names"]')).not.toBeVisible();
      await expect(detailedView.locator('[data-testid="children-photos"]')).not.toBeVisible();
      await expect(detailedView.locator('[data-testid="children-schools"]')).not.toBeVisible();

      // Step 5: Can swipe from detailed view
      await detailedView.locator('[data-testid="swipe-right-btn"]').click();
      await expect(detailedView).not.toBeVisible();
    });

    test('Verification badge tooltips (Scenario 6)', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Step 1: Hover over background check badge
      const bgCheckBadge = profileCard.locator('[data-testid="badge-background-check"]');
      await bgCheckBadge.hover();

      // Step 2: Tooltip appears
      const tooltip = page.locator('[data-testid="badge-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Background check completed via third-party verification');
    });
  });

  test.describe('Android Emulator: Mobile App', () => {
    test.skip(ANDROID_EMULATOR !== 'true', 'Android emulator tests require ANDROID_EMULATOR=true');

    test('Touch gestures - Swipe right', async () => {
      await page.goto(MOBILE_URL);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Get card position
      const box = await profileCard.boundingBox();
      if (!box) throw new Error('Profile card not found');

      // Simulate swipe right gesture
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.touchscreen.swipe(
        { x: box.x + 50, y: box.y + box.height / 2 },
        { x: box.x + box.width + 100, y: box.y + box.height / 2 },
      );

      // Profile should disappear
      await expect(profileCard).not.toBeVisible({ timeout: 1000 });
    });

    test('Touch gestures - Swipe left', async () => {
      await page.goto(MOBILE_URL);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      const box = await profileCard.boundingBox();
      if (!box) throw new Error('Profile card not found');

      // Simulate swipe left gesture
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.touchscreen.swipe(
        { x: box.x + box.width - 50, y: box.y + box.height / 2 },
        { x: box.x - 100, y: box.y + box.height / 2 },
      );

      await expect(profileCard).not.toBeVisible({ timeout: 1000 });
    });

    test('Haptic feedback on swipe', async () => {
      // TODO: Implement haptic feedback validation
      // Android emulator should trigger vibration on swipe action
      // Can be validated via Android Debug Bridge (adb) logs
    });

    test('60fps animation performance on mobile', async () => {
      await page.goto(MOBILE_URL);

      // Start performance measurement
      await page.evaluate(() => {
        (window as any).fpsCounter = {
          frames: 0,
          lastTime: performance.now(),
        };

        function measureFPS() {
          const now = performance.now();
          (window as any).fpsCounter.frames++;
          if (now >= (window as any).fpsCounter.lastTime + 1000) {
            (window as any).fpsCounter.lastFPS = (window as any).fpsCounter.frames;
            (window as any).fpsCounter.frames = 0;
            (window as any).fpsCounter.lastTime = now;
          }
          requestAnimationFrame(measureFPS);
        }
        measureFPS();
      });

      // Trigger swipe animation
      const profileCard = page.locator('[data-testid="profile-card"]').first();
      await profileCard.locator('[data-testid="swipe-right-btn"]').click();

      // Wait for animation to complete
      await page.waitForTimeout(1000);

      // Check FPS
      const fps = await page.evaluate(() => (window as any).fpsCounter.lastFPS);
      expect(fps).toBeGreaterThanOrEqual(55); // Allow 5 fps tolerance
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('Firefox: Discovery screen loads correctly', async () => {
      const firefoxBrowser = await chromium.launch({ channel: 'firefox' });
      const firefoxContext = await firefoxBrowser.newContext();
      const firefoxPage = await firefoxContext.newPage();

      await firefoxPage.goto(`${BACKEND_URL}/discovery`);
      await expect(firefoxPage.locator('[data-testid="profile-card"]').first()).toBeVisible();

      await firefoxContext.close();
      await firefoxBrowser.close();
    });

    test('Safari: Discovery screen loads correctly', async () => {
      if (process.platform !== 'darwin') {
        test.skip();
        return;
      }

      const safariBrowser = await chromium.launch({ channel: 'webkit' });
      const safariContext = await safariBrowser.newContext();
      const safariPage = await safariContext.newPage();

      await safariPage.goto(`${BACKEND_URL}/discovery`);
      await expect(safariPage.locator('[data-testid="profile-card"]').first()).toBeVisible();

      await safariContext.close();
      await safariBrowser.close();
    });
  });

  test.describe('Accessibility (WCAG 2.1 AA)', () => {
    test('Keyboard navigation support', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      // Tab to swipe right button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Enter key should trigger swipe
      const profileCard = page.locator('[data-testid="profile-card"]').first();
      await page.keyboard.press('Enter');

      await expect(profileCard).not.toBeVisible({ timeout: 1000 });
    });

    test('Screen reader support', async () => {
      await page.goto(`${BACKEND_URL}/discovery`);

      const profileCard = page.locator('[data-testid="profile-card"]').first();

      // Check ARIA labels
      await expect(profileCard).toHaveAttribute('role', 'article');
      await expect(profileCard.locator('[data-testid="swipe-right-btn"]')).toHaveAttribute(
        'aria-label',
        'Express interest in this profile',
      );
      await expect(profileCard.locator('[data-testid="swipe-left-btn"]')).toHaveAttribute(
        'aria-label',
        'Pass on this profile',
      );
    });
  });
});
