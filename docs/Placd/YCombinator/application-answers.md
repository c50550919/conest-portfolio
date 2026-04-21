# Y Combinator Summer 2026 — Application Answers

**Deadline**: May 4, 2026, 8pm PT
**Decision**: By June 5
**Batch**: July–September, San Francisco
**Deal**: $500K for 7% equity
**Apply**: https://www.ycombinator.com/apply

---

## Company name
Placd

## Company URL
[Pre-launch — demo available on request]

## What is your company going to make?

Software that matches housing clients to available units for nonprofits, refugee agencies, and employer housing programs. Case managers use HMIS to track data but still decide placements manually — spreadsheets, gut feel, email chains. Placd adds intelligent matching: weighted scoring on budget, language, accessibility, household size, location. Drag placements through a pipeline. Export compliance reports. The case manager's 15-hour/week placement workflow drops to 4 hours.

## Please tell us in one or two sentences something impressive each founder has built or achieved.

Solo-built two full-stack platforms: CoNest (React Native mobile app with real-time messaging, Stripe payments, background check integration, matching algorithm — shipped to app stores) and Placd (multi-tenant Next.js SaaS with weighted matching engine, AES-256-GCM encryption, org-scoped data isolation, kanban pipeline, PDF compliance reporting — built in 3 weeks). Before startups: security engineer with defense-in-depth architecture experience, Air Force veteran.

## Why did you pick this idea to work on? Do you have domain expertise in this area?

I built CoNest first — a B2C app matching single parents as roommates. The unit economics were structurally broken: $14.99/month couldn't cover verification costs, and the trust problem (strangers moving in with kids) was unsolvable at the consumer level. But while researching housing, I found that every organization placing people in homes — refugee agencies, housing nonprofits, employer programs — runs the same manual matching workflow on spreadsheets and email. Nobody has built a purpose-built tool for this. I understand institutional housing from personal experience: the military housing assignment process is the same workflow, just in uniform.

## What is your progress? (Revenue, users, launches)

Pre-revenue. Working demo with real matching engine (not mockups). Multi-tenant architecture with org-scoped JWT auth, encrypted sensitive data, configurable matching weights. Demo simulates a Charlotte nonprofit with 40 clients, 25 units, 15 active placements. Currently in discovery phase — researching HMIS/Coordinated Entry workflows and preparing outreach to 5 Charlotte housing organizations. No signed pilots yet. I'm applying to YC because I need help closing my first enterprise sale and expanding beyond Charlotte.

## How will you get your first customers?

Direct outreach to Charlotte housing organizations. Top 5 targets identified: (1) Atrium Health H.O.P.E. program — corporate employer-assisted housing, manual placement into partner communities, (2) Carolina Refugee Resettlement Agency — core use case, ORR compliance needs, (3) Crisis Assistance Ministry — high-volume emergency housing, (4) USCRI North Carolina — refugee placement since 2007, (5) DreamKey Partners — City of Charlotte contract holder. Running dual lanes: corporate (Atrium) for faster close, nonprofit for mission alignment and case study. Discovery call script prepared with system-native language from studying ShelterPoint and HMIS training materials.

## What is your revenue model?

SaaS subscription: $499-$999/month based on tier (seats, features, reporting). Plus $50 per successful placement across all tiers. First pilot at $499/month for 6 months, then standard pricing. Unit economics improve with per-placement revenue as orgs increase volume.

## Who are your competitors?

HMIS platforms (Clarity, WellSky, ClientTrack) — mandated by HUD, track enrollment and reporting, but do NOT do intelligent matching. Case managers still decide manually. Salesforce Nonprofit Cloud — case management, not placement matching. No purpose-built placement matching tool exists. The real competitor is the spreadsheet and the case manager's head. We win because we produce defensible, auditable match decisions that answer the funder's question: "why this family, why this unit?"

## Why will you win?

Three structural advantages: (1) Purpose-built for placement matching — not a CRM adapted sideways. (2) SDVOSB certification — unlocks government set-aside procurement that VC-backed competitors can't access (3,300+ housing authorities, VA programs). (3) Multi-vertical engine — same matching core serves nonprofits today, corporate relocation and insurance ALE tomorrow. Each vertical is incremental revenue without rebuilding the product.

## Is there anything else you'd like us to know?

I pivoted from B2C to B2B after honest analysis showed CoNest's model was broken. That pivot — not stubbornness — is why I'm confident in Placd. The technology works. The market gap is validated by primary source research (HMIS training videos, ShelterPoint CE matching workflows show manual processes and explicit requests for "more automation"). What I need from YC is sales mentorship and network access to housing organizations beyond Charlotte.
