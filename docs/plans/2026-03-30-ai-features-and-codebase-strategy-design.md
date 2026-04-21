# AI Features & Codebase Strategy Design

**Date:** 2026-03-30
**Status:** Approved
**Context:** Placd B2B pivot — demo-first sales approach targeting Charlotte nonprofits

---

## Decision 1: Customer-Facing AI Features in Demo

### Decision: UI-Only AI Touches — Show the Vision, Build Later

The demo is a screen-share visual prop (Option A in sales cycle). AI features don't need real backend logic — seed data that looks like AI output is indistinguishable from real AI during a narrated walkthrough.

### What to Add (Ranked by Demo Impact)

**1. AI Match Score on Placement Cards (High Impact)**
- Percentage badge (e.g., "92% match") on pipeline board cards and client detail
- Seed data provides the numbers — no algorithm needed
- Demo narrative: "Placd scores compatibility based on unit requirements, client needs, and placement history"
- Prospect hears: *this is smarter than my spreadsheet*

**2. Suggested Placements on Client Detail (High Impact)**
- 2-3 recommended units per client with match reasons
- Reasons like: "Budget fit", "School district match", "Wheelchair accessible"
- All hardcoded in seed data
- Prospect hears: *this saves my case managers 30 minutes per client*

**3. At-Risk Flag on Stalled Placements (Medium Impact)**
- Red indicator on placements sitting in one pipeline stage too long
- Simple date math (days_in_stage > threshold), not AI
- Prospect hears: *nothing falls through the cracks*

### What NOT to Build for Demo

- Document processing / OCR intake automation
- Real matching algorithm with ML
- Predictive analytics / time-to-place forecasting
- Any LLM API integration
- Chat-based AI assistant

### Rationale

The close is "I can see my pipeline and my team saves 10 hours/week." AI is the sizzle that makes Placd feel modern vs. a spreadsheet. It doesn't need to be real until post-pilot when you have actual usage data to train on.

---

## Decision 2: Codebase Strategy — Demo Evolves Into MVP

### Decision: Same Repo, Progressive Enhancement

The demo and MVP share one codebase. The demo *becomes* the MVP through progressive replacement of seed data with real features.

### Why

- Backend has 22 feature modules, 40+ migrations, auth, Stripe, real-time, encryption — too valuable to discard
- `web/` Next.js app already talks to Express API with real data flow
- Multi-tenant org scoping (`[orgSlug]`) already built
- Demo seed data → pilot org's real data is a configuration change, not a rewrite

### Demo → MVP Transition Map

| Layer | Demo (Now) | MVP (After Pilot Signed) |
|-------|-----------|--------------------------|
| Data | Seed data (Charlotte Housing Partners) | Real org data |
| AI scores | Hardcoded in seed | Real matching algorithm |
| Auth | Basic JWT, demo credentials | RBAC with role permissions |
| Demo banner | Visible | Removed |
| Tenancy | Single demo org | Multi-tenant onboarding |
| Integrations | None | HMIS export, HUD reporting |
| Payments | Disabled | Stripe subscription billing |

### Branch Strategy

- `placd-pivot` branch: current demo work
- Merge to `main` when demo is call-ready
- MVP features land on `main` via feature branches
- No separate "demo" and "mvp" repos or long-lived branches

---

## Competitive Positioning

**Primary competitor:** Spreadsheets + HMIS (Clarity Human Services)

HMIS is a HUD compliance/reporting tool, not a workflow tool. Placd is the workflow layer orgs are missing. HMIS is a complement, not a competitor. Salesforce is overkill and not purpose-built for housing placement.

**Discovery call opener:** "Walk me through how you track a client from intake to placed today."

**Demo close:** Time savings (A) + pipeline visibility (B). AI features are differentiator sizzle, not the core pitch.

---

## Implementation Priority

1. AI Match Score badges on pipeline cards + client detail (seed data)
2. Suggested Placements section on client detail page (seed data)
3. At-Risk flag on stalled placements (simple date math)
4. Start outreach — demo is ready for calls after these additions
