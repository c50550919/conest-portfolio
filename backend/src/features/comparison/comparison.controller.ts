/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile Comparison Controller
 *
 * Purpose: Handle unified comparison requests for discovery and saved profiles
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Created: 2025-10-20
 */

import { Response } from 'express';
import { ProfileComparisonService } from './comparison.service';
import { compareProfilesSchema } from '../../validators/comparisonValidator';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';

const comparisonService = new ProfileComparisonService();

/**
 * POST /api/profiles/compare
 * Compare 2-4 profiles from mixed sources (discovery + saved)
 */
export const compareProfiles = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = compareProfilesSchema.parse(req.body);

    // Get requesting user ID from auth middleware
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Call comparison service
    const result = await comparisonService.compareProfiles(
      userId,
      validatedData.profiles,
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      // Check for known error messages
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error.message.includes('Unauthorized') || error.message.includes('authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }

      if (
        error.message.includes('Invalid') ||
        error.message.includes('Must compare')
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    console.error('[ComparisonController] Error comparing profiles:', error);
    res.status(500).json({ error: 'Failed to compare profiles' });
  }
};

/**
 * POST /api/compatibility/calculate
 * Calculate detailed 6-dimension compatibility breakdown between two profiles
 */
export const calculateCompatibility = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { profile1Id, profile2Id } = req.body;

    // Validate input
    if (!profile1Id || !profile2Id) {
      res.status(400).json({
        error: 'Both profile1Id and profile2Id are required',
      });
      return;
    }

    // Get requesting user ID from auth middleware
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Fetch profiles using comparison service (reuses existing data fetching logic)
    const comparisonResult = await comparisonService.compareProfiles(userId, [
      { type: 'discovery', id: profile1Id },
      { type: 'discovery', id: profile2Id },
    ]);

    if (!comparisonResult.data || comparisonResult.data.length !== 2) {
      res.status(400).json({
        error: 'Could not fetch both profiles for comparison',
      });
      return;
    }

    const profile1 = comparisonResult.data[0];
    const profile2 = comparisonResult.data[1];

    // Calculate 6-dimension compatibility breakdown
    const dimensions = [
      {
        dimension: 'Schedule Compatibility',
        score: calculateScheduleCompatibility(profile1, profile2),
        weight: 0.25,
        explanation: 'How well your daily routines and availability align',
        icon: 'clock-outline',
      },
      {
        dimension: 'Parenting Philosophy',
        score: calculateParentingCompatibility(profile1, profile2),
        weight: 0.2,
        explanation: 'Alignment in parenting styles and values',
        icon: 'heart-outline',
      },
      {
        dimension: 'Lifestyle Compatibility',
        score: calculateLifestyleCompatibility(profile1, profile2),
        weight: 0.2,
        explanation: 'Shared lifestyle preferences and habits',
        icon: 'home-outline',
      },
      {
        dimension: 'Location & Schools',
        score: calculateLocationCompatibility(profile1, profile2),
        weight: 0.15,
        explanation: 'Proximity to preferred locations and schools',
        icon: 'map-marker-outline',
      },
      {
        dimension: 'Budget Alignment',
        score: calculateBudgetCompatibility(profile1, profile2),
        weight: 0.1,
        explanation: 'Financial compatibility for shared housing',
        icon: 'currency-usd',
      },
      {
        dimension: 'House Rules Agreement',
        score: calculateHouseRulesCompatibility(profile1, profile2),
        weight: 0.1,
        explanation: 'Agreement on household rules and expectations',
        icon: 'clipboard-text-outline',
      },
    ];

    // Calculate overall weighted score
    const overallScore = dimensions.reduce(
      (sum, dim) => sum + dim.score * dim.weight,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        overallScore: Math.round(overallScore * 100) / 100,
        dimensions: dimensions.map((dim) => ({
          ...dim,
          score: Math.round(dim.score * 100) / 100,
        })),
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      '[ComparisonController] Error calculating compatibility:',
      error,
    );
    res.status(500).json({ error: 'Failed to calculate compatibility' });
  }
};

// Helper functions for dimension calculations
function calculateScheduleCompatibility(profile1: any, profile2: any): number {
  // Simplified algorithm - in production, this would analyze actual schedule data
  const p1Schedule = profile1.profile.preferences?.scheduleFlexibility || 'moderate';
  const p2Schedule = profile2.profile.preferences?.scheduleFlexibility || 'moderate';

  if (p1Schedule === p2Schedule) return 90;
  if (Math.abs(['low', 'moderate', 'high'].indexOf(p1Schedule) - ['low', 'moderate', 'high'].indexOf(p2Schedule)) === 1) return 70;
  return 50;
}

function calculateParentingCompatibility(profile1: any, profile2: any): number {
  // Simplified - would analyze parenting philosophy alignment
  const p1Style = profile1.profile.preferences?.parentingStyle || 'balanced';
  const p2Style = profile2.profile.preferences?.parentingStyle || 'balanced';

  if (p1Style === p2Style) return 85;
  return 60;
}

function calculateLifestyleCompatibility(profile1: any, profile2: any): number {
  // Analyze lifestyle factors (pets, smoking, cleanliness, etc.)
  let score = 70; // Base score

  const p1Prefs = profile1.profile.household_preferences || {};
  const p2Prefs = profile2.profile.household_preferences || {};

  // Check smoking compatibility
  if (p1Prefs.smoking === p2Prefs.smoking) score += 10;
  else if (p1Prefs.smoking === false && p2Prefs.smoking === true) score -= 20;

  // Check pet compatibility
  if (p1Prefs.has_pets === p2Prefs.has_pets) score += 10;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calculateLocationCompatibility(profile1: any, profile2: any): number {
  // Simplified - would use actual geolocation and school data
  const p1City = profile1.profile.location?.city || '';
  const p2City = profile2.profile.location?.city || '';

  if (p1City && p2City && p1City.toLowerCase() === p2City.toLowerCase()) return 80;
  return 50;
}

function calculateBudgetCompatibility(profile1: any, profile2: any): number {
  // Analyze budget ranges and financial compatibility
  const p1Budget = profile1.profile.housing_preferences?.budget || 0;
  const p2Budget = profile2.profile.housing_preferences?.budget || 0;

  if (p1Budget === 0 || p2Budget === 0) return 60; // No data

  const diff = Math.abs(p1Budget - p2Budget);
  const avgBudget = (p1Budget + p2Budget) / 2;
  const percentDiff = (diff / avgBudget) * 100;

  if (percentDiff < 10) return 90;
  if (percentDiff < 20) return 75;
  if (percentDiff < 30) return 60;
  return 40;
}

function calculateHouseRulesCompatibility(profile1: any, profile2: any): number {
  // Simplified - would analyze detailed house rules alignment
  const p1Rules = profile1.profile.household_preferences || {};
  const p2Rules = profile2.profile.household_preferences || {};

  let matches = 0;
  let total = 0;

  // Compare various house rule preferences
  const rulesToCompare = ['quiet_hours', 'guest_policy', 'cleanliness_level'];
  rulesToCompare.forEach((rule) => {
    if (p1Rules[rule] && p2Rules[rule]) {
      total++;
      if (p1Rules[rule] === p2Rules[rule]) matches++;
    }
  });

  if (total === 0) return 60; // No data to compare
  return (matches / total) * 100;
}
