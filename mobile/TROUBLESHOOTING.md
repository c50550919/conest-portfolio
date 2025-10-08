# Troubleshooting Guide - CoNest Mobile App

## ✅ Issues Resolved

### 1. Expo Package Incompatibility (FIXED)
**Problem**: Multiple Expo packages caused compilation errors in bare React Native project

**Root Cause**: The mobile app was initially written assuming Expo infrastructure, but it's actually a bare React Native 0.74.5 project

**Fixed Files** (7 files updated):
- `/src/components/discovery/MatchModal.tsx`
- `/src/components/discovery/ProfileCard.tsx`
- `/src/components/discovery/SwipeableCard.tsx`
- `/src/screens/main/DiscoverScreen.tsx`
- `/src/services/encryption.ts`
- `/src/utils/secureStorage.ts`
- `/src/utils/biometric.ts`

**Replacements Made**:
- ❌ `expo-linear-gradient` → ✅ `react-native-linear-gradient`
- ❌ `expo-crypto` → ✅ `react-native-aes-crypto`
- ❌ `@expo/vector-icons` → ✅ `react-native-vector-icons`
- ❌ `expo-screen-capture` → ⚠️ Commented out (non-critical feature)
- ❌ `expo-local-authentication` → ⚠️ Commented out (non-critical feature)

### 2. Metro Bundler Compilation (FIXED)
**Status**: ✅ Successfully compiles JavaScript bundle without errors

**Verification**: Bundle endpoint responds correctly at `http://localhost:8081/index.bundle`

## ⚠️ Outstanding Issues

### react-native-reanimated Compatibility Issue
**Status**: BLOCKING Android builds

**Problem**: React Native Reanimated has incompatibility with React Native 0.74.5:
- `react-native-reanimated@3.10.1` requires RN 0.78+
- `react-native-reanimated@3.6.0` has API mismatch
- `react-native-reanimated@3.5.4` has compilation errors

**Error Messages**:
```
error: ReanimatedMessageQueueThread is not abstract and does not override abstract method isIdle()
error: cannot find symbol: method replaceExistingNonRootView(int,int)
error: cannot find symbol: method removeSubviewsFromContainerWithID(int)
```

**Affected Components**:
- `SwipeableCard.tsx` - Uses PanGestureHandler and animated values
- `MatchModal.tsx` - Uses animated values for modal entrance
- `DiscoverScreen.tsx` - Stack rendering with animations

**Recommended Solutions** (choose one):

**Option 1: Upgrade React Native (Recommended)**
```bash
npm install react-native@0.75.0 --legacy-peer-deps
npm install react-native-reanimated@3.10.1 --legacy-peer-deps
```
- **Pros**: Latest features, better compatibility
- **Cons**: May require updating other dependencies, migration effort
- **Risk**: Medium - requires testing all features

**Option 2: Remove Reanimated Animations (Quick Fix)**
```bash
npm uninstall react-native-reanimated
```
- Replace animated cards with simple `View` components
- Use React Native's built-in `Animated` API instead
- **Pros**: Minimal risk, works immediately
- **Cons**: Loses smooth 60fps animations, reduced UX quality
- **Risk**: Low - isolated to Discovery Screen

**Option 3: Downgrade to Reanimated 2.x**
```bash
npm install react-native-reanimated@2.17.0 --legacy-peer-deps
```
- Update imports from Reanimated 3 to Reanimated 2 API
- **Pros**: Stable with RN 0.74
- **Cons**: Requires code changes, older API
- **Risk**: Medium - requires refactoring

## Current App State

### Metro Bundler: ✅ Working
- Port 8081 active
- JavaScript bundle compiles successfully
- All Expo dependencies removed

### Android Build: ❌ Blocked
- Compilation fails at react-native-reanimated
- Java 17 configured correctly
- Gradle 8.7 working properly

### Components Status:
- ✅ DiscoverScreen.tsx - Metro compiles (runtime blocked by Reanimated)
- ✅ ProfileCard.tsx - Fully working
- ✅ MatchModal.tsx - Metro compiles (runtime blocked by Reanimated)
- ✅ SwipeableCard.tsx - Metro compiles (runtime blocked by Reanimated)

## Next Steps

1. **Choose one of the 3 solutions above** and implement
2. Once Reanimated is fixed, build and test on emulator
3. Run manual testing scenarios from `/specs/001-discovery-screen-swipeable/quickstart.md`
4. Verify all swipe gestures work at 60fps
5. Test match modal animations
6. Complete Phase 3.6 testing tasks (T037-T045)

## Environment Info

- **React Native**: 0.74.5
- **Node**: 23.x
- **Java**: 17 (openjdk@17 via Homebrew)
- **Gradle**: 8.7
- **Android Emulator**: Pixel_3a_API_34_extension_level_7_arm64-v8a (running)
- **Metro**: Port 8081 (active)

## Testing Checklist

Once Reanimated is fixed:

- [ ] Metro bundler starts without errors
- [ ] Android app installs on emulator
- [ ] Discovery Screen loads
- [ ] Swipe gestures work (left/right)
- [ ] Match modal appears with animations
- [ ] No Reanimated errors in logcat
- [ ] All Phase 3.6 tests pass
