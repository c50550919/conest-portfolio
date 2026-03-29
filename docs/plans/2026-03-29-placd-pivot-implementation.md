# Placd Pivot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a credible Placd demo (login, client roster, placement pipeline, match view, compliance report, org settings) in 2-3 weeks to run discovery calls and close a paid pilot.

**Architecture:** Keep existing Express backend (Knex + PostgreSQL + Redis). Add multi-tenant tables and org-scoped query layer. Build new Next.js App Router frontend in `/web` with shadcn/ui + Tailwind. Demo uses real auth + matching engine, seed data for everything else.

**Tech Stack:** Express 4.x, Knex 3.x, PostgreSQL 15 + PostGIS, Redis 7, Next.js 14+ (App Router), TypeScript 5.x, shadcn/ui, Tailwind CSS, Docker Compose

**Design Doc:** `docs/plans/2026-03-29-placd-pivot-design.md`

---

## Phase 0: Repository Snapshot (30 min)

### Task 0.1: Snapshot CoNest to Public Portfolio Repo

**Files:**
- Modify: `.gitignore` (verify secrets excluded)

**Step 1: Create sanitized snapshot branch**

```bash
git checkout main
git checkout -b conest-portfolio-snapshot
```

**Step 2: Verify no secrets in tracked files**

```bash
# Check for .env files, API keys, credentials
grep -r "sk_live\|sk_test\|SENDGRID_API_KEY\|AWS_SECRET" --include="*.ts" --include="*.js" --include="*.json" --include="*.env" .
# Should return nothing from tracked files (only .env which is gitignored)
```

**Step 3: Remove seed data with real names if any exist**

Check `backend/src/seeds/` and `backend/scripts/` for any real PII in seed data. Replace with synthetic data if found.

**Step 4: Add SECURITY.md to snapshot**

Create `SECURITY.md` at repo root:
```markdown
# Security Notice

This is a **portfolio/demonstration repository**. It contains no production data, credentials, or active service configurations.

- No real user data has ever been stored in this codebase
- All API keys and secrets shown in config files are placeholders
- This application is not deployed or serving live traffic

For questions, contact the repository owner.
```

**Step 5: Commit and note for later**

```bash
git add -A
git commit -m "chore: prepare CoNest portfolio snapshot with security notice"
```

> **Note:** Push to a new public repo (`conest-portfolio`) after the pivot branch work is underway. Don't block on this.

**Step 6: Return to pivot branch**

```bash
git checkout 005-slim-onboarding-housing
git checkout -b placd-pivot
```

---

## Phase 1: Backend Multi-Tenancy (Days 1-4)

### Task 1.1: Create Organizations Table Migration

**Files:**
- Create: `backend/src/migrations/20260329000001_create_organizations.ts`
- Test: `backend/__tests__/migrations/organizations.test.ts`

**Step 1: Write the migration**

```typescript
// backend/src/migrations/20260329000001_create_organizations.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.enum('plan_tier', ['starter', 'professional', 'enterprise']).notNullable().defaultTo('starter');
    table.string('stripe_customer_id', 255).nullable();
    table.jsonb('settings').notNullable().defaultTo('{}');
    table.string('phone', 20).nullable();
    table.string('email', 255).nullable();
    table.string('website', 255).nullable();
    table.string('address', 500).nullable();
    table.string('city', 100).nullable();
    table.string('state', 2).nullable();
    table.string('zip', 10).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_organizations_slug ON organizations (slug);
    CREATE INDEX idx_organizations_plan_tier ON organizations (plan_tier);
    CREATE INDEX idx_organizations_is_active ON organizations (is_active);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organizations');
}
```

**Step 2: Run migration**

```bash
cd backend && npx knex migrate:latest
```
Expected: Migration runs successfully, `organizations` table created.

**Step 3: Write integration test**

```typescript
// backend/__tests__/migrations/organizations.test.ts
import db from '../../src/config/database';

describe('organizations table', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('should exist with required columns', async () => {
    const columns = await db('organizations').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('slug');
    expect(columns).toHaveProperty('plan_tier');
    expect(columns).toHaveProperty('stripe_customer_id');
    expect(columns).toHaveProperty('settings');
    expect(columns).toHaveProperty('is_active');
  });

  it('should enforce unique slug', async () => {
    const org = { name: 'Test Org', slug: 'test-org' };
    await db('organizations').insert(org);
    await expect(db('organizations').insert(org)).rejects.toThrow();
    await db('organizations').where({ slug: 'test-org' }).del();
  });
});
```

**Step 4: Run test**

```bash
cd backend && npx jest __tests__/migrations/organizations.test.ts --verbose
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/migrations/20260329000001_create_organizations.ts backend/__tests__/migrations/organizations.test.ts
git commit -m "feat: add organizations table for multi-tenancy"
```

---

### Task 1.2: Create Org Members Table Migration

**Files:**
- Create: `backend/src/migrations/20260329000002_create_org_members.ts`

**Step 1: Write the migration**

```typescript
// backend/src/migrations/20260329000002_create_org_members.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('org_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['case_manager', 'program_director', 'org_admin', 'super_admin']).notNullable().defaultTo('case_manager');
    table.timestamp('invited_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.unique(['org_id', 'user_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_org_members_org_id ON org_members (org_id);
    CREATE INDEX idx_org_members_user_id ON org_members (user_id);
    CREATE INDEX idx_org_members_role ON org_members (role);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('org_members');
}
```

**Step 2: Run migration**

```bash
cd backend && npx knex migrate:latest
```

**Step 3: Commit**

```bash
git add backend/src/migrations/20260329000002_create_org_members.ts
git commit -m "feat: add org_members table with RBAC roles"
```

---

### Task 1.3: Create Clients Table Migration

**Files:**
- Create: `backend/src/migrations/20260329000003_create_clients.ts`

**Step 1: Write the migration**

```typescript
// backend/src/migrations/20260329000003_create_clients.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.integer('household_size').notNullable().defaultTo(1);
    table.string('income_range', 50).nullable();
    table.string('language_primary', 50).nullable();
    table.string('language_secondary', 50).nullable();
    table.jsonb('cultural_preferences').notNullable().defaultTo('{}');
    table.jsonb('accessibility_needs').notNullable().defaultTo('{}');
    table.specificType('location_preference', 'geography(Point, 4326)').nullable();
    table.string('preferred_area', 255).nullable();
    table.integer('budget_max').nullable();
    table.enum('status', ['intake', 'ready', 'placed', 'exited']).notNullable().defaultTo('intake');
    table.uuid('case_manager_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.date('intake_date').nullable();
    table.text('notes_encrypted').nullable();
    table.string('phone', 20).nullable();
    table.string('email', 255).nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_clients_org_id ON clients (org_id);
    CREATE INDEX idx_clients_status ON clients (status);
    CREATE INDEX idx_clients_case_manager_id ON clients (case_manager_id);
    CREATE INDEX idx_clients_org_status ON clients (org_id, status);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clients');
}
```

**Step 2: Run migration and commit**

```bash
cd backend && npx knex migrate:latest
git add backend/src/migrations/20260329000003_create_clients.ts
git commit -m "feat: add clients table for housing placement tracking"
```

---

### Task 1.4: Create Housing Units Table Migration

**Files:**
- Create: `backend/src/migrations/20260329000004_create_housing_units.ts`

**Step 1: Write the migration**

```typescript
// backend/src/migrations/20260329000004_create_housing_units.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('housing_units', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('address', 500).notNullable();
    table.string('city', 100).notNullable();
    table.string('state', 2).notNullable();
    table.string('zip', 10).notNullable();
    table.specificType('location', 'geography(Point, 4326)').nullable();
    table.integer('bedrooms').notNullable();
    table.integer('bathrooms').notNullable();
    table.integer('rent_amount').notNullable();
    table.string('landlord_name', 255).nullable();
    table.string('landlord_contact', 255).nullable();
    table.jsonb('accessibility_features').notNullable().defaultTo('[]');
    table.string('language_spoken', 50).nullable();
    table.date('available_from').nullable();
    table.date('available_until').nullable();
    table.enum('status', ['available', 'reserved', 'occupied', 'inactive']).notNullable().defaultTo('available');
    table.jsonb('nearby_services').notNullable().defaultTo('{}');
    table.text('notes').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_housing_units_org_id ON housing_units (org_id);
    CREATE INDEX idx_housing_units_status ON housing_units (status);
    CREATE INDEX idx_housing_units_org_status ON housing_units (org_id, status);
    CREATE INDEX idx_housing_units_rent ON housing_units (rent_amount);
    CREATE INDEX idx_housing_units_bedrooms ON housing_units (bedrooms);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('housing_units');
}
```

**Step 2: Run migration and commit**

```bash
cd backend && npx knex migrate:latest
git add backend/src/migrations/20260329000004_create_housing_units.ts
git commit -m "feat: add housing_units table for unit inventory"
```

---

### Task 1.5: Create Placements Table Migration

**Files:**
- Create: `backend/src/migrations/20260329000005_create_placements.ts`

**Step 1: Write the migration**

```typescript
// backend/src/migrations/20260329000005_create_placements.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('placements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('unit_id').nullable().references('id').inTable('housing_units').onDelete('SET NULL');
    table.uuid('case_manager_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.enum('stage', ['intake', 'matching', 'proposed', 'accepted', 'placed', 'closed']).notNullable().defaultTo('intake');
    table.decimal('compatibility_score', 5, 2).nullable();
    table.jsonb('score_breakdown').nullable();
    table.timestamp('proposed_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.timestamp('placed_at').nullable();
    table.timestamp('closed_at').nullable();
    table.enum('outcome', ['successful', 'unsuccessful', 'withdrawn']).nullable();
    table.text('notes_encrypted').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_placements_org_id ON placements (org_id);
    CREATE INDEX idx_placements_client_id ON placements (client_id);
    CREATE INDEX idx_placements_unit_id ON placements (unit_id);
    CREATE INDEX idx_placements_stage ON placements (stage);
    CREATE INDEX idx_placements_org_stage ON placements (org_id, stage);
    CREATE INDEX idx_placements_case_manager ON placements (case_manager_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('placements');
}
```

**Step 2: Run migration and commit**

```bash
cd backend && npx knex migrate:latest
git add backend/src/migrations/20260329000005_create_placements.ts
git commit -m "feat: add placements table with pipeline stage tracking"
```

---

### Task 1.6: Build Org-Scoped Query Helper

**Files:**
- Create: `backend/src/lib/orgScope.ts`
- Test: `backend/__tests__/lib/orgScope.test.ts`

**Step 1: Write the failing test**

```typescript
// backend/__tests__/lib/orgScope.test.ts
import db from '../../src/config/database';
import { scopedQuery, withOrgScope } from '../../src/lib/orgScope';

describe('orgScope', () => {
  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const otherOrgId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    await db('organizations').insert([
      { id: testOrgId, name: 'Test Org', slug: 'test-org' },
      { id: otherOrgId, name: 'Other Org', slug: 'other-org' },
    ]);
  });

  afterAll(async () => {
    await db('organizations').whereIn('id', [testOrgId, otherOrgId]).del();
    await db.destroy();
  });

  describe('scopedQuery', () => {
    it('should return a knex query builder scoped to org_id', () => {
      const query = scopedQuery('organizations', testOrgId);
      const sql = query.toSQL();
      expect(sql.sql).toContain('org_id');
    });
  });

  describe('withOrgScope', () => {
    it('should provide scoped query methods for a given org', () => {
      const scoped = withOrgScope(testOrgId);
      expect(scoped.query).toBeDefined();
      expect(scoped.orgId).toBe(testOrgId);
    });

    it('should scope queries to the given org_id', async () => {
      const scoped = withOrgScope(testOrgId);
      const query = scoped.query('organizations');
      const sql = query.toSQL();
      expect(sql.sql).toContain('org_id');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npx jest __tests__/lib/orgScope.test.ts --verbose
```
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// backend/src/lib/orgScope.ts
import db from '../config/database';
import { Knex } from 'knex';

/**
 * Returns a Knex query builder pre-scoped to a specific org_id.
 * Use this instead of raw db('table') to enforce tenant isolation.
 */
export function scopedQuery(table: string, orgId: string): Knex.QueryBuilder {
  if (!orgId) {
    throw new Error('orgId is required for scoped queries');
  }
  return db(table).where({ org_id: orgId });
}

/**
 * Returns an org-scoped context object with a bound query helper.
 * Usage:
 *   const scoped = withOrgScope(req.orgId);
 *   const clients = await scoped.query('clients').where({ status: 'ready' });
 */
export function withOrgScope(orgId: string) {
  if (!orgId) {
    throw new Error('orgId is required for org scope');
  }

  return {
    orgId,
    query: (table: string) => db(table).where({ org_id: orgId }),
    insert: (table: string, data: Record<string, unknown> | Record<string, unknown>[]) => {
      const rows = Array.isArray(data) ? data : [data];
      const scopedRows = rows.map((row) => ({ ...row, org_id: orgId }));
      return db(table).insert(scopedRows).returning('*');
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
cd backend && npx jest __tests__/lib/orgScope.test.ts --verbose
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/lib/orgScope.ts backend/__tests__/lib/orgScope.test.ts
git commit -m "feat: add org-scoped query helper for tenant isolation"
```

---

### Task 1.7: Create Organization and OrgMember Models

**Files:**
- Create: `backend/src/models/Organization.ts`
- Create: `backend/src/models/OrgMember.ts`

**Step 1: Write Organization model**

```typescript
// backend/src/models/Organization.ts
import db from '../config/database';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: 'starter' | 'professional' | 'enterprise';
  stripe_customer_id: string | null;
  settings: Record<string, unknown>;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const Organization = {
  async findById(id: string): Promise<Organization | undefined> {
    return db('organizations').where({ id }).first();
  },

  async findBySlug(slug: string): Promise<Organization | undefined> {
    return db('organizations').where({ slug, is_active: true }).first();
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    const [org] = await db('organizations').insert(data).returning('*');
    return org;
  },

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const [org] = await db('organizations').where({ id }).update({ ...data, updated_at: db.fn.now() }).returning('*');
    return org;
  },
};

export default Organization;
```

**Step 2: Write OrgMember model**

```typescript
// backend/src/models/OrgMember.ts
import db from '../config/database';

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'case_manager' | 'program_director' | 'org_admin' | 'super_admin';
  invited_at: Date | null;
  accepted_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const OrgMember = {
  async findByOrgAndUser(orgId: string, userId: string): Promise<OrgMember | undefined> {
    return db('org_members').where({ org_id: orgId, user_id: userId, is_active: true }).first();
  },

  async findByOrg(orgId: string): Promise<OrgMember[]> {
    return db('org_members')
      .join('users', 'org_members.user_id', 'users.id')
      .where({ 'org_members.org_id': orgId, 'org_members.is_active': true })
      .select('org_members.*', 'users.email', 'users.first_name', 'users.last_name');
  },

  async create(data: Partial<OrgMember>): Promise<OrgMember> {
    const [member] = await db('org_members').insert(data).returning('*');
    return member;
  },

  async updateRole(id: string, role: OrgMember['role']): Promise<OrgMember> {
    const [member] = await db('org_members').where({ id }).update({ role, updated_at: db.fn.now() }).returning('*');
    return member;
  },

  async getUserOrgs(userId: string): Promise<Array<OrgMember & { org_name: string; org_slug: string }>> {
    return db('org_members')
      .join('organizations', 'org_members.org_id', 'organizations.id')
      .where({ 'org_members.user_id': userId, 'org_members.is_active': true })
      .select('org_members.*', 'organizations.name as org_name', 'organizations.slug as org_slug');
  },
};

export default OrgMember;
```

**Step 3: Commit**

```bash
git add backend/src/models/Organization.ts backend/src/models/OrgMember.ts
git commit -m "feat: add Organization and OrgMember models"
```

---

### Task 1.8: Create Client and HousingUnit Models

**Files:**
- Create: `backend/src/models/Client.ts`
- Create: `backend/src/models/HousingUnit.ts`

**Step 1: Write Client model** (follows existing project pattern from Parent.ts)

```typescript
// backend/src/models/Client.ts
import db from '../config/database';

export interface Client {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  household_size: number;
  income_range: string | null;
  language_primary: string | null;
  language_secondary: string | null;
  cultural_preferences: Record<string, unknown>;
  accessibility_needs: Record<string, unknown>;
  location_preference: unknown;
  preferred_area: string | null;
  budget_max: number | null;
  status: 'intake' | 'ready' | 'placed' | 'exited';
  case_manager_id: string | null;
  intake_date: string | null;
  notes_encrypted: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

const ClientModel = {
  async findByOrg(orgId: string, filters?: { status?: string; case_manager_id?: string }): Promise<Client[]> {
    let query = db('clients').where({ org_id: orgId });
    if (filters?.status) query = query.where({ status: filters.status });
    if (filters?.case_manager_id) query = query.where({ case_manager_id: filters.case_manager_id });
    return query.orderBy('created_at', 'desc');
  },

  async findById(orgId: string, id: string): Promise<Client | undefined> {
    return db('clients').where({ id, org_id: orgId }).first();
  },

  async create(data: Partial<Client>): Promise<Client> {
    const [client] = await db('clients').insert(data).returning('*');
    return client;
  },

  async update(orgId: string, id: string, data: Partial<Client>): Promise<Client> {
    const [client] = await db('clients').where({ id, org_id: orgId }).update({ ...data, updated_at: db.fn.now() }).returning('*');
    return client;
  },

  async countByOrg(orgId: string): Promise<Record<string, number>> {
    const counts = await db('clients')
      .where({ org_id: orgId })
      .groupBy('status')
      .select('status')
      .count('* as count');
    return counts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
  },
};

export default ClientModel;
```

**Step 2: Write HousingUnit model**

```typescript
// backend/src/models/HousingUnit.ts
import db from '../config/database';

export interface HousingUnit {
  id: string;
  org_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  location: unknown;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  landlord_name: string | null;
  landlord_contact: string | null;
  accessibility_features: string[];
  language_spoken: string | null;
  available_from: string | null;
  available_until: string | null;
  status: 'available' | 'reserved' | 'occupied' | 'inactive';
  nearby_services: Record<string, unknown>;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const HousingUnitModel = {
  async findByOrg(orgId: string, filters?: { status?: string; min_bedrooms?: number }): Promise<HousingUnit[]> {
    let query = db('housing_units').where({ org_id: orgId });
    if (filters?.status) query = query.where({ status: filters.status });
    if (filters?.min_bedrooms) query = query.where('bedrooms', '>=', filters.min_bedrooms);
    return query.orderBy('created_at', 'desc');
  },

  async findById(orgId: string, id: string): Promise<HousingUnit | undefined> {
    return db('housing_units').where({ id, org_id: orgId }).first();
  },

  async findAvailable(orgId: string): Promise<HousingUnit[]> {
    return db('housing_units')
      .where({ org_id: orgId, status: 'available' })
      .orderBy('rent_amount', 'asc');
  },

  async create(data: Partial<HousingUnit>): Promise<HousingUnit> {
    const [unit] = await db('housing_units').insert(data).returning('*');
    return unit;
  },

  async update(orgId: string, id: string, data: Partial<HousingUnit>): Promise<HousingUnit> {
    const [unit] = await db('housing_units').where({ id, org_id: orgId }).update({ ...data, updated_at: db.fn.now() }).returning('*');
    return unit;
  },
};

export default HousingUnitModel;
```

**Step 3: Commit**

```bash
git add backend/src/models/Client.ts backend/src/models/HousingUnit.ts
git commit -m "feat: add Client and HousingUnit models with org-scoped queries"
```

---

### Task 1.9: Create Placement Model + Matching Service (Client → Unit)

**Files:**
- Create: `backend/src/models/Placement.ts`
- Create: `backend/src/features/placement/placement.service.ts`
- Test: `backend/__tests__/features/placement/placement.service.test.ts`

**Step 1: Write Placement model**

```typescript
// backend/src/models/Placement.ts
import db from '../config/database';

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
  created_at: Date;
  updated_at: Date;
}

const PlacementModel = {
  async findByOrg(orgId: string, filters?: { stage?: string }): Promise<Placement[]> {
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
        'housing_units.bedrooms as unit_bedrooms'
      );
    if (filters?.stage) query = query.where({ 'placements.stage': filters.stage });
    return query.orderBy('placements.updated_at', 'desc');
  },

  async findById(orgId: string, id: string): Promise<Placement | undefined> {
    return db('placements').where({ id, org_id: orgId }).first();
  },

  async create(data: Partial<Placement>): Promise<Placement> {
    const [placement] = await db('placements').insert(data).returning('*');
    return placement;
  },

  async updateStage(orgId: string, id: string, stage: Placement['stage'], extra?: Partial<Placement>): Promise<Placement> {
    const stageTimestamps: Record<string, string> = {
      proposed: 'proposed_at',
      accepted: 'accepted_at',
      placed: 'placed_at',
      closed: 'closed_at',
    };
    const update: Record<string, unknown> = { stage, updated_at: db.fn.now(), ...extra };
    if (stageTimestamps[stage]) {
      update[stageTimestamps[stage]] = db.fn.now();
    }
    const [placement] = await db('placements').where({ id, org_id: orgId }).update(update).returning('*');
    return placement;
  },

  async countByStage(orgId: string): Promise<Record<string, number>> {
    const counts = await db('placements')
      .where({ org_id: orgId })
      .groupBy('stage')
      .select('stage')
      .count('* as count');
    return counts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.stage] = parseInt(row.count);
      return acc;
    }, {});
  },
};

export default PlacementModel;
```

**Step 2: Write placement matching service (Client → Unit)**

```typescript
// backend/src/features/placement/placement.service.ts
import HousingUnitModel, { HousingUnit } from '../../models/HousingUnit';
import { Client } from '../../models/Client';

interface MatchScore {
  unitId: string;
  totalScore: number;
  breakdown: {
    location: number;
    budget: number;
    householdSize: number;
    languageCultural: number;
    accessibility: number;
    servicesProximity: number;
  };
}

// Default weights — org-configurable in settings.matching_weights
const DEFAULT_WEIGHTS = {
  location: 0.25,
  budget: 0.25,
  householdSize: 0.20,
  languageCultural: 0.15,
  accessibility: 0.10,
  servicesProximity: 0.05,
};

export const PlacementMatchingService = {
  /**
   * Score a single client against a single unit.
   */
  scoreClientUnit(client: Client, unit: HousingUnit, weights = DEFAULT_WEIGHTS): MatchScore {
    const breakdown = {
      location: this.scoreLocation(client, unit),
      budget: this.scoreBudget(client, unit),
      householdSize: this.scoreHouseholdSize(client, unit),
      languageCultural: this.scoreLanguageCultural(client, unit),
      accessibility: this.scoreAccessibility(client, unit),
      servicesProximity: this.scoreServicesProximity(client, unit),
    };

    const totalScore =
      breakdown.location * weights.location +
      breakdown.budget * weights.budget +
      breakdown.householdSize * weights.householdSize +
      breakdown.languageCultural * weights.languageCultural +
      breakdown.accessibility * weights.accessibility +
      breakdown.servicesProximity * weights.servicesProximity;

    return { unitId: unit.id, totalScore: Math.round(totalScore * 100) / 100, breakdown };
  },

  /**
   * Find top N matching units for a client from available inventory.
   */
  async findTopMatches(
    orgId: string,
    client: Client,
    topN: number = 3,
    weights = DEFAULT_WEIGHTS
  ): Promise<MatchScore[]> {
    const availableUnits = await HousingUnitModel.findAvailable(orgId);
    const scores = availableUnits.map((unit) => this.scoreClientUnit(client, unit, weights));
    scores.sort((a, b) => b.totalScore - a.totalScore);
    return scores.slice(0, topN);
  },

  // --- Scoring functions (0.0 to 1.0) ---

  scoreBudget(client: Client, unit: HousingUnit): number {
    if (!client.budget_max) return 0.5; // No budget preference = neutral
    if (unit.rent_amount <= client.budget_max) return 1.0;
    const overBudgetPct = (unit.rent_amount - client.budget_max) / client.budget_max;
    if (overBudgetPct <= 0.1) return 0.7;
    if (overBudgetPct <= 0.2) return 0.4;
    return 0.1;
  },

  scoreHouseholdSize(client: Client, unit: HousingUnit): number {
    const needed = Math.ceil(client.household_size / 2); // ~2 people per bedroom
    if (unit.bedrooms >= needed) return 1.0;
    if (unit.bedrooms === needed - 1) return 0.5;
    return 0.1;
  },

  scoreLocation(client: Client, unit: HousingUnit): number {
    // For demo: simple area string matching. PostGIS distance scoring in MVP.
    if (!client.preferred_area) return 0.5;
    if (!unit.city) return 0.3;
    if (client.preferred_area.toLowerCase().includes(unit.city.toLowerCase())) return 1.0;
    return 0.3;
  },

  scoreLanguageCultural(client: Client, unit: HousingUnit): number {
    if (!client.language_primary || !unit.language_spoken) return 0.5;
    if (client.language_primary.toLowerCase() === unit.language_spoken.toLowerCase()) return 1.0;
    return 0.3;
  },

  scoreAccessibility(client: Client, unit: HousingUnit): number {
    const needs = client.accessibility_needs || {};
    const features = unit.accessibility_features || [];
    const needKeys = Object.keys(needs).filter((k) => (needs as any)[k] === true);
    if (needKeys.length === 0) return 1.0; // No needs = perfect match
    if (features.length === 0 && needKeys.length > 0) return 0.1;
    const matched = needKeys.filter((need) =>
      features.some((f: string) => f.toLowerCase().includes(need.toLowerCase()))
    );
    return matched.length / needKeys.length;
  },

  scoreServicesProximity(client: Client, unit: HousingUnit): number {
    const services = unit.nearby_services || {};
    const serviceCount = Object.keys(services).length;
    if (serviceCount >= 4) return 1.0;
    if (serviceCount >= 2) return 0.7;
    if (serviceCount >= 1) return 0.4;
    return 0.2;
  },
};
```

**Step 3: Write test for matching service**

```typescript
// backend/__tests__/features/placement/placement.service.test.ts
import { PlacementMatchingService } from '../../../src/features/placement/placement.service';
import { Client } from '../../../src/models/Client';
import { HousingUnit } from '../../../src/models/HousingUnit';

const mockClient: Client = {
  id: 'client-1',
  org_id: 'org-1',
  first_name: 'Maria',
  last_name: 'Garcia',
  household_size: 4,
  income_range: '30000-45000',
  language_primary: 'Spanish',
  language_secondary: 'English',
  cultural_preferences: {},
  accessibility_needs: {},
  location_preference: null,
  preferred_area: 'Charlotte',
  budget_max: 1200,
  status: 'ready',
  case_manager_id: null,
  intake_date: '2026-03-01',
  notes_encrypted: null,
  phone: null,
  email: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockUnit: HousingUnit = {
  id: 'unit-1',
  org_id: 'org-1',
  address: '123 Main St',
  city: 'Charlotte',
  state: 'NC',
  zip: '28202',
  location: null,
  bedrooms: 3,
  bathrooms: 2,
  rent_amount: 1100,
  landlord_name: 'Smith Properties',
  landlord_contact: '704-555-0100',
  accessibility_features: [],
  language_spoken: 'Spanish',
  available_from: '2026-04-01',
  available_until: null,
  status: 'available',
  nearby_services: { transit: 'CATS bus stop 0.2mi', schools: 'Shamrock Gardens Elementary 0.5mi' },
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('PlacementMatchingService', () => {
  describe('scoreClientUnit', () => {
    it('should return a score between 0 and 1', () => {
      const result = PlacementMatchingService.scoreClientUnit(mockClient, mockUnit);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(1);
    });

    it('should have all breakdown components', () => {
      const result = PlacementMatchingService.scoreClientUnit(mockClient, mockUnit);
      expect(result.breakdown).toHaveProperty('location');
      expect(result.breakdown).toHaveProperty('budget');
      expect(result.breakdown).toHaveProperty('householdSize');
      expect(result.breakdown).toHaveProperty('languageCultural');
      expect(result.breakdown).toHaveProperty('accessibility');
      expect(result.breakdown).toHaveProperty('servicesProximity');
    });

    it('should score high for a good match', () => {
      const result = PlacementMatchingService.scoreClientUnit(mockClient, mockUnit);
      // Charlotte client + Charlotte unit + within budget + language match + right size
      expect(result.totalScore).toBeGreaterThan(0.7);
    });

    it('should score low for over-budget unit', () => {
      const expensiveUnit = { ...mockUnit, rent_amount: 2000 };
      const result = PlacementMatchingService.scoreClientUnit(mockClient, expensiveUnit);
      expect(result.breakdown.budget).toBeLessThan(0.5);
    });

    it('should score low for undersized unit', () => {
      const smallUnit = { ...mockUnit, bedrooms: 1 };
      const result = PlacementMatchingService.scoreClientUnit(mockClient, smallUnit);
      expect(result.breakdown.householdSize).toBeLessThan(0.5);
    });
  });

  describe('scoreBudget', () => {
    it('should return 1.0 when unit is within budget', () => {
      expect(PlacementMatchingService.scoreBudget(mockClient, mockUnit)).toBe(1.0);
    });

    it('should return 0.5 when client has no budget preference', () => {
      const noBudgetClient = { ...mockClient, budget_max: null };
      expect(PlacementMatchingService.scoreBudget(noBudgetClient, mockUnit)).toBe(0.5);
    });
  });

  describe('scoreHouseholdSize', () => {
    it('should return 1.0 when unit has enough bedrooms', () => {
      // Household of 4, unit has 3 bedrooms, needs ceil(4/2) = 2
      expect(PlacementMatchingService.scoreHouseholdSize(mockClient, mockUnit)).toBe(1.0);
    });
  });
});
```

**Step 4: Run tests**

```bash
cd backend && npx jest __tests__/features/placement/placement.service.test.ts --verbose
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/models/Placement.ts backend/src/features/placement/placement.service.ts backend/__tests__/features/placement/placement.service.test.ts
git commit -m "feat: add Placement model and Client→Unit matching service with tests"
```

---

### Task 1.10: Add Org Context to Auth Middleware

**Files:**
- Modify: `backend/src/middleware/auth.middleware.ts`
- Create: `backend/src/middleware/orgContext.ts`
- Test: `backend/__tests__/middleware/orgContext.test.ts`

**Step 1: Create org context middleware**

```typescript
// backend/src/middleware/orgContext.ts
import { Request, Response, NextFunction } from 'express';
import OrgMember from '../models/OrgMember';
import Organization from '../models/Organization';

// Extend Express Request to include org context
declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      orgSlug?: string;
      orgMember?: {
        id: string;
        role: string;
        org_id: string;
      };
    }
  }
}

/**
 * Resolves org context from the URL slug parameter.
 * Validates that the authenticated user is a member of the org.
 * Must run AFTER authenticateJWT middleware.
 */
export function resolveOrgContext() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const orgSlug = req.params.orgSlug;
    if (!orgSlug) {
      return res.status(400).json({ success: false, message: 'Organization slug is required' });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Resolve org from slug
    const org = await Organization.findBySlug(orgSlug);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Validate membership — never trust the URL param alone
    const membership = await OrgMember.findByOrgAndUser(org.id, userId);
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Not a member of this organization' });
    }

    req.orgId = org.id;
    req.orgSlug = org.slug;
    req.orgMember = {
      id: membership.id,
      role: membership.role,
      org_id: org.id,
    };

    next();
  };
}

/**
 * Requires a minimum role level for the current org.
 * Role hierarchy: super_admin > org_admin > program_director > case_manager
 */
export function requireOrgRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.orgMember) {
      return res.status(403).json({ success: false, message: 'Organization context required' });
    }
    if (!allowedRoles.includes(req.orgMember.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient role for this action' });
    }
    next();
  };
}
```

**Step 2: Commit**

```bash
git add backend/src/middleware/orgContext.ts
git commit -m "feat: add org context middleware with membership validation and RBAC"
```

---

## Phase 2: Next.js Frontend Setup (Days 4-6)

### Task 2.1: Initialize Next.js App

**Step 1: Create Next.js app in /web**

```bash
cd /Users/ghostmac/Development/conest
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

**Step 2: Install shadcn/ui**

```bash
cd web
npx shadcn@latest init -d
```

Select: New York style, Zinc base color, CSS variables enabled.

**Step 3: Install key shadcn components**

```bash
npx shadcn@latest add button card table badge input label dialog dropdown-menu avatar separator tabs
```

**Step 4: Install additional dependencies**

```bash
npm install @tanstack/react-query axios lucide-react
npm install -D @types/node
```

**Step 5: Update root package.json workspaces**

Add `"web"` to the workspaces array in `/Users/ghostmac/Development/conest/package.json`.

**Step 6: Update docker-compose.yml**

Add web service:
```yaml
  web:
    container_name: placd-web
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3000"
    volumes:
      - ./web:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - backend
```

**Step 7: Create web Dockerfile.dev**

```dockerfile
# web/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

**Step 8: Commit**

```bash
git add web/ docker-compose.yml package.json
git commit -m "feat: initialize Next.js app with shadcn/ui and Tailwind"
```

---

### Task 2.2: Auth Integration (Login Page + API Client)

**Files:**
- Create: `web/src/lib/api.ts`
- Create: `web/src/lib/auth.ts`
- Create: `web/src/app/(auth)/login/page.tsx`
- Create: `web/src/app/(auth)/layout.tsx`
- Create: `web/src/middleware.ts`

**Step 1: Create API client**

```typescript
// web/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('placd_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('placd_access_token');
      localStorage.removeItem('placd_refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Step 2: Create auth utilities**

```typescript
// web/src/lib/auth.ts
import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OrgContext {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.success) {
    localStorage.setItem('placd_access_token', data.data.accessToken);
    localStorage.setItem('placd_refresh_token', data.data.refreshToken);
  }
  return data;
}

export async function getMyOrgs(): Promise<OrgContext[]> {
  const { data } = await api.get('/orgs/me');
  return data.data;
}

export function logout() {
  localStorage.removeItem('placd_access_token');
  localStorage.removeItem('placd_refresh_token');
  window.location.href = '/login';
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('placd_access_token');
}
```

**Step 3: Create login page**

```tsx
// web/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login, getMyOrgs } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const orgs = await getMyOrgs();
        if (orgs.length === 1) {
          router.push(`/${orgs[0].orgSlug}/placements`);
        } else if (orgs.length > 1) {
          router.push('/select-org');
        } else {
          setError('No organization membership found.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Placd</CardTitle>
          <CardDescription>Housing Placement Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create auth layout**

```tsx
// web/src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 5: Commit**

```bash
git add web/src/lib/ web/src/app/\(auth\)/ web/src/middleware.ts
git commit -m "feat: add login page with JWT auth integration"
```

---

### Task 2.3: Dashboard Layout with Org Context

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/layout.tsx`
- Create: `web/src/components/sidebar.tsx`
- Create: `web/src/components/demo-banner.tsx`

**Step 1: Create demo banner component**

```tsx
// web/src/components/demo-banner.tsx
export function DemoBanner() {
  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-800">
      Demo Data — Not Real Clients
    </div>
  );
}
```

**Step 2: Create sidebar navigation**

```tsx
// web/src/components/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';

interface SidebarProps {
  orgSlug: string;
  orgName: string;
}

const navItems = [
  { label: 'Placements', href: '/placements', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ orgSlug, orgName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Placd</h1>
        <p className="text-sm text-muted-foreground">{orgName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const href = `/${orgSlug}${item.href}`;
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

**Step 3: Create dashboard layout**

```tsx
// web/src/app/(dashboard)/[orgSlug]/layout.tsx
import { Sidebar } from '@/components/sidebar';
import { DemoBanner } from '@/components/demo-banner';

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  // In demo, org name is hardcoded. In MVP, fetch from API.
  const orgName = 'Charlotte Housing Partners';

  return (
    <div className="flex h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar orgSlug={params.orgSlug} orgName={orgName} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add web/src/components/ web/src/app/\(dashboard\)/
git commit -m "feat: add dashboard layout with sidebar, org context, and demo banner"
```

---

## Phase 3: Demo Screens (Days 6-12)

### Task 3.1: Client Roster Page

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx`

Build a server-rendered table showing 40 seed clients with status badges (intake/ready/placed/exited), name, language, household size, budget, case manager. Include search and filter by status. Uses shadcn Table + Badge components.

**Key elements:**
- Fetch from `GET /api/orgs/:orgSlug/clients`
- Status badges: intake (yellow), ready (blue), placed (green), exited (gray)
- Columns: Name, Status, Language, Household Size, Budget, Case Manager, Intake Date
- Search by name, filter dropdown by status

**Commit message:** `feat: add client roster page with status badges and filtering`

---

### Task 3.2: Placement Pipeline Page (Kanban)

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/placements/page.tsx`
- Create: `web/src/components/pipeline-board.tsx`
- Create: `web/src/components/placement-card.tsx`

Build a kanban board with 6 columns: Intake → Matching → Proposed → Accepted → Placed → Closed. Cards show client name, unit address (if assigned), compatibility score, case manager. Cards are draggable between columns.

**Dependencies:** Install `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd).

```bash
cd web && npm install @hello-pangea/dnd
```

**Key elements:**
- Fetch from `GET /api/orgs/:orgSlug/placements`
- Drag-and-drop stage transitions via `PATCH /api/orgs/:orgSlug/placements/:id/stage`
- Color-coded columns (stage progression from yellow to green)
- Card shows: client name, unit address, score, days in stage

**Commit message:** `feat: add placement pipeline kanban with drag-and-drop stage transitions`

---

### Task 3.3: Client → Unit Match View

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/placements/[id]/page.tsx`
- Create: `web/src/components/match-comparison.tsx`
- Create: `web/src/components/score-breakdown.tsx`

Build a split-screen view: left side shows client profile (demographics, needs, preferences), right side shows top 3 ranked units with compatibility scores and breakdowns. Score breakdown shown as a bar chart per factor.

**Key elements:**
- Fetch from `GET /api/orgs/:orgSlug/placements/:id/matches`
- Uses real matching engine (PlacementMatchingService)
- Score breakdown: horizontal bars showing location/budget/size/language/accessibility/services
- "Propose" button to advance placement to proposed stage

**Commit message:** `feat: add client-unit match view with real compatibility scoring`

---

### Task 3.4: Compliance Report Page

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx`
- Create: `web/src/components/report-summary.tsx`

Build a report page showing: placements by month (bar chart), outcomes breakdown (pie chart), demographics summary, average time-to-placement. Include "Export PDF" button that generates a downloadable report.

**Dependencies:**

```bash
cd web && npm install recharts jspdf jspdf-autotable
```

**Key elements:**
- Fetch from `GET /api/orgs/:orgSlug/reports/summary`
- Recharts bar chart for monthly placements
- Summary cards: total placements, avg days to placement, success rate
- PDF export with "Demo Data — Not Real Clients" footer watermark

**Commit message:** `feat: add compliance report page with charts and PDF export`

---

### Task 3.5: Org Settings Page

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/settings/page.tsx`

Build a settings page with tabs: Organization (name, address, plan tier), Team (member list with roles), Matching Weights (sliders for the 6 factors). Basic CRUD for org profile. Read-only member list with role badges.

**Key elements:**
- Tabs component from shadcn
- Org profile form (name, email, phone, address)
- Team members table (name, email, role badge)
- Matching weights section with range sliders (showing current defaults)

**Commit message:** `feat: add org settings page with team management and matching weight config`

---

## Phase 4: Seed Data + API Routes + Polish (Days 12-15)

### Task 4.1: Backend API Routes for Placd

**Files:**
- Create: `backend/src/features/placement/placement.controller.ts`
- Create: `backend/src/features/placement/placement.routes.ts`
- Create: `backend/src/features/org/org.controller.ts`
- Create: `backend/src/features/org/org.routes.ts`
- Modify: `backend/src/app.ts` (register new routes)

**New route groups:**

```
GET    /api/orgs/me                              → user's org memberships
GET    /api/orgs/:orgSlug/clients                → client roster (org-scoped)
GET    /api/orgs/:orgSlug/clients/:id            → client detail
GET    /api/orgs/:orgSlug/units                  → housing unit inventory
GET    /api/orgs/:orgSlug/placements             → placement pipeline
GET    /api/orgs/:orgSlug/placements/:id         → placement detail
GET    /api/orgs/:orgSlug/placements/:id/matches → top matching units for client
PATCH  /api/orgs/:orgSlug/placements/:id/stage   → update placement stage
GET    /api/orgs/:orgSlug/reports/summary         → report data
GET    /api/orgs/:orgSlug/settings               → org settings
PUT    /api/orgs/:orgSlug/settings               → update org settings
GET    /api/orgs/:orgSlug/members                → team members
```

All routes use `authenticateJWT` + `resolveOrgContext()` middleware chain.

**Commit message:** `feat: add org-scoped API routes for placements, clients, units, reports`

---

### Task 4.2: Demo Seed Script

**Files:**
- Create: `backend/scripts/seed-placd-demo.ts`

**Generates:**
- 1 organization: "Charlotte Housing Partners" (slug: `charlotte-housing-partners`, plan: professional)
- 3 users + org_members: Sarah Chen (org_admin), Marcus Johnson (program_director), Ana Rivera (case_manager)
- 40 clients: Mix of refugee families (Burmese, Congolese, Afghan, Somali), veterans, single parents. Realistic Charlotte demographics. Languages: English, Spanish, Burmese, French, Dari, Somali. Statuses: 10 intake, 15 ready, 12 placed, 3 exited.
- 25 housing units: Real Charlotte neighborhoods (NoDa, Plaza Midwood, South End, University City, Shamrock Gardens, Hidden Valley, Eastway, West Charlotte). Rent: $650-$1,400. Mix of 1-4 bedrooms. Statuses: 15 available, 5 reserved, 4 occupied, 1 inactive.
- 15 placements: Distributed across all 6 pipeline stages. 3 intake, 3 matching, 3 proposed, 2 accepted, 3 placed, 1 closed. Each with realistic compatibility scores.

**Run command:**
```bash
cd backend && npx ts-node scripts/seed-placd-demo.ts
```

**Add npm script to backend/package.json:**
```json
"seed:placd-demo": "ts-node scripts/seed-placd-demo.ts"
```

**Commit message:** `feat: add Placd demo seed script with Charlotte-based synthetic data`

---

### Task 4.3: Demo Polish and Integration Testing

**Steps:**
1. Start full Docker stack: `docker compose up --build`
2. Run seed script: `cd backend && npm run seed:placd-demo`
3. Navigate to `http://localhost:3002/login`
4. Login as Sarah Chen (org_admin)
5. Verify all 6 screens render correctly with seed data
6. Test drag-and-drop on pipeline board
7. Test match view with real scoring
8. Test PDF export
9. Fix any integration issues found

**Commit message:** `chore: integration test demo flow and fix edge cases`

---

## Execution Summary

| Phase | Tasks | Estimated Days | Commits |
|-------|-------|---------------|---------|
| Phase 0: Repo Snapshot | 0.1 | 0.5 | 1 |
| Phase 1: Backend Multi-Tenancy | 1.1-1.10 | 3-4 | 10 |
| Phase 2: Next.js Frontend | 2.1-2.3 | 2-3 | 3 |
| Phase 3: Demo Screens | 3.1-3.5 | 4-5 | 5 |
| Phase 4: Seed + Routes + Polish | 4.1-4.3 | 2-3 | 3 |
| **Total** | **~18 tasks** | **12-15 days** | **~22 commits** |

---

## Post-Demo (After First Pilot Signed)

These are explicitly OUT of scope until a pilot is signed:
- Real client intake forms
- Housing unit CRUD
- Messaging between case managers
- Stripe billing (subscription + per-placement)
- ORR/HUD-specific report templates
- Salesforce AppExchange integration
- Client → Client shared housing matching
- Bulk CSV/Excel import
- Push notifications
- Obsidian doc updates (Sprint Board, Roadmap, Funding Strategy, etc.)
