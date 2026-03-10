/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Match Group Entity - Phase 1 Schema Only
 *
 * Database Tables: match_groups, match_group_members
 * Purpose: Group matching infrastructure (schema ready for Phase 2 algorithm)
 *
 * Phase 2 will add: group compatibility scoring, village formation workflow,
 * group discussion spaces, and consensus-building tools.
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type MatchGroupTypeDB = 'pair' | 'trio' | 'quad';
export type MatchGroupStatusDB = 'forming' | 'active' | 'dissolved';
export type MatchGroupMemberRoleDB = 'initiator' | 'member';

export interface MatchGroupDB {
  id: string;
  type: MatchGroupTypeDB;
  status: MatchGroupStatusDB;
  created_at: Date;
  updated_at: Date;
}

export interface MatchGroupMemberDB {
  id: string;
  match_group_id: string;
  user_id: string;
  role: MatchGroupMemberRoleDB;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

export type MatchGroupType = 'pair' | 'trio' | 'quad';
export type MatchGroupStatus = 'forming' | 'active' | 'dissolved';

export interface MatchGroup {
  id: string;
  type: MatchGroupType;
  status: MatchGroupStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchGroupMember {
  id: string;
  matchGroupId: string;
  userId: string;
  role: 'initiator' | 'member';
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}
