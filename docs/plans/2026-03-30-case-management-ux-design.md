# Placd Case Management UX Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Placd from a basic client roster into a demo-ready case management platform with activity timeline, task management, document checklists, and dual-audience dashboards.

**Architecture:** Hybrid Progressive — 2 new DB tables (`activity_events`, `tasks`) + 1 JSONB column (`document_checklist` on placements). Polymorphic activity events serve as both case notes and auto-logged audit trail. Live queries for all metrics (no pre-aggregation at demo scale).

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript, Tailwind + shadcn/ui, Axios, Express, PostgreSQL + Knex, Redis (audit caching)

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target audience | Both case managers AND supervisors | Demo must show daily workflow AND executive oversight |
| Client detail model | Hybrid: quick-preview drawer + full page | Drawer for daily triage, full page for deep work (Salesforce/Clarity pattern) |
| Case notes UX | Quick-add with optional structure | 80% quick notes (type + Enter), 20% structured (note type, linked placement, private flag) |
| Activity timeline scope | All auto-populated events | Status changes, stage changes, field edits, assignments, documents, photos |
| Task management | Manual + auto-generated from stage transitions | Hardcoded 2-3 auto-tasks per stage transition; no configurable workflow engine |
| Documents | Checklist only (no file storage) | Visual progress bar is the demo money shot; actual file management is post-demo |
| Primary working surface | Client-centric with placement context | Case managers think "my client" not "placement #47"; placements are nested within client |
| KPI computation | Live queries on transactional tables | Demo scale (~40 clients, ~200 events) doesn't warrant pre-aggregation; revisit at 500+ clients or 200ms+ dashboard load |
| Keyboard accessibility | Tab focus order in drawer, visible focus rings | Power users doing 50+ reviews/day develop keyboard habits |

---

## Competitive Research Summary

**Platforms analyzed:** Clarity Human Services (HMIS gold standard), Salesforce Nonprofit Cloud, Casebook, CaseWorthy, Bonterra ETO, Bonterra Apricot, Penelope, Notehouse, CharityTracker

**Key patterns adopted:**
1. Activity timeline as centerpiece of client detail (Casebook, Salesforce)
2. Inline quick-add notes without modal navigation (Notehouse, Casebook)
3. Task urgency grouping: overdue/today/upcoming (Salesforce, ETO)
4. Document checklists with progress visualization (Clarity)
5. List-to-detail drawer preserving list context (Salesforce, modern enterprise tools)
6. Days-in-status counters for ambient bottleneck awareness (Clarity)
7. Personal caseload dashboard as default landing (Salesforce)

**Differentiation vs. incumbents:**
- Modern UI (Next.js + Tailwind + shadcn) vs. CaseWorthy's dated interface
- Zero configuration vs. Apricot's daunting setup
- Mobile-responsive vs. CaseWorthy's desktop-only
- Housing-specific workflows vs. Salesforce's generic-then-customize
- Fewer clicks vs. CaseWorthy's "specific buttons before submit" complaints

---

## Data Model

### `activity_events` table

Polymorphic event table serving as both case notes and auto-logged audit trail.

```sql
CREATE TABLE activity_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   VARCHAR(255),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  placement_id      UUID REFERENCES placements(id) ON DELETE SET NULL,
  actor_id          UUID REFERENCES org_members(id) ON DELETE SET NULL,

  event_type        VARCHAR(50) NOT NULL,
  -- ENUM values: 'note', 'status_change', 'stage_change',
  --              'field_edit', 'assignment', 'document', 'photo', 'task'

  origin            VARCHAR(20) NOT NULL DEFAULT 'user',
  -- ENUM values: 'user', 'system', 'integration'

  is_private        BOOLEAN NOT NULL DEFAULT false,

  -- For notes (event_type = 'note')
  title             VARCHAR(255),
  body              TEXT,
  note_type         VARCHAR(50),
  -- Values: 'general', 'phone_call', 'site_visit', 'lease_update', 'intake_note'

  -- Flexible payload (app-level validators enforce schema per event_type)
  metadata          JSONB NOT NULL DEFAULT '{}',
  -- status_change: { "field": "status", "from": "intake", "to": "ready" }
  -- field_edit:    { "field": "budget_max", "from": 1200, "to": 1500 }
  --               (PII fields use identifiers, not raw values)
  -- stage_change:  { "from": "matching", "to": "proposed" }
  -- assignment:    { "from_id": null, "to_id": "uuid", "to_name": "Jane Smith" }
  -- document:      { "doc_type": "lease", "action": "checked_off" }
  -- task:          { "task_id": "uuid", "action": "completed", "title": "Review matches" }

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_events_org ON activity_events(org_id);
CREATE INDEX idx_activity_events_client ON activity_events(client_id);
CREATE INDEX idx_activity_events_placement ON activity_events(placement_id);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created ON activity_events(created_at DESC);
CREATE INDEX idx_activity_events_client_timeline
  ON activity_events(client_id, created_at DESC) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_activity_events_idempotency
  ON activity_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

**Idempotency key conventions:**
- Stage changes: `stage_change:<placement_id>:<from>:<to>`
- Status changes: `status_change:<client_id>:<from>:<to>:<timestamp_minute>`
- Auto-generated tasks: `auto_task:<placement_id>:<stage>:<task_slug>`

**App-level metadata validators:** Each `event_type` requires specific metadata fields. Validation happens in the model layer before insert. Missing required fields → 400 error.

### `tasks` table

```sql
CREATE TABLE tasks (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id),
  client_id                 UUID REFERENCES clients(id) ON DELETE SET NULL,
  placement_id              UUID REFERENCES placements(id) ON DELETE SET NULL,
  assigned_to               UUID REFERENCES org_members(id) ON DELETE SET NULL,
  created_by                UUID NOT NULL REFERENCES org_members(id),
  created_by_name           VARCHAR(255) NOT NULL,

  title                     VARCHAR(255) NOT NULL,
  description               TEXT,
  due_date                  DATE,
  priority                  VARCHAR(20) NOT NULL DEFAULT 'medium',
  -- ENUM values: 'low', 'medium', 'high', 'urgent'

  status                    VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- ENUM values: 'pending', 'in_progress', 'completed', 'cancelled'

  auto_generated            BOOLEAN NOT NULL DEFAULT false,
  source_event              VARCHAR(100),
  -- Convention: 'stage:<stage_name>', 'doc:<type>:missing'
  source_activity_event_id  UUID REFERENCES activity_events(id) ON DELETE SET NULL,

  completed_at              TIMESTAMPTZ,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_placement ON tasks(placement_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_dashboard
  ON tasks(org_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee_dashboard
  ON tasks(assigned_to, status, due_date) WHERE deleted_at IS NULL;
```

### Document checklist — JSONB column on `placements`

```sql
ALTER TABLE placements ADD COLUMN document_checklist JSONB NOT NULL DEFAULT '{"version": 1, "items": []}';
```

**Default template (applied in code on placement creation):**

```json
{
  "version": 1,
  "items": [
    { "type": "government_id", "label": "Government ID", "status": "missing", "updated_at": null, "activity_event_id": null },
    { "type": "income_proof", "label": "Income Verification", "status": "missing", "updated_at": null, "activity_event_id": null },
    { "type": "background_check", "label": "Background Check", "status": "missing", "updated_at": null, "activity_event_id": null },
    { "type": "references", "label": "References", "status": "missing", "updated_at": null, "activity_event_id": null },
    { "type": "lease_agreement", "label": "Lease Agreement", "status": "missing", "updated_at": null, "activity_event_id": null },
    { "type": "inspection_report", "label": "Unit Inspection", "status": "missing", "updated_at": null, "activity_event_id": null }
  ]
}
```

**Status values:** `missing` | `collected` | `expired`
**`updated_at`** always set on status change.
**`activity_event_id`** links to the `document` type event that recorded the change.

---

## UI Design

### 1. Client Roster — Enhanced Table + Quick-Preview Drawer

**Roster table changes (existing page: `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx`):**

New columns added to existing table:
- **Next Task** — nearest due task, urgency-colored (red = overdue, yellow = today, gray = future). Truncated to ~30 chars.
- **Last Activity** — relative timestamp ("2h ago", "Yesterday", "5 days ago"). Red text if >7 days (cold case signal).

**Row click behavior:**
- Single click on row (not name link) → opens quick-preview drawer
- Client name link → navigates to full detail page (unchanged)

**Quick-preview drawer (new component: `web/src/components/client-drawer.tsx`):**

Right-side panel, ~400px wide, slides over roster (roster dims but stays visible).

Content:
1. **Header:** Avatar + name + status badge + days-in-current-status
2. **Quick Info card:** Phone, email, household size, budget, preferred area (read-only)
3. **Current Placement card:** Stage badge, unit address (if matched), compatibility score, days-in-stage. Or "No active placement" if none.
4. **Recent Activity card:** Last 3-5 timeline entries, condensed (icon + description + relative time)
5. **Quick actions:** "Add Note" (opens inline input in drawer), "Open Full Profile" (navigates to detail page)

Dismiss: click outside, Escape key, or X button.
Keyboard: tab order flows roster row → drawer header → cards → actions → Escape to dismiss. Visible focus rings.

### 2. Client Detail Page — Tabbed Command Center

**Restructured from current single-scroll to fixed header + tabs.**

**File:** `web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx` (rewrite)

#### Fixed Header (always visible)

- Back link to roster
- Avatar + full name + status badge + days-in-status counter
- Contact info inline (phone, email)
- Action buttons: "Edit Profile", "Add Note", "Create Task"
- Overflow menu: Delete, Change Status, Assign Case Manager
- Tab bar (sticky below header): Timeline | Profile | Placements | Tasks | Documents

#### Tab: Timeline (default)

**Quick-add note input** pinned at top:
- Default: text input + Send button (the 80% case)
- Expandable optional fields: note type dropdown, link to placement, private toggle
- Slash commands: `/phone` → Phone Call, `/visit` → Site Visit, `/lease` → Lease Update
- Send on Enter (Shift+Enter for newline)

**Timeline entries** below (reverse chronological):
- Each entry: icon by event_type + description + actor + relative timestamp
- Icons: note 📝, status 🔄, task 📋, field edit ✏️, assignment 👤, document 📄, photo 📸
- Private indicator 🔒 for `is_private: true`
- Notes show full body text, other events show one-line summary
- **Filter bar:** pill toggles for "All" | "Notes" | "Status Changes" | "Tasks" | "Edits"
- **Placement filter:** dropdown to scope to specific placement or "All Placements"

#### Tab: Profile

Existing inline-editable fields reorganized into cards:
- **Personal Information** — Name, phone, email, language(s)
- **Housing Needs** — Household size, budget, preferred area, income range
- **Accessibility & Preferences** — accessibility_needs, cultural_preferences
- **Case Assignment** — Case manager dropdown, intake date

Auto-save on field blur with undo toast. Each save creates a `field_edit` event in timeline.

#### Tab: Placements

List of all placements for this client (active at top, historical below):
- Active: stage badge, unit (if assigned), compatibility score, start date, next due task
- Historical: outcome badge, unit, score, date range
- "View Details" → navigates to placement detail page (which has document checklist)
- "Start New Placement" button if no active placement

#### Tab: Tasks

All tasks for this client, grouped by urgency:
- 🔴 Overdue (red section header)
- 🟡 Due Today (yellow)
- ⚪ Upcoming (neutral)
- ✅ Completed (collapsed by default)

Each row: checkbox + title + priority badge + due date + linked placement + auto-generated indicator
One-click checkbox completion (creates `task` event in timeline).
"Create Task" button: title, description, due date, priority, linked placement, assign to.

#### Tab: Documents

Document checklist scoped to active placement:
- Progress bar at top: "4/6 collected — 67%"
- Checklist items: status icon (✅/⬜) + label + status text + date
- Click row to toggle: missing → collected → expired → missing
- Each toggle creates `document` event in timeline and updates JSONB
- Placement dropdown if multiple placements exist

### 3. Dashboard — Dual-Mode (My View + Org Overview)

**File:** `web/src/app/(dashboard)/[orgSlug]/page.tsx` (rewrite)

Toggle between "My View" (default) and "Org Overview" at top of page.

#### My View (Case Manager)

**Row 1: 4 KPI cards**
- Overdue Tasks (red if >0, clickable)
- Open Tasks (pending + in_progress assigned to me)
- My Clients (count where case_manager_id = me)
- Placed This Month (my placements moved to "placed" this month)

**Row 2: Two-column layout**

Left (60%) — **My Tasks:**
Grouped by urgency (overdue → today → upcoming). Each row: checkbox + task title + client name + priority + due date. Client name clickable → navigates to client detail. One-click completion.

Right (40%) — **My Caseload:**
Compact client list sorted by urgency (overdue tasks first, then stale cases). Each row: avatar + name + status badge + days-in-status + next due task with urgency color. Click row → client detail page.

**Row 3: Recent Team Activity**
Last 5-8 org-wide activity events. Icon + actor name + description + relative time. "View All" link.

#### Org Overview (Supervisor)

**Row 1: 5 KPI cards**
- Active Clients (total)
- Placed This Month (org-wide)
- Avg Days to Placement
- Success Rate (%)
- Open Units (available housing units)

**Row 2: Two-column layout**

Left (60%) — **Pipeline Summary:**
Horizontal bars showing placement count by stage. Click bar → navigates to placements page filtered by stage.

Right (40%) — **Staff Workload:**
Table: case manager name, client count, overdue task count (red badge). Sorted by overdue count descending.

**Row 3: Charts**
Monthly placements trend (line chart) + outcome breakdown (donut chart). Reused from existing reports page in compact form.

### 4. Auto-Generated Task Definitions

Hardcoded task templates triggered by placement stage transitions:

| Stage Transition | Auto-Generated Tasks | Priority | Due Offset |
|---|---|---|---|
| → `intake` | Complete client intake assessment | high | +3 days |
| → `matching` | Review top 3 unit matches | high | +2 days |
| | Contact client about housing preferences | medium | +3 days |
| → `proposed` | Schedule client tour of proposed unit | high | +3 days |
| | Send unit details to client | medium | +1 day |
| → `accepted` | Initiate lease review | high | +2 days |
| | Verify all documents collected | high | +3 days |
| → `placed` | Schedule 7-day check-in | medium | +7 days |
| | Schedule 30-day stability check | medium | +30 days |
| → `closed` | Complete outcome assessment | medium | +5 days |

**Task creation logic:**
- `auto_generated: true`
- `source_event: 'stage:<stage_name>'`
- `source_activity_event_id` points to the stage_change activity event
- `assigned_to` = placement's `case_manager_id`
- `created_by` = actor who triggered the stage change
- `created_by_name` = denormalized snapshot of actor name
- **Idempotency:** check for existing task with same `source_event` + `placement_id` before creating

---

## Architectural Notes

### Performance Strategy
- **v1: Live queries only.** Demo dataset (~40 clients, ~30 placements, ~200 activity events) is well within PostgreSQL's comfort zone for indexed aggregations.
- **Trigger for pre-aggregation:** If org crosses ~500 active clients or ~10K activity events and dashboard load exceeds 200ms, introduce a `reporting_snapshots` materialized view refreshed hourly.

### Timeline Grouping (v2)
- Optional "Today" / "Last 7 days" / "Older" section headers in the timeline once real-world volume is observed. Not required for v1.

### Event Type Extensibility
- `event_type` is stored as VARCHAR with app-level ENUM validation, not a database ENUM. Adding new event types requires only a code change, not a migration.
- If non-ENUM event types proliferate post-launch, introduce an `event_kinds` lookup table.

### Security Considerations
- `created_at` is server-side and immutable (no client-provided timestamps)
- PII field changes logged by field identifier, not raw values (e.g., `{ "field": "phone", "changed": true }` instead of logging actual phone numbers)
- `is_private` flag enforced at query level — private notes filtered from non-author responses
- `deleted_at` soft-delete on tasks preserves audit trail while hiding cancelled tasks from user-facing lists

### Seed Data Strategy
- New migration seeds ~50 activity events across demo clients (mix of notes, status changes, field edits)
- ~20 tasks seeded (mix of completed, overdue, upcoming, auto-generated)
- Document checklists on existing placements seeded with partial completion (2-4 of 6 items collected)
