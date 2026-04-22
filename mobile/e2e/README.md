# CoNest Mobile E2E Testing Suite

## Overview

Comprehensive E2E test suite for CoNest/CoNest mobile application using Detox framework. Tests cover authentication, discovery, messaging, and household management with **critical child safety compliance verification**.

## Test Files

### 1. Authentication Flow (`auth-flow.e2e.ts`)
**Purpose**: Test complete authentication flow including login, signup, and logout

**Test Coverage**:
- Login screen validation and UI
- Login with valid/invalid credentials
- Signup form validation (NO child PII inputs)
- Password strength validation
- Token persistence across app restarts
- Logout functionality

**Child Safety**: Verifies NO child PII collection during signup (only parent data)

---

### 2. Discovery Flow (`discovery-flow.e2e.ts`) ⚠️ CHILD SAFETY CRITICAL
**Purpose**: Test swipeable discovery screen with strict child PII verification

**Test Coverage**:
- Profile cards display ONLY childrenCount + childrenAgeGroups
- Swipe gestures (left/right) with 60fps performance
- Match notifications and modal display
- Screenshot detection and reporting
- Empty states and error handling
- Performance: <500ms profile loading

**CRITICAL Child Safety Checks**:
- ✅ ONLY childrenCount (integer) displayed
- ✅ ONLY childrenAgeGroups (generic ranges: toddler, elementary, teen) displayed
- ❌ NO child names visible anywhere
- ❌ NO child photos displayed
- ❌ NO specific child ages (e.g., "3 years old")
- ❌ NO child school names

**Performance Requirements**:
- Profile loading: <500ms (Constitution Principle IV)
- Swipe animations: 60fps smooth transitions
- Match notifications: Real-time via Socket.io

---

### 3. Messages Flow (`messages-flow.e2e.ts`)
**Purpose**: Test real-time messaging functionality with Socket.io

**Test Coverage**:
- Match list display with latest messages
- Message history loading with pagination
- Send text messages with optimistic updates
- Real-time message reception (Socket.io)
- Typing indicators and read receipts
- Offline support with retry queue
- Performance: <500ms conversation loading

**Child Safety**: Verifies NO child PII can be sent in messages (UI-level check)

---

### 4. Household Flow (`household-flow.e2e.ts`) ⚠️ CHILD SAFETY CRITICAL
**Purpose**: Test household management with strict child PII verification

**Test Coverage**:
- Household member list (ONLY parents, NO children)
- Expense management and splitting
- Payment processing (Stripe integration)
- Transaction history and filtering
- Performance: <500ms data loading, <200ms API calls P95

**CRITICAL Child Safety Checks**:
- ✅ ONLY parent members listed (NO child members)
- ❌ NO child names in member list
- ❌ NO child photos displayed
- ❌ NO child ages or schools
- ❌ NO "Add Child" functionality
- ❌ NO child-specific expense descriptions
- ❌ NO child names in calendar/chores/house rules

---

## Running Tests

### Prerequisites

1. **Install Detox CLI** (if not already installed):
   ```bash
   npm install -g detox-cli
   ```

2. **Build Android APK**:
   ```bash
   cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..
   ```

3. **Start Android Emulator**:
   ```bash
   # List available AVDs
   emulator -list-avds

   # Start emulator (use AVD name from .detoxrc.js)
   emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a &
   ```

4. **Start Metro Bundler**:
   ```bash
   npm start
   ```

### Run All Tests

```bash
# Android Emulator (Debug)
detox test --configuration android.emu.debug

# Android Emulator (Release)
detox test --configuration android.emu.release

# iOS Simulator (Debug)
detox test --configuration ios.sim.debug

# iOS Simulator (Release)
detox test --configuration ios.sim.release
```

### Run Specific Test File

```bash
# Authentication tests only
detox test e2e/auth-flow.e2e.ts --configuration android.emu.debug

# Discovery tests (CHILD SAFETY CRITICAL)
detox test e2e/discovery-flow.e2e.ts --configuration android.emu.debug

# Messages tests
detox test e2e/messages-flow.e2e.ts --configuration android.emu.debug

# Household tests (CHILD SAFETY CRITICAL)
detox test e2e/household-flow.e2e.ts --configuration android.emu.debug
```

### Run Specific Test Suite

```bash
# Run only child safety compliance tests
detox test --grep "CHILD SAFETY COMPLIANCE" --configuration android.emu.debug

# Run only performance tests
detox test --grep "Performance" --configuration android.emu.debug
```

---

## Test Data Requirements

### Backend Mock Data
Tests assume the following test accounts exist in the backend:

**Test User 1**:
- Email: `parent@example.com`
- Password: `TestPass123!`
- Profile: Complete, verified parent account
- Children: 2 (toddler, elementary age groups)
- Household: Active with expenses and matches

**Test User 2**:
- Email: `newparent@example.com`
- Used for signup flow testing
- Should NOT exist initially

### Mock API Responses
For optimal test coverage, backend should provide:
- 10+ discovery profiles with varying compatibility scores
- 3+ matches with message history
- Real-time Socket.io message delivery
- Household with 2+ members and 5+ expenses

---

## Performance Benchmarks

All tests verify performance compliance with Constitution Principle IV:

| Metric | Target | Test |
|--------|--------|------|
| Profile Loading | <500ms | `discovery-flow.e2e.ts` |
| Swipe Animation | 60fps | `discovery-flow.e2e.ts` |
| Conversation Loading | <500ms | `messages-flow.e2e.ts` |
| Message Optimistic Update | <100ms | `messages-flow.e2e.ts` |
| Household Data Loading | <500ms | `household-flow.e2e.ts` |
| API Response Time (P95) | <200ms | `household-flow.e2e.ts` |
| Screen Transitions | <500ms | All tests |

---

## Child Safety Compliance Matrix

### ✅ ALLOWED Data
- `childrenCount`: Integer (e.g., 2)
- `childrenAgeGroups`: Generic ranges (toddler, elementary, teen)
- Parent name, photo, age, city
- Verification badges (ID, background check, phone)
- Compatibility score

### ❌ PROHIBITED Data (Child PII)
- Child names (first, last, nicknames)
- Child photos or avatars
- Specific child ages (e.g., "3 years old", "7", "14")
- Child schools or grades
- Child birthdays or birthdates
- Child gender identifiers
- Child nicknames or aliases
- Child-specific calendar events
- Child-specific chore assignments
- Child-specific house rules

---

## Continuous Integration (CI/CD)

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  e2e-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Build Android APK
        run: cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug
      - name: Run E2E Tests
        run: detox test --configuration android.emu.debug --headless
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: e2e/artifacts/
```

---

## Troubleshooting

### Common Issues

**1. "Cannot find element" errors**
- Ensure testID props are set on UI components
- Verify app is fully loaded before running tests
- Check that backend mock data exists

**2. "Timeout waiting for element" errors**
- Increase timeout values in `waitFor()` calls
- Verify network connectivity and backend availability
- Check that Socket.io server is running (for real-time tests)

**3. Performance test failures**
- Ensure emulator/simulator has sufficient resources
- Close other apps to free up system resources
- Run tests on physical device for accurate performance metrics

**4. Child safety test failures**
- **CRITICAL**: Immediately investigate any child PII appearing on screen
- Review component code and Redux state for child data leaks
- Update components to only display childrenCount + childrenAgeGroups

### Debug Mode

```bash
# Run tests with verbose logging
detox test --configuration android.emu.debug --loglevel trace

# Run tests with screenshots on failure
detox test --configuration android.emu.debug --take-screenshots failing

# Run tests with video recording
detox test --configuration android.emu.debug --record-videos all
```

---

## Test Maintenance

### Adding New Tests

1. Create new test file in `e2e/` directory
2. Follow naming convention: `{feature}-flow.e2e.ts`
3. Include child safety verification if applicable
4. Add performance benchmarks for critical operations
5. Update this README with test coverage details

### Updating Existing Tests

1. Verify child safety compliance after UI changes
2. Update performance benchmarks if requirements change
3. Maintain testID consistency across components
4. Update mock data requirements if needed

---

## Contact

For questions or issues with E2E testing:
- **Framework**: Detox (https://wix.github.io/Detox/)
- **Child Safety Compliance**: See CLAUDE.md (Constitution Principle I)
- **Performance Requirements**: See CLAUDE.md (Constitution Principle IV)

---

## Version History

- **2025-10-08**: Initial E2E test suite creation
  - Authentication flow tests
  - Discovery flow tests (child safety critical)
  - Messages flow tests
  - Household flow tests (child safety critical)
  - Performance benchmarks
  - Child safety compliance matrix
