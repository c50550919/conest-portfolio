/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * useContextualPrompts Hook
 *
 * Manages progressive profile completion prompts based on user behavior.
 *
 * Trigger logic:
 * - First profile detail view → schedule prompt
 * - Compatibility score tap → parenting prompt
 * - 3rd session → bio prompt
 * - 5th session → children prompt
 *
 * Prompts stop after 3 dismissals or completion.
 */

import { useState, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import promptStateService, { PromptType } from '../services/promptStateService';
import profileAPI from '../services/api/profileAPI';

interface UseContextualPromptsReturn {
  activePrompt: PromptType | null;
  showPrompt: (type: PromptType) => Promise<void>;
  dismissPrompt: () => Promise<void>;
  completePrompt: (data: Record<string, unknown>) => Promise<void>;
}

export function useContextualPrompts(): UseContextualPromptsReturn {
  const [activePrompt, setActivePrompt] = useState<PromptType | null>(null);

  // Track session count on app foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        promptStateService.incrementSessionCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    // Count initial session
    promptStateService.incrementSessionCount();

    return () => {
      subscription.remove();
    };
  }, []);

  const showPrompt = useCallback(async (type: PromptType) => {
    const shouldShow = await promptStateService.shouldShowPrompt(type);
    if (shouldShow) {
      setActivePrompt(type);
    }
  }, []);

  const dismissPrompt = useCallback(async () => {
    if (activePrompt) {
      await promptStateService.updatePromptDismissal(activePrompt);
      setActivePrompt(null);
    }
  }, [activePrompt]);

  const completePrompt = useCallback(async (data: Record<string, unknown>) => {
    if (!activePrompt) return;

    await profileAPI.updateProgressiveProfile(data);
    await promptStateService.markPromptCompleted(activePrompt);
    setActivePrompt(null);
  }, [activePrompt]);

  return {
    activePrompt,
    showPrompt,
    dismissPrompt,
    completePrompt,
  };
}

/**
 * Session-based prompt triggers.
 * Call from AppNavigator or relevant screens.
 */
export async function checkSessionPrompts(
  showPrompt: (type: PromptType) => Promise<void>,
): Promise<void> {
  const sessionCount = await promptStateService.getSessionCount();

  if (sessionCount >= 5) {
    await showPrompt('children');
  } else if (sessionCount >= 3) {
    await showPrompt('bio');
  }
}

export default useContextualPrompts;
