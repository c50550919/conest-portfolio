# CoNest E2E Testing Guide - Complete User Journey

## Overview
This guide covers end-to-end (E2E) testing for the CoNest mobile application using Detox. The tests verify all application use cases from login through messaging.

## Test Coverage

### Complete User Journey Test (`e2e/full-user-journey.test.js`)
This comprehensive E2E test covers:

1. **Authentication Flow**
   - Login with test credentials
   - JWT token validation
   - Navigation to main app

2. **Home/Dashboard Screen**
   - Welcome message display
   - Tab bar navigation
   - Screen loading verification

3. **Discovery Screen - Browse Profiles**
   - Profile card loading
   - Grid/list view display
   - API call success verification
   - Empty state handling

4. **Profile Details View**
   - Modal opening on card tap
   - Full profile information display
   - Compatibility score (if available)
   - Close/dismiss functionality

5. **Express Interest (Matching)**
   - Interest button interaction
   - API request submission
   - Success feedback display
   - Match detection (if mutual)

6. **Match Notification**
   - Match modal display
   - Match celebration UI
   - Dismiss functionality
   - Navigation to messages

7. **Messages Screen**
   - Conversation list display
   - Matched users visibility
   - Empty state handling
   - Unread message indicators

8. **Send Message Flow**
   - Conversation opening
   - Message input interaction
   - Send button functionality
   - Message appearance in thread
   - Timestamp and status display

9. **Household Screen**
   - Navigation verification
   - Feature display
   - Empty state handling
   - Expense split UI (if applicable)

10. **Profile Screen**
    - User profile display
    - Edit profile access
    - Settings options
    - Logout functionality

## Prerequisites

### Backend Setup
```bash
cd backend
npm install
npm run migrate
npm run seed:dev  # Creates test users and profiles
npm run dev       # Start backend on port 3000
```

### Mobile App Setup
```bash
cd mobile
npm install
cd ios && pod install && cd ..
```

### Detox Setup
```bash
# Install Detox CLI globally
npm install -g detox-cli

# For iOS testing
xcode-select --install
brew tap wix/brew
brew install applesimutils
```

## Running Tests

### iOS Tests
```bash
cd mobile

# Build iOS app for testing
npx detox build --configuration ios.sim.debug

# Run complete user journey test
npx detox test e2e/full-user-journey.test.js --configuration ios.sim.debug

# Run with verbose logging
npx detox test e2e/full-user-journey.test.js --configuration ios.sim.debug --loglevel verbose

# Run and generate artifacts (screenshots, logs)
npx detox test e2e/full-user-journey.test.js --configuration ios.sim.debug --record-logs all --take-screenshots all
```

### Android Tests
```bash
cd mobile

# Start Android emulator
emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a

# Build Android app for testing
npx detox build --configuration android.emu.debug

# Run complete user journey test
npx detox test e2e/full-user-journey.test.js --configuration android.emu.debug
```

## Test Data

### Test User Credentials
- **Email**: `test@conest.com`
- **Password**: `TestPassword123`

### Test Profiles
The database seed file creates 20 test profiles with realistic data:
- Sarah Johnson (Oakland, CA) - 2 children
- Jennifer Lee (San Francisco, CA) - 1 child
- Maria Garcia (Berkeley, CA) - 3 children
- Amanda Wilson (Oakland, CA) - 2 children
- And 16 more profiles...

## Required testIDs

### Login Screen
```typescript
- email-input: Email input field
- password-input: Password input field
- login-button: Login submit button
```

### Navigation
```typescript
- tab-bar: Bottom tab navigation
- tab-discover: Discovery tab button
- tab-messages: Messages tab button
- tab-household: Household tab button
- tab-profile: Profile tab button
```

### Home Screen
```typescript
- home-screen: Main container
- welcome-message: Welcome/greeting text
```

### Discovery Screen
```typescript
- discovery-screen: Main container
- profile-card-{index}: Profile card (e.g., profile-card-0)
- profile-name-{index}: Profile name text
- profile-bio-{index}: Profile bio/description
- profile-location-{index}: Profile location
```

### Profile Details Modal
```typescript
- profile-details-modal: Modal container
- profile-full-bio: Full biography text
- compatibility-score: Compatibility percentage
- express-interest-button: Interest button
- close-modal-button: Close/dismiss button
```

### Messages Screen
```typescript
- messages-screen: Main container
- conversation-list: List container
- conversation-item-{index}: Conversation row
- conversation-name-{index}: Match name
```

### Conversation Screen
```typescript
- conversation-screen: Chat container
- message-input: Message input field
- send-message-button: Send button
- message-timestamp-{index}: Message time
- message-status-{index}: Delivery status
- back-button: Navigation back
```

### Household Screen
```typescript
- household-screen: Main container
- household-info: Household details
- expense-split-section: Expense features
```

### Profile Screen
```typescript
- profile-screen: Main container
- profile-photo: User avatar/photo
- profile-name: User name display
- edit-profile-button: Edit button
- settings-section: Settings list
- logout-button: Logout button
```

## Test Execution Flow

```
1. Launch App → Login Screen
   ↓
2. Enter Credentials → Authenticate
   ↓
3. Navigate to Home → Verify Tab Bar
   ↓
4. Tap Discovery Tab → Load Profiles
   ↓
5. Tap Profile Card → Open Details Modal
   ↓
6. Tap Express Interest → Submit to API
   ↓
7. Check for Match Notification (if mutual)
   ↓
8. Navigate to Messages → View Conversations
   ↓
9. Open Conversation → Send Message
   ↓
10. Verify Message Sent → Check Status
    ↓
11. Navigate to Household → Verify Features
    ↓
12. Navigate to Profile → Verify Settings
    ↓
13. Test Complete ✓
```

## Screenshots & Artifacts

Test artifacts are saved to `./artifacts/` directory:
- **Screenshots**: Captured at key test points
- **Logs**: Device and app logs
- **Videos**: Full test execution recording (if enabled)

Key screenshot moments:
- `express-interest-submitted.png` - After interest button tap
- `match-notification.png` - Match celebration screen
- `message-sent.png` - After sending message
- `test-complete-final-state.png` - Final app state

## Troubleshooting

### Build Failures
```bash
# Clean iOS build
cd mobile/ios
rm -rf build
pod cache clean --all
pod deintegrate && pod install
cd .. && npx detox build --configuration ios.sim.debug
```

### Test Failures

**Profile cards not loading:**
- Verify backend is running (`http://localhost:3000`)
- Check seed data exists: `cd backend && npm run seed:dev`
- Verify API URL in socket.ts matches backend

**WebSocket connection errors:**
- Ensure ngrok tunnel is active if using remote backend
- Update socket.ts SOCKET_URL to match backend URL
- Check Redis server is running for real-time features

**Element not found errors:**
- Verify testID props are added to components
- Check element is actually visible on screen
- Increase waitFor timeout if loading takes time

**Authentication failures:**
- Verify test user exists in database
- Check JWT_SECRET matches between backend and mobile
- Clear app data and retry

### Viewing Logs
```bash
# iOS Simulator logs
xcrun simctl spawn booted log stream --predicate 'process == "conest"'

# Metro bundler logs
cd mobile && npx react-native start

# Detox test logs with verbose output
npx detox test --configuration ios.sim.debug --loglevel verbose
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd mobile && npm install
      - name: Install Detox
        run: npm install -g detox-cli
      - name: Build app
        run: cd mobile && npx detox build --configuration ios.sim.debug
      - name: Run E2E tests
        run: cd mobile && npx detox test --configuration ios.sim.debug --cleanup
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        if: failure()
        with:
          name: e2e-artifacts
          path: mobile/artifacts/
```

## Best Practices

### Writing Tests
1. **Use descriptive test names** - Clearly state what is being tested
2. **Add console.log statements** - Help debug failures
3. **Wait for elements** - Use `waitFor()` instead of `sleep()`
4. **Handle optional features** - Use try/catch for features that may not be implemented
5. **Take screenshots** - Capture evidence at key points
6. **Test empty states** - Verify graceful handling when no data exists

### Maintaining Tests
1. **Keep testIDs consistent** - Document all testID values
2. **Update tests with features** - Add tests when features are added
3. **Run tests frequently** - Catch regressions early
4. **Review artifacts** - Check screenshots when tests fail
5. **Mock external services** - Reduce flakiness from network issues

### Performance
1. **Reuse app instance** - Don't reload between every test
2. **Parallel execution** - Run independent test suites in parallel
3. **Optimize waits** - Use specific conditions instead of arbitrary timeouts
4. **Clean up state** - Reset data between test runs

## Next Steps

1. **Add testIDs to all screens** - Ensure every interactive element has a testID
2. **Implement missing features** - Complete household and profile features
3. **Add more test scenarios** - Edge cases, error handling, offline mode
4. **Set up CI/CD** - Automate test execution on commits
5. **Monitor test results** - Track pass/fail rates and execution time

## References

- [Detox Documentation](https://wix.github.io/Detox/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/)
- [CoNest Testing Protocol](./docs/TESTING_PROTOCOL.md)
