import { db } from '../config/database';

export interface Task {
  id: string;
  org_id: string;
  client_id: string | null;
  placement_id: string | null;
  assigned_to: string | null;
  created_by: string;
  created_by_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  auto_generated: boolean;
  source_event: string | null;
  source_activity_event_id: string | null;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_first_name?: string;
  client_last_name?: string;
}

const TaskModel = {
  async create(data: Partial<Task>): Promise<Task> {
    const [task] = await db('tasks').insert(data).returning('*');
    return task;
  },

  async findById(orgId: string, id: string): Promise<Task | undefined> {
    return db('tasks').where({ id, org_id: orgId }).whereNull('deleted_at').first();
  },

  async findByClient(orgId: string, clientId: string): Promise<Task[]> {
    return db('tasks')
      .where({ org_id: orgId, client_id: clientId })
      .whereNull('deleted_at')
      .orderByRaw(`
        CASE WHEN status = 'completed' THEN 1 ELSE 0 END ASC,
        CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 0
             WHEN due_date = CURRENT_DATE THEN 1
             ELSE 2 END ASC,
        due_date ASC NULLS LAST
      `);
  },

  async findByAssignee(orgId: string, assigneeId: string): Promise<Task[]> {
    return db('tasks')
      .where({ 'tasks.org_id': orgId, 'tasks.assigned_to': assigneeId })
      .whereNull('tasks.deleted_at')
      .whereIn('tasks.status', ['pending', 'in_progress'])
      .leftJoin('clients', 'tasks.client_id', 'clients.id')
      .select('tasks.*', 'clients.first_name as client_first_name', 'clients.last_name as client_last_name')
      .orderByRaw(`
        CASE WHEN tasks.due_date < CURRENT_DATE THEN 0
             WHEN tasks.due_date = CURRENT_DATE THEN 1
             ELSE 2 END ASC,
        tasks.due_date ASC NULLS LAST
      `);
  },

  async update(orgId: string, id: string, data: Partial<Task>): Promise<Task> {
    const [task] = await db('tasks')
      .where({ id, org_id: orgId })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return task;
  },

  async complete(orgId: string, id: string): Promise<Task> {
    return this.update(orgId, id, { status: 'completed', completed_at: new Date().toISOString() } as any);
  },

  async softDelete(orgId: string, id: string): Promise<boolean> {
    const count = await db('tasks')
      .where({ id, org_id: orgId })
      .update({ deleted_at: new Date().toISOString(), updated_at: db.fn.now() });
    return count > 0;
  },

  async countByAssignee(orgId: string): Promise<Array<{ assigned_to: string; total: number; overdue: number }>> {
    const rows = await db('tasks')
      .where({ org_id: orgId })
      .whereNull('deleted_at')
      .whereIn('status', ['pending', 'in_progress'])
      .select('assigned_to')
      .count('* as total')
      .select(db.raw(`COUNT(DISTINCT CASE WHEN due_date < CURRENT_DATE THEN id END) as overdue`))
      .groupBy('assigned_to');
    return rows.map((r: any) => ({
      assigned_to: r.assigned_to,
      total: parseInt(r.total),
      overdue: parseInt(r.overdue) || 0,
    }));
  },

  async getNextDueByClients(orgId: string, clientIds: string[]): Promise<Record<string, { title: string; due_date: string | null }>> {
    if (clientIds.length === 0) return {};
    const rows = await db.raw(`
      SELECT DISTINCT ON (client_id) client_id, title, due_date
      FROM tasks
      WHERE org_id = ? AND client_id = ANY(?) AND deleted_at IS NULL AND status IN ('pending', 'in_progress')
      ORDER BY client_id,
        CASE WHEN due_date < CURRENT_DATE THEN 0 WHEN due_date = CURRENT_DATE THEN 1 ELSE 2 END ASC,
        due_date ASC NULLS LAST
    `, [orgId, clientIds]);
    return (rows.rows || []).reduce((acc: Record<string, any>, r: any) => {
      acc[r.client_id] = { title: r.title, due_date: r.due_date };
      return acc;
    }, {});
  },
};

export default TaskModel;
