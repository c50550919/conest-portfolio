/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { db } from '../config/database';
import { encryptNote, decryptNote } from '../utils/encryption';

/**
 * SavedProfile Model
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * Constitution Principle I: NO child PII - only parent data
 * Constitution Principle III: Private notes encrypted at rest (AES-256-GCM)
 *
 * Entity: Bookmarked profiles for later review with folders and notes
 * - Maximum 50 saved profiles per user
 * - 4 predefined folders: Top Choice, Strong Maybe, Considering, Backup
 * - Optional private notes (encrypted, max 500 chars decrypted)
 */

export interface SavedProfile {
  id: string;
  user_id: string;
  profile_id: string;
  folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup';
  notes_encrypted: string | null;
  notes_iv: string | null;
  saved_at: Date;
}

export interface CreateSavedProfileData {
  user_id: string;
  profile_id: string;
  folder: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup';
  notes?: string; // Plaintext, will be encrypted
}

export interface SavedProfileWithProfile extends SavedProfile {
  profile: {
    user_id: string;
    first_name: string;
    age: number;
    city: string;
    state: string;
    verification_score: number;
    compatibility_score?: number;
  };
}

export const SavedProfileModel = {
  /**
   * Create a new saved profile
   * Encrypts notes if provided
   * @throws Error if user tries to save own profile or exceeds 50-profile limit
   */
  async create(data: CreateSavedProfileData): Promise<SavedProfile> {
    // Check 50-profile limit
    const count = await this.countByUserId(data.user_id);
    if (count >= 50) {
      throw new Error('SAVED_PROFILES_LIMIT_REACHED');
    }

    // Check not saving own profile
    if (data.user_id === data.profile_id) {
      throw new Error('CANNOT_SAVE_OWN_PROFILE');
    }

    // Encrypt notes if provided
    let notes_encrypted = null;
    let notes_iv = null;
    if (data.notes) {
      const encrypted = encryptNote(data.notes);
      notes_encrypted = encrypted.encrypted;
      notes_iv = encrypted.iv;
    }

    const [savedProfile] = (await db('saved_profiles')
      .insert({
        user_id: data.user_id,
        profile_id: data.profile_id,
        folder: data.folder,
        notes_encrypted,
        notes_iv,
      })
      .returning('*')) as SavedProfile[];

    return savedProfile;
  },

  /**
   * Find all saved profiles for a user, optionally filtered by folder
   * Returns profiles with decrypted notes
   */
  async findByUserId(
    userId: string,
    folder?: string,
  ): Promise<SavedProfileWithProfile[]> {
    const query = db('saved_profiles as sp')
      .join('users as u', 'sp.profile_id', 'u.id')
      .join('parents as p', 'u.id', 'p.user_id')
      .where('sp.user_id', userId)
      .select(
        'sp.*',
        'p.first_name',
        'p.date_of_birth',
        'p.city',
        'p.state',
      )
      .orderBy('sp.saved_at', 'desc');

    if (folder) {
      void query.where('sp.folder', folder);
    }

    const results = await query;

    // Decrypt notes for each profile
    return results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      folder: row.folder,
      notes_encrypted: row.notes_encrypted,
      notes_iv: row.notes_iv,
      saved_at: row.saved_at,
      profile: {
        user_id: row.profile_id,
        first_name: row.first_name,
        age: row.age,
        city: row.city,
        state: row.state,
        verification_score: row.verification_score || 0,
      },
    }));
  },

  /**
   * Get decrypted notes for a saved profile
   * Only returns notes if requester is the owner
   */
  async getDecryptedNotes(id: string, userId: string): Promise<string | null> {
    const savedProfile = await db('saved_profiles')
      .where({ id, user_id: userId })
      .first();

    if (!savedProfile) {
      return null;
    }

    if (!savedProfile.notes_encrypted || !savedProfile.notes_iv) {
      return null;
    }

    return decryptNote(savedProfile.notes_encrypted, savedProfile.notes_iv);
  },

  /**
   * Find saved profile by ID (for update/delete operations)
   */
  async findById(id: string): Promise<SavedProfile | undefined> {
    return await db('saved_profiles').where({ id }).first();
  },

  /**
   * Update folder or notes for a saved profile
   * Encrypts notes if provided
   */
  async update(
    id: string,
    userId: string,
    data: { folder?: string; notes?: string },
  ): Promise<SavedProfile> {
    const updateData: any = {};

    if (data.folder) {
      updateData.folder = data.folder;
    }

    if (data.notes !== undefined) {
      if (data.notes) {
        const encrypted = encryptNote(data.notes);
        updateData.notes_encrypted = encrypted.encrypted;
        updateData.notes_iv = encrypted.iv;
      } else {
        // Clear notes
        updateData.notes_encrypted = null;
        updateData.notes_iv = null;
      }
    }

    const [savedProfile] = (await db('saved_profiles')
      .where({ id, user_id: userId })
      .update(updateData)
      .returning('*')) as SavedProfile[];

    if (!savedProfile) {
      throw new Error('SAVED_PROFILE_NOT_FOUND');
    }

    return savedProfile;
  },

  /**
   * Delete a saved profile
   */
  async delete(id: string, userId: string): Promise<void> {
    const deleted = await db('saved_profiles')
      .where({ id, user_id: userId })
      .delete();

    if (deleted === 0) {
      throw new Error('SAVED_PROFILE_NOT_FOUND');
    }
  },

  /**
   * Get comparison data for 2-4 saved profiles
   * Returns profiles with decrypted notes for comparison view
   */
  async compareProfiles(
    userId: string,
    ids: string[],
  ): Promise<SavedProfileWithProfile[]> {
    if (ids.length < 2 || ids.length > 4) {
      throw new Error('INVALID_COMPARISON_COUNT');
    }

    const results = await db('saved_profiles as sp')
      .join('users as u', 'sp.profile_id', 'u.id')
      .join('parents as p', 'u.id', 'p.user_id')
      .where('sp.user_id', userId)
      .whereIn('sp.id', ids)
      .select(
        'sp.*',
        'p.first_name',
        'p.date_of_birth',
        'p.city',
        'p.state',
        'p.work_schedule',
        'p.parenting_style',
        'p.household_preferences',
        'p.budget_min',
        'p.budget_max',
      )
      .orderBy('sp.saved_at', 'desc');

    if (results.length !== ids.length) {
      throw new Error('SOME_PROFILES_NOT_FOUND');
    }

    return results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      folder: row.folder,
      notes_encrypted: row.notes_encrypted,
      notes_iv: row.notes_iv,
      saved_at: row.saved_at,
      profile: {
        user_id: row.profile_id,
        first_name: row.first_name,
        age: row.age,
        city: row.city,
        state: row.state,
        verification_score: row.verification_score || 0,
      },
    }));
  },

  /**
   * Count saved profiles for a user (for 50-profile limit check)
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db('saved_profiles')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    return parseInt(result?.count as string) || 0;
  },

  /**
   * Check if a profile is already saved by a user
   */
  async isSaved(userId: string, profileId: string): Promise<boolean> {
    const result = await db('saved_profiles')
      .where({ user_id: userId, profile_id: profileId })
      .first();

    return !!result;
  },
};
