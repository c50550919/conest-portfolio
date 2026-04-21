# Google for Startups Black Founders Fund — Application

**Deadline**: Rolling / currently accepting applications
**Deal**: Up to $150K equity-free cash + Google Cloud credits + mentorship
**Apply**: https://startup.google.com/programs/black-founders-fund/united-states/

---

## Framing Notes

- Lead with technology depth and scale potential
- Emphasize: Black founder building enterprise infrastructure for an underserved sector
- Tone: Technical and ambitious. Google wants founders who build and scale technology.
- No live pitch required — written answers carry the full weight.

---

## Company Description

Placd is a B2B SaaS platform that brings intelligent matching to housing placement. Housing nonprofits, refugee resettlement agencies, and employer-assisted housing programs place families in homes using manual processes — spreadsheets, email-driven vacancy lists, undocumented matching decisions. Placd's weighted scoring engine matches clients to housing units on budget, language, accessibility, household size, and location. Organizations track every placement through a pipeline from intake to move-in, with exportable compliance reporting.

## Technology

Full-stack platform built solo: Next.js App Router frontend (shadcn/ui + Tailwind CSS), Express/TypeScript backend, PostgreSQL with Knex ORM, multi-tenant architecture with org-scoped JWT claims and defense-in-depth data isolation. Matching engine uses configurable weighted scoring (org-customizable weights for each matching factor). AES-256-GCM encryption for sensitive client data. Role-based access control (case manager / program director / org admin / super admin). Scoped query helpers enforce tenant isolation at every data access layer.

## Founder Background

African American founder. Disabled Air Force veteran. Security engineering background specializing in defense-in-depth architecture, encryption patterns, and access control systems. Built two full-stack platforms solo: CoNest (React Native mobile app — real-time messaging, Stripe payments, background check integration, matching algorithm) and Placd (multi-tenant B2B SaaS — weighted matching engine, compliance reporting, org-scoped data isolation). SDVOSB-eligible, providing structural access to government procurement channels.

## Scale Potential

The matching engine is market-agnostic — it scores a person against a housing unit on weighted criteria. This pattern applies to:
- 10,000+ housing nonprofits
- 3,300+ public housing authorities
- 350+ refugee resettlement agency offices
- Growing employer-assisted housing programs

Adjacent markets use the same engine with different weights: insurance ALE placement, military PCS housing, senior living placement, corporate relocation, disaster relief housing. Each vertical is incremental revenue without rebuilding the product.

## Stage and Traction

Pre-revenue. Working demo with real matching engine (not mockups or wireframes). Multi-tenant architecture deployed with org-scoped authentication, encrypted data, and configurable matching weights. Currently in discovery phase with Charlotte, NC housing organizations. SDVOSB-eligible — structural advantage for government procurement access.

## How Google Can Help

- **Google Cloud credits**: Scale infrastructure as orgs onboard. Multi-tenant PostgreSQL, file storage for compliance documents, deployment pipeline.
- **Mentorship**: Enterprise sales and go-to-market for government/nonprofit buyers. This is my biggest gap as a solo technical founder.
- **Network**: Introductions to housing technology ecosystem, potential corporate partners, impact investors.
- **Capital**: $150K in non-dilutive funding covers the gap between working demo and first paid pilot — 6+ months of discovery calls, feature development from pilot customer feedback, and initial go-to-market execution.

## Competitive Landscape

No purpose-built placement matching tool exists for housing organizations. HMIS platforms (Clarity, WellSky, ClientTrack) track enrollment data and generate compliance reports but do not perform intelligent matching. Salesforce Nonprofit Cloud provides case management but not placement scoring. Coordinated Entry systems built on HMIS use manual matching with daily vacancy emails. The real competitor is the spreadsheet and the case manager's institutional memory.

## Impact

Every dollar of Placd's revenue comes from organizations placing people in homes. Revenue growth is structurally aligned with housing placement volume. More placements = more revenue = more families housed. Target population served: refugees, homeless families, veterans, low-income households, domestic violence survivors, and employees in housing-cost-burdened markets.
