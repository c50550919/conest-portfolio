import { db } from '../config/database';

export interface DocumentChecklistItem {
  type: string;
  label: string;
  status: 'missing' | 'collected' | 'expired';
  updated_at: string | null;
  activity_event_id: string | null;
}

export interface DocumentChecklist {
  version: number;
  items: DocumentChecklistItem[];
}

export interface Placement {
  id: string;
  org_id: string;
  client_id: string;
  unit_id: string | null;
  case_manager_id: string | null;
  stage: 'intake' | 'matching' | 'proposed' | 'accepted' | 'placed' | 'closed';
  compatibility_score: number | null;
  score_breakdown: Record<string, number> | null;
  proposed_at: Date | null;
  accepted_at: Date | null;
  placed_at: Date | null;
  closed_at: Date | null;
  outcome: 'successful' | 'unsuccessful' | 'withdrawn' | null;
  notes_encrypted: string | null;
  document_checklist: DocumentChecklist;
  created_at: Date;
  updated_at: Date;
}

const PlacementModel = {
  async findByOrg(
    orgId: string,
    filters?: { stage?: string },
  ): Promise<Placement[]> {
    let query = db('placements')
      .where({ 'placements.org_id': orgId })
      .leftJoin('clients', 'placements.client_id', 'clients.id')
      .leftJoin('housing_units', 'placements.unit_id', 'housing_units.id')
      .select(
        'placements.*',
        'clients.first_name as client_first_name',
        'clients.last_name as client_last_name',
        'clients.status as client_status',
        'housing_units.address as unit_address',
        'housing_units.rent_amount as unit_rent',
        'housing_units.bedrooms as unit_bedrooms',
      );
    if (filters?.stage)
      query = query.where({ 'placements.stage': filters.stage });
    return query.orderBy('placements.updated_at', 'desc');
  },

  async findById(
    orgId: string,
    id: string,
  ): Promise<Placement | undefined> {
    return db('placements').where({ id, org_id: orgId }).first();
  },

  async create(data: Partial<Placement>): Promise<Placement> {
    const [placement] = await db('placements').insert(data).returning('*');
    return placement;
  },

  async updateStage(
    orgId: string,
    id: string,
    stage: Placement['stage'],
    extra?: Partial<Placement>,
  ): Promise<Placement> {
    const stageTimestamps: Record<string, string> = {
      proposed: 'proposed_at',
      accepted: 'accepted_at',
      placed: 'placed_at',
      closed: 'closed_at',
    };
    const update: Record<string, unknown> = {
      stage,
      updated_at: db.fn.now(),
      ...extra,
    };
    if (stageTimestamps[stage]) {
      update[stageTimestamps[stage]] = db.fn.now();
    }
    const [placement] = await db('placements')
      .where({ id, org_id: orgId })
      .update(update)
      .returning('*');
    return placement;
  },

  async updateDocumentChecklist(
    orgId: string,
    id: string,
    checklist: DocumentChecklist,
  ): Promise<Placement> {
    const [placement] = await db('placements')
      .where({ id, org_id: orgId })
      .update({ document_checklist: JSON.stringify(checklist), updated_at: db.fn.now() })
      .returning('*');
    return placement;
  },

  async countByStage(orgId: string): Promise<Record<string, number>> {
    const counts = await db('placements')
      .where({ org_id: orgId })
      .groupBy('stage')
      .select('stage')
      .count('* as count');
    return counts.reduce(
      (acc: Record<string, number>, row: any) => {
        acc[row.stage] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  },
};

export default PlacementModel;
