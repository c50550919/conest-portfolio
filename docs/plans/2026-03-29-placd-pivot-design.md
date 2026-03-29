# Placd Pivot Design: CoNest → B2B Housing Placement SaaS

**Date**: 2026-03-29
**Status**: Approved
**Approach**: Demo-First (Approach 1)
**Branch**: `placd-pivot` off `main`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture & Code Strategy](#section-1-architecture--code-strategy)
3. [Demo Scope & Timeline](#section-2-demo-scope--timeline)
4. [Go-to-Market Sequence & Obsidian Updates](#section-3-go-to-market-sequence--obsidian-updates)
5. [Revenue Model, Pricing & Success Metrics](#section-4-revenue-model-pricing--success-metrics)
6. [Lead List](#lead-list)
7. [Decisions Log](#decisions-log)

---

## Executive Summary

Pivot CoNest (B2C roommate app for single parents) to Placd (B2B SaaS for organizational housing placement). The market structure, unit economics, compliance burden, and competitive landscape all favor the B2B direction.

**Core thesis**: Housing nonprofits, refugee resettlement agencies, housing authorities, and employer-assisted housing programs all run placement workflows on spreadsheets. Placd replaces that with a purpose-built placement pipeline + matching engine + compliance reporting platform.

**Execution approach**: Demo-First. Build a credible demo in 2-3 weeks, run discovery calls, close one paid pilot, then build the real MVP behind that signed commitment.

**Key decisions**:
- Rebrand/evolve CoNest entity → Placd (same legal entity, same SDVOSB cert)
- Snapshot CoNest codebase → public portfolio repo (sanitized)
- Keep Express backend, build Next.js App Router frontend
- Charlotte nonprofits + Atrium Health corporate pilot = first sales motion
- Direct sales primary, academic/grant track secondary (after first pilot proof)

---

## Section 1: Architecture & Code Strategy

### Repo Strategy

1. **Snapshot**: Export current `conest` repo → new public repo `conest-portfolio`
   - Air-gapped export: strip all `.env`, API keys, seed data with real names, logs
   - Add `SECURITY.md` with "no production data" notice
   - Never push secrets, even temporarily
2. **Pivot branch**: `placd-pivot` off `main` in the existing repo
3. **Rename**: Repo rename happens after refactor lands, not day one

### Backend Refactor (Express stays)

**Keep (with modifications)**:
- Auth system (JWT + OAuth) — add org-scoped claims to JWT
- Matching engine — swap weights for Client → Unit mode
- Payments (Stripe Connect) — rework to org subscriptions + per-placement billing; Stripe customer objects tied to `organization.id`, not individual users
- Messaging (Socket.io) — add `org_id` to every thread/message, org membership gates access
- Encryption (AES-256-GCM) — unchanged
- Audit logging — add `org_id` + `actor_role` for per-org compliance queries
- Webhook infrastructure — unchanged

**Drop**:
- Swipe endpoints, discovery feed
- Slim-onboarding, consumer onboarding flows
- React Native-specific endpoints
- FCRA adverse action workflow
- Child safety guardrails (no longer applicable — B2B platform)

**New tables**:

```
organizations
├── id (uuid, PK)
├── name
├── slug (unique, used in URLs)
├── plan_tier (starter | professional | enterprise)
├── stripe_customer_id
├── settings (jsonb)
├── created_at, updated_at

org_members
├── id (uuid, PK)
├── org_id (FK → organizations)
├── user_id (FK → users)
├── role (case_manager | program_director | org_admin | super_admin)
├── invited_at, accepted_at
├── created_at, updated_at

clients
├── id (uuid, PK)
├── org_id (FK → organizations)
├── first_name, last_name
├── household_size
├── income_range
├── language_primary, language_secondary
├── cultural_preferences (jsonb)
├── accessibility_needs (jsonb)
├── location_preference (geography)
├── budget_max
├── status (intake | ready | placed | exited)
├── case_manager_id (FK → org_members)
├── intake_date
├── notes (encrypted text)
├── created_at, updated_at

housing_units
├── id (uuid, PK)
├── org_id (FK → organizations)
├── address, city, state, zip
├── location (geography, PostGIS)
├── bedrooms, bathrooms
├── rent_amount
├── landlord_name, landlord_contact
├── accessibility_features (jsonb)
├── language_spoken (landlord/community)
├── available_from, available_until
├── status (available | reserved | occupied | inactive)
├── nearby_services (jsonb — transit, schools, employment, community orgs)
├── created_at, updated_at

placements
├── id (uuid, PK)
├── org_id (FK → organizations)
├── client_id (FK → clients)
├── unit_id (FK → housing_units)
├── case_manager_id (FK → org_members)
├── stage (intake | matching | proposed | accepted | placed | closed)
├── compatibility_score (decimal)
├── score_breakdown (jsonb)
├── proposed_at, accepted_at, placed_at, closed_at
├── outcome (successful | unsuccessful | withdrawn)
├── notes (encrypted text)
├── created_at, updated_at
```

**Multi-tenancy enforcement (defense in depth)**:

1. **JWT layer**: `org_id` embedded in token claims, extracted by auth middleware
2. **Request validation**: Never trust `orgId` from path params or body directly. Always validate user's org membership and role before executing queries
3. **Query layer**: Scoped query helper enforced at data access level:
   ```typescript
   // Makes unscoped queries painful to write by default
   const scopedQuery = (table: string, orgId: string) =>
     knex(table).where({ org_id: orgId });
   ```
4. **Indexing**: `org_id` indexed on every tenant-scoped table
5. **Audit**: Every mutation logged with `org_id` + `actor_user_id` + `actor_role`

**Existing tables that get `org_id` added**:
- `users`, `profiles`, `matches`, `messages`, `conversations`, `verifications`, `payments`, `audit_logs`

### Frontend (New — Next.js App Router)

**Route structure**:
```
/app/(auth)/login
/app/(dashboard)/[orgSlug]/clients          — client roster
/app/(dashboard)/[orgSlug]/units            — housing unit inventory
/app/(dashboard)/[orgSlug]/placements       — placement pipeline (kanban)
/app/(dashboard)/[orgSlug]/placements/[id]  — placement detail + match view
/app/(dashboard)/[orgSlug]/reports          — compliance reporting
/app/(dashboard)/[orgSlug]/settings         — org settings, team management
```

**Tenant resolution**: `[orgSlug]` in URL is a display slug only. Actual `org_id` always derived from server session + membership validation. Layout-level loader resolves `OrgContext` with RBAC, passed down as typed context so individual pages don't re-validate.

**Middleware handles**:
- Auth verification (JWT)
- Org membership validation
- Org-switching flows (403 if not a member)
- Revoked/expired membership (403 with clear UX path)

**Component library**: shadcn/ui + Tailwind CSS. Ships fast, looks professional, coherent backoffice UI without custom design overhead.

### Matching Engine Changes

**Mode 1 — Client → Unit (primary, ships with demo)**:

| Factor | Weight | Description |
|--------|--------|-------------|
| Location | 25% | Distance to preferred area, neighborhood fit |
| Budget | 25% | Client budget vs. unit rent |
| Household size | 20% | Bedrooms/space vs. family size |
| Language/cultural fit | 15% | Language match, cultural community proximity |
| Accessibility needs | 10% | Unit accessibility features vs. client needs |
| Services proximity | 5% | Transit, schools, employment, community orgs |

Weights are **org-configurable** with these as sane defaults. Some programs care more about accessibility vs. services proximity — this becomes a product differentiator.

**Mode 2 — Client → Client shared housing (premium add-on, later)**:
- Feature-flagged per org
- Reuses CoNest's person-to-person compatibility algorithm with adjusted weights
- Only built when real org demand exists (home-sharing programs, veteran shared housing)

---

## Section 2: Demo Scope & Timeline

The demo is a **credible simulation**, not a working product. Purpose: run discovery calls and close a pilot.

### IN the demo (Weeks 1-3)

Every screen tagged as `[REAL]` (uses actual backend logic) or `[SEED]` (displays seed data).

| Screen | What It Shows | Tag | Build Effort |
|--------|--------------|-----|-------------|
| **Login** | Org-branded login, role-based redirect | `[REAL]` | Day 1-2 |
| **Client Roster** | Table with status badges (intake, ready, placed), search/filter | `[SEED]` | Day 2-3 |
| **Placement Pipeline** | Kanban board: Intake → Matching → Proposed → Accepted → Placed → Closed | `[SEED]` | Day 3-5 |
| **Client → Unit Match View** | Side-by-side: client profile + top 3 ranked units with compatibility scores | `[REAL]` matching engine | Day 5-7 |
| **Sample Compliance Report** | PDF-exportable: placements by month, outcomes, demographics | `[SEED]` template | Day 7-8 |
| **Org Settings** | Team members, roles, org profile | `[SEED]` basic CRUD | Day 8-9 |

**Buffer**: Days 10-15 for UX polish, demo rehearsal, edge bug fixes.

### OUT of the demo (built during MVP phase)

- Real client intake forms / data entry workflows
- Housing unit inventory management (CRUD)
- Messaging between case managers
- Stripe billing integration (subscription + per-placement)
- ORR/HUD-specific report templates
- Salesforce AppExchange integration
- Client → Client shared housing matching (Mode 2)
- Bulk import (CSV/Excel)
- Notification system

### Demo Data Strategy

Seed script generates Charlotte-based synthetic dataset:
- 1 organization ("Charlotte Housing Partners")
- 3 case managers with different roles
- 40 clients (realistic demographics: refugee families, veterans, single parents, diverse languages)
- 25 housing units (real Charlotte neighborhoods, realistic rent ranges $650-$1,400)
- 15 active placements at various pipeline stages
- No real PII. All clearly synthetic.

**"Demo Data — Not Real Clients" banner** visible on every page and in PDF report footer.

### Demo Pitch Script

> "This is our placement pipeline. Your case managers log in here, see their client roster, and the system surfaces the top-ranked units for each client based on language, budget, location, and household size. You drag a placement through stages. At month-end, you export this compliance report. What does your current process look like?"

### Week-by-Week Build Plan

- **Week 1**: Auth wiring (real JWT), org + roster screens, seed script, basic pipeline view (no drag yet)
- **Week 2**: Drag-and-drop pipeline, match view (real engine), PDF report template, org settings CRUD, demo polish
- **Week 3** (buffer): Refine UX, tweak matching weights, rehearse demo scenarios, fix edge bugs

---

## Section 3: Go-to-Market Sequence & Obsidian Updates

### Sales Sequence

**Weeks 1-4: Direct sales only**
- Target: Atrium Health (H.O.P.E. program), CRRA, Crisis Assistance Ministry, DreamKey Partners, USCRI NC
- Goal: 10-15 discovery calls booked, 3-5 demos delivered
- Outcome: 1 signed pilot (paid, even if discounted) + 2 LOIs within 60 days

**Weeks 4-8: Re-approach academics with proof**
- Target: NC A&T CIAHSC (Dr. Yuhan Jiang)
- Pitch: "We're building placement technology. [First customer] is our pilot. Research partnership on placement effectiveness?"
- Do NOT re-approach Billingsley/Cash until you have traction

**Weeks 8+: MVP delivery + expansion**
- Ship working product to pilot customer
- Onboard 2-3 additional orgs from LOI pipeline
- Submit NC A&T grant application

### Obsidian Update Plan

| Document | Action |
|----------|--------|
| **Sprint Board** (`00-Dashboard/Sprint Board.md`) | Replace CoNest compliance tasks with Placd lanes: Demo Build → Sales Outreach → Pilot Signed → MVP Build |
| **Phased Growth Roadmap** (`01-CoNest/`) | Replace with Placd 4-phase: Phase 1 = Demo + pilot (Wk 1-4), Phase 2 = MVP (Wk 5-12), Phase 3 = 5-10 orgs + grants (Mo 4-8), Phase 4 = Scale + adjacent verticals (Mo 9-18) |
| **Milestones** (`06-Tracking/Roadmap/`) | Q2 2026: Demo + 3 discovery calls + 1 pilot. Q3: MVP + 3-5 paying orgs. Q4: $10K+ MRR + NC A&T grant submitted |
| **Strategic Connections** (`02-Business/Partnerships/`) | Add dormant note: "Built for CoNest B2C. Re-approach after first Placd pilot." |
| **Backup Academic Connections** (`02-Business/Partnerships/`) | Elevate NC A&T CIAHSC as primary. Deprioritize JCSU. Add: "Outreach after first pilot proof point." |
| **Funding Strategy 2026** (`02-Business/Funding/`) | Rewrite: Track 1 = B2B sales (primary). Track 2 = Grants via NC A&T (secondary). Track 3 = SDVOSB (unchanged). Remove CoNest B2C projections. |
| **Revenue docs** (`02-Business/Revenue/`) | Replace B2C pricing with Placd B2B: $499-999/mo + $50/placement. Drop voucher model. |
| **Project folder** | Create `01-Placd/` alongside archived `01-CoNest/` |

**New documents to create in Obsidian**:
- `01-Placd/Lead List.md` — Tiered lead list (see Lead List section below)
- `01-Placd/Sales Playbook.md` — Discovery call script, demo flow, objection handling, pricing anchoring
- `01-Placd/Pitch Deck Outline.md` — New Placd pitch replacing CoNest Feb 2026 deck

### Partnership Relevance After Pivot

| Partner | Placd Relevance | Action |
|---------|-----------------|--------|
| **Dr. Billingsley (JCSU)** | Medium — grant co-PI still works, but JCSU lacks HUD funding CIAHSC has | Dormant. Re-approach only if she resurfaces. |
| **John Cash (Narmer Group)** | Low — B2B enterprise sales ≠ social media marketing | Dormant. Federal funding navigation useful but not urgent. |
| **Michael Roberts Sr.** | Low — Placd is SaaS, not housing development. Liability risk. | Drop. |
| **NC A&T CIAHSC** | **High** — $2.5M HUD funding, housing placement research alignment | Primary academic target. Outreach after first pilot. |
| **CoAbode** | Medium — they have the same spreadsheet problem Placd solves | Keep as future prospect / potential customer. |
| **Co-parenting apps** | **Irrelevant** — Placd users are case managers, not parents | Drop entirely. |

---

## Section 4: Revenue Model, Pricing & Success Metrics

### Pricing Tiers

| Tier | Monthly | Includes | Target Buyer |
|------|---------|----------|-------------|
| **Starter** | $499/mo | 3 case manager seats, 50 placements/mo, basic reporting, email support | Small nonprofits (3-5 staff) |
| **Professional** | $799/mo | 10 seats, unlimited placements, compliance reporting (ORR/HUD templates), priority support | Mid-size orgs (CRRA, USCRI NC, Crisis Assistance Ministry) |
| **Enterprise** | $999+/mo | Unlimited seats, custom reporting, API access, dedicated onboarding, SLA | Housing authorities (INLIVIAN), corporate/EAH (Atrium Health) |

**Per-placement fee**: $50/placement across all tiers. Usage-based revenue that scales with org activity.

### First Pilot Pricing

Offer Professional tier at Starter price ($499/mo) for 6 months as "founding partner" discount. Anchor at $799, discount to $499, lock for 6 months. Never go below $499.

After 6 months: workflow embedded, switching cost real, move to standard pricing.

### Revenue Projections

| Milestone | Timeline | Orgs | MRR | Cumulative Placements |
|-----------|----------|------|-----|-----------------------|
| First pilot signed | Week 4-6 | 1 | $499 | 0 (demo phase) |
| MVP live, pilot onboarded | Week 10-12 | 1-2 | $499-$998 | 10-20 |
| 5 paying orgs | Month 4-6 | 5 | $2,995-$4,495 | 50-100 |
| 10 orgs + first grant | Month 8-12 | 10 | $5,990-$9,990 | 200+ |

### Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Time-to-first-pilot | <6 weeks from demo | Validates PMF signal |
| Case manager hours saved/week | 10-15 hrs (measurable in first month) | ROI story for case study |
| Placements per org/month | 10-25 | Drives per-placement revenue |
| Org retention at 6 months | >90% | Validates stickiness |
| Net Revenue Retention | >110% | Upsell signal |
| Discovery-to-close rate | 20-30% | Validates sales motion |
| Time from pilot signed to MVP delivery | <60 days | Credibility for next 9 customers |

### Fundable Pitch Lines

- "We signed our first customer in 6 weeks with a demo."
- "Atrium Health's H.O.P.E. program went from 20 hrs/week manual placement to 4 hrs/week."
- "5 Charlotte orgs pay us $3K-$5K/month combined, with 90% retention."
- "$300K+ non-dilutive grant pending via NC A&T CIAHSC."
- "TAM expands to corporate relocation, insurance ALE, housing authorities — same product, different buyer."

---

## Lead List

### Tier 1: Housing Nonprofits (mission-aligned, grant-eligible)

| Org | Focus | Why They're a Lead |
|-----|-------|-------------------|
| **DreamKey Partners** | 36-year affordable housing developer, City of Charlotte contract holder | High-volume placement, established workflows |
| **Crisis Assistance Ministry** | Emergency rent/utility/housing stabilization, Mecklenburg County | High case volume, likely spreadsheet-heavy intake |
| **Home Again Foundation** | Affordable housing + supportive services for homeless/at-risk | Smaller org, president-led (Rick Gilbert), fast decision-maker |
| **Carolina Refugee Resettlement Agency** | Refugee housing placement in Charlotte | Core Placd use case, ORR compliance needs |
| **USCRI North Carolina** | Refugee/immigrant housing + case management since 2007 | Established placement workflow, federal funding |
| **Welcome Home Charlotte** | Refugee resettlement resources | Grassroots, possible referral partner |
| **Catholic Charities Diocese of Charlotte** | Refugee resettlement (currently paused — federal policy) | Paused = frustrated staff, may reactivate |

### Tier 2: Government / Coordinated Entry

| Org | Focus | Why They're a Lead |
|-----|-------|-------------------|
| **INLIVIAN** (Charlotte Housing Authority) | Public housing, Section 8/HCV waitlists | Uses tech for waitlists but placement matching is manual |
| **Mecklenburg County Housing & Homelessness** | Coordinated Entry System, HMIS | Runs county coordinated entry — exactly the workflow Placd replaces |
| **Mecklenburg County Dept of Community Resources** | Emergency Assistance Program, housing vouchers | Government entity with placement workflow |

### Tier 3: Corporate / Employer-Assisted Housing

| Org | Focus | Why They're a Lead |
|-----|-------|-------------------|
| **Atrium Health** | Runs H.O.P.E. employee housing program with partner communities. $10M housing commitment with LISC. | #1 corporate target. Already placing employees manually. |
| **Novant Health** | Major Charlotte health system, 35K+ employees | Same nurse housing pressure as Atrium |
| **UNC Charlotte** | Faculty/staff relocation resources, dual-career assistance | Has relocation workflow, manual processes |

### Top 5 First-Contact Priorities

1. **Atrium Health** — H.O.P.E. program, manual placement into partner communities, corporate budget
2. **Carolina Refugee Resettlement Agency** — Core use case, ORR compliance, refugee → unit placement
3. **Crisis Assistance Ministry** — High case volume emergency housing, likely spreadsheet-bound
4. **USCRI North Carolina** — Established refugee placement since 2007, federal funding
5. **DreamKey Partners** — City contract holder, high-volume affordable housing

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Brand/entity | Rebrand CoNest → Placd, same entity | Preserves SDVOSB cert, avoids new entity cost/delay |
| CoNest codebase | Snapshot to public portfolio repo | Preserves engineering portfolio, air-gapped from production |
| First sales motion | Charlotte nonprofits + Atrium Health corporate | Dual-lane: nonprofits for mission/grants, corporate for fast cash |
| Partnership sequencing | Direct sales primary, academics secondary | Revenue in 60-90 days vs. grants in 6-18 months |
| Tech stack | Keep Express backend + new Next.js frontend | Maximum code reuse, Express backend is hardened and tested |
| Matching mode | Client → Unit primary, Client → Client as premium add-on | Client → Unit is market volume; shared housing is niche |
| Multi-tenancy | Middleware + query-layer scoping (defense in depth) | JWT org claims + scoped query helper + indexed org_id |
| Execution approach | Demo-First | Fastest to revenue, customer shapes MVP |
| Billingsley/Cash | Dormant | Unresponsive + pivot changes the pitch. Re-approach with proof. |
| NC A&T CIAHSC | Primary academic target (after first pilot) | $2.5M HUD funding, stronger institutional fit than JCSU |
| Roberts | Drop | Liability risk, SaaS model doesn't need real estate partner |
