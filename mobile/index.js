/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './package.json';
import { mobilePushService } from './src/services/pushNotificationService';

// Register FCM background message handler before AppRegistry
// Must be called at module scope, outside any component lifecycle
mobilePushService.setupBackgroundHandler();

// Disable LogBox in development to prevent UI overlays during E2E tests
// The warnings are still logged to console, just not displayed as overlays
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

AppRegistry.registerComponent(appName, () => App);
