# Testing Protocol for CoNest Mobile App

## Overview
This document defines the mandatory testing requirements for all screens, dashboards, and critical UI components in the CoNest mobile application.

## Constitutional Principle IV Compliance
All features must meet **<500ms performance** targets and maintain **60fps animations** as defined in the project constitution.

---

## Mandatory Testing Rules

### Rule 1: Automated Tests Required for All Screens
**Every screen and dashboard MUST have automated Detox E2E tests created before the feature is considered complete.**

No exceptions. No "TODO: add tests later". Tests are part of the feature definition of done.

### Rule 2: Test Creation Timing
Tests must be created:
1. **During feature implementation** - Not after
2. **Before marking PR as ready** - Tests must pass
3. **With testID props added** - All interactive elements must have testID

### Rule 3: Test Coverage Requirements
Each screen/dashboard must test:
- ✅ **Navigation** - Screen opens correctly from parent
- ✅ **User Interactions** - All buttons, inputs, gestures work
- ✅ **Data Display** - All sections render with data
- ✅ **Error States** - Handle loading, empty, error states
- ✅ **Child Safety** - NO child PII displayed (Constitution Principle I)
- ✅ **Performance** - Render time <500ms, animations 60fps
- ✅ **Edge Cases** - Missing data, rapid interactions, back navigation

---

## Testing Checklist for New Screens

### Phase 1: Development (During Implementation)
- [ ] Add `testID` props to all interactive elements (buttons, inputs, scrolls, modals)
- [ ] Add `testID` props to all major sections for scroll-and-verify tests
- [ ] Document expected user flows and interactions
- [ ] Identify edge cases and error scenarios

### Phase 2: Test Creation (Before PR)
- [ ] Create E2E test file in `/mobile/e2e/[feature-name].test.js`
- [ ] Write tests for all user flows identified in Phase 1
- [ ] Write tests for all edge cases
- [ ] Write performance tests (render time, animation smoothness)
- [ ] Write child safety compliance tests (if applicable)

### Phase 3: Validation (PR Review)
- [ ] All tests pass locally
- [ ] Tests run in CI/CD pipeline
- [ ] Code coverage meets minimum thresholds
- [ ] Manual verification on physical device/emulator
- [ ] Performance metrics documented in test report

---

## Test File Naming Convention

```
e2e/[screen-name].test.js
```

Examples:
- `e2e/discover-screen.test.js`
- `e2e/profile-details-modal.test.js`
- `e2e/messages-screen.test.js`
- `e2e/household-dashboard.test.js`

---

## TestID Naming Convention

Use descriptive, consistent naming:

```typescript
// Screens
testID="discover-screen"
testID="profile-screen"

// Buttons
testID="login-button"
testID="info-button"
testID="continue-browsing-button"
testID="interested-button"

// Sections
testID="compatibility-section"
testID="about-section"
testID="children-section"

// Inputs
testID="email-input"
testID="password-input"

// Lists/Scrolls
testID="profile-list"
testID="message-scroll"
testID="photo-gallery"

// Modals
testID="profile-details-modal"
testID="match-modal"
```

---

## Test Structure Template

```javascript
/**
 * [Feature Name] E2E Tests
 *
 * Tests the [Feature] component functionality including:
 * - [Test category 1]
 * - [Test category 2]
 * - [Test category 3]
 *
 * Created: YYYY-MM-DD
 */

describe('[Feature Name] E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Basic Functionality', () => {
    it('should render screen correctly', async () => {
      // Test implementation
    });

    it('should handle user interaction', async () => {
      // Test implementation
    });
  });

  describe('Performance', () => {
    it('should render within 500ms (Constitution Principle IV)', async () => {
      const startTime = Date.now();
      // Trigger render
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should maintain 60fps during animations', async () => {
      // Test implementation
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing data gracefully', async () => {
      // Test implementation
    });
  });

  describe('Child Safety Compliance', () => {
    it('should NOT display child PII', async () => {
      // Verify NO child names, photos, individual ages
    });
  });
});
```

---

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx detox test --configuration android.emu.debug e2e/[test-file].test.js
```

### Run Tests with Logs
```bash
npx detox test --configuration android.emu.debug e2e/[test-file].test.js --loglevel trace
```

### Run Tests with Screenshots
```bash
npx detox test --configuration android.emu.debug e2e/[test-file].test.js --take-screenshots all
```

---

## CI/CD Integration

Tests must pass in CI/CD before merge:

### GitHub Actions Workflow
```yaml
name: E2E Tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Install Dependencies
        run: npm install
      - name: Build Android
        run: npm run build:android
      - name: Run E2E Tests
        run: npm run test:e2e
      - name: Upload Test Reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: artifacts/
```

---

## Performance Benchmarks

All screens must meet these targets (Constitution Principle IV):

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Render | <500ms | Time to visible |
| User Interaction Response | <100ms | Tap to feedback |
| Animation Frame Rate | 60fps | Scroll/swipe smoothness |
| Modal Open/Close | <300ms | Animation duration |
| Navigation Transition | <500ms | Screen to screen |

---

## Test Coverage Goals

| Coverage Type | Minimum Target |
|---------------|----------------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| E2E Tests | 90% of user flows |
| Critical Paths | 100% |

---

## Enforcement

### Code Review Checklist
Reviewers must verify:
- [ ] E2E test file exists for new screen
- [ ] All testIDs are properly added
- [ ] Tests cover all user flows
- [ ] Tests pass locally and in CI
- [ ] Performance benchmarks documented
- [ ] Child safety tests included (if applicable)

### Automated Checks
Pre-commit hooks should enforce:
- [ ] Test files exist for modified screens
- [ ] No testID removals without replacement
- [ ] Test coverage doesn't decrease

---

## Examples

### Existing Test Files (Reference)
- `/mobile/e2e/profile-details-modal.test.js` - Full modal testing example
- `/mobile/e2e/complete-dashboard-test.test.js` - Dashboard testing example
- `/mobile/e2e/quick-login-test.test.js` - Login flow testing example

### Adding Tests for New Screen

1. **Create screen with testIDs**:
```typescript
// MyNewScreen.tsx
export default function MyNewScreen() {
  return (
    <View testID="my-new-screen">
      <Text testID="screen-title">My New Screen</Text>
      <TouchableOpacity testID="action-button" onPress={handleAction}>
        <Text>Action</Text>
      </TouchableOpacity>
    </View>
  );
}
```

2. **Create test file**:
```javascript
// e2e/my-new-screen.test.js
describe('MyNewScreen E2E Tests', () => {
  it('should render screen correctly', async () => {
    await expect(element(by.id('my-new-screen'))).toBeVisible();
    await expect(element(by.id('screen-title'))).toBeVisible();
  });

  it('should handle action button tap', async () => {
    await element(by.id('action-button')).tap();
    // Verify expected outcome
  });
});
```

3. **Run tests**:
```bash
npx detox test --configuration android.emu.debug e2e/my-new-screen.test.js
```

---

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Best Practices](https://reactnative.dev/docs/testing-overview)
- [CoNest Constitution](/mobile/.specify/memory/constitution.md) - Performance principles

---

## Questions or Issues

If you have questions about testing requirements:
1. Review existing test files in `/mobile/e2e/`
2. Check this protocol document
3. Consult with the QA lead
4. Update this document with clarifications

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
