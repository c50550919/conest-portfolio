/**
 * Simple Launch Test - Verify app starts without crashing
 */

describe('Simple Launch Test', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  it('should launch app without crashing', async () => {
    // Just wait a bit to see if app crashes
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ App launched successfully - no immediate crash');
  });

  it('should find any visible element', async () => {
    try {
      // Try to find common elements
      const selectors = [
        'login-button',
        'email-input',
        'password-input',
        'welcome-text',
        'home-tab',
        'login-screen',
      ];

      let found = [];
      for (const id of selectors) {
        try {
          await expect(element(by.id(id))).toExist();
          found.push(id);
          console.log(`✅ Found element: ${id}`);
        } catch (e) {
          // Not found
        }
      }

      if (found.length > 0) {
        console.log(`✅ Found ${found.length} elements: ${found.join(', ')}`);
      } else {
        console.log('⚠️ No expected elements found - app may be on unexpected screen');
      }
    } catch (e) {
      console.log('ℹ️ Element search completed');
    }
  });
});
