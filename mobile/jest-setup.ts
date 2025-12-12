/**
 * Jest Setup for React Native
 *
 * Global test configuration and mocks for React Native environment.
 *
 * Constitution Principles:
 * - Principle II: 85% coverage (100% for discovery UI components)
 * - Principle V: TDD workflow enforcement
 */

// @testing-library/react-native v12.4+ includes built-in Jest matchers
// No need for separate @testing-library/jest-native import

// Mock axios for API client
jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    ...mockAxiosInstance,
  };
});

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    GestureHandlerRootView: View,
    Directions: {},
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('react-native-fast-image', () => ({
  __esModule: true,
  default: require('react-native/Libraries/Image/Image'),
  preload: jest.fn(),
  Priority: {
    low: 'low',
    normal: 'normal',
    high: 'high',
  },
  CacheControl: {
    immutable: 'immutable',
    web: 'web',
    cacheOnly: 'cacheOnly',
  },
}));

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    __esModule: true,
    default: View,
  };
});

// Mock react-native-signature-capture
jest.mock('react-native-signature-capture', () => {
  const React = require('react');
  const View = require('react-native/Libraries/Components/View/View');
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      resetImage: jest.fn(),
      saveImage: jest.fn(),
    }));
    return React.createElement(View, { testID: 'signature-capture', ...props });
  });
});

// Mock react-native-paper with MD3LightTheme
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity, Switch } = require('react-native');

  const MD3LightTheme = {
    dark: false,
    version: 3,
    isV3: true,
    colors: {
      primary: '#2E7D32',
      onPrimary: '#FFFFFF',
      primaryContainer: '#E8F8F2',
      onPrimaryContainer: '#1B5E20',
      secondary: '#00897B',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#B2DFDB',
      onSecondaryContainer: '#004D40',
      tertiary: '#5E35B1',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#EDE7F6',
      onTertiaryContainer: '#311B92',
      error: '#B71C1C',
      onError: '#FFFFFF',
      errorContainer: '#FFCDD2',
      onErrorContainer: '#B71C1C',
      background: '#FAFAFA',
      onBackground: '#212121',
      surface: '#FFFFFF',
      onSurface: '#212121',
      surfaceVariant: '#F5F5F5',
      onSurfaceVariant: '#757575',
      outline: '#BDBDBD',
      outlineVariant: '#E0E0E0',
      shadow: '#000000',
      scrim: '#000000',
      inverseSurface: '#303030',
      inverseOnSurface: '#F5F5F5',
      inversePrimary: '#81C784',
      elevation: {
        level0: 'transparent',
        level1: '#F5F5F5',
        level2: '#EEEEEE',
        level3: '#E0E0E0',
        level4: '#BDBDBD',
        level5: '#9E9E9E',
      },
      surfaceDisabled: 'rgba(0, 0, 0, 0.12)',
      onSurfaceDisabled: 'rgba(0, 0, 0, 0.38)',
      backdrop: 'rgba(0, 0, 0, 0.5)',
    },
    fonts: {
      displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '400' },
      displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '400' },
      displaySmall: { fontFamily: 'System', fontSize: 36, fontWeight: '400' },
      headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '400' },
      headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '400' },
      headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '400' },
      titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '500' },
      titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '500' },
      titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '500' },
      labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '500' },
      labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' },
      labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' },
      bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' },
      bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
      bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' },
    },
    animation: { scale: 1.0 },
    roundness: 4,
  };

  return {
    MD3LightTheme,
    MD3DarkTheme: { ...MD3LightTheme, dark: true },
    Provider: ({ children }: any) => React.createElement(View, {}, children),
    PaperProvider: ({ children }: any) => React.createElement(View, {}, children),
    Button: ({ children, onPress, mode, testID, disabled, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID, disabled, accessibilityState: { disabled }, ...props },
        React.createElement(Text, {}, children)
      ),
    TextInput: ({ testID, label, value, onChangeText, error, ...props }: any) =>
      React.createElement(TextInput, { testID, value, onChangeText, placeholder: label, ...props }),
    Text: ({ children, ...props }: any) => React.createElement(Text, props, children),
    Card: ({ children, ...props }: any) => React.createElement(View, props, children),
    Surface: ({ children, ...props }: any) => React.createElement(View, props, children),
    Chip: ({ children, onPress, testID, ...props }: any) =>
      React.createElement(TouchableOpacity, { onPress, testID, ...props }, React.createElement(Text, {}, children)),
    IconButton: ({ icon, onPress, testID, ...props }: any) =>
      React.createElement(TouchableOpacity, { onPress, testID, ...props }, React.createElement(Text, {}, icon)),
    Switch: ({ value, onValueChange, testID, ...props }: any) =>
      React.createElement(Switch, { value, onValueChange, testID, ...props }),
    ProgressBar: ({ progress, testID, ...props }: any) =>
      React.createElement(View, { testID, ...props }),
    ActivityIndicator: ({ testID, ...props }: any) =>
      React.createElement(View, { testID, ...props }),
    Snackbar: ({ visible, children, testID, ...props }: any) =>
      visible ? React.createElement(View, { testID, ...props }, React.createElement(Text, {}, children)) : null,
    Modal: ({ visible, children, testID, ...props }: any) =>
      visible ? React.createElement(View, { testID, ...props }, children) : null,
    Portal: ({ children }: any) => React.createElement(View, {}, children),
    Divider: (props: any) => React.createElement(View, props),
    Avatar: {
      Image: ({ source, testID, ...props }: any) =>
        React.createElement(View, { testID, ...props }),
      Icon: ({ icon, testID, ...props }: any) =>
        React.createElement(View, { testID, ...props }),
      Text: ({ label, testID, ...props }: any) =>
        React.createElement(View, { testID, ...props }, React.createElement(Text, {}, label)),
    },
    List: {
      Item: ({ title, description, onPress, testID, ...props }: any) =>
        React.createElement(
          TouchableOpacity,
          { onPress, testID, ...props },
          React.createElement(Text, {}, title),
          description && React.createElement(Text, {}, description)
        ),
      Section: ({ title, children, ...props }: any) =>
        React.createElement(View, props, React.createElement(Text, {}, title), children),
      Icon: ({ icon, ...props }: any) => React.createElement(View, props),
    },
    FAB: ({ icon, onPress, testID, ...props }: any) =>
      React.createElement(TouchableOpacity, { onPress, testID, ...props }, React.createElement(Text, {}, icon)),
    Appbar: {
      Header: ({ children, ...props }: any) => React.createElement(View, props, children),
      BackAction: ({ onPress, testID, ...props }: any) =>
        React.createElement(TouchableOpacity, { onPress, testID, ...props }),
      Content: ({ title, ...props }: any) => React.createElement(Text, props, title),
      Action: ({ icon, onPress, testID, ...props }: any) =>
        React.createElement(TouchableOpacity, { onPress, testID, ...props }),
    },
    SegmentedButtons: ({ value, onValueChange, buttons, testID, ...props }: any) =>
      React.createElement(
        View,
        { testID, ...props },
        buttons?.map((btn: any, idx: number) =>
          React.createElement(
            TouchableOpacity,
            { key: idx, onPress: () => onValueChange(btn.value), testID: `${testID}-${btn.value}` },
            React.createElement(Text, {}, btn.label)
          )
        )
      ),
    useTheme: () => MD3LightTheme,
    withTheme: (Component: any) => Component,
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, testID, ...props }: { name: string; testID?: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: testID || `icon-${name}`, ...props }, name),
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, testID, ...props }: { name: string; testID?: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: testID || `ionicon-${name}`, ...props }, name),
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => {
      // Call immediately in tests
      callback();
    }),
    useIsFocused: () => true,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, {}, children),
    SafeAreaView: ({ children, ...props }: any) => React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock theme module to avoid circular dependency issues with react-native-paper
jest.mock('./src/theme', () => ({
  theme: {
    dark: false,
    version: 3,
    isV3: true,
    colors: {
      primary: '#2ECC71',
      onPrimary: '#FFFFFF',
      primaryContainer: '#E8F8F2',
      onPrimaryContainer: '#1A5C3A',
      secondary: '#3498DB',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#EBF5FB',
      onSecondaryContainer: '#1A4D70',
      tertiary: '#F39C12',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FEF5E7',
      onTertiaryContainer: '#7D5A29',
      error: '#E74C3C',
      onError: '#FFFFFF',
      errorContainer: '#FADBD8',
      onErrorContainer: '#7B241C',
      background: '#FAFBFC',
      onBackground: '#2C3E50',
      surface: '#FFFFFF',
      onSurface: '#5D6D7E',
      surfaceVariant: '#F5F7FA',
      onSurfaceVariant: '#5D6D7E',
      outline: '#D5D8DC',
      outlineVariant: '#E8EBF0',
    },
    fonts: {},
    roundness: 8,
    animation: { scale: 1.0 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  },
  colors: {
    primary: '#2ECC71',
    primaryLight: '#A9DFBF',
    primaryDark: '#1A5C3A',
    secondary: '#3498DB',
    secondaryLight: '#AED6F1',
    secondaryDark: '#1A4D70',
    tertiary: '#F39C12',
    tertiaryLight: '#FAD7A0',
    tertiaryDark: '#7D5A29',
    error: '#E74C3C',
    errorLight: '#FADBD8',
    errorDark: '#7B241C',
    success: '#27AE60',
    successLight: '#ABEBC6',
    successDark: '#145A32',
    warning: '#F39C12',
    warningLight: '#FEF5E7',
    warningDark: '#7D5A29',
    info: '#3498DB',
    infoLight: '#EBF5FB',
    infoDark: '#1B4F72',
    background: '#FAFBFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F7FA',
    text: { primary: '#2C3E50', secondary: '#5D6D7E', disabled: '#95A5A6', inverse: '#FFFFFF', hint: '#95A5A6' },
    border: { light: '#E8EBF0', medium: '#D5D8DC', dark: '#95A5A6' },
    overlay: { light: 'rgba(44, 62, 80, 0.1)', medium: 'rgba(44, 62, 80, 0.3)', dark: 'rgba(44, 62, 80, 0.5)' },
    shadow: 'rgba(0, 0, 0, 0.1)',
    verification: { verified: '#27AE60', partial: '#F39C12', unverified: '#95A5A6' },
    compatibility: { low: '#E74C3C', medium: '#F39C12', high: '#27AE60' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
  borderRadius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  iconSizes: { xs: 16, sm: 20, md: 24, lg: 32, xl: 48 },
  fontFamily: { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System' },
  animations: { timing: { fast: 150, normal: 300, slow: 500 } },
}));

// Suppress console methods in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:3000';
