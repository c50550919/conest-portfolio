# Caseworker Assignment, Dashboard Home, & Stage Gating — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an action-first case manager dashboard with weighted assignment suggestions and task-gated stage progression, differentiated from search-first (Clarity) and roster-first (ClientTrack) competitors.

**Architecture:** Bottom-up implementation — migrations and backend APIs first, then UI enhancements to the existing dashboard. No new tables beyond `programs`; extends `org_members` with `specializations` and `max_caseload`. Gating logic is backend-only using existing `tasks.is_required`.

**Tech Stack:** Next.js (App Router), Node.js/Express, PostgreSQL (Knex), TypeScript

---

## Locked Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Program model | Lightweight `programs` lookup table (id, org_id, name, type) | Matches HMIS project descriptor pattern without over-normalizing |
| Assignment model | Supervisor-assisted with weighted suggestions | Auto-assign to intake worker (industry standard), then weighted suggestion for reassignment |
| Suggestion scoring | Caseload 40%, specialization 30%, language 20%, geo 10% | Weighted by fit and load, not just raw count — aligned with NASW/SDSU caseload research |
| Caseload calculation | Weighted by stage: intake 1.5, matching 1.2, proposed/accepted 1.0, placed 0.5, closed 0.0 | 10 intake cases = heavier than 20 placed cases |
| max_caseload | Soft threshold (default 25, org-configurable) | De-prioritizes in suggestions, never blocks assignment. Not marketed as "NASW standard" |
| Home screen | Action-first queue: overdue → today → upcoming | Answers "what do I need to do right now?" before anything else |
| Task list cap | 5 items per section with "View All" | Keeps home screen scannable; View All links to tasks page with filter pre-applied |
| Supervisor view | Team View with staff workload, pipeline by stage, activity feed | Weighted caseload + traffic-light colors per worker |
| Stage gating | Required tasks gate advancement; supervisor override with reason | "Ready to advance" banner when all required tasks complete; disabled button with remaining task list when not |
| Traffic-light thresholds | Green <70%, Yellow 70-99%, Red >=100% | Applied to caseload percentages in assignment panel and workload view |

---

## Section 1: Data Model Changes

### New table: `programs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Default: gen_random_uuid() |
| `org_id` | uuid FK → orgs | NOT NULL |
| `name` | varchar(100) | e.g. "Rapid Rehousing", "Permanent Supportive Housing" |
| `type` | varchar(50) | Enum-like: `rrh`, `psh`, `transitional`, `prevention`, `custom` |
| `created_at` | timestamp | Default: now() |

### Modified tables

**`placements`:** Add `program_id` uuid FK → programs (nullable, backfill later)

**`org_members`:** Add:
- `specializations` jsonb (default `[]`) — e.g. `["rrh", "psh"]`
- `max_caseload` integer (default 25) — org-configurable soft threshold

### No changes to

`tasks`, `units`, `reports`, `clients` tables.

---

## Section 2: Assignment Flow

### Three-step flow

1. **Auto-assign to intake worker** — whoever creates the placement becomes the initial `case_manager_id`. Matches Clarity and ClientTrack behavior.

2. **System suggests reassignment** — when a supervisor opens the assignment panel, ranks eligible case managers by:
   - **Caseload weight (40%):** weighted active placements / max_caseload ratio. Lower = higher rank.
   - **Specialization match (30%):** worker's `specializations` includes placement's program type.
   - **Language match (20%):** worker speaks client's `language_primary`.
   - **Geographic familiarity (10%):** future — all workers score equally for now.

3. **Supervisor confirms with one click** — suggested assignee pre-selected in dropdown. Supervisor can accept or pick someone else. Updates `case_manager_id` on placement + client, reassigns all open tasks.

### Stage-based caseload weights

| Stage | Weight | Rationale |
|-------|--------|-----------|
| `intake` | 1.5 | High-touch: assessments, document gathering |
| `matching` | 1.2 | Active search, unit coordination |
| `proposed` | 1.0 | Baseline |
| `accepted` | 1.0 | Lease prep, move-in |
| `placed` | 0.5 | Stabilized: periodic check-ins |
| `closed` | 0.0 | No active work |

### Assignment panel UI

```
+-- Assign Case Manager ---------------------------+
|                                                   |
|  Suggested: Maria Lopez *                         |
|  +-- Caseload: 15.0/25 (60%) GREEN              |
|  +-- Specialization: RRH CHECK                   |
|  +-- Language: Spanish CHECK                      |
|                                                   |
|  Other available:                                 |
|  +-- James Patterson  22.0/25 (88%) YELLOW       |
|  +-- Crystal Davis    26.5/25 (106%) RED         |
|  +-- Robert Mitchell  12.0/25 (48%) GREEN        |
|                                                   |
|  [ Assign Maria Lopez ]                           |
+---------------------------------------------------+
```

### API endpoints

- `GET /orgs/:orgSlug/staff/suggestions?placement_id=xxx` — ranked list with scores and breakdown
- `PATCH /orgs/:orgSlug/placements/:id/assign` — body: `{ case_manager_id: "uuid" }`, updates placement + client + reassigns open tasks in one transaction

---

## Section 3: Dashboard Home Screen

### Case Manager "My View" (enhanced)

**KPI Tiles (top row):** Active Cases (weighted), Overdue, Due Today, Placed MTD, Data Quality

**Task Queue (three sections, 5-item cap each):**
1. **OVERDUE (red)** — sorted oldest first. Each row: task title, client name, due date, placement stage.
2. **DUE TODAY (yellow)** — same row format. "Ready to advance?" badge when all required tasks for a stage are complete.
3. **UPCOMING 7 days (green)** — same row format.

"View All" links navigate to tasks page with relevant filter pre-applied.

Clicking a task navigates to the placement detail page.

### Supervisor "Team View" (enhanced from Org Overview)

**Org KPI Tiles:** Total Active, Team Overdue, Placed MTD, Avg Days to Place, Data Quality

**Staff Workload Panel:** Per-worker weighted caseload with traffic-light colors and specializations. Clicking a worker opens their filtered My View.

**Pipeline by Stage:** Horizontal bar chart showing placement counts per stage.

**Recent Activity:** Timestamped feed of stage advances, assignments, task completions.

---

## Section 4: Stage Gating

### Gating behavior

When all required tasks (`is_required = true`) for the current stage are completed:
1. "Ready to advance" banner appears on placement detail page with "Advance" button
2. Clicking Advance: updates stage, generates next-stage auto-tasks, assigns to case_manager_id, logs activity

When required tasks remain:
1. "Advance" button is disabled
2. Remaining required tasks listed below the banner

### Override rules

- `case_manager` role: cannot advance with incomplete required tasks
- `program_director` / `org_admin` / `super_admin`: can force-advance with `force_reason` (logged)
- Backwards movement (e.g., proposed → matching) is always allowed
- Optional/manually-added tasks never gate progression

### API endpoints

- `POST /orgs/:orgSlug/placements/:id/advance` — body: `{ force_reason?: string }`. Returns updated placement + new tasks.
- `GET /orgs/:orgSlug/placements/:id/gate-status` — returns `{ ready, stage, required_remaining, completed }`

### Backend gate check

```sql
SELECT count(*) FROM tasks
WHERE placement_id = ? AND stage = ? AND is_required = true AND status != 'completed'
```

If count > 0 and requester is `case_manager` → 403 with remaining task list.
If count > 0 and requester is `program_director`+ → allow, log force_reason.

---

## Implementation Sequence

Bottom-up: migrations + backend APIs first, then UI.

1. Database migrations (programs table, org_members columns, placements.program_id)
2. Seed data (programs, specializations, max_caseload for demo staff)
3. Weighted caseload calculation utility
4. Staff suggestions endpoint
5. Assignment endpoint (PATCH)
6. Gate-status endpoint (GET)
7. Advance endpoint (POST)
8. Dashboard API enhancements (My View task queue, Team View workload)
9. Frontend: My View task queue (overdue/today/upcoming sections)
10. Frontend: Team View workload panel + pipeline
11. Frontend: Assignment panel on placement detail
12. Frontend: Stage gating banner on placement detail

---

## Sources and Attribution

- HMIS Data Standards (HUD Exchange): program descriptor pattern, enrollment-to-project relationship
- Clarity Human Services (Bitfocus): auto-assign intake worker as Assigned Staff
- NASW/SDSU Caseload Standards Research: weighted contextual caseloads, not fixed caps
- ClientTrack (CaseWorthy): HMIS user auto-assignment at intake
- Our synthesis: action-first home screen, weighted suggestion with explainable scoring, stage-gated task progression. These are our design choices informed by the above sources, not features documented in competitor platforms.
