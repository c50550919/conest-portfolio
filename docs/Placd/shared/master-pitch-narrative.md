# Placd — Master Pitch Narrative

Reusable building blocks for all applications. Each program folder has its own tailored version.

---

## One-Liner (60 characters)
> Placement matching software for housing organizations.

## What Placd Makes (2 sentences)
> Placd is B2B SaaS that replaces the manual matching process housing organizations use to place clients in homes. Case managers upload clients and available units — Placd scores compatibility on budget, language, accessibility, household size, and location, and tracks every placement from intake to move-in.

## The Problem
> Housing nonprofits, refugee resettlement agencies, and employer-assisted housing programs place thousands of families in homes every year. The matching decision — which client fits which unit — is still done manually: spreadsheets, gut feel, daily email blasts, and "fake clients" holding units in HMIS systems like Clarity and ShelterPoint. Case managers spend 15-20 hours a week on placement logistics instead of serving families. When funders or auditors ask "why did family X get unit Y instead of family Z?" — there's no defensible, documented answer.

## Why Now
> Three forces are converging: (1) Federal refugee resettlement is under policy pressure, creating urgency for agencies to demonstrate placement efficiency with fewer resources, (2) housing affordability is at crisis levels nationally, pushing more organizations into active placement workflows, and (3) HMIS systems have tracked enrollment data for years but never added intelligent matching — that gap has existed for a decade but the tools to fill it (weighted scoring engines, configurable algorithms, modern SaaS) are now accessible to a single technical founder.

## Why Me
> I'm a disabled Air Force veteran and security engineer who built the entire Placd platform solo — backend (Express/PostgreSQL with multi-tenant isolation), frontend (Next.js/shadcn), and matching engine with configurable weighted scoring. I understand institutional housing because I lived the military housing assignment process. I'm SDVOSB-eligible, which unlocks set-aside government procurement that no VC-backed competitor can access. I built CoNest (B2C single parent housing platform) first, learned the unit economics were structurally broken, and pivoted to B2B with the same core technology. That pivot discipline is a signal, not a weakness.

## Progress
- Working demo: real matching engine, org-scoped multi-tenant architecture, placement pipeline (kanban with drag-and-drop), client roster with intake forms, compliance reporting (PDF export), role-based access control
- Seed data: 40 clients, 25 housing units, 15 active placements across pipeline stages
- Architecture: JWT auth with org-scoped claims, AES-256-GCM encryption, scoped query helpers enforcing tenant isolation
- Pre-revenue. No signed pilots yet.
- Discovery phase: researching HMIS/CE workflows, preparing outreach to 5 Charlotte housing organizations

## Revenue Model
- **Starter**: $499/mo — 3 seats, 50 placements/mo, basic reporting
- **Professional**: $799/mo — 10 seats, unlimited placements, compliance reporting (ORR/HUD templates)
- **Enterprise**: $999+/mo — unlimited seats, custom reporting, API access, SLA
- **Per-placement fee**: $50/placement across all tiers
- **First pilot**: $499/mo for 6 months (founding partner discount)

## Market Size
- 10,000+ housing nonprofits
- 350+ refugee resettlement agency offices
- 3,300+ public housing authorities
- Growing employer-assisted housing programs
- Adjacent markets: Insurance ALE, military PCS housing, senior living, corporate relocation, disaster relief

## Competitors
- **HMIS platforms** (Clarity, WellSky, ClientTrack): Track enrollment/reporting. No intelligent matching.
- **Salesforce Nonprofit Cloud**: Case management. No placement scoring.
- **Coordinated Entry**: Built on HMIS. Manual matching with daily vacancy emails.
- **The real competitor**: The spreadsheet.

## Competitive Advantage
1. **Purpose-built**: Not a CRM adapted for housing.
2. **Defensible scoring**: Weighted algorithm produces auditable match decisions.
3. **SDVOSB**: Government set-aside procurement access. Structural moat.
4. **Multi-vertical engine**: Same core serves nonprofits, corporate, insurance, military.
