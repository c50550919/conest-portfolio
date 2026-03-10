/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { db } from '../config/database';

/**
 * PreQualificationResponse Model
 *
 * Feature: 003-complete-3-critical (Pre-Qualification Questions)
 * Constitution Principle I: Child Safety (background screening)
 * Constitution Principle III: Data privacy and security
 *
 * Purpose: Store pre-qualification responses before payment
 * Questions:
 * 1. sex_offender: "Are you a registered sex offender?"
 * 2. pending_charges: "Do you have any pending criminal charges?"
 *
 * CMP-06: Removed felony_conviction question per Fair Chance Housing laws.
 * 15+ jurisdictions restrict blanket felony questions in housing contexts.
 * Sex offender registry and pending charges are universally exempt from
 * ban-the-box protections. Felony history is assessed through the
 * background check with tiered classification (CMP-05).
 *
 * Responses: 'yes', 'no', 'prefer_not_to_say'
 *
 * Auto-Disqualification:
 * - 'yes' to sex_offender → Auto-reject, no payment allowed
 * - 'prefer_not_to_say' → Allowed, but may affect admin review
 */

export interface PreQualificationResponse {
  id: string;
  user_id: string;
  question_id: 'sex_offender' | 'pending_charges';
  response: 'yes' | 'no' | 'prefer_not_to_say';
  answered_at: Date;
}

export interface CreatePreQualificationResponseData {
  user_id: string;
  question_id: 'sex_offender' | 'pending_charges';
  response: 'yes' | 'no' | 'prefer_not_to_say';
}

export interface PreQualificationSummary {
  user_id: string;
  sex_offender: 'yes' | 'no' | 'prefer_not_to_say' | null;
  pending_charges: 'yes' | 'no' | 'prefer_not_to_say' | null;
  is_auto_disqualified: boolean;
  completed_at: Date | null;
  completion_percentage: number;
}

export const PreQualificationResponseModel = {
  /**
   * Create or update pre-qualification response
   * Upserts response (allows users to change their answers)
   *
   * @throws Error if sex_offender response is 'yes' (auto-disqualify)
   */
  async upsertResponse(
    data: CreatePreQualificationResponseData,
  ): Promise<PreQualificationResponse> {
    // CMP-06: Reject legacy felony_conviction question
    if ((data.question_id as string) === 'felony_conviction') {
      throw new Error(
        'FELONY_QUESTION_REMOVED: Use background check tiered classification instead',
      );
    }

    // Auto-disqualify sex offenders
    if (data.question_id === 'sex_offender' && data.response === 'yes') {
      throw new Error('SEX_OFFENDER_AUTO_DISQUALIFIED');
    }

    // Check if response already exists
    const existingResponse = await db('pre_qualification_responses')
      .where({
        user_id: data.user_id,
        question_id: data.question_id,
      })
      .first();

    if (existingResponse) {
      // Update existing response
      const [response] = await db('pre_qualification_responses')
        .where({
          user_id: data.user_id,
          question_id: data.question_id,
        })
        .update({
          response: data.response,
          answered_at: db.fn.now(),
        })
        .returning('*');

      return response;
    } else {
      // Insert new response
      const [response] = await db('pre_qualification_responses')
        .insert({
          user_id: data.user_id,
          question_id: data.question_id,
          response: data.response,
        })
        .returning('*');

      return response;
    }
  },

  /**
   * Get all responses for a user
   */
  async findByUserId(userId: string): Promise<PreQualificationResponse[]> {
    return await db('pre_qualification_responses')
      .where({ user_id: userId })
      .orderBy('answered_at', 'desc');
  },

  /**
   * Get a specific response for a user
   */
  async findByUserAndQuestion(
    userId: string,
    questionId: 'sex_offender' | 'pending_charges',
  ): Promise<PreQualificationResponse | undefined> {
    return await db('pre_qualification_responses')
      .where({ user_id: userId, question_id: questionId })
      .first();
  },

  /**
   * Get pre-qualification summary for a user
   * Returns all responses in a structured format with eligibility status
   */
  async getSummary(userId: string): Promise<PreQualificationSummary> {
    const responses = await this.findByUserId(userId);

    const summary: PreQualificationSummary = {
      user_id: userId,
      sex_offender: null,
      pending_charges: null,
      is_auto_disqualified: false,
      completed_at: null,
      completion_percentage: 0,
    };

    // CMP-06: Only 2 questions now (sex_offender + pending_charges)
    const TOTAL_QUESTIONS = 2;
    let answeredCount = 0;

    responses.forEach((response) => {
      if (response.question_id === 'sex_offender') {
        summary.sex_offender = response.response;
        answeredCount++;
      } else if (response.question_id === 'pending_charges') {
        summary.pending_charges = response.response;
        answeredCount++;
      }
      // Ignore legacy felony_conviction responses if they exist
    });

    // Auto-disqualify if sex offender is 'yes'
    summary.is_auto_disqualified = summary.sex_offender === 'yes';

    // Calculate completion percentage
    summary.completion_percentage = Math.floor((answeredCount / TOTAL_QUESTIONS) * 100);

    // Set completed_at if all questions answered
    if (answeredCount === TOTAL_QUESTIONS) {
      const latestResponse = responses.reduce((latest, current) =>
        new Date(current.answered_at) > new Date(latest.answered_at) ? current : latest,
      );
      summary.completed_at = latestResponse.answered_at;
    }

    return summary;
  },

  /**
   * Check if user has completed all pre-qualification questions
   */
  async hasCompletedPreQualification(userId: string): Promise<boolean> {
    const count = await db('pre_qualification_responses')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    // CMP-06: Only 2 questions now (sex_offender + pending_charges)
    return parseInt(count?.count as string) >= 2;
  },

  /**
   * Check if user is auto-disqualified (sex offender)
   */
  async isAutoDisqualified(userId: string): Promise<boolean> {
    const response = await this.findByUserAndQuestion(userId, 'sex_offender');
    return response?.response === 'yes';
  },

  /**
   * Delete all responses for a user
   * Used when user deletes account
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db('pre_qualification_responses').where({ user_id: userId }).delete();
  },

  /**
   * Get flagged users for admin review
   * Returns users who answered 'yes' to any question except sex_offender
   * (sex_offender 'yes' is auto-disqualified and blocked from payment)
   */
  async getFlaggedUsers(): Promise<
    {
      user_id: string;
      flagged_questions: string[];
      answered_at: Date;
    }[]
  > {
    const responses = await db('pre_qualification_responses')
      .where('response', 'yes')
      .whereNot('question_id', 'sex_offender')
      .select('user_id', 'question_id', 'answered_at')
      .orderBy('answered_at', 'desc');

    // Group by user_id
    const flaggedUsers: Map<
      string,
      {
        user_id: string;
        flagged_questions: string[];
        answered_at: Date;
      }
    > = new Map();

    responses.forEach((response) => {
      if (!flaggedUsers.has(response.user_id)) {
        flaggedUsers.set(response.user_id, {
          user_id: response.user_id,
          flagged_questions: [],
          answered_at: response.answered_at,
        });
      }

      const user = flaggedUsers.get(response.user_id)!;
      user.flagged_questions.push(response.question_id);

      // Keep the latest answered_at date
      if (new Date(response.answered_at) > new Date(user.answered_at)) {
        user.answered_at = response.answered_at;
      }
    });

    return Array.from(flaggedUsers.values());
  },

  /**
   * Get statistics for admin dashboard
   */
  async getStats(): Promise<{
    total_users_answered: number;
    completed_users: number;
    auto_disqualified_users: number;
    flagged_users: number;
    prefer_not_to_say_users: number;
  }> {
    const totalUsers = await db('pre_qualification_responses')
      .countDistinct('user_id as count')
      .first();

    const completedUsers = await db('pre_qualification_responses')
      .select('user_id')
      .groupBy('user_id')
      .having(db.raw('COUNT(*) = 3'))
      .count('* as count');

    const autoDisqualified = await db('pre_qualification_responses')
      .where({ question_id: 'sex_offender', response: 'yes' })
      .countDistinct('user_id as count')
      .first();

    const flagged = await db('pre_qualification_responses')
      .where('response', 'yes')
      .whereNot('question_id', 'sex_offender')
      .countDistinct('user_id as count')
      .first();

    const preferNotToSay = await db('pre_qualification_responses')
      .where({ response: 'prefer_not_to_say' })
      .countDistinct('user_id as count')
      .first();

    return {
      total_users_answered: parseInt(totalUsers?.count as string) || 0,
      completed_users: completedUsers.length,
      auto_disqualified_users: parseInt(autoDisqualified?.count as string) || 0,
      flagged_users: parseInt(flagged?.count as string) || 0,
      prefer_not_to_say_users: parseInt(preferNotToSay?.count as string) || 0,
    };
  },
};

/**
 * Model Relations:
 *
 * - belongsTo: User (via user_id)
 * - Used in conjunction with VerificationPayment and Verification models
 */
