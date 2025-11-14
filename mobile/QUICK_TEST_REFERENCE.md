# CoNest E2E Testing - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Setup Backend
```bash
cd /Users/ghostmac/Development/conest/backend
npm run seed:dev  # Create test users & profiles
npm run dev       # Start backend (port 3000)
```

### 2. Build iOS App for Testing
```bash
cd /Users/ghostmac/Development/conest/mobile
npx detox build --configuration ios.sim.debug
```

### 3. Run E2E Tests
```bash
npx detox test e2e/full-user-journey.test.js --configuration ios.sim.debug
```

## 📋 Test Credentials
- **Email**: `test@conest.com`
- **Password**: `TestPassword123`

## 🎯 Test Coverage (10 Use Cases)

| # | Test Scenario | Status |
|---|---------------|--------|
| 1 | Authentication & Login | ✅ Ready |
| 2 | Home/Dashboard Screen | ✅ Ready |
| 3 | Discovery - Browse Profiles | ✅ Ready |
| 4 | Profile Details View | ✅ Ready |
| 5 | Express Interest (Match) | ✅ Ready |
| 6 | Match Notification | ✅ Ready |
| 7 | Messages Screen | ✅ Ready |
| 8 | Send Message Flow | ✅ Ready |
| 9 | Household Screen | ✅ Ready |
| 10 | Profile Screen | ✅ Ready |

## 🔧 Common Commands

### Build Only
```bash
npx detox build --configuration ios.sim.debug
```

### Test Only (no rebuild)
```bash
npx detox test e2e/full-user-journey.test.js --configuration ios.sim.debug
```

### With Screenshots & Logs
```bash
npx detox test e2e/full-user-journey.test.js \
  --configuration ios.sim.debug \
  --record-logs all \
  --take-screenshots all
```

### Verbose Output
```bash
npx detox test --configuration ios.sim.debug --loglevel verbose
```

### Specific Test Only
```bash
npx detox test --configuration ios.sim.debug --grep "Authentication Flow"
```

### Clean Rebuild
```bash
npx detox clean-framework-cache
npx detox build --configuration ios.sim.debug
```

## 📸 Artifacts Location
After test run, check: `./artifacts/`
- Screenshots: `./artifacts/*.png`
- Logs: `./artifacts/*.log`
- Videos (if enabled): `./artifacts/*.mp4`

## ⚠️ Troubleshooting

### Build Fails
```bash
cd ios
pod cache clean --all
pod deintegrate
pod install
cd .. && npx detox build --configuration ios.sim.debug
```

### Tests Can't Find Elements
- Check testID props are added to components
- Verify screen is actually visible
- Increase waitFor timeout values

### Backend Connection Errors
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check socket connection
curl http://localhost:3000
```

### Clean Start
```bash
# Kill all simulators
killall Simulator

# Clean build
rm -rf ios/build
npx detox clean-framework-cache

# Rebuild and test
npx detox build --configuration ios.sim.debug
npx detox test --configuration ios.sim.debug
```

## 📊 Expected Test Results

### ✅ Success
```
Complete User Journey - Login to Messaging
  ✓ Authentication Flow (5s)
  ✓ Home/Dashboard Screen (2s)
  ✓ Discovery - Browse Profiles (3s)
  ✓ Profile Details View (2s)
  ✓ Express Interest (2s)
  ✓ Match Notification (1s)
  ✓ Messages Screen (2s)
  ✓ Send Message Flow (3s)
  ✓ Household Screen (2s)
  ✓ Profile Screen (2s)

16 tests passed (24s)
```

### ❌ Common Failures

**"Element not found"**
- Missing testID prop on component
- Screen not fully loaded yet
- Element hidden/not visible

**"Backend not responding"**
- Backend not running
- Wrong API URL
- Database not seeded

**"Login failed"**
- Test user not in database
- Wrong credentials
- JWT secret mismatch

## 🎓 Full Documentation
- **Setup Guide**: `E2E_TESTING_GUIDE.md`
- **Implementation Details**: `E2E_TEST_SUMMARY.md`
- **Test Code**: `e2e/full-user-journey.test.js`

## 🔗 Quick Links
- Detox Docs: https://wix.github.io/Detox/
- React Native Testing: https://reactnative.dev/docs/testing-overview
- Jest Docs: https://jestjs.io/

## 💡 Pro Tips

1. **Run tests frequently** - Catch regressions early
2. **Check artifacts** - Screenshots show exactly what happened
3. **Use --grep** - Run specific test scenarios
4. **Keep backend running** - Faster test iterations
5. **Clean builds occasionally** - Prevent cache issues

## ⏱️ Estimated Times
- Initial setup: 10-15 minutes
- Build for testing: 5-10 minutes
- Run full test suite: 30-60 seconds
- Add testIDs to screen: 2-5 minutes
- Debug failing test: 5-15 minutes

---

**Last Updated**: 2025-10-13
**Version**: 1.0
**Status**: Ready for Testing
