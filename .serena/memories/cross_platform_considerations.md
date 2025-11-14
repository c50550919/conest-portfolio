# Cross-Platform Development (iOS + Android)

## Platform Detection

### Using Platform API
```typescript
import { Platform } from 'react-native';

// Platform-specific values
const fontSize = Platform.select({
  ios: 16,
  android: 14,
});

// Platform-specific components
const Component = Platform.select({
  ios: () => require('./Component.ios').default,
  android: () => require('./Component.android').default,
})();

// Check platform
if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

### File Extensions for Platform-Specific Code
- `Component.ios.tsx` - iOS only
- `Component.android.tsx` - Android only
- `Component.native.tsx` - Both platforms (native)
- `Component.tsx` - Shared (used if no platform-specific file exists)

## API Base URL Configuration

### Environment-Aware URLs
```typescript
// mobile/src/config/api.ts
import { Platform } from 'react-native';

const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Development mode
    return Platform.select({
      ios: 'http://localhost:3000',
      android: 'http://10.0.2.2:3000',  // Android emulator host
    }) as string;
  }
  
  // Production mode (same for both platforms)
  return 'https://api.safenest.app';
};

export const API_BASE_URL = getApiBaseUrl();
```

### Testing on Physical Devices
```typescript
// Use your machine's IP address
const DEV_API_URL = Platform.select({
  ios: 'http://192.168.1.100:3000',      // Replace with your IP
  android: 'http://192.168.1.100:3000',  // Same IP for physical device
});
```

## Navigation Differences

### Safe Area Handling
```typescript
// iOS: Notch and home indicator
// Android: System bars and navigation gestures

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Use SafeAreaView for both platforms
<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
  {/* Content */}
</SafeAreaView>
```

### Back Button (Android Only)
```typescript
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      // Custom back button behavior
      return true; // Prevent default behavior
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [])
);
```

### Status Bar
```typescript
import { StatusBar, Platform } from 'react-native';

<StatusBar
  barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
  backgroundColor={Platform.OS === 'android' ? '#1a1a1a' : undefined}
/>
```

## Permissions

### Request Permissions (Both Platforms)
```typescript
import { Platform, PermissionsAndroid } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    const result = await request(PERMISSIONS.IOS.CAMERA);
    return result === RESULTS.GRANTED;
  }
};
```

### iOS: Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to verify your identity</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to upload profile pictures</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need location to show nearby housing options</string>
```

### Android: AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Authentication (OAuth)

### Google Sign-In
- **iOS**: Configured via Firebase/Google Developer Console
- **Android**: Requires SHA-1 fingerprint from keystore
  ```bash
  # Get debug SHA-1
  cd mobile/android
  ./gradlew signingReport
  ```

### Apple Sign-In
- **iOS**: Native support with `@invertase/react-native-apple-authentication`
- **Android**: Limited support (web-based flow only)

## Push Notifications

### Firebase Cloud Messaging (FCM)
- **iOS**: Requires APNs certificate + FCM configuration
- **Android**: FCM only (no additional setup)

### Platform-Specific Setup
```typescript
// iOS: Request permission
import messaging from '@react-native-firebase/messaging';

const requestPermission = async () => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
  }
  return true; // Android doesn't require runtime permission
};
```

## Maps

### react-native-maps
```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
  style={styles.map}
>
  <Marker coordinate={{ latitude: 37.78, longitude: -122.4 }} />
</MapView>
```

- **iOS**: Uses Apple Maps by default
- **Android**: Requires Google Maps API key in `AndroidManifest.xml`

## Styling Differences

### Platform-Specific Styles
```typescript
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
```

### Shadows
- **iOS**: Use shadow properties
- **Android**: Use `elevation` (Material Design)

### Typography
- **iOS**: San Francisco font
- **Android**: Roboto font
- **Custom Fonts**: Must be linked for both platforms

## Performance

### Hermes JavaScript Engine
- **iOS**: Opt-in (edit Podfile)
- **Android**: Enabled by default
- **Benefits**: Faster startup, lower memory usage

### Image Optimization
```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  style={styles.image}
  source={{
    uri: imageUrl,
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

## Testing

### Unit Tests (Same for Both)
```bash
npm test
```

### E2E Tests (Detox)
```bash
# iOS
npx detox test --configuration ios.sim.debug

# Android
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home \
npx detox test --configuration android.emu.debug
```

## Build & Release

### Version Management
- **iOS**: CFBundleShortVersionString (Info.plist)
- **Android**: versionName & versionCode (build.gradle)

### Code Signing
- **iOS**: Xcode automatic signing or manual certificates
- **Android**: Keystore file (`.keystore`)

### App Size
- **iOS**: Typically larger due to multiple architectures
- **Android**: Use App Bundle (.aab) for smaller downloads

## Debugging

### React Native Debugger
```bash
# Works for both platforms
npm install -g react-devtools
react-devtools
```

### Platform-Specific Debugging
- **iOS**: Xcode console, iOS simulator logs
- **Android**: Logcat, Android Studio logcat

### Metro Bundler
```bash
# Reset cache (both platforms)
npx react-native start --reset-cache
```

## Common Gotchas

### 1. Localhost vs 10.0.2.2
- Always use `10.0.2.2` for Android emulator
- Physical devices use machine's IP address

### 2. Third-Party Libraries
- Check library supports both iOS and Android
- Some libraries require native module linking
- Test on both platforms before committing

### 3. Async Storage
- Different storage locations on each platform
- Same API, different underlying implementation

### 4. Keyboard Handling
```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.container}
>
  {/* Content */}
</KeyboardAvoidingView>
```

### 5. Date/Time Formatting
- Use `moment.js` or `date-fns` for consistency
- Platform-specific locale handling

## Recommended Testing Matrix

### Minimum Test Coverage
- **iOS**: iPhone 13 (iOS 16), iPhone 17 Pro (iOS 26)
- **Android**: Pixel 7 (API 33), Pixel 7 Pro (API 34)

### Screen Sizes to Test
- **iOS**: iPhone SE, iPhone 17 Pro, iPad Air
- **Android**: Small (5"), Medium (6"), Large (6.5"), Tablet (10")

### OS Versions
- **iOS**: 16.0+ (current and previous major version)
- **Android**: API 24+ (Android 7.0 through 14)
