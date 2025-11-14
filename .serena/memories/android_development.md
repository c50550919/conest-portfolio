# Android Development Guide

## Android Configuration

### Build Configuration
- **Min SDK**: 24 (Android 7.0 Nougat)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 35
- **Build Tools**: 34.0.0
- **NDK Version**: 25.1.8937393
- **Kotlin**: 1.9.24
- **Gradle**: 8.6.0
- **AndroidX Core**: 1.13.1

### Package Name
`com.safenest.app`

### Build Features
- **Hermes Engine**: Enabled (React Native's JavaScript engine)
- **ProGuard**: Enabled for release builds (code obfuscation & minification)
- **JSC Flavor**: io.github.react-native-community:jsc-android:2026004.+

## Android Project Structure

```
mobile/android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/safenest/app/
│   │   │   │   └── MainActivity.java
│   │   │   ├── res/              # Resources (drawables, layouts, values)
│   │   │   ├── assets/           # Static assets
│   │   │   └── AndroidManifest.xml
│   │   ├── debug/               # Debug-specific config
│   │   └── release/             # Release-specific config
│   ├── build.gradle             # App-level Gradle config
│   └── proguard-rules.pro       # ProGuard rules
├── gradle/
│   └── wrapper/
├── build.gradle                 # Project-level Gradle config
├── settings.gradle              # Project settings
├── gradle.properties            # Gradle properties
├── gradlew                      # Gradle wrapper (Unix)
└── gradlew.bat                  # Gradle wrapper (Windows)
```

## Android Development Commands

### Setup & Build

#### Initial Setup
```bash
cd mobile/android
./gradlew clean
cd ..
npm run android
```

#### Build APK (Debug)
```bash
cd mobile/android
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

#### Build APK (Release)
```bash
cd mobile/android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

#### Build Android App Bundle (AAB) for Play Store
```bash
cd mobile/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Running the App

#### Run on Emulator/Device
```bash
cd mobile
npm run android
# or specify device:
npx react-native run-android --deviceId=DEVICE_ID
```

#### List Connected Devices
```bash
adb devices
```

#### Run on Specific Device
```bash
npx react-native run-android --deviceId=emulator-5554
```

### Cleaning & Troubleshooting

#### Clean Gradle Build
```bash
cd mobile/android
./gradlew clean
./gradlew cleanBuildCache
```

#### Complete Clean (Nuclear Option)
```bash
cd mobile
npm run clean  # Cleans both Android and iOS
# or manually:
cd android
./gradlew clean
rm -rf .gradle build app/build
cd ..
rm -rf node_modules
npm install
cd android
./gradlew --stop  # Stop Gradle daemon
```

#### Clear Metro Bundler Cache
```bash
cd mobile
npx react-native start --reset-cache
```

### Debugging

#### View Logs
```bash
# All logs
adb logcat

# React Native logs only
adb logcat *:S ReactNative:V ReactNativeJS:V

# App-specific logs
adb logcat | grep "com.safenest.app"
```

#### Install APK Manually
```bash
adb install path/to/app-debug.apk
# Force reinstall:
adb install -r path/to/app-debug.apk
```

#### Uninstall App
```bash
adb uninstall com.safenest.app
```

#### Enable USB Debugging
1. Settings → About Phone → Tap Build Number 7 times
2. Settings → Developer Options → Enable USB Debugging
3. Connect device and allow USB debugging prompt

### Emulator Management

#### List Available Emulators
```bash
emulator -list-avds
```

#### Start Emulator
```bash
emulator -avd EMULATOR_NAME
# Background:
emulator -avd EMULATOR_NAME &
```

#### Create New Emulator (Android Studio)
```bash
# Open Android Studio → Tools → AVD Manager
# Recommended: Pixel 7 Pro, Android 14 (API 34)
```

### Gradle Tasks

#### View Available Tasks
```bash
cd mobile/android
./gradlew tasks
```

#### Common Tasks
```bash
./gradlew assembleDebug          # Build debug APK
./gradlew assembleRelease        # Build release APK
./gradlew bundleRelease          # Build release AAB
./gradlew installDebug           # Install debug on device
./gradlew installRelease         # Install release on device
./gradlew clean                  # Clean build artifacts
./gradlew dependencies           # Show dependency tree
```

## Android-Specific Considerations

### Platform Differences (iOS vs Android)

#### Network Access
- **Android Emulator**: Use `10.0.2.2` instead of `localhost` for host machine
- **iOS Simulator**: Use `localhost` directly
- **Both**: Use actual IP address for physical devices

#### API Configuration
```typescript
// mobile/src/config/api.ts
const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000',
  android: __DEV__ 
    ? 'http://10.0.2.2:3000'  // Emulator
    : 'https://api.safenest.app',  // Production
});
```

#### Permissions (Android Manifest)
```xml
<!-- Required permissions in AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### Google Play Services
- Required for: Google Sign-In, Google Maps
- Add to `app/build.gradle`:
```gradle
implementation 'com.google.android.gms:play-services-auth:20.7.0'
implementation 'com.google.android.gms:play-services-maps:18.2.0'
```

#### Signing Config (Release Builds)
```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore safenest-release.keystore \
  -alias safenest-key \
  -keyalg RSA -keysize 2048 -validity 10000

# Add to gradle.properties
SAFENEST_RELEASE_STORE_FILE=safenest-release.keystore
SAFENEST_RELEASE_KEY_ALIAS=safenest-key
SAFENEST_RELEASE_STORE_PASSWORD=your_store_password
SAFENEST_RELEASE_KEY_PASSWORD=your_key_password
```

### Performance Optimization

#### Enable Hermes (Already Enabled)
- Faster startup time
- Reduced memory usage
- Smaller app size

#### ProGuard/R8 (Release Builds)
- Code shrinking
- Obfuscation
- Optimization
- Already enabled: `enableProguardInReleaseBuilds = true`

#### Split APKs by Architecture
```gradle
// In app/build.gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk false
        }
    }
}
```

### Testing (Detox E2E)

#### Android Detox Configuration
```bash
# Run E2E tests on Android
cd mobile
JAVA_HOME=/path/to/java npx detox test --configuration android.emu.debug
```

#### Debug Configuration (from .detoxrc.js)
```javascript
{
  type: 'android.emulator',
  device: { avdName: 'Pixel_7_Pro_API_34' },
  binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk'
}
```

## Common Android Issues & Solutions

### Gradle Sync Issues
```bash
cd mobile/android
./gradlew clean
./gradlew --stop
rm -rf .gradle
./gradlew build
```

### Metro Bundler Connection
```bash
# Reverse port for Android emulator
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

### Missing Dependencies
```bash
# Install all required tools
brew install watchman
brew install --cask android-studio
# Set ANDROID_HOME in ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Build Errors
1. **OutOfMemoryError**: Increase Gradle heap in `gradle.properties`
2. **NDK not found**: Install NDK in Android Studio SDK Manager
3. **Build Tools not found**: Install build tools 34.0.0
4. **Kotlin version mismatch**: Use kotlin 1.9.24

## Android Release Checklist

### Pre-Release
- [ ] Update version in `app/build.gradle` (versionCode, versionName)
- [ ] Test on multiple Android versions (API 24-34)
- [ ] Test on different screen sizes
- [ ] Verify ProGuard rules don't break functionality
- [ ] Check app size and optimize if needed
- [ ] Test Google Play Services integration

### Build Release
- [ ] Generate signed APK/AAB
- [ ] Test release build on device
- [ ] Verify all features work in release mode
- [ ] Check crash reporting (if integrated)

### Play Store
- [ ] Create app listing
- [ ] Upload screenshots (phone, tablet)
- [ ] Set content rating
- [ ] Configure pricing & distribution
- [ ] Upload AAB (not APK for new apps)
- [ ] Submit for review

## Android Studio Setup

### Recommended Plugins
- React Native Tools
- Kotlin
- Android Material Design Icon Generator

### SDK Components (Install via SDK Manager)
- Android SDK Platform 34, 35
- Android SDK Build-Tools 34.0.0
- Android Emulator
- Android SDK Platform-Tools
- Google Play Services
- Intel x86 Emulator Accelerator (HAXM) - Intel Macs
- Android Emulator Hypervisor Driver - M1/M2 Macs
