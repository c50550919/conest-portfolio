# Placd Accelerator & Cohort Application Strategy

**Date**: 2026-04-07
**Status**: Approved
**Founder**: Service-disabled Air Force veteran, SDVOSB-eligible, Black founder, Charlotte NC
**Stage**: Pre-revenue, working demo, no pilots, in discovery phase

---

## Table of Contents

1. [Master Pitch Narrative](#master-pitch-narrative)
2. [Program Applications](#program-applications)
   - [Y Combinator Summer 2026](#1-y-combinator-summer-2026)
   - [PenFed Veteran Entrepreneur Accelerator](#2-penfed-veteran-entrepreneur-accelerator)
   - [Google for Startups Black Founders Fund](#3-google-for-startups-black-founders-fund)
   - [Halcyon EquityTech Fellowship](#4-halcyon-equitytech-fellowship)
   - [NC IDEA SEED Fall 2026](#5-nc-idea-seed-fall-2026)
3. [1-Minute Video Script](#1-minute-video-script)
4. [Pitch Deck Outline (15 Slides)](#pitch-deck-outline-15-slides)
5. [Even Realities Prep Notes](#even-realities-prep-notes)
6. [Application Timeline](#application-timeline)

---

## Master Pitch Narrative

These building blocks are reused across every application. Each program section shows how to adapt them.

### One-Liner (60 characters)
> Placement matching software for housing organizations.

### What Placd Makes (2 sentences)
> Placd is B2B SaaS that replaces the manual matching process housing organizations use to place clients in homes. Case managers upload clients and available units — Placd scores compatibility on budget, language, accessibility, household size, and location, and tracks every placement from intake to move-in.

### The Problem
> Housing nonprofits, refugee resettlement agencies, and employer-assisted housing programs place thousands of families in homes every year. The matching decision — which client fits which unit — is still done manually: spreadsheets, gut feel, daily email blasts, and "fake clients" holding units in HMIS systems like Clarity and ShelterPoint. Case managers spend 15-20 hours a week on placement logistics instead of serving families. When funders or auditors ask "why did family X get unit Y instead of family Z?" — there's no defensible, documented answer.

### Why Now
> Three forces are converging: (1) Federal refugee resettlement is under policy pressure, creating urgency for agencies to demonstrate placement efficiency with fewer resources, (2) housing affordability is at crisis levels nationally, pushing more organizations into active placement workflows, and (3) HMIS systems have tracked enrollment data for years but never added intelligent matching — that gap has existed for a decade but the tools to fill it (weighted scoring engines, configurable algorithms, modern SaaS) are now accessible to a single technical founder.

### Why Me
> I'm a disabled Air Force veteran and security engineer who built the entire Placd platform solo — backend (Express/PostgreSQL with multi-tenant isolation), frontend (Next.js/shadcn), and matching engine with configurable weighted scoring. I understand institutional housing because I lived the military housing assignment process. I'm SDVOSB-eligible, which unlocks set-aside government procurement that no VC-backed competitor can access. I built CoNest (B2C single parent housing platform) first, learned the unit economics were structurally broken, and pivoted to B2B with the same core technology. That pivot discipline is a signal, not a weakness.

### Progress
> - Working demo: real matching engine, org-scoped multi-tenant architecture, placement pipeline (kanban with drag-and-drop), client roster with intake forms, compliance reporting (PDF export), role-based access control (case manager / program director / org admin)
> - Seed data simulates Charlotte nonprofit: 40 clients, 25 housing units, 15 active placements across pipeline stages
> - Architecture: JWT auth with org-scoped claims, AES-256-GCM encryption for sensitive data, scoped query helpers enforcing tenant isolation at every data access layer
> - Pre-revenue. No signed pilots yet.
> - Currently in discovery phase: researching HMIS/Coordinated Entry workflows (ShelterPoint, Clarity), preparing outreach to Charlotte housing organizations (CRRA, Crisis Assistance Ministry, Atrium Health H.O.P.E. program, DreamKey Partners, USCRI NC)

### Revenue Model
> SaaS subscription + per-placement usage fee:
> - **Starter**: $499/mo — 3 case manager seats, 50 placements/mo, basic reporting
> - **Professional**: $799/mo — 10 seats, unlimited placements, compliance reporting (ORR/HUD templates)
> - **Enterprise**: $999+/mo — unlimited seats, custom reporting, API access, SLA
> - **Per-placement fee**: $50/placement across all tiers
> - **First pilot pricing**: Professional tier at Starter price ($499/mo) for 6 months as founding partner discount

### Market Size
> - 10,000+ housing nonprofits in the U.S.
> - 350+ refugee resettlement agency offices (9 national networks)
> - 3,300+ public housing authorities
> - Growing employer-assisted housing programs (Atrium Health, Novant, major employers)
> - **Adjacent markets (same engine, different buyer)**: Insurance ALE placement, military PCS housing, senior living placement, corporate relocation, disaster relief housing
> - No purpose-built placement matching tool exists for any of these segments

### Competitors
> - **HMIS platforms** (Clarity/Bitfocus, WellSky ServicePoint, ClientTrack/Eccovia): Track enrollment, assessments, and HUD reporting. Do NOT do intelligent matching — case managers still decide manually who gets which unit.
> - **Salesforce Nonprofit Cloud**: Strong case management and task tracking. No placement scoring or housing-specific matching.
> - **Coordinated Entry systems**: Built on HMIS. Use daily vacancy lists and email-driven manual matching. Chicago's ShelterPoint training explicitly acknowledges wanting "more automation" in matching.
> - **The real competitor is the spreadsheet** — and the case manager's mental model of who fits where.

### Competitive Advantage
> 1. **Purpose-built**: Not a general CRM adapted for housing. Built specifically for the client → unit matching workflow.
> 2. **Defensible scoring**: Weighted compatibility algorithm produces documented, auditable match decisions — answers the "why this family, why this unit" question for funders.
> 3. **SDVOSB**: Set-aside procurement access for government contracts (housing authorities, VA programs). Structural moat no VC-backed competitor can replicate.
> 4. **Multi-vertical engine**: Same matching core serves nonprofits, corporate housing, insurance, military — each vertical is a new revenue stream without rebuilding the product.

---

## Program Applications

### 1. Y Combinator Summer 2026

**Deadline**: May 4, 2026, 8pm PT
**Decision**: By June 5
**Batch**: July–September, San Francisco
**Deal**: $500K for 7% equity
**Apply**: https://www.ycombinator.com/apply

#### Application Answers

**Company name**: Placd

**Company URL**: [demo URL if deployed, or "Pre-launch — demo available on request"]

**What is your company going to make?**
> Software that matches housing clients to available units for nonprofits, refugee agencies, and employer housing programs. Case managers use HMIS to track data but still decide placements manually — spreadsheets, gut feel, email chains. Placd adds intelligent matching: weighted scoring on budget, language, accessibility, household size, location. Drag placements through a pipeline. Export compliance reports. The case manager's 15-hour/week placement workflow drops to 4 hours.

**Please tell us in one or two sentences something impressive each founder has built or achieved.**
> Solo-built two full-stack platforms: CoNest (React Native mobile app with real-time messaging, Stripe payments, background check integration, matching algorithm — shipped to app stores) and Placd (multi-tenant Next.js SaaS with weighted matching engine, AES-256-GCM encryption, org-scoped data isolation, kanban pipeline, PDF compliance reporting — built in 3 weeks). Before startups: security engineer with defense-in-depth architecture experience, Air Force veteran.

**Why did you pick this idea to work on? Do you have domain expertise in this area?**
> I built CoNest first — a B2C app matching single parents as roommates. The unit economics were structurally broken: $14.99/month couldn't cover verification costs, and the trust problem (strangers moving in with kids) was unsolvable at the consumer level. But while researching housing, I found that every organization placing people in homes — refugee agencies, housing nonprofits, employer programs — runs the same manual matching workflow on spreadsheets and email. Nobody has built a purpose-built tool for this. I understand institutional housing from personal experience: the military housing assignment process is the same workflow, just in uniform.

**What is your progress? (Revenue, users, launches)**
> Pre-revenue. Working demo with real matching engine (not mockups). Multi-tenant architecture with org-scoped JWT auth, encrypted sensitive data, configurable matching weights. Demo simulates a Charlotte nonprofit with 40 clients, 25 units, 15 active placements. Currently in discovery phase — researching HMIS/Coordinated Entry workflows and preparing outreach to 5 Charlotte housing organizations. No signed pilots yet. I'm applying to YC because I need help closing my first enterprise sale and expanding beyond Charlotte.

**How will you get your first customers?**
> Direct outreach to Charlotte housing organizations. Top 5 targets identified: (1) Atrium Health H.O.P.E. program — corporate employer-assisted housing, manual placement into partner communities, (2) Carolina Refugee Resettlement Agency — core use case, ORR compliance needs, (3) Crisis Assistance Ministry — high-volume emergency housing, (4) USCRI North Carolina — refugee placement since 2007, (5) DreamKey Partners — City of Charlotte contract holder. Running dual lanes: corporate (Atrium) for faster close, nonprofit for mission alignment and case study. Discovery call script prepared with system-native language from studying ShelterPoint and HMIS training materials.

**What is your revenue model?**
> SaaS subscription: $499-$999/month based on tier (seats, features, reporting). Plus $50 per successful placement across all tiers. First pilot at $499/month for 6 months, then standard pricing. Unit economics improve with per-placement revenue as orgs increase volume.

**Who are your competitors?**
> HMIS platforms (Clarity, WellSky, ClientTrack) — mandated by HUD, track enrollment and reporting, but do NOT do intelligent matching. Case managers still decide manually. Salesforce Nonprofit Cloud — case management, not placement matching. No purpose-built placement matching tool exists. The real competitor is the spreadsheet and the case manager's head. We win because we produce defensible, auditable match decisions that answer the funder's question: "why this family, why this unit?"

**Why will you win?**
> Three structural advantages: (1) Purpose-built for placement matching — not a CRM adapted sideways. (2) SDVOSB certification — unlocks government set-aside procurement that VC-backed competitors can't access (3,300+ housing authorities, VA programs). (3) Multi-vertical engine — same matching core serves nonprofits today, corporate relocation and insurance ALE tomorrow. Each vertical is incremental revenue without rebuilding the product.

**Is there anything else you'd like us to know?**
> I pivoted from B2C to B2B after honest analysis showed CoNest's model was broken. That pivot — not stubbornness — is why I'm confident in Placd. The technology works. The market gap is validated by primary source research (HMIS training videos, ShelterPoint CE matching workflows show manual processes and explicit requests for "more automation"). What I need from YC is sales mentorship and network access to housing organizations beyond Charlotte.

#### 1-Minute Video Notes
See [1-Minute Video Script](#1-minute-video-script) section below.

---

### 2. PenFed Veteran Entrepreneur Accelerator

**Next cohorts**: Tysons VA (May 5-8), Bentonville AR (Jul 21-24), San Antonio TX (Sep 15-18)
**Deadline**: Rolling (monthly review)
**Deal**: Free. No equity. Travel covered.
**Apply**: https://penfedfoundation.org/our-programs/vep/

#### Application Framing

**Lead with**: Veteran identity, service-to-mission continuity, SDVOSB as competitive moat.

**Tone**: "I served my country. Now I build tools for the people serving our communities."

**Business description**:
> Placd is B2B SaaS for housing placement organizations — nonprofits, refugee resettlement agencies, housing authorities, and employer-assisted housing programs. These organizations place families in homes manually: spreadsheets, email chains, gut-feel matching. Placd replaces that with intelligent matching (weighted scoring on budget, language, accessibility, household size, location), a placement pipeline, and compliance reporting.

**MVP status**:
> Working demo with real matching engine, multi-tenant architecture, placement pipeline (kanban), client roster, compliance reporting, and role-based access. Built solo as a full-stack security engineer. Ready for pilot deployment.

**Scalability**:
> 10,000+ housing nonprofits, 3,300+ housing authorities, 350+ refugee resettlement offices in the U.S. Same matching engine serves corporate relocation, insurance ALE, military housing, and senior living — each a new vertical without rebuilding the product. SaaS model ($499-$999/month + $50/placement) scales with org count and placement volume.

**Why veteran-led matters**:
> SDVOSB certification unlocks set-aside government procurement for housing authorities and VA programs. No VC-backed competitor can access this channel. My military background includes direct experience with institutional housing assignment — the same workflow Placd digitizes. Service-disabled veteran building tools to house vulnerable populations is not just a story — it's a structural competitive advantage.

**What I need from VEP**:
> Help closing my first enterprise sale. Investor introductions. Mentorship on B2B SaaS sales cycles for government and nonprofit buyers. Connections to housing organizations beyond Charlotte.

---

### 3. Google for Startups Black Founders Fund

**Deadline**: Rolling / currently accepting
**Deal**: Up to $150K equity-free cash + Google Cloud credits + mentorship
**Apply**: https://startup.google.com/programs/black-founders-fund/united-states/

#### Application Framing

**Lead with**: Technology depth, scale potential, Black founder building enterprise infrastructure for an underserved sector.

**Tone**: Technical and ambitious. Google wants to see founders who can build and scale technology.

**Company description**:
> Placd is a B2B SaaS platform that brings intelligent matching to housing placement. Housing nonprofits, refugee resettlement agencies, and employer-assisted housing programs place families in homes using manual processes — spreadsheets, email-driven vacancy lists, undocumented matching decisions. Placd's weighted scoring engine matches clients to housing units on budget, language, accessibility, household size, and location. Organizations track every placement through a pipeline from intake to move-in, with exportable compliance reporting.

**Technology**:
> Full-stack platform built solo: Next.js App Router frontend (shadcn/ui + Tailwind), Express/TypeScript backend, PostgreSQL with Knex ORM, multi-tenant architecture with org-scoped JWT claims and defense-in-depth data isolation. Matching engine uses configurable weighted scoring (org-customizable weights). AES-256-GCM encryption for sensitive client data. Role-based access control (case manager / program director / org admin / super admin).

**Scale potential**:
> The matching engine is market-agnostic — it scores a person against a housing unit on weighted criteria. This pattern applies to 10,000+ housing nonprofits, 3,300+ housing authorities, 350+ refugee resettlement offices, and employer-assisted housing programs. Adjacent markets use the same engine with different weights: insurance ALE placement, military PCS housing, senior living, corporate relocation, disaster relief. Each vertical is incremental revenue without rebuilding the product.

**Stage and traction**:
> Pre-revenue. Working demo with real matching engine (not mockups). Multi-tenant architecture deployed. Currently in discovery phase with Charlotte housing organizations. SDVOSB-eligible (service-disabled veteran), which provides set-aside government procurement access.

**How Google can help**:
> Google Cloud credits to scale infrastructure. Mentorship on enterprise sales and go-to-market for government/nonprofit buyers. Network access to housing technology ecosystem. The $150K in non-dilutive capital funds the gap between demo and first paid pilot — covering 6+ months of discovery calls, feature development based on pilot customer feedback, and initial go-to-market.

---

### 4. Halcyon EquityTech Fellowship

**Deadline**: Rolling eligibility form
**Deal**: Fellowship support, resources, DC-based network
**Apply**: https://halcyon.submittable.com/submit

#### Eligibility Form Answers

**Venture name**: Placd

**One-sentence description**:
> B2B SaaS that brings intelligent placement matching to housing organizations serving refugees, homeless families, veterans, and other vulnerable populations.

**Impact focus**:
> SDG 11 (Sustainable Cities and Communities): Improving housing placement efficiency for organizations that house vulnerable populations.
> SDG 10 (Reduced Inequalities): Ensuring placement decisions are documented, defensible, and equitable — not based on gut feel or implicit bias.
> SDG 1 (No Poverty): Reducing time-to-placement means families access stable housing faster, enabling faster economic participation.

**How is impact non-negotiable to your business model?**
> Every dollar of Placd's revenue comes from organizations placing people in homes. More placements = more revenue = more families housed. The business model is structurally aligned with impact — we cannot grow revenue without increasing housing placements for vulnerable populations.

**Stage**:
> MVP-stage. Working demo with real matching engine, multi-tenant architecture, placement pipeline, and compliance reporting. Pre-revenue. In discovery phase with Charlotte housing organizations.

#### Invited Application (If Selected) — Pitch Deck
See [Pitch Deck Outline](#pitch-deck-outline-15-slides) section below.

#### Invited Application — Written Proposal

**Innovation**:
> Housing placement organizations use HMIS systems (Clarity, WellSky, ClientTrack) to track client data and report to funders. But the actual matching decision — which client goes to which unit — remains manual, undocumented, and unscalable. Placd is the first purpose-built placement matching tool: weighted scoring on budget, language, accessibility, household size, and location, with a pipeline that tracks every placement from intake to move-in. This produces auditable, defensible placement decisions that answer the question funders increasingly ask: "why this family, why this unit?"

**Scalability**:
> Placd's matching engine is market-agnostic. The same weighted scoring infrastructure serves housing nonprofits, refugee resettlement, employer-assisted housing, insurance ALE, military housing, and senior living placement. Each vertical is a new revenue stream without rebuilding the product. SaaS pricing ($499-$999/month + $50/placement) scales with org count and placement volume. TAM in housing alone: 10,000+ nonprofits, 3,300+ housing authorities, 350+ resettlement offices.

**Talent**:
> Solo technical founder. Disabled Air Force veteran. Security engineering background (defense-in-depth architecture, encryption, access control). Built two full-stack platforms: CoNest (React Native mobile, real-time messaging, Stripe, background checks) and Placd (multi-tenant SaaS, matching engine, compliance reporting). SDVOSB-eligible — structural advantage for government procurement.

---

### 5. NC IDEA SEED Fall 2026

**Opens**: ~August 2026
**Deadline**: ~September 2026
**Deal**: $50K grant, non-dilutive
**Apply**: https://ncidea.org/nc-idea-seed/

#### Application Framing

**Lead with**: NC presence, customer discovery evidence, specific use of funds, path to $2M+ revenue.

**Company description**:
> Placd is Charlotte-based B2B SaaS for housing placement organizations. Case managers at nonprofits, refugee agencies, and employer housing programs spend 15-20 hours/week matching clients to housing units manually. Placd's weighted scoring engine automates matching on budget, language, accessibility, household size, and location. Placement pipeline tracks every case from intake to move-in. Compliance reporting exports to PDF for funder requirements.

**Market opportunity**:
> 10,000+ housing nonprofits, 3,300+ housing authorities, 350+ refugee resettlement offices in the U.S. No purpose-built placement matching tool exists. Coordinated Entry systems (built on HMIS) use manual matching — Chicago's ShelterPoint training explicitly acknowledges wanting "more automation." Revenue path: 10 orgs at $799/month = $96K ARR + placement fees. 50 orgs = $500K+ ARR. Expansion to government/corporate/insurance verticals drives $2M+ within 3-5 years.

**Customer discovery evidence**:
> Primary research into HMIS workflows (Clarity, ShelterPoint) via official training materials reveals that matching is manual across the industry. Coordinated Entry matching in Chicago uses daily vacancy emails, manual client-to-unit assignment, and "fake clients" to hold units. Case managers explicitly request "more automation and fairness in matching." Discovery call pipeline includes 5 Charlotte organizations: Atrium Health H.O.P.E. (corporate employer-assisted housing), CRRA (refugee resettlement), Crisis Assistance Ministry (emergency housing), USCRI NC (refugee/immigrant housing), DreamKey Partners (City of Charlotte affordable housing contract holder).

**Use of $50K SEED funds**:
> 1. **Close first pilot** ($5K) — Discovery calls, demo refinement, contract negotiation with first paying customer
> 2. **Build pilot-driven features** ($25K) — 3 months of development on features requested during pilot: bulk client/unit import (CSV), notification system, inter-case-manager messaging, landlord communication portal
> 3. **Expand discovery beyond Charlotte** ($10K) — Outreach to refugee resettlement agencies in Raleigh, Greensboro, and Triangle area; attend NC housing coalition meetings
> 4. **Infrastructure** ($10K) — Production deployment, monitoring, security audit, SDVOSB certification completion

**Path to institutional investment or $2M+ revenue**:
> After SEED: 1-3 paying orgs in Charlotte, validated PMF. Months 4-8: expand to 10 NC orgs ($96K-$120K ARR). Months 8-12: enter government channel via SDVOSB (housing authorities). Month 12+: adjacent verticals (insurance ALE, corporate relocation). $2M+ ARR achievable at 100+ orgs — realistic given 14,000+ potential customers across housing nonprofits, authorities, and resettlement agencies. Alternatively, seed round ($500K-$1M) after demonstrating NC traction + government channel access.

---

## 1-Minute Video Script

**For**: YC application (required), Halcyon (optional), general use

**Format**: Face to camera. Load key stats into Even Realities Prep Notes. No slides — just you and optionally a brief screen share of the demo.

**Script** (aim for 55-60 seconds):

> **[0:00-0:15 — The Problem]**
> "Housing nonprofits and refugee agencies place thousands of families in homes every year. The matching decision — which family gets which unit — is still done on spreadsheets and gut feel. Case managers spend 15 hours a week on placement logistics instead of helping families."
>
> **[0:15-0:40 — The Solution + Demo Flash]**
> "Placd fixes that. It's placement matching software for housing organizations. Case managers see their clients, see available units, and the system scores compatibility — budget, language, accessibility, household size, location. Drag a placement through the pipeline from intake to move-in. Export a compliance report for your funder. What used to take 15 hours takes 4."
>
> *[Optional: 5-second screen share of pipeline board or match view]*
>
> **[0:40-0:55 — Why Me, Why Now]**
> "I'm a disabled Air Force veteran. I built this entire platform solo. There are 10,000 housing nonprofits, 3,300 housing authorities, and 350 resettlement offices in the U.S. — none of them have a purpose-built matching tool. I'm SDVOSB-eligible, which gives me set-aside access to government contracts no VC-backed competitor can touch."
>
> **[0:55-1:00 — The Ask]**
> "I need help closing my first pilot and expanding beyond Charlotte."

**Recording tips**:
- Load the 3 key stats (15 hrs → 4 hrs, 10,000+ nonprofits, 3,300+ authorities) into Even Realities Prep Notes
- Record in a quiet room with good lighting, face to camera
- Conversational tone — don't read. The glasses have your safety net.
- One take is fine. YC explicitly says they don't care about production quality.

---

## Pitch Deck Outline (15 Slides)

**For**: Halcyon (15 slides max), general investor/demo use, Pitch Day events

| Slide | Title | Content |
|-------|-------|---------|
| 1 | **Placd** | Logo, one-liner: "Placement matching software for housing organizations." |
| 2 | **The Problem** | Case managers spend 15-20 hrs/week matching manually. Spreadsheets. Gut feel. No defensible documentation. "Behind every placement is a family waiting." |
| 3 | **Why Now** | Policy pressure on resettlement, housing crisis, HMIS has data but no matching intelligence |
| 4 | **The Solution** | Weighted matching engine + placement pipeline + compliance reporting. Screenshot of pipeline board. |
| 5 | **How It Works** | 3-step flow: (1) Add clients & units → (2) System scores matches → (3) Track placement through pipeline |
| 6 | **Demo Screenshot** | Match view — client profile side-by-side with top 3 ranked units + compatibility scores |
| 7 | **Market Size** | 10,000+ nonprofits, 3,300+ housing authorities, 350+ resettlement offices. No purpose-built tool exists. |
| 8 | **Business Model** | Subscription tiers ($499-$999/mo) + $50/placement fee. Show unit economics. |
| 9 | **Competitors** | HMIS (data, no matching), Salesforce (CRM, no placement scoring), Spreadsheets (the real competitor) |
| 10 | **Competitive Advantage** | Purpose-built + Defensible scoring + SDVOSB moat + Multi-vertical engine |
| 11 | **Go-to-Market** | Charlotte first → NC nonprofits → Government (SDVOSB) → Corporate/insurance verticals |
| 12 | **Traction** | Working demo, matching engine live, discovery pipeline (5 Charlotte orgs), HMIS workflow research completed |
| 13 | **Impact** | Every placement = a family housed. Every hour saved = a case manager who serves one more family. Map to SDGs 1, 10, 11. |
| 14 | **Team** | Solo founder. Air Force veteran. Security engineer. Built 2 full platforms. SDVOSB-eligible. |
| 15 | **The Ask** | [Customize per program: YC = help closing first sale; Halcyon = fellowship resources; Google = $150K non-dilutive capital] |

---

## Even Realities Prep Notes

### Key Stats (Load Into Glasses)
Upload these for any live pitch or interview:

```
PROBLEM:
- 15-20 hrs/week case managers spend on manual placement
- Spreadsheets + gut feel = no defensible match decisions
- ShelterPoint (Chicago) uses "fake clients" to hold units

MARKET:
- 10,000+ housing nonprofits
- 3,300+ housing authorities  
- 350+ refugee resettlement offices
- $0 spent on purpose-built matching tools today

REVENUE:
- $499-$999/mo subscription + $50/placement
- First pilot: $499/mo for 6 months
- 10 orgs = ~$96K ARR + placement fees
- 50 orgs = $500K+ ARR

MOATS:
- SDVOSB = government set-aside procurement
- Purpose-built (not adapted CRM)
- Multi-vertical engine (same core, different buyers)

MY STORY:
- Disabled Air Force veteran
- Security engineer background
- Built 2 full platforms solo
- Pivoted from B2C (broken economics) to B2B (validated gap)
```

### YC Interview Rapid-Fire Prep
Load these for the 10-minute YC video interview:

```
Q: What do you make?
A: Placement matching software for housing orgs.

Q: Revenue?
A: Pre-revenue. Working demo. In discovery.

Q: How do you get customers?
A: Direct outreach to Charlotte housing orgs. 5 in pipeline.

Q: Why will they switch?
A: They're not switching FROM anything. No tool exists. They're switching from spreadsheets and email.

Q: What if Salesforce builds this?
A: Salesforce builds horizontal CRM. We build vertical placement matching. They've had 20 years to add matching to Nonprofit Cloud and haven't.

Q: What if HMIS vendors add matching?
A: HMIS vendors (Clarity, WellSky) are compliance-reporting tools. Adding matching changes their product category. They'd have to rebuild. We're native.

Q: Why you?
A: Built 2 platforms solo. Security engineer. Veteran with SDVOSB access to 3,300+ housing authorities. Pivoted when data said pivot.

Q: What's the biggest risk?
A: Sales cycle. Nonprofits are slow buyers. Mitigating with dual lane: corporate (Atrium Health, faster close) + nonprofit (CRRA, mission aligned).
```

---

## Application Timeline

| Date | Action | Program |
|------|--------|---------|
| **April 7-11** | Write 60-sec and 3-min pitch. Load into Even Realities. Practice 5x. | All |
| **April 11-14** | Submit PenFed Accelerator application (target Tysons VA May 5-8 cohort) | PenFed |
| **April 14-18** | Submit Google Black Founders Fund application | Google BFF |
| **April 14-18** | Submit Halcyon eligibility form | Halcyon |
| **April 18-25** | Build YC application. Record 1-minute video. Practice with Even Realities. | YC |
| **April 25-May 2** | Refine YC answers. Get feedback from 1-2 people. | YC |
| **May 4** | **Submit YC application** (deadline 8pm PT) | YC |
| **May 5-8** | Attend PenFed Tysons VA cohort (if accepted) | PenFed |
| **June 5** | YC decision arrives | YC |
| **~August** | Submit NC IDEA SEED Fall application when cycle opens | NC IDEA |
| **September** | Submit TinySeed Fall 2026 application when it opens | TinySeed |

---

## Notes

- **No loans**: All programs listed are either non-dilutive (grants/fellowships) or equity-based (accelerators). No debt instruments.
- **Equity decisions**: YC (7%), Alchemist (~5%), TinySeed (varies) require equity. PenFed, Google BFF, Halcyon, NC IDEA SEED are all equity-free. Evaluate case-by-case based on program strength.
- **Pitch freeze mitigation**: Even Realities G2 glasses with Teleprompter and Prep Notes features. Load pitch script and key stats. Practice 5+ times before any live pitch. The glasses provide a safety net that reduces anxiety.
- **DAV Patriot Boot Camp**: Previously attended, did not close during pitch. Not reapplying. Focus on programs with different formats.
