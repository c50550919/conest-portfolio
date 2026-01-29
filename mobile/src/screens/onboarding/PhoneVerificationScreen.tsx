/**
 * Phone Verification Screen (Onboarding)
 *
 * Purpose: Wraps the verification PhoneVerificationScreen for onboarding flow
 * Constitution: Principle II (Secure verification)
 *
 * This wrapper ensures the onboarding flow navigates to ProfileSetup
 * after successful phone verification instead of going back.
 */

import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { PhoneVerificationScreen as RealPhoneVerification } from '../verification/PhoneVerificationScreen';

type Props = StackScreenProps<OnboardingStackParamList, 'PhoneVerification'>;

const OnboardingPhoneVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  // Success handler navigates to ProfileSetup instead of goBack
  const handleSuccess = () => {
    navigation.navigate('ProfileSetup');
  };

  return (
    <RealPhoneVerification
      navigation={navigation as any}
      route={
        {
          ...route,
          params: { phoneNumber: route.params?.phoneNumber },
        } as any
      }
      onSuccess={handleSuccess}
    />
  );
};

export default OnboardingPhoneVerificationScreen;
