/**
 * SubscriptionScreen Tests
 *
 * CRITICAL TESTS - Revenue Generation Feature
 *
 * Key Test Areas:
 * 1. Loading state
 * 2. Premium features display
 * 3. Subscribe button functionality
 * 4. Restore purchases
 * 5. Active subscription status
 * 6. Manage subscription
 * 7. Legal notices
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, style, ...props }: { name: string; style?: any; [key: string]: unknown }) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'safe-area-view', ...props }, children);
  },
}));

// Mock billing service - use object that can be mutated
const mockBillingService = {
  initConnection: jest.fn(),
  getSubscriptions: jest.fn(),
  checkSubscriptionStatus: jest.fn(),
  purchaseSubscription: jest.fn(),
  restorePurchases: jest.fn(),
};

jest.mock('../../../src/services/billing/GooglePlayBillingService', () => {
  // Return getter functions that always access the current mock
  return {
    __esModule: true,
    default: {
      get initConnection() { return mockBillingService.initConnection; },
      get getSubscriptions() { return mockBillingService.getSubscriptions; },
      get checkSubscriptionStatus() { return mockBillingService.checkSubscriptionStatus; },
      get purchaseSubscription() { return mockBillingService.purchaseSubscription; },
      get restorePurchases() { return mockBillingService.restorePurchases; },
    },
    PRODUCT_SKUS: {
      PREMIUM_MONTHLY: 'conest_premium_monthly',
    },
  };
});

import SubscriptionScreen from '../../../src/screens/subscription/SubscriptionScreen';

describe('SubscriptionScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');

    // Reset mock implementations
    mockBillingService.initConnection.mockResolvedValue(true);
    mockBillingService.getSubscriptions.mockResolvedValue([
      {
        productId: 'conest_premium_monthly',
        localizedPrice: '$4.99',
        title: 'CoNest Premium',
        description: 'Monthly premium subscription',
      },
    ]);
    mockBillingService.checkSubscriptionStatus.mockResolvedValue({
      isActive: false,
      productId: null,
      expiresAt: null,
      autoRenewing: false,
    });
    mockBillingService.purchaseSubscription.mockResolvedValue({ success: true });
    mockBillingService.restorePurchases.mockResolvedValue([]);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const renderScreen = () => {
    return render(<SubscriptionScreen />);
  };

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should transition from loading to loaded state', async () => {
      const { getByText } = renderScreen();

      // Mocks resolve immediately, so we should see the loaded content
      await waitFor(() => {
        expect(getByText('CoNest Premium')).toBeTruthy();
      });
    });

    it('should call billing service on mount', async () => {
      renderScreen();

      // Mocks are called synchronously during useEffect
      await waitFor(() => {
        expect(mockBillingService.initConnection).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should fetch subscriptions on mount', async () => {
      renderScreen();

      await waitFor(() => {
        expect(mockBillingService.getSubscriptions).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should check subscription status on mount', async () => {
      renderScreen();

      await waitFor(() => {
        expect(mockBillingService.checkSubscriptionStatus).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  // ===========================================================================
  // HEADER AND BRANDING TESTS
  // ===========================================================================

  describe('Header and Branding', () => {
    it('should display premium crown icon', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-crown-outline')).toBeTruthy();
      });
    });

    it('should display CoNest Premium title', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('CoNest Premium')).toBeTruthy();
      });
    });

    it('should display subtitle', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Find your perfect roommate faster')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PRICING DISPLAY TESTS
  // ===========================================================================

  describe('Pricing Display', () => {
    it('should display subscription price', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('$4.99')).toBeTruthy();
      });
    });

    it('should display price period', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('per month')).toBeTruthy();
      });
    });

    it('should display cancel anytime notice', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Cancel anytime')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PREMIUM FEATURES TESTS
  // ===========================================================================

  describe('Premium Features', () => {
    it('should display premium features section title', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Premium Features')).toBeTruthy();
      });
    });

    it('should display Unlimited Profile Views feature', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Unlimited Profile Views')).toBeTruthy();
      });
    });

    it('should display Advanced Filters feature', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Advanced Filters')).toBeTruthy();
      });
    });

    it('should display Priority Support feature', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Priority Support')).toBeTruthy();
      });
    });

    it('should display Read Receipts feature', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Read Receipts')).toBeTruthy();
      });
    });

    it('should display Extended Visibility feature', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Extended Visibility')).toBeTruthy();
      });
    });

    it('should display feature descriptions', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Browse as many profiles as you want without restrictions')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // SUBSCRIBE BUTTON TESTS
  // ===========================================================================

  describe('Subscribe Button', () => {
    it('should display subscribe button when not subscribed', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Subscribe Now')).toBeTruthy();
      });
    });

    it('should call purchase subscription on subscribe press', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Subscribe Now')).toBeTruthy();
      });

      fireEvent.press(getByText('Subscribe Now'));

      await waitFor(() => {
        expect(mockBillingService.purchaseSubscription).toHaveBeenCalledWith(
          'conest_premium_monthly'
        );
      }, { timeout: 3000 });
    });

    it('should show success alert on successful purchase', async () => {
      mockBillingService.purchaseSubscription.mockResolvedValue({ success: true });
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Subscribe Now')).toBeTruthy();
      });

      fireEvent.press(getByText('Subscribe Now'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success!',
          expect.stringContaining('subscription is now active'),
          expect.any(Array)
        );
      }, { timeout: 3000 });
    });

    it('should show error alert on failed purchase', async () => {
      mockBillingService.purchaseSubscription.mockResolvedValue({
        success: false,
        error: 'Payment failed',
      });
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Subscribe Now')).toBeTruthy();
      });

      fireEvent.press(getByText('Subscribe Now'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Purchase Failed',
          expect.any(String)
        );
      }, { timeout: 3000 });
    });
  });

  // ===========================================================================
  // RESTORE PURCHASES TESTS
  // ===========================================================================

  describe('Restore Purchases', () => {
    it('should display restore purchases button', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Restore Purchases')).toBeTruthy();
      });
    });

    it('should call restore purchases on button press', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(getByText('Restore Purchases'));

      await waitFor(() => {
        expect(mockBillingService.restorePurchases).toHaveBeenCalled();
      });
    });

    it('should show success alert when purchases restored', async () => {
      mockBillingService.restorePurchases.mockResolvedValue([
        { productId: 'conest_premium_monthly' },
      ]);
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(getByText('Restore Purchases'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('restored')
        );
      });
    });

    it('should show no purchases found alert when empty', async () => {
      mockBillingService.restorePurchases.mockResolvedValue([]);
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(getByText('Restore Purchases'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'No Purchases Found',
          expect.any(String)
        );
      });
    });
  });

  // ===========================================================================
  // ACTIVE SUBSCRIPTION TESTS
  // ===========================================================================

  describe('Active Subscription', () => {
    beforeEach(() => {
      mockBillingService.checkSubscriptionStatus.mockResolvedValue({
        isActive: true,
        productId: 'conest_premium_monthly',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenewing: true,
      });
    });

    it('should show premium member status when subscribed', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText("You're a Premium Member!")).toBeTruthy();
      });
    });

    it('should show subscription status description', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Your subscription is active and auto-renewing')).toBeTruthy();
      });
    });

    it('should show renewal date', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText(/Renews on/)).toBeTruthy();
      });
    });

    it('should show manage subscription button when subscribed', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Manage Subscription')).toBeTruthy();
      });
    });

    it('should NOT show subscribe button when already subscribed', async () => {
      const { queryByText } = renderScreen();

      await waitFor(() => {
        expect(queryByText('Subscribe Now')).toBeNull();
      });
    });

    it('should show check circle icon for active subscription', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-check-circle')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // MANAGE SUBSCRIPTION TESTS
  // ===========================================================================

  describe('Manage Subscription', () => {
    beforeEach(() => {
      mockBillingService.checkSubscriptionStatus.mockResolvedValue({
        isActive: true,
        productId: 'conest_premium_monthly',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenewing: true,
      });
    });

    it('should show manage subscription dialog on button press', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Manage Subscription')).toBeTruthy();
      });

      fireEvent.press(getByText('Manage Subscription'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Manage Subscription',
        expect.stringContaining('Google Play Store'),
        expect.any(Array)
      );
    });
  });

  // ===========================================================================
  // LEGAL NOTICES TESTS
  // ===========================================================================

  describe('Legal Notices', () => {
    it('should display terms of service notice', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText(/Terms of Service/)).toBeTruthy();
      });
    });

    it('should display privacy policy notice', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText(/Privacy Policy/)).toBeTruthy();
      });
    });

    it('should display auto-renewal notice', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText(/automatically renews/)).toBeTruthy();
      });
    });

    it('should display cancellation notice', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText(/cancelled at least 24 hours/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show error alert when billing initialization fails', async () => {
      mockBillingService.initConnection.mockRejectedValue(new Error('Connection failed'));
      renderScreen();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to load subscription information')
        );
      });
    });

    it('should show error alert when purchase throws exception', async () => {
      mockBillingService.purchaseSubscription.mockRejectedValue(new Error('Network error'));
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Subscribe Now')).toBeTruthy();
      });

      fireEvent.press(getByText('Subscribe Now'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('unexpected error')
        );
      });
    });

    it('should show error alert when restore fails', async () => {
      mockBillingService.restorePurchases.mockRejectedValue(new Error('Restore failed'));
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(getByText('Restore Purchases'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to restore')
        );
      });
    });
  });

  // ===========================================================================
  // ICON TESTS
  // ===========================================================================

  describe('Icons', () => {
    it('should render crown icon in header', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-crown-outline')).toBeTruthy();
      });
    });

    it('should render eye icon for profile views feature', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-eye-outline')).toBeTruthy();
      });
    });

    it('should render filter icon for advanced filters feature', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-filter-variant')).toBeTruthy();
      });
    });

    it('should render star icon for priority support feature', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('icon-star-outline')).toBeTruthy();
      });
    });
  });
});
