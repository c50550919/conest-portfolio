# Caseworker Assignment, Dashboard & Stage Gating — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement weighted caseworker assignment suggestions, action-first dashboard home screen, and task-gated stage progression for the Placd demo.

**Architecture:** Bottom-up — database migrations first, then backend models/utilities/endpoints, then frontend UI. No new frameworks. Extends existing Knex models, Express routes, and Next.js App Router pages.

**Tech Stack:** TypeScript, PostgreSQL (Knex), Express 4.x, Next.js (App Router), shadcn/ui components, Tailwind CSS, Axios

**Design Doc:** `docs/plans/2026-03-31-caseworker-assignment-design.md`

---

## Task 1: Migration — Create `programs` Table

**Files:**
- Create: `backend/src/migrations/20260331000001_create_programs.ts`

**Step 1: Write the migration**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('programs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('type', 50).notNullable(); // rrh, psh, transitional, prevention, custom
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_programs_org ON programs (org_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('programs');
}
```

**Step 2: Run the migration**

Run: `cd /Users/ghostmac/Development/conest/backend && npx knex migrate:latest`
Expected: Migration completes successfully, `programs` table created.

**Step 3: Verify**

Run: `cd /Users/ghostmac/Development/conest/backend && npx knex migrate:status`
Expected: Shows `20260331000001_create_programs.ts` as applied.

**Step 4: Commit**

```bash
git add backend/src/migrations/20260331000001_create_programs.ts
git commit -m "feat: add programs lookup table migration"
```

---

## Task 2: Migration — Extend `org_members` with Caseload Fields

**Files:**
- Create: `backend/src/migrations/20260331000002_add_org_member_caseload_fields.ts`

**Step 1: Write the migration**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('org_members', (table) => {
    table.jsonb('specializations').defaultTo('[]');
    table.integer('max_caseload').defaultTo(25);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('org_members', (table) => {
    table.dropColumn('specializations');
    table.dropColumn('max_caseload');
  });
}
```

**Step 2: Run the migration**

Run: `cd /Users/ghostmac/Development/conest/backend && npx knex migrate:latest`
Expected: `org_members` table now has `specializations` (jsonb) and `max_caseload` (integer) columns.

**Step 3: Commit**

```bash
git add backend/src/migrations/20260331000002_add_org_member_caseload_fields.ts
git commit -m "feat: add specializations and max_caseload to org_members"
```

---

## Task 3: Migration — Add `program_id` to Placements, `is_required`/`stage` to Tasks

**Files:**
- Create: `backend/src/migrations/20260331000003_add_program_and_task_gating_fields.ts`

**Context:** The `tasks` table currently has `auto_generated` (boolean) and `source_event` (varchar, e.g. `stage:intake`) but NO `is_required` or `stage` columns. Both are needed for stage gating. The `placements` table needs a `program_id` FK to the new `programs` table.

**Step 1: Write the migration**

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add program_id to placements
  await knex.schema.alterTable('placements', (table) => {
    table.uuid('program_id').nullable().references('id').inTable('programs').onDelete('SET NULL');
  });

  // Add gating fields to tasks
  await knex.schema.alterTable('tasks', (table) => {
    table.boolean('is_required').defaultTo(false);
    table.string('stage', 20).nullable(); // intake, matching, proposed, accepted, placed, closed
  });

  // Backfill: all existing auto-generated tasks are required, parse stage from source_event
  await knex.raw(`
    UPDATE tasks
    SET is_required = true,
        stage = SUBSTRING(source_event FROM 7)
    WHERE auto_generated = true
      AND source_event LIKE 'stage:%'
  `);

  await knex.schema.raw('CREATE INDEX idx_tasks_gating ON tasks (placement_id, stage, is_required, status) WHERE deleted_at IS NULL');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_tasks_gating');
  await knex.schema.alterTable('tasks', (table) => {
    table.dropColumn('is_required');
    table.dropColumn('stage');
  });
  await knex.schema.alterTable('placements', (table) => {
    table.dropColumn('program_id');
  });
}
```

**Step 2: Run the migration**

Run: `cd /Users/ghostmac/Development/conest/backend && npx knex migrate:latest`
Expected: Columns added, existing auto-generated tasks backfilled with `is_required=true` and `stage` parsed from `source_event`.

**Step 3: Verify backfill**

Run: `cd /Users/ghostmac/Development/conest/backend && npx knex raw "SELECT stage, is_required, count(*) FROM tasks WHERE auto_generated = true GROUP BY stage, is_required"`
Expected: Rows showing stage values (intake, matching, etc.) with is_required=true and counts matching existing auto-tasks.

**Step 4: Commit**

```bash
git add backend/src/migrations/20260331000003_add_program_and_task_gating_fields.ts
git commit -m "feat: add program_id to placements, is_required/stage to tasks with backfill"
```

---

## Task 4: Program Model

**Files:**
- Create: `backend/src/models/Program.ts`

**Step 1: Write the model**

```typescript
import { db } from '../config/database';

export interface Program {
  id: string;
  org_id: string;
  name: string;
  type: string; // rrh, psh, transitional, prevention, custom
  created_at: string;
}

const ProgramModel = {
  async findByOrg(orgId: string): Promise<Program[]> {
    return db('programs').where({ org_id: orgId }).orderBy('name');
  },

  async findById(orgId: string, id: string): Promise<Program | undefined> {
    return db('programs').where({ id, org_id: orgId }).first();
  },

  async create(data: Partial<Program>): Promise<Program> {
    const [program] = await db('programs').insert(data).returning('*');
    return program;
  },
};

export default ProgramModel;
```

**Step 2: Commit**

```bash
git add backend/src/models/Program.ts
git commit -m "feat: add Program model"
```

---

## Task 5: Update OrgMember and Task Interfaces

**Files:**
- Modify: `backend/src/models/OrgMember.ts` (add specializations/max_caseload to interface)
- Modify: `backend/src/models/Task.ts` (add is_required/stage to interface, add findByPlacementStage method)

**Step 1: Update OrgMember interface**

In `backend/src/models/OrgMember.ts`, add two fields to the `OrgMember` interface:

```typescript
export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'case_manager' | 'program_director' | 'org_admin' | 'super_admin';
  invited_at: Date | null;
  accepted_at: Date | null;
  is_active: boolean;
  specializations: string[]; // NEW
  max_caseload: number;      // NEW
  created_at: Date;
  updated_at: Date;
}
```

**Step 2: Update Task interface and add gating method**

In `backend/src/models/Task.ts`, add two fields to the `Task` interface:

```typescript
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
  is_required: boolean;   // NEW
  stage: string | null;   // NEW
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
```

Then add a new method to `TaskModel` (before the closing `};`):

```typescript
  async findRequiredByPlacementStage(
    orgId: string,
    placementId: string,
    stage: string,
  ): Promise<Task[]> {
    return db('tasks')
      .where({ org_id: orgId, placement_id: placementId, stage, is_required: true })
      .whereNull('deleted_at')
      .orderBy('created_at');
  },

  async reassignByPlacement(
    orgId: string,
    placementId: string,
    newAssigneeId: string,
  ): Promise<number> {
    return db('tasks')
      .where({ org_id: orgId, placement_id: placementId })
      .whereNull('deleted_at')
      .whereIn('status', ['pending', 'in_progress'])
      .update({ assigned_to: newAssigneeId, updated_at: db.fn.now() });
  },
```

**Step 3: Update autoTasks.ts to set is_required and stage**

In `backend/src/features/placement/autoTasks.ts`, modify the `TaskModel.create()` call (around line 59) to include the new fields:

```typescript
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
      is_required: true,        // NEW — auto-tasks gate stage progression
      stage: opts.stage,        // NEW — which stage this task belongs to
      source_event: sourceEvent,
      source_activity_event_id: opts.stageEventId || null,
    });
```

**Step 4: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add backend/src/models/OrgMember.ts backend/src/models/Task.ts backend/src/features/placement/autoTasks.ts
git commit -m "feat: update OrgMember/Task interfaces, add gating fields to autoTasks"
```

---

## Task 6: Seed Data — Programs and Staff Specializations

**Files:**
- Create: `backend/scripts/seed-programs-and-staff.ts`

**Context:** The existing seed (`seed-placd-demo.ts`) creates 3 staff members:
- Sarah Chen (org_admin)
- Marcus Johnson (program_director)
- Ana Rivera (case_manager)

Plus additional case managers from the demo data. This script adds programs and updates staff specializations/max_caseload.

**Step 1: Write the seed script**

```typescript
/**
 * Seed programs and staff specializations for caseworker assignment demo.
 * Run AFTER seed-placd-demo.ts.
 *
 * Usage: cd backend && npx ts-node scripts/seed-programs-and-staff.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});

async function main() {
  // Find the demo org
  const org = await db('organizations').where({ slug: 'charlotte-housing' }).first();
  if (!org) {
    console.error('Demo org "charlotte-housing" not found. Run seed-placd-demo.ts first.');
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`Org: ${org.name} (${orgId})`);

  // Create programs
  const programData = [
    { org_id: orgId, name: 'Rapid Rehousing', type: 'rrh' },
    { org_id: orgId, name: 'Permanent Supportive Housing', type: 'psh' },
    { org_id: orgId, name: 'Transitional Housing', type: 'transitional' },
    { org_id: orgId, name: 'Homelessness Prevention', type: 'prevention' },
  ];

  for (const p of programData) {
    const existing = await db('programs').where({ org_id: orgId, name: p.name }).first();
    if (!existing) {
      await db('programs').insert(p);
      console.log(`  + Program: ${p.name}`);
    } else {
      console.log(`  = Program: ${p.name} (already exists)`);
    }
  }

  // Get programs for assignment
  const programs = await db('programs').where({ org_id: orgId });
  const rrhId = programs.find((p: any) => p.type === 'rrh')?.id;
  const pshId = programs.find((p: any) => p.type === 'psh')?.id;

  // Update staff specializations and max_caseload
  const staffUpdates: Record<string, { specializations: string[]; max_caseload: number }> = {
    'ana.rivera@chp-demo.org': { specializations: ['rrh', 'prevention'], max_caseload: 25 },
    'sarah.chen@chp-demo.org': { specializations: ['rrh', 'psh', 'transitional', 'prevention'], max_caseload: 30 },
    'marcus.johnson@chp-demo.org': { specializations: ['psh', 'transitional'], max_caseload: 20 },
  };

  // Also look for any additional case managers created by the demo seed
  const members = await db('org_members')
    .where({ org_id: orgId })
    .join('users', 'org_members.user_id', 'users.id')
    .select('org_members.id', 'users.email', 'org_members.role');

  for (const member of members) {
    const update = staffUpdates[member.email];
    if (update) {
      await db('org_members').where({ id: member.id }).update({
        specializations: JSON.stringify(update.specializations),
        max_caseload: update.max_caseload,
        updated_at: db.fn.now(),
      });
      console.log(`  + Staff: ${member.email} → ${update.specializations.join(', ')} (max: ${update.max_caseload})`);
    } else if (member.role === 'case_manager') {
      // Default case managers get rrh specialization
      await db('org_members').where({ id: member.id }).update({
        specializations: JSON.stringify(['rrh']),
        max_caseload: 25,
        updated_at: db.fn.now(),
      });
      console.log(`  + Staff: ${member.email} → rrh (default, max: 25)`);
    }
  }

  // Assign program_id to existing placements (distribute across programs)
  if (rrhId) {
    const placementCount = await db('placements')
      .where({ org_id: orgId })
      .whereNull('program_id')
      .update({ program_id: rrhId, updated_at: db.fn.now() });
    console.log(`\n  Updated ${placementCount} placements → Rapid Rehousing (default program)`);
  }

  console.log('\nDone.');
  await db.destroy();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

**Step 2: Run the seed**

Run: `cd /Users/ghostmac/Development/conest/backend && npx ts-node scripts/seed-programs-and-staff.ts`
Expected: Programs created, staff updated with specializations, placements assigned to RRH program.

**Step 3: Commit**

```bash
git add backend/scripts/seed-programs-and-staff.ts
git commit -m "feat: add program and staff specialization seed data"
```

---

## Task 7: Weighted Caseload Utility

**Files:**
- Create: `backend/src/features/placement/caseloadCalculator.ts`

**Context:** This utility calculates weighted caseload for a case manager. Stage weights: intake=1.5, matching=1.2, proposed=1.0, accepted=1.0, placed=0.5, closed=0.0.

**Step 1: Write the utility**

```typescript
import { db } from '../../config/database';

/**
 * Stage-based caseload weights.
 * intake=1.5 (high-touch), matching=1.2, proposed/accepted=1.0, placed=0.5, closed=0.0.
 * Stored as a backend constant — not org-configurable yet.
 */
const STAGE_WEIGHTS: Record<string, number> = {
  intake: 1.5,
  matching: 1.2,
  proposed: 1.0,
  accepted: 1.0,
  placed: 0.5,
  closed: 0.0,
};

export interface CaseloadResult {
  memberId: string;
  rawCount: number;
  weightedLoad: number;
  maxCaseload: number;
  utilizationPct: number; // (weightedLoad / maxCaseload) * 100
  byStage: Record<string, number>;
}

/**
 * Calculate weighted caseload for one or more org members.
 * Joins placements on case_manager_id, groups by stage, applies weights.
 */
export async function calculateCaseloads(
  orgId: string,
  memberIds?: string[],
): Promise<CaseloadResult[]> {
  let query = db('org_members')
    .where({ 'org_members.org_id': orgId, 'org_members.is_active': true })
    .whereIn('org_members.role', ['case_manager', 'program_director'])
    .leftJoin('placements', function () {
      this.on('placements.case_manager_id', '=', 'org_members.id')
        .andOn('placements.org_id', '=', 'org_members.org_id')
        .andOnVal('placements.stage', '!=', 'closed');
    })
    .select(
      'org_members.id as member_id',
      'org_members.max_caseload',
      'placements.stage',
    )
    .select(db.raw('COUNT(placements.id) as stage_count'))
    .groupBy('org_members.id', 'org_members.max_caseload', 'placements.stage');

  if (memberIds && memberIds.length > 0) {
    query = query.whereIn('org_members.id', memberIds);
  }

  const rows: Array<{
    member_id: string;
    max_caseload: number;
    stage: string | null;
    stage_count: string;
  }> = await query;

  // Aggregate by member
  const memberMap = new Map<string, CaseloadResult>();

  for (const row of rows) {
    if (!memberMap.has(row.member_id)) {
      memberMap.set(row.member_id, {
        memberId: row.member_id,
        rawCount: 0,
        weightedLoad: 0,
        maxCaseload: row.max_caseload || 25,
        utilizationPct: 0,
        byStage: {},
      });
    }
    const result = memberMap.get(row.member_id)!;
    const count = parseInt(row.stage_count) || 0;
    const stage = row.stage;

    if (stage && count > 0) {
      result.rawCount += count;
      result.byStage[stage] = count;
      result.weightedLoad += count * (STAGE_WEIGHTS[stage] ?? 1.0);
    }
  }

  // Calculate utilization
  for (const result of memberMap.values()) {
    result.weightedLoad = Math.round(result.weightedLoad * 10) / 10; // 1 decimal
    result.utilizationPct = result.maxCaseload > 0
      ? Math.round((result.weightedLoad / result.maxCaseload) * 100)
      : 0;
  }

  return Array.from(memberMap.values());
}

export { STAGE_WEIGHTS };
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add backend/src/features/placement/caseloadCalculator.ts
git commit -m "feat: add weighted caseload calculator utility"
```

---

## Task 8: Staff Suggestions Endpoint

**Files:**
- Modify: `backend/src/features/placement/placement.controller.ts` (add `getStaffSuggestions` method)
- Modify: `backend/src/features/placement/placement.routes.ts` (add route)

**Context:** `GET /orgs/:orgSlug/staff/suggestions?placement_id=xxx` — returns ranked list of case managers with scores. Scoring: caseload 40%, specialization 30%, language 20%, geo 10% (all equal for now).

**Step 1: Add the controller method**

In `backend/src/features/placement/placement.controller.ts`, add this import at the top (after existing imports):

```typescript
import { calculateCaseloads } from './caseloadCalculator';
import ProgramModel from '../../models/Program';
```

Then add this method to `PlacementController` (before the closing `};`):

```typescript
  /**
   * GET /api/orgs/:orgSlug/staff/suggestions?placement_id=xxx
   * Returns ranked list of eligible case managers with weighted scores.
   */
  async getStaffSuggestions(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placementId = req.query.placement_id as string;

      if (!placementId) {
        return res.status(400).json({ success: false, message: 'placement_id is required' });
      }

      // Get placement with client details
      const placement = await PlacementModel.findById(orgId, placementId);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }

      const client = await ClientModel.findById(orgId, placement.client_id);

      // Get program type for specialization matching
      let programType: string | null = null;
      if (placement.program_id) {
        const program = await ProgramModel.findById(orgId, placement.program_id);
        programType = program?.type || null;
      }

      // Get all active staff who can be assigned (case_manager or program_director)
      const members = await db('org_members')
        .where({ org_id: orgId, is_active: true })
        .whereIn('role', ['case_manager', 'program_director'])
        .join('users', 'org_members.user_id', 'users.id')
        .select(
          'org_members.id',
          'org_members.role',
          'org_members.specializations',
          'org_members.max_caseload',
          'users.email',
          'users.first_name',
          'users.last_name',
        );

      if (members.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Get weighted caseloads for all members
      const caseloads = await calculateCaseloads(orgId);
      const caseloadMap = new Map(caseloads.map((c) => [c.memberId, c]));

      // Score each member
      const scored = members.map((m: any) => {
        const caseload = caseloadMap.get(m.id);
        const utilization = caseload?.utilizationPct ?? 0;
        const maxCaseload = caseload?.maxCaseload ?? m.max_caseload ?? 25;
        const weightedLoad = caseload?.weightedLoad ?? 0;

        // Caseload score (40%): lower utilization = higher score
        const caseloadScore = Math.max(0, 100 - utilization);

        // Specialization score (30%): does worker specialize in this program type?
        const specs: string[] = Array.isArray(m.specializations)
          ? m.specializations
          : JSON.parse(m.specializations || '[]');
        const specScore = programType && specs.includes(programType) ? 100 : 0;

        // Language score (20%): does worker speak client's primary language?
        // For now, check if worker email domain suggests language match — simplified.
        // In production, add language_spoken to org_members.
        const langScore = 50; // neutral default — all workers score equally until language field added

        // Geographic score (10%): future — all workers score equally for now
        const geoScore = 50;

        const totalScore = Math.round(
          caseloadScore * 0.4 + specScore * 0.3 + langScore * 0.2 + geoScore * 0.1,
        );

        return {
          id: m.id,
          name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
          email: m.email,
          role: m.role,
          weightedLoad,
          maxCaseload,
          utilizationPct: utilization,
          specializations: specs,
          totalScore,
          breakdown: {
            caseload: Math.round(caseloadScore * 0.4),
            specialization: Math.round(specScore * 0.3),
            language: Math.round(langScore * 0.2),
            geographic: Math.round(geoScore * 0.1),
          },
        };
      });

      // Sort by total score descending
      scored.sort((a: any, b: any) => b.totalScore - a.totalScore);

      return res.json({ success: true, data: scored });
    } catch (err) {
      console.error('getStaffSuggestions error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
```

**Step 2: Add the route**

In `backend/src/features/placement/placement.routes.ts`, add this route (after existing org-scoped routes, before the `export`):

```typescript
router.get('/:orgSlug/staff/suggestions', ...orgMiddleware, PlacementController.getStaffSuggestions);
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 4: Test manually**

Run: `curl -s http://localhost:3000/api/orgs/charlotte-housing/staff/suggestions?placement_id=<ANY_PLACEMENT_ID> -H "Authorization: Bearer <TOKEN>" | jq .`
Expected: JSON array of scored staff members with `totalScore`, `weightedLoad`, `utilizationPct`, and `breakdown`.

**Step 5: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts backend/src/features/placement/placement.routes.ts
git commit -m "feat: add staff suggestion endpoint with weighted scoring"
```

---

## Task 9: Assignment Endpoint

**Files:**
- Modify: `backend/src/features/placement/placement.controller.ts` (add `assignCaseManager` method)
- Modify: `backend/src/features/placement/placement.routes.ts` (add route)

**Context:** `PATCH /orgs/:orgSlug/placements/:id/assign` — updates case_manager_id on placement + client, reassigns open tasks, logs activity event. One transaction.

**Step 1: Add the controller method**

In `backend/src/features/placement/placement.controller.ts`, add this method to `PlacementController`:

```typescript
  /**
   * PATCH /api/orgs/:orgSlug/placements/:id/assign
   * Assign (or reassign) a case manager to a placement.
   * Updates placement.case_manager_id, client.case_manager_id, and reassigns open tasks.
   */
  async assignCaseManager(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placementId = req.params.id;
      const { case_manager_id } = req.body;

      if (!case_manager_id) {
        return res.status(400).json({ success: false, message: 'case_manager_id is required' });
      }

      // Verify the target member exists and is active
      const targetMember = await db('org_members')
        .where({ id: case_manager_id, org_id: orgId, is_active: true })
        .first();
      if (!targetMember) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      // Get placement
      const placement = await PlacementModel.findById(orgId, placementId);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }

      const previousManagerId = placement.case_manager_id;

      // Transaction: update placement, client, and tasks
      await db.transaction(async (trx: any) => {
        // Update placement
        await trx('placements')
          .where({ id: placementId, org_id: orgId })
          .update({ case_manager_id, updated_at: trx.fn.now() });

        // Update client
        await trx('clients')
          .where({ id: placement.client_id, org_id: orgId })
          .update({ case_manager_id, updated_at: trx.fn.now() });

        // Reassign open tasks
        await trx('tasks')
          .where({ placement_id: placementId, org_id: orgId })
          .whereNull('deleted_at')
          .whereIn('status', ['pending', 'in_progress'])
          .update({ assigned_to: case_manager_id, updated_at: trx.fn.now() });
      });

      // Log activity event
      const actorName = (req as any).user?.email || 'System';
      const targetName = await db('users').where({ id: targetMember.user_id }).select('email').first();

      await ActivityEventModel.create({
        org_id: orgId,
        client_id: placement.client_id,
        placement_id: placementId,
        actor_id: req.orgMember!.id,
        event_type: 'assignment',
        origin: 'user',
        title: `Case manager assigned`,
        metadata: {
          new_case_manager_id: case_manager_id,
          new_case_manager_email: targetName?.email,
          previous_case_manager_id: previousManagerId,
        },
      });

      const updated = await PlacementModel.findById(orgId, placementId);
      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('assignCaseManager error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
```

**Step 2: Add the route**

In `backend/src/features/placement/placement.routes.ts`:

```typescript
router.patch('/:orgSlug/placements/:id/assign', ...orgMiddleware, PlacementController.assignCaseManager);
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts backend/src/features/placement/placement.routes.ts
git commit -m "feat: add case manager assignment endpoint with transactional update"
```

---

## Task 10: Gate Status and Advance Endpoints

**Files:**
- Modify: `backend/src/features/placement/placement.controller.ts` (add `getGateStatus` and `advanceStage` methods)
- Modify: `backend/src/features/placement/placement.routes.ts` (add routes)

**Context:**
- `GET /orgs/:orgSlug/placements/:id/gate-status` — checks if all required tasks for current stage are complete
- `POST /orgs/:orgSlug/placements/:id/advance` — advances stage if gated tasks are done (or supervisor force-advances with reason)

**Step 1: Add gate-status controller method**

```typescript
  /**
   * GET /api/orgs/:orgSlug/placements/:id/gate-status
   * Returns whether all required tasks for the current stage are complete.
   */
  async getGateStatus(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placementId = req.params.id;

      const placement = await PlacementModel.findById(orgId, placementId);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }

      const requiredTasks = await TaskModel.findRequiredByPlacementStage(
        orgId,
        placementId,
        placement.stage,
      );

      const completed = requiredTasks.filter((t) => t.status === 'completed');
      const remaining = requiredTasks.filter((t) => t.status !== 'completed');

      return res.json({
        success: true,
        data: {
          ready: remaining.length === 0 && requiredTasks.length > 0,
          stage: placement.stage,
          totalRequired: requiredTasks.length,
          completedCount: completed.length,
          remainingCount: remaining.length,
          required_remaining: remaining,
          completed,
        },
      });
    } catch (err) {
      console.error('getGateStatus error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
```

**Step 2: Add advance controller method**

```typescript
  /**
   * POST /api/orgs/:orgSlug/placements/:id/advance
   * Advance placement to the next stage if gate conditions are met.
   * Supervisors (program_director+) can force-advance with a reason.
   */
  async advanceStage(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placementId = req.params.id;
      const { force_reason } = req.body;

      const placement = await PlacementModel.findById(orgId, placementId);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }

      // Determine next stage
      const stageOrder = ['intake', 'matching', 'proposed', 'accepted', 'placed', 'closed'];
      const currentIdx = stageOrder.indexOf(placement.stage);
      if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
        return res.status(400).json({ success: false, message: `Cannot advance from stage: ${placement.stage}` });
      }
      const nextStage = stageOrder[currentIdx + 1];

      // Check gate status
      const requiredTasks = await TaskModel.findRequiredByPlacementStage(
        orgId,
        placementId,
        placement.stage,
      );
      const remaining = requiredTasks.filter((t) => t.status !== 'completed');

      if (remaining.length > 0) {
        const role = req.orgMember!.role;
        const canOverride = ['program_director', 'org_admin', 'super_admin'].includes(role);

        if (!canOverride) {
          return res.status(403).json({
            success: false,
            message: `${remaining.length} required task(s) not completed`,
            data: { remaining },
          });
        }

        if (!force_reason) {
          return res.status(400).json({
            success: false,
            message: 'force_reason required when overriding incomplete tasks',
            data: { remaining },
          });
        }
      }

      // Advance stage
      const updated = await PlacementModel.updateStage(orgId, placementId, nextStage);

      // Log activity event
      const actorEmail = (req as any).user?.email || 'System';
      const stageEvent = await ActivityEventModel.create({
        org_id: orgId,
        client_id: placement.client_id,
        placement_id: placementId,
        actor_id: req.orgMember!.id,
        event_type: 'stage_change',
        origin: 'user',
        title: `Stage advanced: ${placement.stage} → ${nextStage}`,
        metadata: {
          from_stage: placement.stage,
          to_stage: nextStage,
          force_reason: force_reason || null,
          incomplete_tasks: remaining.length,
        },
      });

      // Generate auto-tasks for the new stage
      await generateAutoTasks({
        orgId,
        placementId,
        clientId: placement.client_id,
        stage: nextStage,
        actorId: req.orgMember!.id,
        actorName: actorEmail,
        assignToId: placement.case_manager_id,
        stageEventId: stageEvent.id,
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('advanceStage error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
```

**Step 3: Add the routes**

In `backend/src/features/placement/placement.routes.ts`:

```typescript
router.get('/:orgSlug/placements/:id/gate-status', ...orgMiddleware, PlacementController.getGateStatus);
router.post('/:orgSlug/placements/:id/advance', ...orgMiddleware, PlacementController.advanceStage);
```

**Step 4: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts backend/src/features/placement/placement.routes.ts
git commit -m "feat: add gate-status and advance-stage endpoints"
```

---

## Task 11: Enhanced Dashboard API

**Files:**
- Modify: `backend/src/features/placement/placement.controller.ts` (enhance `getDashboardData`)

**Context:** The existing `getDashboardData` returns `myTasks`, `stageCounts`, `taskCounts`, etc. Enhance it to include:
- Weighted caseload for current user (My View KPI)
- Task queue split: overdue / due_today / upcoming (instead of flat list)
- Staff workload with weighted caseloads (Team View)
- Placement stage for each task (for "Ready to advance?" badge)

**Step 1: Enhance the getDashboardData method**

Replace the existing `getDashboardData` method in `PlacementController` with:

```typescript
  async getDashboardData(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const memberId = req.orgMember!.id;

      const [stageCounts, clientCounts, myTasks, taskCounts, recentActivity, allCaseloads] =
        await Promise.all([
          PlacementModel.countByStage(orgId),
          ClientModel.countByOrg(orgId),
          TaskModel.findByAssignee(orgId, memberId),
          TaskModel.countByAssignee(orgId),
          ActivityEventModel.findByOrg(orgId, { limit: 10 }),
          calculateCaseloads(orgId),
        ]);

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const next7 = new Date(now);
      next7.setDate(next7.getDate() + 7);
      const next7Str = next7.toISOString().slice(0, 10);

      // Split tasks into overdue / due_today / upcoming
      const overdueTasks = myTasks.filter(
        (t) => t.due_date && t.due_date < todayStr && t.status !== 'completed',
      );
      const dueTodayTasks = myTasks.filter(
        (t) => t.due_date && t.due_date === todayStr && t.status !== 'completed',
      );
      const upcomingTasks = myTasks.filter(
        (t) => t.due_date && t.due_date > todayStr && t.due_date <= next7Str && t.status !== 'completed',
      );

      // My weighted caseload
      const myCaseload = allCaseloads.find((c) => c.memberId === memberId);

      // Staff workload (Team View) — augment with user names
      const memberDetails = await db('org_members')
        .where({ org_id: orgId, is_active: true })
        .whereIn('role', ['case_manager', 'program_director'])
        .join('users', 'org_members.user_id', 'users.id')
        .select(
          'org_members.id',
          'org_members.role',
          'org_members.specializations',
          'users.first_name',
          'users.last_name',
          'users.email',
        );

      const staffWorkload = allCaseloads.map((c) => {
        const details = memberDetails.find((m: any) => m.id === c.memberId);
        return {
          ...c,
          name: details
            ? `${details.first_name || ''} ${details.last_name || ''}`.trim() || details.email
            : 'Unknown',
          email: details?.email,
          role: details?.role,
          specializations: details?.specializations || [],
        };
      });

      return res.json({
        success: true,
        data: {
          // Existing (preserved for backward compat)
          stageCounts,
          clientCounts,
          myTasks,
          overdueTasks: overdueTasks.length,
          openTasks: myTasks.length,
          taskCounts,
          recentActivity,
          // New: structured task queue
          taskQueue: {
            overdue: overdueTasks.slice(0, 5),
            dueToday: dueTodayTasks.slice(0, 5),
            upcoming: upcomingTasks.slice(0, 5),
            overdueTotal: overdueTasks.length,
            dueTodayTotal: dueTodayTasks.length,
            upcomingTotal: upcomingTasks.length,
          },
          // New: my weighted caseload
          myCaseload: myCaseload || null,
          // New: staff workload for Team View
          staffWorkload,
        },
      });
    } catch (err) {
      console.error('getDashboardData error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts
git commit -m "feat: enhance dashboard API with task queue, weighted caseload, staff workload"
```

---

## Task 12: Frontend — Action-First Task Queue (My View)

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/page.tsx`

**Context:** Replace the existing "My Tasks" card with the action-first task queue: OVERDUE (red) → DUE TODAY (yellow) → UPCOMING (green), 5-item cap per section with "View All" links. Update KPI cards to show weighted caseload.

**Step 1: Update the DashboardData interface**

Add new fields to the `DashboardData` interface in `web/src/app/(dashboard)/[orgSlug]/page.tsx`:

```typescript
interface CaseloadData {
  memberId: string;
  rawCount: number;
  weightedLoad: number;
  maxCaseload: number;
  utilizationPct: number;
  byStage: Record<string, number>;
}

interface StaffWorkloadItem {
  memberId: string;
  name: string;
  email: string;
  role: string;
  rawCount: number;
  weightedLoad: number;
  maxCaseload: number;
  utilizationPct: number;
  specializations: string[];
  byStage: Record<string, number>;
}

interface TaskQueue {
  overdue: TaskItem[];
  dueToday: TaskItem[];
  upcoming: TaskItem[];
  overdueTotal: number;
  dueTodayTotal: number;
  upcomingTotal: number;
}

interface DashboardData {
  stageCounts: Record<string, number>;
  clientCounts: Record<string, number>;
  myTasks: TaskItem[];
  overdueTasks: number;
  openTasks: number;
  taskCounts: Array<{ assigned_to: string; total: number; overdue: number }>;
  recentActivity: ActivityEvent[];
  // New fields
  taskQueue: TaskQueue;
  myCaseload: CaseloadData | null;
  staffWorkload: StaffWorkloadItem[];
}
```

**Step 2: Replace the "My View" tab content**

Replace the "My View" tab (the `<TabsContent value="my-view">` section) with the action-first task queue. The full JSX for the new My View tab:

```tsx
<TabsContent value="my-view" className="space-y-6">
  {/* Task Queue */}
  {dashboard?.taskQueue && (
    <div className="space-y-4">
      {/* OVERDUE */}
      {dashboard.taskQueue.overdueTotal > 0 && (
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                OVERDUE ({dashboard.taskQueue.overdueTotal})
              </CardTitle>
              {dashboard.taskQueue.overdueTotal > 5 && (
                <a href={`/${orgSlug}/tasks?status=overdue`} className="text-xs text-muted-foreground hover:text-foreground">
                  View All
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.taskQueue.overdue.map((task) => (
              <a
                key={task.id}
                href={task.client_id ? `/${orgSlug}/clients/${task.client_id}` : '#'}
                className="flex items-center justify-between rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 hover:bg-red-500/10 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.client_first_name} {task.client_last_name}
                    {task.due_date && ` · Due ${new Date(task.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DUE TODAY */}
      {dashboard.taskQueue.dueTodayTotal > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                DUE TODAY ({dashboard.taskQueue.dueTodayTotal})
              </CardTitle>
              {dashboard.taskQueue.dueTodayTotal > 5 && (
                <a href={`/${orgSlug}/tasks?status=due_today`} className="text-xs text-muted-foreground hover:text-foreground">
                  View All
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.taskQueue.dueToday.map((task) => (
              <a
                key={task.id}
                href={task.client_id ? `/${orgSlug}/clients/${task.client_id}` : '#'}
                className="flex items-center justify-between rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 hover:bg-yellow-500/10 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.client_first_name} {task.client_last_name}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* UPCOMING */}
      {dashboard.taskQueue.upcomingTotal > 0 && (
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                UPCOMING ({dashboard.taskQueue.upcomingTotal})
              </CardTitle>
              {dashboard.taskQueue.upcomingTotal > 5 && (
                <a href={`/${orgSlug}/tasks?status=upcoming`} className="text-xs text-muted-foreground hover:text-foreground">
                  View All
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.taskQueue.upcoming.map((task) => (
              <a
                key={task.id}
                href={task.client_id ? `/${orgSlug}/clients/${task.client_id}` : '#'}
                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.client_first_name} {task.client_last_name}
                    {task.due_date && ` · ${new Date(task.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {dashboard.taskQueue.overdueTotal === 0 &&
        dashboard.taskQueue.dueTodayTotal === 0 &&
        dashboard.taskQueue.upcomingTotal === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No pending tasks.</p>
            </CardContent>
          </Card>
        )}
    </div>
  )}
</TabsContent>
```

**Step 3: Update the KPI cards**

Replace the "Active Cases" KPI card to show weighted caseload:

```tsx
{/* Active Cases — weighted */}
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Active Cases</p>
        <p className="text-2xl font-bold">
          {dashboard?.myCaseload
            ? `${dashboard.myCaseload.weightedLoad}/${dashboard.myCaseload.maxCaseload}`
            : totalActive}
        </p>
      </div>
      <Users className="h-8 w-8 text-muted-foreground" />
    </div>
    {dashboard?.myCaseload && (
      <p className={`text-xs mt-1 ${
        dashboard.myCaseload.utilizationPct >= 100
          ? 'text-red-400'
          : dashboard.myCaseload.utilizationPct >= 70
            ? 'text-yellow-400'
            : 'text-green-400'
      }`}>
        {dashboard.myCaseload.utilizationPct}% weighted capacity
      </p>
    )}
  </CardContent>
</Card>
```

**Step 4: Verify the page renders**

Run the dev server: `cd /Users/ghostmac/Development/conest/web && npm run dev`
Navigate to the dashboard page. Verify the task queue renders with overdue/today/upcoming sections.

**Step 5: Commit**

```bash
git add web/src/app/\(dashboard\)/\[orgSlug\]/page.tsx
git commit -m "feat: replace My View with action-first task queue and weighted caseload KPI"
```

---

## Task 13: Frontend — Team View Workload Panel

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/page.tsx` (enhance "Org Overview" tab)

**Context:** Replace the basic "Staff Workload" card with the weighted workload panel showing traffic-light colors, specializations, and caseload bars.

**Step 1: Replace the "Staff Workload" card in the Org Overview tab**

In the `<TabsContent value="org-overview">` section, replace the Staff Workload card with:

```tsx
{/* Staff Workload — weighted */}
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Staff Workload</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {(dashboard?.staffWorkload || []).length > 0 ? (
      dashboard!.staffWorkload.map((staff) => {
        const color =
          staff.utilizationPct >= 100
            ? 'red'
            : staff.utilizationPct >= 70
              ? 'yellow'
              : 'green';
        return (
          <div key={staff.memberId} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{staff.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(staff.specializations || []).map((s: string) => s.toUpperCase()).join(', ') || 'No specialization'}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className={`text-sm font-medium ${
                  color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {staff.weightedLoad}/{staff.maxCaseload}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({staff.utilizationPct}%)
                </span>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(staff.utilizationPct, 100)}%` }}
              />
            </div>
          </div>
        );
      })
    ) : (
      <p className="text-sm text-muted-foreground">No staff data available</p>
    )}
  </CardContent>
</Card>
```

**Step 2: Add "Avg Days to Place" KPI**

Add a new KPI card to the org-overview section. Compute average from `stageCounts` and placement data — or add it as a simple calculation from existing data. For the demo, add a placeholder that we can wire up later:

```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Avg Days to Place</p>
        <p className="text-2xl font-bold">23</p>
      </div>
      <Clock className="h-8 w-8 text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
  </CardContent>
</Card>
```

**Step 3: Verify the page renders**

Navigate to the dashboard page, click "Org Overview" tab. Verify staff workload panel shows weighted bars with traffic-light colors.

**Step 4: Commit**

```bash
git add web/src/app/\(dashboard\)/\[orgSlug\]/page.tsx
git commit -m "feat: add weighted staff workload panel and KPIs to Team View"
```

---

## Task 14: Frontend — Assignment Panel on Placement Detail

**Files:**
- Create: `web/src/components/assignment-panel.tsx`
- Modify: `web/src/app/(dashboard)/[orgSlug]/placements/[id]/page.tsx`

**Context:** Add an "Assign Case Manager" panel to the placement detail page. Shows suggested assignee + ranked list with scores.

**Step 1: Create the AssignmentPanel component**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface StaffSuggestion {
  id: string;
  name: string;
  email: string;
  role: string;
  weightedLoad: number;
  maxCaseload: number;
  utilizationPct: number;
  specializations: string[];
  totalScore: number;
  breakdown: {
    caseload: number;
    specialization: number;
    language: number;
    geographic: number;
  };
}

interface AssignmentPanelProps {
  orgSlug: string;
  placementId: string;
  currentManagerId: string | null;
  onAssigned?: () => void;
}

export function AssignmentPanel({ orgSlug, placementId, currentManagerId, onAssigned }: AssignmentPanelProps) {
  const [suggestions, setSuggestions] = useState<StaffSuggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await api.get(`/orgs/${orgSlug}/staff/suggestions?placement_id=${placementId}`);
        const data = res.data.data || [];
        setSuggestions(data);
        if (data.length > 0) {
          setSelectedId(data[0].id); // pre-select top suggestion
        }
      } catch {
        // API not ready
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestions();
  }, [orgSlug, placementId]);

  async function handleAssign() {
    if (!selectedId) return;
    setAssigning(true);
    try {
      await api.patch(`/orgs/${orgSlug}/placements/${placementId}/assign`, {
        case_manager_id: selectedId,
      });
      onAssigned?.();
    } catch {
      alert('Failed to assign case manager');
    } finally {
      setAssigning(false);
    }
  }

  function utilizationColor(pct: number) {
    if (pct >= 100) return 'text-red-400';
    if (pct >= 70) return 'text-yellow-400';
    return 'text-green-400';
  }

  function utilizationDot(pct: number) {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Loading suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  const selected = suggestions.find((s) => s.id === selectedId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Assign Case Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No eligible staff found</p>
        ) : (
          <>
            {suggestions.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                  selectedId === s.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      {idx === 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          Suggested
                        </span>
                      )}
                      {s.id === currentManagerId && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.specializations.map((sp) => sp.toUpperCase()).join(', ') || 'No specialization'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${utilizationDot(s.utilizationPct)}`} />
                      <span className={`text-sm font-medium ${utilizationColor(s.utilizationPct)}`}>
                        {s.weightedLoad}/{s.maxCaseload}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.utilizationPct}%</p>
                  </div>
                </div>
              </button>
            ))}

            {/* Score breakdown for selected */}
            {selected && (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2 space-y-1">
                <p className="font-medium text-foreground">Score breakdown:</p>
                <div className="flex justify-between">
                  <span>Caseload</span>
                  <span>{selected.breakdown.caseload}pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Specialization</span>
                  <span>{selected.breakdown.specialization}pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Language</span>
                  <span>{selected.breakdown.language}pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Geographic</span>
                  <span>{selected.breakdown.geographic}pts</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedId || selectedId === currentManagerId}
              className="w-full mt-2"
            >
              {assigning ? 'Assigning...' : `Assign ${selected?.name || ''}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Add AssignmentPanel to placement detail page**

In `web/src/app/(dashboard)/[orgSlug]/placements/[id]/page.tsx`:

Add the import:
```typescript
import { AssignmentPanel } from '@/components/assignment-panel';
```

Add state for the placement's case_manager_id (extracted from the placement response):
```typescript
const [caseManagerId, setCaseManagerId] = useState<string | null>(null);
```

In the `fetchData` function, after setting client:
```typescript
setCaseManagerId(placementRes.data.data?.case_manager_id || null);
```

Add the AssignmentPanel below the Client Profile card (inside the left column grid area):
```tsx
{/* Assignment Panel */}
<AssignmentPanel
  orgSlug={orgSlug}
  placementId={placementId}
  currentManagerId={caseManagerId}
  onAssigned={() => {
    // Refresh placement data
    api.get(`/orgs/${orgSlug}/placements/${placementId}`).then((res) => {
      setCaseManagerId(res.data.data?.case_manager_id || null);
    });
  }}
/>
```

**Step 3: Verify the page renders**

Navigate to any placement detail page. Verify the assignment panel appears with ranked staff suggestions and traffic-light colors.

**Step 4: Commit**

```bash
git add web/src/components/assignment-panel.tsx web/src/app/\(dashboard\)/\[orgSlug\]/placements/\[id\]/page.tsx
git commit -m "feat: add case manager assignment panel with weighted suggestions to placement detail"
```

---

## Task 15: Frontend — Stage Gating Banner on Placement Detail

**Files:**
- Create: `web/src/components/stage-gate-banner.tsx`
- Modify: `web/src/app/(dashboard)/[orgSlug]/placements/[id]/page.tsx`

**Context:** Show a "Ready to advance" banner when all required tasks are complete, or show remaining tasks when not. Include "Advance" button.

**Step 1: Create the StageGateBanner component**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

interface RemainingTask {
  id: string;
  title: string;
  status: string;
}

interface GateStatus {
  ready: boolean;
  stage: string;
  totalRequired: number;
  completedCount: number;
  remainingCount: number;
  required_remaining: RemainingTask[];
}

interface StageGateBannerProps {
  orgSlug: string;
  placementId: string;
  currentStage: string;
  onAdvanced?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  intake: 'Matching',
  matching: 'Proposed',
  proposed: 'Accepted',
  accepted: 'Placed',
  placed: 'Closed',
};

export function StageGateBanner({ orgSlug, placementId, currentStage, onAdvanced }: StageGateBannerProps) {
  const [gate, setGate] = useState<GateStatus | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    async function fetchGate() {
      try {
        const res = await api.get(`/orgs/${orgSlug}/placements/${placementId}/gate-status`);
        setGate(res.data.data);
      } catch {
        // API not ready
      }
    }
    fetchGate();
  }, [orgSlug, placementId, currentStage]);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await api.post(`/orgs/${orgSlug}/placements/${placementId}/advance`);
      onAdvanced?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to advance stage';
      alert(msg);
    } finally {
      setAdvancing(false);
    }
  }

  if (!gate || currentStage === 'closed') return null;

  const nextStage = STAGE_LABELS[currentStage];
  if (!nextStage) return null;

  if (gate.ready) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium">All {currentStage} tasks complete.</p>
            <p className="text-xs text-muted-foreground">Ready to advance to {nextStage}?</p>
          </div>
        </div>
        <Button size="sm" onClick={handleAdvance} disabled={advancing}>
          {advancing ? 'Advancing...' : `Advance to ${nextStage}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-muted px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {gate.completedCount} of {gate.totalRequired} {currentStage} tasks completed
        </p>
      </div>
      {gate.required_remaining.length > 0 && (
        <ul className="space-y-1 ml-6">
          {gate.required_remaining.map((task) => (
            <li key={task.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              {task.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Add StageGateBanner to placement detail page**

In `web/src/app/(dashboard)/[orgSlug]/placements/[id]/page.tsx`:

Add the import:
```typescript
import { StageGateBanner } from '@/components/stage-gate-banner';
```

Add state for placement stage:
```typescript
const [currentStage, setCurrentStage] = useState<string>('intake');
```

In `fetchData`, after setting client:
```typescript
setCurrentStage(placementRes.data.data?.stage || 'intake');
```

Add the banner at the top of the return JSX (inside the `<div className="space-y-6">`, before the `<h2>`):

```tsx
<StageGateBanner
  orgSlug={orgSlug}
  placementId={placementId}
  currentStage={currentStage}
  onAdvanced={() => {
    // Refresh the page data
    window.location.reload();
  }}
/>
```

**Step 3: Verify the page renders**

Navigate to a placement detail page. Verify:
- If tasks are incomplete: shows remaining tasks with progress count
- If all tasks complete: shows green "Ready to advance" banner with button

**Step 4: Commit**

```bash
git add web/src/components/stage-gate-banner.tsx web/src/app/\(dashboard\)/\[orgSlug\]/placements/\[id\]/page.tsx
git commit -m "feat: add stage gating banner with advance button to placement detail"
```

---

## Task 16: Final Verification

**Step 1: Run backend TypeScript check**

Run: `cd /Users/ghostmac/Development/conest/backend && npx tsc --noEmit`
Expected: No errors.

**Step 2: Run frontend build check**

Run: `cd /Users/ghostmac/Development/conest/web && npx next build`
Expected: Build succeeds with no errors.

**Step 3: Manual smoke test**

1. Navigate to dashboard → verify action-first task queue renders
2. Click "Org Overview" → verify staff workload panel with traffic-light bars
3. Navigate to any placement → verify assignment panel with scored suggestions
4. Navigate to any placement → verify stage gate banner shows correct status
5. Try assigning a different case manager → verify it updates

**Step 4: Commit any fixes**

If any TypeScript or build errors found, fix and commit.

---

## Summary

| Task | What | Files | Commit |
|------|------|-------|--------|
| 1 | Programs table migration | 1 create | `feat: add programs lookup table migration` |
| 2 | org_members caseload fields migration | 1 create | `feat: add specializations and max_caseload to org_members` |
| 3 | placements.program_id + tasks gating fields migration | 1 create | `feat: add program_id to placements, is_required/stage to tasks with backfill` |
| 4 | Program model | 1 create | `feat: add Program model` |
| 5 | Update OrgMember/Task interfaces + autoTasks | 3 modify | `feat: update OrgMember/Task interfaces, add gating fields to autoTasks` |
| 6 | Seed programs + staff specializations | 1 create | `feat: add program and staff specialization seed data` |
| 7 | Weighted caseload utility | 1 create | `feat: add weighted caseload calculator utility` |
| 8 | Staff suggestions endpoint | 2 modify | `feat: add staff suggestion endpoint with weighted scoring` |
| 9 | Assignment endpoint | 2 modify | `feat: add case manager assignment endpoint with transactional update` |
| 10 | Gate-status + advance endpoints | 2 modify | `feat: add gate-status and advance-stage endpoints` |
| 11 | Enhanced dashboard API | 1 modify | `feat: enhance dashboard API with task queue, weighted caseload, staff workload` |
| 12 | Frontend: My View task queue | 1 modify | `feat: replace My View with action-first task queue and weighted caseload KPI` |
| 13 | Frontend: Team View workload | 1 modify | `feat: add weighted staff workload panel and KPIs to Team View` |
| 14 | Frontend: Assignment panel | 1 create + 1 modify | `feat: add case manager assignment panel with weighted suggestions` |
| 15 | Frontend: Stage gate banner | 1 create + 1 modify | `feat: add stage gating banner with advance button` |
| 16 | Final verification | 0 | Fix commits as needed |

**Total:** ~14 new/modified backend files, ~5 new/modified frontend files, 16 commits.
