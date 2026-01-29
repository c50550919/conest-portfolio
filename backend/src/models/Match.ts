import db from '../config/database';

export interface Match {
  id: string;
  user_id_1: string;
  user_id_2: string;
  compatibility_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  // Score breakdown
  schedule_score: number;
  parenting_score: number;
  rules_score: number;
  location_score: number;
  budget_score: number;
  lifestyle_score: number;

  initiated_by: string; // user_id who initiated
  response_deadline?: Date;
  matched_at?: Date;

  created_at: Date;
  updated_at: Date;
}

export interface CreateMatchData {
  user_id_1: string;
  user_id_2: string;
  compatibility_score: number;
  schedule_score: number;
  parenting_score: number;
  rules_score: number;
  location_score: number;
  budget_score: number;
  lifestyle_score: number;
  initiated_by: string;
}

export const MatchModel = {
  async create(data: CreateMatchData): Promise<Match> {
    const matchData = {
      ...data,
      status: 'pending',
      response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const [match] = await db('matches').insert(matchData).returning('*');
    return match;
  },

  async findById(id: string): Promise<Match | undefined> {
    return await db('matches').where({ id }).first();
  },

  async findByUserId(userId: string, status?: string): Promise<Match[]> {
    let query = db('matches')
      .where({ user_id_1: userId })
      .orWhere({ user_id_2: userId });

    if (status) {
      query = query.andWhere({ status });
    }

    return await query.orderBy('compatibility_score', 'desc');
  },

  async findExistingMatch(userId1: string, userId2: string): Promise<Match | undefined> {
    return await db('matches')
      .where((builder) => {
        void builder
          .where({ user_id_1: userId1, user_id_2: userId2 })
          .orWhere({ user_id_1: userId2, user_id_2: userId1 });
      })
      .first();
  },

  async update(id: string, data: Partial<Match>): Promise<Match> {
    const updateData: any = { ...data, updated_at: db.fn.now() };

    if (data.status === 'accepted') {
      updateData.matched_at = db.fn.now();
    }

    const [match] = await db('matches')
      .where({ id })
      .update(updateData)
      .returning('*');
    return match;
  },

  async getTopMatches(userId: string, limit: number = 10): Promise<Match[]> {
    return await db('matches')
      .where({ user_id_1: userId })
      .orWhere({ user_id_2: userId })
      .whereIn('status', ['pending', 'accepted'])
      .orderBy('compatibility_score', 'desc')
      .limit(limit);
  },

  async expireOldMatches(): Promise<number> {
    const result = await db('matches')
      .where({ status: 'pending' })
      .where('response_deadline', '<', db.fn.now())
      .update({ status: 'expired', updated_at: db.fn.now() });

    return result;
  },
};
