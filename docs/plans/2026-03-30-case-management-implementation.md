# Case Management UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full case management UX design from `docs/plans/2026-03-30-case-management-ux-design.md` — activity timeline, task management, document checklists, client drawer, tabbed client detail, and dual-mode dashboard.

**Architecture:** 3 new migrations (activity_events, tasks, document_checklist JSONB), 2 new models, expanded API routes, 4 rewritten/new frontend pages/components.

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript, Tailwind + shadcn/ui, Express, PostgreSQL + Knex

---

## Task 1: Create `activity_events` Migration

**Files:**
- Create: `backend/src/migrations/20260330000002_create_activity_events.ts`

**Step 1: Write the migration**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('idempotency_key', 255).nullable();
    t.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('client_id').nullable().references('id').inTable('clients').onDelete('SET NULL');
    t.uuid('placement_id').nullable().references('id').inTable('placements').onDelete('SET NULL');
    t.uuid('actor_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');

    t.string('event_type', 50).notNullable(); // note, status_change, stage_change, field_edit, assignment, document, photo, task
    t.string('origin', 20).notNullable().defaultTo('user'); // user, system, integration

    t.boolean('is_private').notNullable().defaultTo(false);

    // Note fields
    t.string('title', 255).nullable();
    t.text('body').nullable();
    t.string('note_type', 50).nullable(); // general, phone_call, site_visit, lease_update, intake_note

    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Indexes
  await knex.raw(`CREATE INDEX idx_activity_events_org ON activity_events(org_id)`);
  await knex.raw(`CREATE INDEX idx_activity_events_client ON activity_events(client_id)`);
  await knex.raw(`CREATE INDEX idx_activity_events_placement ON activity_events(placement_id)`);
  await knex.raw(`CREATE INDEX idx_activity_events_type ON activity_events(event_type)`);
  await knex.raw(`CREATE INDEX idx_activity_events_created ON activity_events(created_at DESC)`);
  await knex.raw(`CREATE INDEX idx_activity_events_client_timeline ON activity_events(client_id, created_at DESC) WHERE client_id IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX idx_activity_events_idempotency ON activity_events(idempotency_key) WHERE idempotency_key IS NOT NULL`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_events');
}
```

**Step 2: Run migration**

Run: `cd backend && npx knex migrate:latest`
Expected: Migration completes, `activity_events` table created.

**Step 3: Commit**

```bash
git add backend/src/migrations/20260330000002_create_activity_events.ts
git commit -m "feat: add activity_events migration for case management timeline"
```

---

## Task 2: Create `tasks` Migration

**Files:**
- Create: `backend/src/migrations/20260330000003_create_tasks.ts`

**Step 1: Write the migration**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.uuid('client_id').nullable().references('id').inTable('clients').onDelete('SET NULL');
    t.uuid('placement_id').nullable().references('id').inTable('placements').onDelete('SET NULL');
    t.uuid('assigned_to').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    t.uuid('created_by').notNullable().references('id').inTable('org_members');
    t.string('created_by_name', 255).notNullable();

    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.date('due_date').nullable();
    t.string('priority', 20).notNullable().defaultTo('medium'); // low, medium, high, urgent
    t.string('status', 20).notNullable().defaultTo('pending'); // pending, in_progress, completed, cancelled

    t.boolean('auto_generated').notNullable().defaultTo(false);
    t.string('source_event', 100).nullable();
    t.uuid('source_activity_event_id').nullable().references('id').inTable('activity_events').onDelete('SET NULL');

    t.timestamp('completed_at', { useTz: true }).nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`CREATE INDEX idx_tasks_org ON tasks(org_id)`);
  await knex.raw(`CREATE INDEX idx_tasks_client ON tasks(client_id)`);
  await knex.raw(`CREATE INDEX idx_tasks_placement ON tasks(placement_id)`);
  await knex.raw(`CREATE INDEX idx_tasks_assigned ON tasks(assigned_to)`);
  await knex.raw(`CREATE INDEX idx_tasks_status ON tasks(status)`);
  await knex.raw(`CREATE INDEX idx_tasks_due ON tasks(due_date)`);
  await knex.raw(`CREATE INDEX idx_tasks_dashboard ON tasks(org_id, status, due_date) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX idx_tasks_assignee_dashboard ON tasks(assigned_to, status, due_date) WHERE deleted_at IS NULL`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tasks');
}
```

**Step 2: Run migration**

Run: `cd backend && npx knex migrate:latest`

**Step 3: Commit**

```bash
git add backend/src/migrations/20260330000003_create_tasks.ts
git commit -m "feat: add tasks migration for case management task tracking"
```

---

## Task 3: Add `document_checklist` to Placements

**Files:**
- Create: `backend/src/migrations/20260330000004_add_document_checklist.ts`
- Modify: `backend/src/models/Placement.ts`

**Step 1: Write migration**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('placements', (t) => {
    t.jsonb('document_checklist').notNullable().defaultTo(JSON.stringify({
      version: 1,
      items: [
        { type: 'government_id', label: 'Government ID', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'income_proof', label: 'Income Verification', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'background_check', label: 'Background Check', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'references', label: 'References', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'lease_agreement', label: 'Lease Agreement', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'inspection_report', label: 'Unit Inspection', status: 'missing', updated_at: null, activity_event_id: null },
      ],
    }));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('placements', (t) => {
    t.dropColumn('document_checklist');
  });
}
```

**Step 2: Update Placement interface in `backend/src/models/Placement.ts`**

Add to Placement interface:
```typescript
document_checklist: {
  version: number;
  items: Array<{
    type: string;
    label: string;
    status: 'missing' | 'collected' | 'expired';
    updated_at: string | null;
    activity_event_id: string | null;
  }>;
};
```

Add method to PlacementModel:
```typescript
async updateDocumentChecklist(
  orgId: string,
  id: string,
  checklist: Placement['document_checklist'],
): Promise<Placement> {
  const [placement] = await db('placements')
    .where({ id, org_id: orgId })
    .update({ document_checklist: JSON.stringify(checklist), updated_at: db.fn.now() })
    .returning('*');
  return placement;
},
```

**Step 3: Run migration, commit**

```bash
cd backend && npx knex migrate:latest
git add backend/src/migrations/20260330000004_add_document_checklist.ts backend/src/models/Placement.ts
git commit -m "feat: add document_checklist JSONB column to placements"
```

---

## Task 4: Create ActivityEvent and Task Models

**Files:**
- Create: `backend/src/models/ActivityEvent.ts`
- Create: `backend/src/models/Task.ts`

**Step 1: Write ActivityEvent model**

```typescript
// backend/src/models/ActivityEvent.ts
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
  actor_name?: string;
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
      .where({ org_id: orgId, client_id: clientId })
      .leftJoin('org_members', 'activity_events.actor_id', 'org_members.id')
      .leftJoin('users', 'org_members.user_id', 'users.id')
      .select('activity_events.*', 'users.email as actor_email');

    if (filters?.event_type) query = query.where('event_type', filters.event_type);
    if (filters?.placement_id) query = query.where('placement_id', filters.placement_id);

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
```

**Step 2: Write Task model**

```typescript
// backend/src/models/Task.ts
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
      .where({ org_id: orgId, assigned_to: assigneeId })
      .whereNull('deleted_at')
      .whereIn('status', ['pending', 'in_progress'])
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
    return this.update(orgId, id, { status: 'completed', completed_at: new Date().toISOString() });
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
      .countDistinct(db.raw(`CASE WHEN due_date < CURRENT_DATE THEN id END as overdue`))
      .groupBy('assigned_to');
    return rows.map((r: any) => ({
      assigned_to: r.assigned_to,
      total: parseInt(r.total),
      overdue: parseInt(r.overdue) || 0,
    }));
  },

  async countOverdueByAssignee(orgId: string, assigneeId: string): Promise<number> {
    const [{ count }] = await db('tasks')
      .where({ org_id: orgId, assigned_to: assigneeId })
      .whereNull('deleted_at')
      .whereIn('status', ['pending', 'in_progress'])
      .where('due_date', '<', db.fn.now())
      .count('* as count');
    return parseInt(count as string);
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
```

**Step 3: Commit**

```bash
git add backend/src/models/ActivityEvent.ts backend/src/models/Task.ts
git commit -m "feat: add ActivityEvent and Task models"
```

---

## Task 5: API Routes for Activity Events and Tasks

**Files:**
- Modify: `backend/src/features/placement/placement.routes.ts`
- Modify: `backend/src/features/placement/placement.controller.ts`

**Step 1: Add controller methods for activity events**

Add to `placement.controller.ts`:

```typescript
// Import at top
import ActivityEventModel from '../../models/ActivityEvent';
import TaskModel from '../../models/Task';

// Add to PlacementController object:

async getActivityEvents(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const clientId = req.params.clientId;
    const { event_type, placement_id, limit, offset } = req.query;
    const events = await ActivityEventModel.findByClient(orgId, clientId, {
      event_type: event_type as string | undefined,
      placement_id: placement_id as string | undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('getActivityEvents error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async createActivityEvent(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const clientId = req.params.clientId;
    const { event_type, title, body, note_type, placement_id, is_private, metadata } = req.body;
    const event = await ActivityEventModel.create({
      org_id: orgId,
      client_id: clientId,
      placement_id: placement_id || null,
      actor_id: req.orgMemberId!,
      event_type,
      origin: 'user',
      is_private: is_private || false,
      title: title || null,
      body: body || null,
      note_type: note_type || null,
      metadata: metadata || {},
    });
    return res.status(201).json({ success: true, data: event });
  } catch (err: any) {
    if (err.message?.startsWith('Invalid')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('createActivityEvent error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async getOrgActivityFeed(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const { limit } = req.query;
    const events = await ActivityEventModel.findByOrg(orgId, {
      limit: limit ? parseInt(limit as string) : 10,
    });
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('getOrgActivityFeed error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

// Tasks
async getClientTasks(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const clientId = req.params.clientId;
    const tasks = await TaskModel.findByClient(orgId, clientId);
    return res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('getClientTasks error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async getMyTasks(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const memberId = req.orgMemberId!;
    const tasks = await TaskModel.findByAssignee(orgId, memberId);
    return res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('getMyTasks error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async createTask(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const { client_id, placement_id, title, description, due_date, priority, assigned_to } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const task = await TaskModel.create({
      org_id: orgId,
      client_id: client_id || null,
      placement_id: placement_id || null,
      assigned_to: assigned_to || req.orgMemberId!,
      created_by: req.orgMemberId!,
      created_by_name: req.orgMemberName || 'Unknown',
      title,
      description: description || null,
      due_date: due_date || null,
      priority: priority || 'medium',
    });
    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('createTask error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async updateTask(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const taskId = req.params.taskId;
    const allowedFields = ['title', 'description', 'due_date', 'priority', 'status', 'assigned_to'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    const task = await TaskModel.update(orgId, taskId, updates as any);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    return res.json({ success: true, data: task });
  } catch (err) {
    console.error('updateTask error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

async completeTask(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const taskId = req.params.taskId;
    const task = await TaskModel.complete(orgId, taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Log activity event
    if (task.client_id) {
      await ActivityEventModel.create({
        org_id: orgId,
        client_id: task.client_id,
        placement_id: task.placement_id,
        actor_id: req.orgMemberId!,
        event_type: 'task',
        origin: 'user',
        metadata: { task_id: task.id, action: 'completed', title: task.title },
      });
    }

    return res.json({ success: true, data: task });
  } catch (err) {
    console.error('completeTask error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},

// Document checklist
async toggleDocumentItem(req: Request, res: Response) {
  try {
    const orgId = req.orgId!;
    const placementId = req.params.id;
    const { doc_type, new_status } = req.body;
    if (!doc_type || !new_status) {
      return res.status(400).json({ success: false, message: 'doc_type and new_status required' });
    }

    const placement = await PlacementModel.findById(orgId, placementId);
    if (!placement) return res.status(404).json({ success: false, message: 'Placement not found' });

    const checklist = placement.document_checklist;
    const item = checklist.items.find((i: any) => i.type === doc_type);
    if (!item) return res.status(404).json({ success: false, message: 'Document type not found' });

    // Log activity event
    let activityEvent = null;
    if (placement.client_id) {
      activityEvent = await ActivityEventModel.create({
        org_id: orgId,
        client_id: placement.client_id,
        placement_id: placementId,
        actor_id: req.orgMemberId!,
        event_type: 'document',
        origin: 'user',
        metadata: { doc_type, action: new_status === 'collected' ? 'checked_off' : 'unchecked', label: item.label },
      });
    }

    item.status = new_status;
    item.updated_at = new Date().toISOString();
    item.activity_event_id = activityEvent?.id || null;

    const updated = await PlacementModel.updateDocumentChecklist(orgId, placementId, checklist);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('toggleDocumentItem error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
},
```

**Step 2: Add routes to `placement.routes.ts`**

Add before the export:

```typescript
// Activity events
router.get('/:orgSlug/clients/:clientId/activity', ...orgMiddleware, PlacementController.getActivityEvents);
router.post('/:orgSlug/clients/:clientId/activity', ...orgMiddleware, PlacementController.createActivityEvent);
router.get('/:orgSlug/activity-feed', ...orgMiddleware, PlacementController.getOrgActivityFeed);

// Tasks
router.get('/:orgSlug/tasks/mine', ...orgMiddleware, PlacementController.getMyTasks);
router.get('/:orgSlug/clients/:clientId/tasks', ...orgMiddleware, PlacementController.getClientTasks);
router.post('/:orgSlug/tasks', ...orgMiddleware, PlacementController.createTask);
router.patch('/:orgSlug/tasks/:taskId', ...orgMiddleware, PlacementController.updateTask);
router.post('/:orgSlug/tasks/:taskId/complete', ...orgMiddleware, PlacementController.completeTask);

// Document checklist
router.post('/:orgSlug/placements/:id/documents/toggle', ...orgMiddleware, PlacementController.toggleDocumentItem);
```

**Step 3: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts backend/src/features/placement/placement.routes.ts
git commit -m "feat: add API routes for activity events, tasks, and document checklist"
```

---

## Task 6: Auto-Task Generation + Enhanced Dashboard API

**Files:**
- Create: `backend/src/features/placement/autoTasks.ts`
- Modify: `backend/src/features/placement/placement.controller.ts` (updateStage + new dashboard endpoints)

**Step 1: Create auto-task definitions**

```typescript
// backend/src/features/placement/autoTasks.ts
import TaskModel from '../../models/Task';
import ActivityEventModel from '../../models/ActivityEvent';

interface AutoTaskDef {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDaysOffset: number;
}

const STAGE_TASKS: Record<string, AutoTaskDef[]> = {
  intake: [
    { title: 'Complete client intake assessment', priority: 'high', dueDaysOffset: 3 },
  ],
  matching: [
    { title: 'Review top 3 unit matches', priority: 'high', dueDaysOffset: 2 },
    { title: 'Contact client about housing preferences', priority: 'medium', dueDaysOffset: 3 },
  ],
  proposed: [
    { title: 'Schedule client tour of proposed unit', priority: 'high', dueDaysOffset: 3 },
    { title: 'Send unit details to client', priority: 'medium', dueDaysOffset: 1 },
  ],
  accepted: [
    { title: 'Initiate lease review', priority: 'high', dueDaysOffset: 2 },
    { title: 'Verify all documents collected', priority: 'high', dueDaysOffset: 3 },
  ],
  placed: [
    { title: 'Schedule 7-day check-in', priority: 'medium', dueDaysOffset: 7 },
    { title: 'Schedule 30-day stability check', priority: 'medium', dueDaysOffset: 30 },
  ],
  closed: [
    { title: 'Complete outcome assessment', priority: 'medium', dueDaysOffset: 5 },
  ],
};

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export async function generateAutoTasks(opts: {
  orgId: string;
  placementId: string;
  clientId: string;
  stage: string;
  actorId: string;
  actorName: string;
  assignToId: string | null;
  stageEventId?: string;
}): Promise<void> {
  const defs = STAGE_TASKS[opts.stage];
  if (!defs) return;

  for (const def of defs) {
    const sourceEvent = `stage:${opts.stage}`;
    const slug = slugify(def.title);
    const idempotencyKey = `auto_task:${opts.placementId}:${opts.stage}:${slug}`;

    // Check idempotency
    const existing = await TaskModel.findByClient(opts.orgId, opts.clientId);
    if (existing.some((t) => t.source_event === sourceEvent && t.title === def.title && t.placement_id === opts.placementId)) {
      continue;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.dueDaysOffset);

    await TaskModel.create({
      org_id: opts.orgId,
      client_id: opts.clientId,
      placement_id: opts.placementId,
      assigned_to: opts.assignToId || opts.actorId,
      created_by: opts.actorId,
      created_by_name: opts.actorName,
      title: def.title,
      due_date: dueDate.toISOString().slice(0, 10),
      priority: def.priority,
      auto_generated: true,
      source_event: sourceEvent,
      source_activity_event_id: opts.stageEventId || null,
    });
  }
}
```

**Step 2: Wire auto-tasks into updateStage controller**

In `placement.controller.ts`, update the `updateStage` method to:
1. Log a `stage_change` activity event
2. Call `generateAutoTasks`

**Step 3: Add enhanced dashboard endpoint**

Add `getDashboardData` controller method that returns:
- Task counts (overdue, open, by assignee)
- Client counts by case_manager_id
- Recent activity feed
- Placement stage counts

**Step 4: Add dashboard routes**

```typescript
router.get('/:orgSlug/dashboard', ...orgMiddleware, PlacementController.getDashboardData);
```

**Step 5: Commit**

```bash
git add backend/src/features/placement/autoTasks.ts backend/src/features/placement/placement.controller.ts backend/src/features/placement/placement.routes.ts
git commit -m "feat: add auto-task generation on stage change and dashboard API"
```

---

## Task 7: Client Quick-Preview Drawer

**Files:**
- Create: `web/src/components/client-drawer.tsx`
- Modify: `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx`

**Step 1: Create ClientDrawer component**

A right-side slide-over panel (~400px) with:
- Header: avatar + name + status badge + days-in-status
- Quick info card: phone, email, household size, budget, preferred area
- Current placement card: stage + unit + score + days-in-stage
- Recent activity: last 3-5 events
- Quick actions: "Add Note" inline input, "Open Full Profile" link

Uses: Sheet/Drawer pattern (or custom div with transition), fetches `/clients/:id`, `/clients/:id/activity?limit=5`, `/placements?client_id=:id`.

**Step 2: Integrate drawer into roster page**

- Add row click handler (not on name link) to open drawer
- Pass selected clientId to drawer component
- Drawer dismisses on Escape, click outside, X button

**Step 3: Commit**

```bash
git add web/src/components/client-drawer.tsx web/src/app/(dashboard)/[orgSlug]/clients/page.tsx
git commit -m "feat: add client quick-preview drawer to roster"
```

---

## Task 8: Client Detail Page Rewrite — Tabs + Timeline

**Files:**
- Rewrite: `web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx`

**Step 1: Implement fixed header + tab bar**

- Back link, avatar + name + status badge + days-in-status counter
- Contact info inline, action buttons: Edit Profile, Add Note, Create Task
- Tab bar: Timeline | Profile | Placements | Tasks | Documents
- Uses shadcn `Tabs` component (already in `web/src/components/ui/tabs.tsx`)

**Step 2: Implement Timeline tab (default)**

- Quick-add note input pinned at top (text + Send, expandable optional fields: note_type, placement, private)
- Slash command detection: `/phone`, `/visit`, `/lease`
- Timeline entries below (reverse chronological) with icons per event_type
- Filter pills: All | Notes | Status Changes | Tasks | Edits
- Fetches from `GET /clients/:id/activity`

**Step 3: Implement Profile tab**

Reorganize existing inline-edit fields into cards:
- Personal Information, Housing Needs, Accessibility & Preferences, Case Assignment

**Step 4: Keep Placements tab**

Move existing placement list into Placements tab.

**Step 5: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx
git commit -m "feat: rewrite client detail page with tabs and activity timeline"
```

---

## Task 9: Tasks Tab + Documents Tab

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx` (add remaining tabs)

**Step 1: Implement Tasks tab**

- Grouped by urgency: Overdue (red) | Due Today (yellow) | Upcoming | Completed (collapsed)
- Each row: checkbox + title + priority badge + due date + auto-generated indicator
- One-click checkbox completion (POST `/tasks/:id/complete`)
- "Create Task" dialog: title, description, due_date, priority

**Step 2: Implement Documents tab**

- Progress bar: "4/6 collected - 67%"
- Checklist items with status toggle (missing -> collected -> expired -> missing)
- Each toggle calls POST `/placements/:id/documents/toggle`
- Placement dropdown if multiple placements

**Step 3: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx
git commit -m "feat: add tasks and documents tabs to client detail"
```

---

## Task 10: Dashboard Rewrite — My View + Org Overview

**Files:**
- Rewrite: `web/src/app/(dashboard)/[orgSlug]/page.tsx`

**Step 1: Implement view toggle**

Toggle between "My View" (default) and "Org Overview" at top.

**Step 2: My View**

- 4 KPI cards: Overdue Tasks, Open Tasks, My Clients, Placed This Month
- Two-column: My Tasks (left 60%) grouped by urgency with one-click completion, My Caseload (right 40%) compact client list sorted by urgency
- Row 3: Recent Team Activity (last 8 events from `/activity-feed`)

**Step 3: Org Overview**

- 5 KPI cards: Active Clients, Placed This Month, Avg Days, Success Rate, Open Units
- Two-column: Pipeline Summary (horizontal bars by stage), Staff Workload (table: name, clients, overdue)
- Row 3: Monthly trend chart + outcome donut (reuse chart logic from reports)

**Step 4: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/page.tsx
git commit -m "feat: rewrite dashboard with My View and Org Overview modes"
```

---

## Task 11: Seed Data Migration

**Files:**
- Create: `backend/src/seeds/20260330_case_management_demo.ts`

**Step 1: Write seed script**

Insert ~50 activity events across demo clients (notes, status changes, field edits, stage changes).
Insert ~20 tasks (mix of completed, overdue, upcoming, auto-generated).
Update existing placements with partially-completed document checklists (2-4 of 6 items).

**Step 2: Run seed**

```bash
cd backend && npx knex seed:run --specific=20260330_case_management_demo.ts
```

**Step 3: Commit**

```bash
git add backend/src/seeds/20260330_case_management_demo.ts
git commit -m "feat: add case management demo seed data"
```

---

## Dependency Graph

```
Task 1 (activity_events migration)
  └── Task 2 (tasks migration) — depends on activity_events for FK
       └── Task 3 (document_checklist migration)
            └── Task 4 (models) — depends on all 3 tables
                 └── Task 5 (API routes) — depends on models
                      └── Task 6 (auto-tasks + dashboard API) — depends on routes
                           ├── Task 7 (client drawer) — depends on activity API
                           ├── Task 8 (client detail tabs) — depends on activity API
                           ├── Task 9 (tasks + docs tabs) — depends on tasks + docs API
                           ├── Task 10 (dashboard) — depends on dashboard API
                           └── Task 11 (seed data) — depends on all tables
```

Tasks 7-10 can run in parallel after Task 6.
