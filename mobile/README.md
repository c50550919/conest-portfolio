# CoNest Mobile App

React Native mobile application for the CoNest/SafeNest platform - helping single parents find safe, verified, and compatible roommates for shared housing.

## Project Structure

```
mobile/
├── App.tsx                 # Root component with providers
├── src/
│   ├── components/        # Reusable UI components
│   │   └── common/       # Core components (SafetyBadge, CompatibilityScore, etc.)
│   ├── screens/          # App screens
│   │   ├── onboarding/   # Onboarding flow screens
│   │   └── main/         # Main app screens
│   ├── navigation/       # React Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── OnboardingNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── services/         # API and external services
│   │   └── api.ts        # Axios API client
│   ├── store/            # Redux state management
│   │   ├── index.ts      # Store configuration
│   │   └── slices/       # Redux Toolkit slices
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions and constants
│   └── theme/            # Design system (colors, typography, spacing)
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
└── package.json          # Dependencies and scripts
```

## Core Components

### SafetyBadge
Shows verification status with color-coded badges:
- ID Verification
- Background Check
- Phone/Email Verification
- Income Verification

### CompatibilityScore
Circular progress indicator displaying match percentage:
- Color gradient: Red (low) → Yellow (medium) → Green (high)
- Interactive breakdown on tap
- Great Match: 70%+, Good Match: 40-69%, Fair Match: <40%

### ParentCard
Profile card for potential matches featuring:
- Profile photo (80px circle)
- Name and location
- Verification badges
- Children count (NO specific details - parent profiles only)
- Work schedule chip
- Compatibility score
- Message/View buttons

### TrustIndicator
Trust metrics display:
- Days since verification
- Number of references
- Response rate (color-coded)
- Account age

## Navigation Structure

### Onboarding Flow
1. Welcome → Safety explanation
2. Phone verification
3. Profile setup
4. Children info (count/age ranges only - NO names or photos)
5. Work schedule
6. Housing preferences
7. ID upload
8. Background check consent

### Main App (Bottom Tabs)
- Home: Dashboard and activity feed
- Discover: Swipeable match cards
- Messages: Encrypted messaging
- Household: Expense tracking and management
- Profile: User settings and verification

## State Management

### Redux Slices
- **auth**: Authentication state and tokens
- **user**: User profile (parent data only)
- **matches**: Compatibility matches
- **messages**: Conversations and unread counts
- **household**: Household management

### React Query
Used for API caching and data synchronization:
- 5-minute stale time
- 10-minute cache time
- Automatic refetch on focus

## Design System

### Color Palette
- Primary: `#2ECC71` - Trust green (safety, growth)
- Secondary: `#3498DB` - Calm blue (stability)
- Tertiary: `#F39C12` - Warm amber (home)
- Error: `#E74C3C` - Alert red
- Success: `#27AE60` - Verified green
- Background: `#FAFBFC` - Soft gray

### Typography
- Base size: 16px
- Line height: 1.5
- Font: Inter/System Font
- Headers: Bold
- Body: Regular
- Small: Light

### Spacing System
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Animations
- Duration: 200-300ms for micro-interactions
- Easing: EaseInOut for smooth feel
- Lottie for complex animations
- React Native Reanimated for gestures

## Safety & Privacy

### CRITICAL SAFETY RULES
1. **NO child data storage** - Only parent profiles
2. Never display child names, photos, or specific details
3. Mandatory verification for all users
4. End-to-end encryption for messages
5. Parent-only platform - children never interact

### Verification Requirements
- Government ID verification (Jumio)
- Background checks (Checkr API)
- Phone/email verification
- Optional income verification

## Installation & Setup

### Prerequisites
- Node.js 16+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

### Install Dependencies
```bash
npm install
```

### iOS Setup
```bash
cd ios && pod install && cd ..
npm run ios
```

### Android Setup
```bash
npm run android
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
```
REACT_APP_API_URL=http://localhost:3000/api
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
SOCKET_URL=http://localhost:3000
```

## Available Scripts

- `npm start` - Start Metro bundler
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run pod-install` - Install iOS dependencies
- `npm run clean` - Clean build artifacts

## API Integration

The app connects to the Node.js backend at `http://localhost:3000/api` (configurable via environment variables).

### Key Endpoints
- `/auth/*` - Authentication and registration
- `/parents/*` - Parent profile management
- `/matches/*` - Compatibility matching
- `/messages/*` - Encrypted messaging
- `/verification/*` - ID and background checks
- `/household/*` - Household management

## Accessibility

- Minimum contrast ratio: 4.5:1
- Touch targets: 44x44pt minimum
- Screen reader labels on all interactive elements
- Font scaling support up to 200%
- Keyboard navigation support

## Performance Targets

- Load time: <3s on 3G, <1s on WiFi
- Bundle size: <500KB initial, <2MB total
- 60fps animations
- Optimistic UI updates

## Next Steps

1. Implement full onboarding screens with forms
2. Build Discovery screen with swipeable cards
3. Add encrypted messaging with Socket.io
4. Integrate Stripe for payment processing
5. Implement ID verification with Jumio
6. Add background check integration with Checkr
7. Build household expense management
8. Add push notifications
9. Implement biometric authentication
10. Add analytics and error tracking

## Contributing

All contributions must adhere to safety principles:
- Never store or display child data
- Maintain privacy-first approach
- Ensure all code passes verification requirements

## License

Proprietary - CoNest Platform
