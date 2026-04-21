import { db } from '../config/database';

export interface ActivityEvent {
  id: string;
  idempotency_key: string | null;
  org_id: string;
  client_id: string | null;
  placement_id: string | null;
  actor_id: string | null;
  event_type: string;
  origin: 'user' | 'system' | 'integration';
  is_private: boolean;
  title: string | null;
  body: string | null;
  note_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  actor_email?: string;
  client_first_name?: string;
  client_last_name?: string;
}

const VALID_EVENT_TYPES = ['note', 'status_change', 'stage_change', 'field_edit', 'assignment', 'document', 'photo', 'task'];
const VALID_NOTE_TYPES = ['general', 'phone_call', 'site_visit', 'lease_update', 'intake_note'];

const ActivityEventModel = {
  validateEventType(type: string): boolean {
    return VALID_EVENT_TYPES.includes(type);
  },

  validateNoteType(type: string): boolean {
    return VALID_NOTE_TYPES.includes(type);
  },

  async create(data: Partial<ActivityEvent>): Promise<ActivityEvent> {
    if (!data.event_type || !this.validateEventType(data.event_type)) {
      throw new Error(`Invalid event_type: ${data.event_type}`);
    }
    if (data.event_type === 'note' && data.note_type && !this.validateNoteType(data.note_type)) {
      throw new Error(`Invalid note_type: ${data.note_type}`);
    }
    const [event] = await db('activity_events').insert(data).returning('*');
    return event;
  },

  async upsert(data: Partial<ActivityEvent> & { idempotency_key: string }): Promise<ActivityEvent> {
    const existing = await db('activity_events')
      .where({ idempotency_key: data.idempotency_key })
      .first();
    if (existing) return existing;
    return this.create(data);
  },

  async findByClient(
    orgId: string,
    clientId: string,
    filters?: { event_type?: string; placement_id?: string; limit?: number; offset?: number },
  ): Promise<ActivityEvent[]> {
    let query = db('activity_events')
      .where({ 'activity_events.org_id': orgId, 'activity_events.client_id': clientId })
      .leftJoin('org_members', 'activity_events.actor_id', 'org_members.id')
      .leftJoin('users', 'org_members.user_id', 'users.id')
      .select('activity_events.*', 'users.email as actor_email');

    if (filters?.event_type) query = query.where('activity_events.event_type', filters.event_type);
    if (filters?.placement_id) query = query.where('activity_events.placement_id', filters.placement_id);

    query = query.orderBy('activity_events.created_at', 'desc');
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.offset(filters.offset);

    return query;
  },

  async findByOrg(
    orgId: string,
    filters?: { limit?: number },
  ): Promise<ActivityEvent[]> {
    let query = db('activity_events')
      .where({ 'activity_events.org_id': orgId })
      .leftJoin('org_members', 'activity_events.actor_id', 'org_members.id')
      .leftJoin('users', 'org_members.user_id', 'users.id')
      .leftJoin('clients', 'activity_events.client_id', 'clients.id')
      .select(
        'activity_events.*',
        'users.email as actor_email',
        'clients.first_name as client_first_name',
        'clients.last_name as client_last_name',
      )
      .orderBy('activity_events.created_at', 'desc');

    if (filters?.limit) query = query.limit(filters.limit);
    return query;
  },

  async getLatestByClient(orgId: string, clientIds: string[]): Promise<Record<string, string>> {
    if (clientIds.length === 0) return {};
    const rows = await db('activity_events')
      .where({ org_id: orgId })
      .whereIn('client_id', clientIds)
      .select('client_id')
      .max('created_at as latest')
      .groupBy('client_id');
    return rows.reduce((acc: Record<string, string>, r: any) => {
      acc[r.client_id] = r.latest;
      return acc;
    }, {});
  },
};

export default ActivityEventModel;
