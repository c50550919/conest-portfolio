describe('Debug: Tab Bar Elements', () => {
  it('should find any tabs', async () => {
    console.log('\n📝 DEBUG: Searching for tab elements...');

    // Try various testID patterns
    const testIDs = [
      'tab-bar',
      'home-tab',
      'discover-tab',
      'messages-tab',
      'household-tab',
      'profile-tab',
      'Home',
      'Discover',
      'Messages',
      'Household',
      'Profile',
    ];

    for (const testID of testIDs) {
      try {
        await waitFor(element(by.id(testID)))
          .toBeVisible()
          .withTimeout(1000);
        console.log(`   ✅ FOUND: ${testID}`);
      } catch (error) {
        console.log(`   ❌ NOT FOUND: ${testID}`);
      }
    }

    // Try text matchers
    const texts = ['Home', 'Discover', 'Messages', 'Household', 'Profile'];
    for (const text of texts) {
      try {
        await waitFor(element(by.text(text)))
          .toBeVisible()
          .withTimeout(1000);
        console.log(`   ✅ FOUND TEXT: ${text}`);
      } catch (error) {
        console.log(`   ❌ NOT FOUND TEXT: ${text}`);
      }
    }
  });
});
