/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './package.json';

// Disable LogBox in development to prevent UI overlays during E2E tests
// The warnings are still logged to console, just not displayed as overlays
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

AppRegistry.registerComponent(appName, () => App);
