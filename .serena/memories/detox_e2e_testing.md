# Detox E2E Testing - SafeNest/Conest Mobile App

## Overview
SafeNest uses **Detox 20.43.0** for cross-platform end-to-end testing on both iOS and Android. Detox provides gray-box testing capabilities with automatic synchronization, eliminating flakiness common in E2E tests.

## Configuration

### Detox Config (`.detoxrc.js`)
```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000  // 2 minutes for build/launch
    }
  }
}
```

### Test Configurations
Six configurations available for cross-platform testing:

**iOS Configurations:**
- `ios.sim.debug` - iPhone 16 Pro simulator, debug build
- `ios.sim.release` - iPhone 16 Pro simulator, release build

**Android Configurations:**
- `android.att.debug` - Attached physical Android device, debug APK
- `android.att.release` - Attached physical Android device, release APK
- `android.emu.debug` - Pixel_3a_API_34 emulator, debug APK
- `android.emu.release` - Pixel_3a_API_34 emulator, release APK

## Running Tests

### iOS Tests
```bash
# Debug build with iPhone 16 Pro simulator
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration ios.sim.debug --loglevel info

# Run specific test file
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration ios.sim.debug e2e/login-with-test-users.test.js --loglevel info

# Release build (for performance testing)
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration ios.sim.release --loglevel info
```

### Android Tests
```bash
# Debug build with emulator (Pixel_3a_API_34)
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration android.emu.debug --loglevel info

# Run specific test file
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration android.emu.debug e2e/wave4-saved-profiles-connections.test.js --loglevel info

# Attached physical device
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
  npx detox test --configuration android.att.debug --loglevel info
```

**Important:** JAVA_HOME must be set to OpenJDK 17 for Android builds to work correctly on macOS.

### Build Management
```bash
# Build iOS app for testing
npx detox build --configuration ios.sim.debug

# Build Android APK for testing
npx detox build --configuration android.emu.debug

# Clean and rebuild
cd android && ./gradlew clean
npx detox build --configuration android.emu.debug
```

## Test File Structure

### Test Files Location
`mobile/e2e/` directory contains all E2E tests:

**Authentication Tests:**
- `login-with-test-users.test.js` - Tests login with seeded users (sarah.verified@test.com, test@conest.com)

**Feature Tests:**
- `wave4-saved-profiles-connections.test.js` - SavedProfiles & ConnectionRequests screens
- `profile-details-modal.test.js` - Profile modal interactions
- `full-user-journey.test.js` - Complete user workflows

**Smoke Tests:**
- `simple-launch-test.test.js` - App launches without crashing
- `quick-login-test.test.js` - Fast login verification

### Test Helpers
`mobile/e2e/helpers/` directory (create when needed):
- `testIds.js` - Centralized testID constants
- `selectors.js` - Reusable element selectors
- `actions.js` - Common user actions (login, navigation)
- `assertions.js` - Reusable assertions

## Writing Detox Tests

### Test Structure Pattern
```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', location: 'always' }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should perform specific action', async () => {
    // Arrange - wait for element
    await waitFor(element(by.id('element-id')))
      .toBeVisible()
      .withTimeout(10000);

    // Act - perform action
    await element(by.id('button-id')).tap();

    // Assert - verify result
    await expect(element(by.id('result-id'))).toBeVisible();
  });
});
```

### Element Selectors
```javascript
// Preferred: testID (works on both iOS and Android)
element(by.id('email-input'))

// Text matching
element(by.text('Login'))
element(by.label('Submit Button'))

// Accessibility label
element(by.label('Close Modal'))

// Type matching
element(by.type('RCTScrollView'))

// Trait matching (iOS only)
element(by.traits(['button']))
```

### Common Actions
```javascript
// Typing text
await element(by.id('email-input')).typeText('user@test.com');

// Tapping
await element(by.id('login-button')).tap();

// Scrolling
await element(by.id('scrollview')).scrollTo('bottom');
await element(by.id('scrollview')).scroll(200, 'down');

// Swiping
await element(by.id('card')).swipe('left', 'fast', 0.8);

// Long press
await element(by.id('item')).longPress();

// Multi-tap
await element(by.id('button')).multiTap(3);
```

### Assertions
```javascript
// Visibility
await expect(element(by.id('welcome'))).toBeVisible();
await expect(element(by.id('hidden'))).not.toBeVisible();

// Existence (in hierarchy, may not be visible)
await expect(element(by.id('element'))).toExist();
await expect(element(by.id('removed'))).not.toExist();

// Text content
await expect(element(by.id('label'))).toHaveText('Expected Text');
await expect(element(by.id('input'))).toHaveValue('input value');

// With timeout (for async operations)
await waitFor(element(by.id('async-result')))
  .toBeVisible()
  .withTimeout(15000);
```

### Platform-Specific Testing
```javascript
const { device, platform } = require('detox');

it('should handle platform-specific behavior', async () => {
  if (device.getPlatform() === 'ios') {
    // iOS-specific test
    await element(by.id('ios-only-button')).tap();
  } else {
    // Android-specific test
    await element(by.id('android-only-button')).tap();
  }
});
```

## Test Data & Seeded Users

### Available Test Users
Tests use seeded users from `backend/scripts/seed-test-users-api.ts`:

**Verified User:**
- Email: `sarah.verified@test.com`
- Password: `TestPassword123!` or `TestPassword123`
- Status: Fully verified with background check

**Basic Test User:**
- Email: `test@conest.com`
- Password: `Test1234`
- Status: Basic verification

**Discovery Users:**
- Email: `sarah.johnson@test.com`
- Password: `Test1234`
- Status: Part of discovery pool

### Prerequisites for Tests
1. **Backend Running:** Docker services must be up (PostgreSQL, Redis, Backend)
2. **Database Seeded:** Test users must exist in database
3. **Simulator/Emulator:** iOS simulator or Android emulator must be available

```bash
# Verify backend health
curl http://localhost:3000/health

# Check test user exists
PGPASSWORD= psql -h localhost -p 5433 -U safenest -d safenest_db \
  -c "SELECT email, is_verified FROM users WHERE email = 'sarah.verified@test.com';"
```

## Best Practices

### 1. Use testID Props
Always add `testID` props to components for reliable selection:

```tsx
// LoginScreen.tsx
<TextInput
  testID="email-input"
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>

<TouchableOpacity testID="login-button" onPress={handleLogin}>
  <Text>Login</Text>
</TouchableOpacity>
```

### 2. Wait for Elements
Use `waitFor` to handle asynchronous operations:

```javascript
// Good - waits for element
await waitFor(element(by.id('profile-modal')))
  .toBeVisible()
  .withTimeout(10000);

// Bad - may fail if element not ready
await expect(element(by.id('profile-modal'))).toBeVisible();
```

### 3. Handle Keyboard
Dismiss keyboard before interactions that might be obscured:

```javascript
// Dismiss keyboard before tapping button
await element(by.id('password-input')).typeText('password');
await element(by.id('login-screen')).scrollTo('bottom');
await element(by.id('login-button')).tap();
```

### 4. Error Handling
Use try-catch for optional elements or screens not yet implemented:

```javascript
try {
  await element(by.id('optional-feature')).tap();
  console.log('✅ Optional feature found');
} catch (e) {
  console.log('ℹ️ Optional feature not available yet');
}
```

### 5. Descriptive Test Names
Use clear, descriptive test names that explain intent:

```javascript
// Good
it('should successfully login with verified user and navigate to home screen', async () => {});

// Bad
it('should work', async () => {});
```

## Debugging Tests

### Verbose Logging
```bash
# Maximum logging
npx detox test --configuration ios.sim.debug --loglevel trace

# Standard logging
npx detox test --configuration ios.sim.debug --loglevel info

# Minimal logging
npx detox test --configuration ios.sim.debug --loglevel error
```

### Taking Screenshots
```javascript
// Capture screenshot for debugging
await device.takeScreenshot('login-screen-state');
```

### Console Logs
```javascript
// Add debugging logs in tests
console.log('🔍 Current element:', await element(by.id('test')).getAttributes());
console.log('✅ Test passed: login successful');
console.log('⚠️ Warning: element not found');
```

### Common Issues

**Issue: "Cannot find element"**
```javascript
// Solution: Use waitFor with timeout
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(15000);
```

**Issue: "Element is not visible"**
```javascript
// Solution: Scroll to element first
await element(by.id('scrollview')).scrollTo('bottom');
await element(by.id('button-at-bottom')).tap();
```

**Issue: "Test timeout"**
```javascript
// Solution: Increase timeout in jest config
jest: {
  setupTimeout: 180000  // 3 minutes
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  ios-e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Build iOS app
        run: npx detox build --configuration ios.sim.debug
      - name: Run iOS tests
        run: npx detox test --configuration ios.sim.debug

  android-e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Build Android app
        run: npx detox build --configuration android.emu.debug
      - name: Run Android tests
        run: npx detox test --configuration android.emu.debug
```

## Performance Testing

### Measuring Render Performance
```javascript
it('should render profile list within performance budget', async () => {
  const startTime = Date.now();
  
  await waitFor(element(by.id('profile-list')))
    .toBeVisible()
    .withTimeout(5000);
  
  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(3000); // 3 second budget
  
  console.log(`📊 Profile list rendered in ${renderTime}ms`);
});
```

### Testing Animations
```javascript
it('should complete swipe animation smoothly', async () => {
  await element(by.id('profile-card')).swipe('left', 'fast', 0.9);
  
  // Wait for animation to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await expect(element(by.id('next-card'))).toBeVisible();
});
```

## Safety & Compliance Testing

### Child Safety Compliance (Constitutional Principle I)
```javascript
describe('Child Safety Compliance', () => {
  it('should never display child data in profile views', async () => {
    await element(by.id('profile-card-0')).tap();
    
    // Verify no child-specific data is visible
    await expect(element(by.text(/child.*name/i))).not.toExist();
    await expect(element(by.text(/kid/i))).not.toExist();
    await expect(element(by.id('child-photo'))).not.toExist();
  });
  
  it('should require verification before viewing profiles', async () => {
    // Attempt to access profiles without verification
    await expect(element(by.id('verification-required-modal'))).toBeVisible();
  });
});
```

## Test Coverage Goals

- **Critical Paths:** 100% coverage (login, profile viewing, matching)
- **Feature Coverage:** 80% coverage for all major features
- **Regression Tests:** All bug fixes must have corresponding test
- **Cross-Platform:** All tests must pass on both iOS and Android

## Maintenance

### Updating Tests
When UI changes, update tests immediately:
1. Update `testID` props if component refactored
2. Update selectors if text/labels changed
3. Update assertions if expected behavior changed
4. Run full test suite before merging

### Test Organization
```
e2e/
├── auth/           # Authentication tests
├── profiles/       # Profile viewing and management
├── matching/       # Matching algorithm tests
├── messaging/      # Chat and communication
├── payments/       # Stripe integration tests
├── helpers/        # Shared utilities
└── smoke/          # Quick sanity tests
```
