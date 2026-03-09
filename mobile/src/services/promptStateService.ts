/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Prompt State Service
 * Manages contextual prompt dismissal/completion state via AsyncStorage.
 * Used for progressive profile completion prompts (schedule, parenting, bio, children).
 *
 * Rules:
 * - Prompt hidden after 3 dismissals OR completion
 * - State persists across sessions
 * - Session count tracked for prompt timing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'conest_prompt_state';

export type PromptType = 'schedule' | 'parenting' | 'bio' | 'children';

interface PromptRecord {
  dismissCount: number;
  lastShownAt: string | null;
  completed: boolean;
}

interface PromptState {
  prompts: Record<PromptType, PromptRecord>;
  sessionCount: number;
}

const DEFAULT_PROMPT_RECORD: PromptRecord = {
  dismissCount: 0,
  lastShownAt: null,
  completed: false,
};

const DEFAULT_STATE: PromptState = {
  prompts: {
    schedule: { ...DEFAULT_PROMPT_RECORD },
    parenting: { ...DEFAULT_PROMPT_RECORD },
    bio: { ...DEFAULT_PROMPT_RECORD },
    children: { ...DEFAULT_PROMPT_RECORD },
  },
  sessionCount: 0,
};

const MAX_DISMISSALS = 3;

async function getPromptState(): Promise<PromptState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(raw) as PromptState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function savePromptState(state: PromptState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function updatePromptDismissal(promptType: PromptType): Promise<void> {
  const state = await getPromptState();
  const record = state.prompts[promptType] || { ...DEFAULT_PROMPT_RECORD };
  record.dismissCount += 1;
  record.lastShownAt = new Date().toISOString();
  state.prompts[promptType] = record;
  await savePromptState(state);
}

async function markPromptCompleted(promptType: PromptType): Promise<void> {
  const state = await getPromptState();
  const record = state.prompts[promptType] || { ...DEFAULT_PROMPT_RECORD };
  record.completed = true;
  state.prompts[promptType] = record;
  await savePromptState(state);
}

async function shouldShowPrompt(promptType: PromptType): Promise<boolean> {
  const state = await getPromptState();
  const record = state.prompts[promptType];
  if (!record) return true;
  return record.dismissCount < MAX_DISMISSALS && !record.completed;
}

async function incrementSessionCount(): Promise<number> {
  const state = await getPromptState();
  state.sessionCount += 1;
  await savePromptState(state);
  return state.sessionCount;
}

async function getSessionCount(): Promise<number> {
  const state = await getPromptState();
  return state.sessionCount;
}

export const promptStateService = {
  getPromptState,
  updatePromptDismissal,
  markPromptCompleted,
  shouldShowPrompt,
  incrementSessionCount,
  getSessionCount,
};

export default promptStateService;
