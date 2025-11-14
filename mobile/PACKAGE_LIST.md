# SafeNest Mobile - Complete Package List

## Production Dependencies (39 packages)

### Core Framework (3 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.2.0 | React framework |
| `react-native` | 0.74.5 | React Native core |
| `babel-plugin-module-resolver` | ^5.0.0 | Module path resolution |

### Navigation & Routing (4 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@react-navigation/native` | ^6.1.9 | Navigation foundation |
| `@react-navigation/stack` | ^6.3.20 | Stack navigation |
| `@react-navigation/bottom-tabs` | ^6.5.11 | Bottom tab navigation |
| `react-native-screens` | ^3.29.0 | Native screen optimization |

### UI Components & Libraries (9 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@gorhom/bottom-sheet` | ^5.2.6 | Modal bottom sheets |
| `react-native-paper` | ^5.12.5 | Material Design components |
| `react-native-vector-icons` | ^10.3.0 | Icon library (MaterialIcons, etc) |
| `react-native-svg` | ^14.1.0 | SVG rendering |
| `lottie-react-native` | ^6.5.1 | Lottie animations |
| `react-native-linear-gradient` | ^2.8.3 | Gradient backgrounds |
| `@react-native-community/slider` | ^5.0.1 | Slider input |
| `@react-native-community/datetimepicker` | ^8.4.5 | Date/time picker |
| `react-native-deck-swiper` | ^2.0.19 | Swipeable cards |

### Gesture & Interaction (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-gesture-handler` | ~2.16.0 | Touch gesture handling |
| `react-native-keyboard-controller` | ^1.18.6 | Keyboard management |

### Forms & Validation (3 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.64.0 | Form state management |
| `@hookform/resolvers` | ^5.2.2 | Validation resolvers |
| `yup` | ^1.7.1 | Schema validation |

### State Management (4 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@reduxjs/toolkit` | ^1.9.7 | Redux state management |
| `react-redux` | ^8.1.3 | Redux React bindings |
| `@tanstack/react-query` | ^5.17.19 | Server state management |
| `@react-native-async-storage/async-storage` | ^1.21.0 | Local storage |

### Authentication (3 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@invertase/react-native-apple-authentication` | ^2.4.1 | Apple Sign In |
| `@react-native-google-signin/google-signin` | ^16.0.0 | Google Sign In |
| `react-native-biometrics` | ^3.0.1 | Face ID / Touch ID |

### Security & Encryption (3 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-keychain` | ^8.2.0 | Secure credential storage |
| `react-native-aes-crypto` | ^3.2.1 | AES encryption |
| `react-native-screenshot-detector` | ^1.0.0 | Screenshot detection |

### Payments (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@stripe/stripe-react-native` | ^0.37.2 | Stripe payment processing |
| `react-native-iap` | ^12.16.4 | In-app purchases (Apple/Google) |

### Media & Assets (3 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-image-picker` | ^7.1.0 | Camera & photo library access |
| `react-native-fast-image` | ^8.6.3 | Optimized image loading/caching |
| `react-native-document-picker` | ^9.1.1 | File picker |

### Communication (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-gifted-chat` | ^2.8.1 | Chat UI components |
| `socket.io-client` | ^4.7.2 | Real-time WebSocket communication |

### Location & Maps (1 package)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-maps` | 1.10.0 | Map integration (Apple Maps/Google Maps) |

### Utilities (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.6.5 | HTTP client |
| `@react-native-community/netinfo` | ^11.4.1 | Network connectivity detection |

### Environment (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-dotenv` | ^3.4.10 | Environment variable management |
| `react-native-safe-area-context` | ^4.8.2 | Safe area handling (notch, etc) |

---

## Development Dependencies (18 packages)

### Build & Compilation (8 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@babel/core` | ^7.23.7 | Babel compiler core |
| `@babel/preset-env` | ^7.23.8 | Babel environment preset |
| `@babel/runtime` | ^7.23.8 | Babel runtime helpers |
| `@react-native/babel-preset` | 0.74.87 | RN Babel configuration |
| `@react-native/metro-config` | 0.74.87 | Metro bundler config |
| `metro-react-native-babel-preset` | 0.77.0 | Metro Babel preset |
| `@react-native/typescript-config` | 0.74.87 | TypeScript configuration |
| `typescript` | ^5.3.3 | TypeScript compiler |

### Testing (6 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Test runner |
| `babel-jest` | ^29.7.0 | Babel Jest transformer |
| `@testing-library/react-native` | ^13.3.3 | React Native testing utilities |
| `@testing-library/jest-native` | ^5.4.3 | Jest Native matchers |
| `react-test-renderer` | 18.2.0 | React test renderer |
| `detox` | ^20.43.0 | E2E testing framework |

### Linting & Code Quality (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^8.56.0 | JavaScript/TypeScript linter |
| `@react-native/eslint-config` | 0.74.87 | RN ESLint rules |

### Type Definitions (2 packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/react` | ^18.2.45 | React TypeScript types |
| `@types/react-redux` | ^7.1.33 | Redux TypeScript types |

---

## Summary Statistics

### Production
- **Total Packages**: 39
- **Total Size**: ~250 MB (node_modules)
- **iOS Native Pods**: 231
- **Android Dependencies**: ~180

### Development
- **Total Packages**: 18
- **Used For**: Build, test, lint only
- **Not Included in App**: Dev deps excluded from production bundle

### Bundle Size Impact
- **JavaScript Bundle**: ~2-3 MB (minified)
- **iOS IPA**: ~80-120 MB (with native frameworks)
- **Android APK**: ~60-90 MB (with native libraries)

---

## Dependency Analysis

### Heavy Dependencies (10+ transitive deps)
1. **react-native** → ~120 iOS pods (Hermes, Fabric, Yoga, C++ libs)
2. **@react-native-google-signin/google-signin** → ~15 pods (Google SDK stack)
3. **@stripe/stripe-react-native** → ~10 pods (Stripe SDK)
4. **react-native-maps** → ~5 pods (MapKit wrappers)

### Lightweight Dependencies (<3 transitive deps)
- `react-native-vector-icons` → 1 pod
- `lottie-react-native` → 2 pods
- `react-native-aes-crypto` → 1 pod
- Most utility libraries → 1-2 pods each

### Potential Optimization Targets
If bundle size becomes an issue, consider:
1. **Replace `react-native-paper`** with custom components (saves ~2 MB)
2. **Remove `react-native-deck-swiper`** if not using swipe UI (saves ~500 KB)
3. **Lazy load `react-native-maps`** (saves ~8 MB if not immediately needed)
4. **Remove unused icon sets** from `react-native-vector-icons` (saves ~1-2 MB)

---

## Version Compatibility

### React Native Version: 0.74.5
- **Node**: 18.20.8 (recommended 18.x)
- **Xcode**: 15.4+ (stable), avoid 26.x beta
- **Java**: 17 (for Android builds)
- **Ruby**: 2.6+ (for CocoaPods)
- **CocoaPods**: 1.12+ (for iOS)

### All packages verified compatible with RN 0.74.5 ✅

---

## Security Considerations

### Packages with Native Code (Audit Priority)
- Authentication: Apple/Google sign-in libraries
- Biometrics: Face ID / Touch ID access
- Keychain: Secure storage
- Encryption: AES crypto
- Payments: Stripe, IAP
- Camera: Image picker
- Location: Maps

### Regular Update Schedule
- **Critical security patches**: Immediate
- **Minor updates**: Monthly review
- **Major version upgrades**: Quarterly planning
