# Y Combinator — Interview Prep

**Format**: 10-minute video call. Rapid-fire questions from 2-3 YC partners.
**Key**: Short, direct answers. Don't ramble. If you don't know, say so.
**Tool**: Load YC Q&A into Even Realities Prep Notes (see shared/even-realities-prep-notes.md)

---

## Opening (They'll start with one of these)

**"What does Placd do?"**
> Placement matching software for housing organizations. Nonprofits and refugee agencies place families in homes manually — spreadsheets, gut feel, email chains. Placd scores compatibility and tracks every placement through a pipeline.

**"Why are you working on this?"**
> I built a B2C housing app first. Unit economics were broken. But I found that every org placing people in homes runs the same manual workflow. Nobody's built a tool for the matching decision specifically. I've lived this workflow — military housing assignment is the same process.

---

## Rapid-Fire Q&A

**"Revenue?"**
> Zero. Pre-revenue. Working demo, in discovery.

**"Users?"**
> Zero. Demo only. Outreach starts this month.

**"How do you know anyone wants this?"**
> Primary research. Watched HMIS and Coordinated Entry training videos. Chicago's ShelterPoint system uses daily vacancy emails and manual matching. Their own training says they want "more automation and fairness." That's a direct quote from their case managers.

**"How do you get customers?"**
> Direct outreach. 5 Charlotte orgs identified. Dual lane — corporate (Atrium Health, faster budget) and nonprofit (CRRA, mission-aligned). Discovery calls with system-native language so I don't sound like an outsider.

**"Why will they pay?"**
> $499/month vs. 15 hours/week of case manager time. At $25/hour labor cost, that's $1,500/month in labor they're burning on manual matching. 3:1 ROI before counting placement fees.

**"Why will they switch from what they have?"**
> They're not switching FROM anything. No matching tool exists. HMIS tracks data. Salesforce tracks cases. Nobody scores clients against units. They're switching from a spreadsheet and their memory.

**"What if Salesforce builds this?"**
> They've had Nonprofit Cloud for 15+ years and haven't added placement matching. It's not their category. They build horizontal CRM. We build vertical placement intelligence.

**"What if Clarity/WellSky adds matching to HMIS?"**
> HMIS is a compliance reporting tool mandated by HUD. Adding matching changes their product category and regulatory surface. They'd essentially be building a different product. We're purpose-built from day one.

**"How big can this get?"**
> Housing alone: 10,000 nonprofits + 3,300 housing authorities + 350 resettlement offices. At $800/month average, that's $130M+ ARR if we capture 1% penetration. Add insurance ALE, military, senior living, corporate relo — $500M+ TAM.

**"Why you?"**
> I built two full platforms solo. Security engineer — I understand multi-tenant isolation, encryption, compliance. Air Force veteran with SDVOSB — set-aside access to 3,300 housing authorities. I pivoted when the data said pivot. I do the work.

**"What's the biggest risk?"**
> Sales cycle. Nonprofits buy slow — committees, fiscal years, grant restrictions. Mitigating: running a corporate lane (Atrium Health) in parallel. If corporate closes first, that case study accelerates nonprofit sales.

**"What do you want from YC?"**
> Two things: help closing my first enterprise sale — I'm technical, not a natural seller. And network access to housing organizations beyond Charlotte.

---

## Questions They Might Go Deep On

**"Walk us through the matching algorithm"**
> Weighted scoring. Six factors: location (25%), budget (25%), household size (20%), language/cultural fit (15%), accessibility (10%), services proximity (5%). Weights are org-configurable — some programs care more about accessibility, others about language. Each factor produces a 0-1 score, weighted and summed. Top N matches surface with score breakdown.

**"How is this different from a recommendation engine?"**
> It's not a black box. Every score is explainable — "this unit scored 87% because budget match is 95%, language match is 80%, location is 90%." Case managers can see exactly why a match was recommended. That transparency is the product — it makes placement decisions defensible for audits and funders.

**"What happens if your first 5 calls say they don't need this?"**
> Then I listen to what they DO need. The matching engine is the hypothesis. If they say "matching is fine, but our reporting is broken" — that's a different product but same buyer. I'm not married to the current feature set. I'm married to the buyer and the workflow.

---

## Don'ts

- Don't give long answers. 1-2 sentences per question.
- Don't say "we" — you're a solo founder. Say "I."
- Don't oversell traction you don't have. "Pre-revenue, working demo, in discovery" is honest and fine.
- Don't apologize for being pre-revenue. Lots of YC companies enter with zero revenue.
- Don't freeze. Prep Notes are in your glasses. Glance if you need to.
