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
