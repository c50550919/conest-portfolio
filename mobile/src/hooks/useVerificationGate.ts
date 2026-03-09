/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * useVerificationGate Hook
 *
 * Checks verification state from Redux and gates actions behind
 * phone/ID/background check verification modals.
 *
 * Usage:
 *   const { withGate, gateModalProps } = useVerificationGate();
 *   // In handler: withGate('message', () => sendMessage());
 *   // In JSX: <VerificationGateModal {...gateModalProps} />
 */

import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GateType } from '../components/gates/VerificationGateModal';

type GatedAction = 'message' | 'connect' | 'household';

const ACTION_TO_GATE: Record<GatedAction, { check: 'phoneVerified' | 'idVerified' | 'backgroundCheckVerified'; gate: GateType }> = {
  message: { check: 'phoneVerified', gate: 'phone' },
  connect: { check: 'idVerified', gate: 'id' },
  household: { check: 'backgroundCheckVerified', gate: 'background' },
};

interface GateCheckResult {
  allowed: boolean;
  gateType?: GateType;
}

interface GateModalProps {
  visible: boolean;
  gateType: GateType;
  onVerify: () => void;
  onDismiss: () => void;
}

interface UseVerificationGateReturn {
  checkGate: (action: GatedAction) => GateCheckResult;
  withGate: (action: GatedAction, callback: () => void) => void;
  gateModalProps: GateModalProps;
}

export function useVerificationGate(): UseVerificationGateReturn {
  const user = useSelector((state: RootState) => state.auth.user);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentGateType, setCurrentGateType] = useState<GateType>('phone');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const checkGate = useCallback((action: GatedAction): GateCheckResult => {
    const config = ACTION_TO_GATE[action];
    if (!user) return { allowed: false, gateType: config.gate };

    const verified = user[config.check];
    if (verified) return { allowed: true };

    return { allowed: false, gateType: config.gate };
  }, [user]);

  const withGate = useCallback((action: GatedAction, callback: () => void) => {
    const result = checkGate(action);
    if (result.allowed) {
      callback();
    } else {
      setCurrentGateType(result.gateType!);
      setPendingCallback(() => callback);
      setModalVisible(true);
    }
  }, [checkGate]);

  const handleVerify = useCallback(() => {
    setModalVisible(false);
    // Navigation to verification screen will be handled by the screen
    // that renders VerificationGateModal based on gateType
  }, []);

  const handleDismiss = useCallback(() => {
    setModalVisible(false);
    setPendingCallback(null);
  }, []);

  const gateModalProps: GateModalProps = {
    visible: modalVisible,
    gateType: currentGateType,
    onVerify: handleVerify,
    onDismiss: handleDismiss,
  };

  return {
    checkGate,
    withGate,
    gateModalProps,
  };
}

/**
 * Get inline gate copy text for action buttons
 */
export function getGateCopyText(action: GatedAction, user: { phoneVerified?: boolean; idVerified?: boolean; backgroundCheckVerified?: boolean } | null): string | null {
  if (!user) return null;

  switch (action) {
    case 'message':
      return user.phoneVerified ? null : 'Verify phone to message \u2014 ~30s';
    case 'connect':
      return user.idVerified ? null : 'Verify ID to connect';
    case 'household':
      return user.backgroundCheckVerified ? null : 'Complete background check to join';
    default:
      return null;
  }
}

export default useVerificationGate;
