# Landing Page Messaging Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite all landing page copy and restructure capabilities section to implement outcome-first positioning per the approved design doc.

**Architecture:** Single-file edit — all changes are in `web/src/app/page.tsx`. No new components, no API changes, no new dependencies. Pure copy and markup restructuring.

**Tech Stack:** Next.js App Router, Tailwind CSS, lucide-react icons

**Design doc:** `docs/plans/2026-03-30-landing-page-messaging-design.md`

---

### Task 1: Update Navigation Labels

**Files:**
- Modify: `web/src/app/page.tsx:42-61`

**Step 1: Edit nav links**

Change the three nav items:
- `Capabilities` → `Platform` (also update href from `#capabilities` to `#platform`)
- `How it Works` → keep as-is
- `Impact` → `What Changes` (also update href from `#impact` to `#what-changes`)

```tsx
<div className="hidden md:flex items-center gap-10">
  <a
    href="#platform"
    className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
  >
    Platform
  </a>
  <a
    href="#how-it-works"
    className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
  >
    How it Works
  </a>
  <a
    href="#what-changes"
    className="text-[13px] tracking-wide uppercase text-slate-400 hover:text-white transition-colors duration-200"
  >
    What Changes
  </a>
</div>
```

**Step 2: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: update nav labels — Capabilities→Platform, Impact→What Changes"
```

---

### Task 2: Rewrite Hero Section

**Files:**
- Modify: `web/src/app/page.tsx:84-122`

**Step 1: Replace eyebrow, H1, subtitle, and secondary CTA**

Replace the entire hero content block (lines 84-122) with:

```tsx
{/* Eyebrow */}
<div className="flex items-center gap-3 mb-8">
  <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
  <span className="text-[13px] tracking-[0.2em] uppercase text-slate-400 font-medium">
    Housing Placement Platform
  </span>
</div>

<h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-bold tracking-[-0.03em] text-white leading-[0.95] mb-8">
  From intake
  <br />
  to placed &mdash;
  <br />
  <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
    in days, not weeks.
  </span>
</h1>

<p className="text-lg text-slate-400 max-w-lg mb-12 leading-relaxed">
  Placd replaces spreadsheets with a purpose-built placement
  pipeline. Your team sees every case, AI surfaces the best-fit
  unit, and funder reports generate in one click.
</p>

<div className="flex items-center gap-5">
  <a
    href="#demo"
    className="inline-flex items-center gap-2.5 bg-white text-slate-950 font-semibold px-7 py-3.5 rounded-lg text-[15px] hover:bg-slate-100 transition-colors duration-200 shadow-2xl shadow-black/30"
  >
    Request a Demo
    <ArrowRight className="w-4 h-4" />
  </a>
  <a
    href="#how-it-works"
    className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium text-[15px] transition-colors duration-200"
  >
    See How It Works
    <ChevronRight className="w-4 h-4" />
  </a>
</div>
```

Key changes:
- Eyebrow: "AI-Powered Placement" → "Housing Placement Platform"
- H1: matching lead → outcome lead ("From intake to placed — in days, not weeks.")
- Sub: scoring-only → full value chain (pipeline → AI → reports)
- Secondary CTA: `<Link href="/login">Sign In` → `<a href="#how-it-works">See How It Works` (plain anchor, no router needed)

**Step 2: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds. No unused `Link` import warning (Link is still used in nav Sign In).

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: rewrite hero — outcome-first positioning, drop Sign In CTA"
```

---

### Task 3: Restructure Capabilities Section

**Files:**
- Modify: `web/src/app/page.tsx:132-215`

**Step 1: Update section id and label**

Change `id="capabilities"` to `id="platform"` and label text from "Capabilities" to "Platform".

**Step 2: Replace the two-column grid content**

Flip the hierarchy: Pipeline becomes the 7-col lead card, Matching and Compliance become the 5-col stacked cards.

Replace the entire grid (lines 144-213) with:

```tsx
{/* Two-column asymmetric layout */}
<div className="grid lg:grid-cols-12 gap-12 lg:gap-6">
  {/* Left: Lead feature — Pipeline */}
  <div className="lg:col-span-7 group">
    <div className="h-full p-10 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Workflow className="w-6 h-6 text-blue-400" />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
        Placement Pipeline
      </h3>
      <p className="text-slate-400 text-lg leading-relaxed max-w-xl mb-8">
        Visual kanban tracks every case from intake through
        move-in. Your team knows where every family stands
        &mdash; no spreadsheet cross-referencing, no cases
        falling through cracks.
      </p>
      <div className="grid grid-cols-6 gap-2">
        {['Intake', 'Matching', 'Proposed', 'Accepted', 'Placed', 'Closed'].map((stage, i) => (
          <div
            key={stage}
            className="px-2 py-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-center"
          >
            <span className="text-xs text-slate-400">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Right: Stacked features */}
  <div className="lg:col-span-5 flex flex-col gap-6">
    <div className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
      <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5">
        <GitMerge className="w-5 h-5 text-teal-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
        Intelligent Matching
      </h3>
      <p className="text-slate-400 leading-relaxed">
        AI scores every client-unit pair across six factors
        &mdash; location, budget, household size, language,
        accessibility, and services. Top matches surface
        automatically.
      </p>
    </div>

    <div className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <LineChart className="w-5 h-5 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
        One-Click Compliance
      </h3>
      <p className="text-slate-400 leading-relaxed">
        HUD- and ORR-ready reports generate instantly.
        Time-to-place, outcomes, demographics &mdash; always
        audit-ready, never assembled by hand.
      </p>
    </div>
  </div>
</div>
```

Key changes:
- Pipeline promoted to 7-col lead card with Workflow icon (blue)
- 6 factor tags replaced with 6 pipeline stage tags (Intake → Closed)
- Matching demoted to 5-col secondary card with GitMerge icon (teal)
- Compliance copy sharpened: "One-Click Compliance", names HUD and ORR

**Step 3: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds. No lint errors about unused `i` variable (used as map index but not referenced — remove if linter complains).

**Step 4: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: flip capabilities hierarchy — pipeline leads, matching secondary"
```

---

### Task 4: Rewrite Impact → "What Changes" Section

**Files:**
- Modify: `web/src/app/page.tsx:217-258`

**Step 1: Update section id, label, and stat cards**

Change `id="impact"` to `id="what-changes"` and label "Impact" to "What Changes". Replace the three stat cards:

```tsx
{/* ===== WHAT CHANGES ===== */}
<section id="what-changes" className="relative py-24">
  <div className="absolute inset-0 bg-slate-950/60" />
  <div className="relative w-full px-4 sm:px-8 lg:px-12">
    <div className="flex items-center gap-3 mb-16">
      <div className="h-px w-12 bg-gradient-to-r from-blue-500 to-teal-400" />
      <span className="text-[13px] tracking-[0.2em] uppercase text-slate-500 font-medium">
        What Changes
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
      <div className="bg-slate-950/90 p-10">
        <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-white tracking-tight leading-none mb-3">
          Hours
          <span className="text-blue-400">, not weeks</span>
        </p>
        <p className="text-slate-400 leading-relaxed">
          Time-to-match drops from manual spreadsheet review
          to instant AI-scored results
        </p>
      </div>
      <div className="bg-slate-950/90 p-10">
        <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-white tracking-tight leading-none mb-3">
          6 factors
          <span className="text-teal-400">, 1 click</span>
        </p>
        <p className="text-slate-400 leading-relaxed">
          Location, budget, household, language, accessibility,
          and services &mdash; scored automatically for every
          client-unit pair
        </p>
      </div>
      <div className="bg-slate-950/90 p-10">
        <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-white tracking-tight leading-none mb-3">
          Always
          <span className="text-emerald-400"> audit-ready</span>
        </p>
        <p className="text-slate-400 leading-relaxed">
          HUD and ORR reports generate from live pipeline data
          &mdash; no end-of-month scramble
        </p>
      </div>
    </div>
  </div>
</section>
```

Key changes:
- Section renamed Impact → What Changes
- "60%" → "Hours, not weeks" (directionally honest, no fabricated stat)
- "6-factor" → "6 factors, 1 click" (reframed as effort saved)
- "100%" → "Always audit-ready" (no compliance liability)
- Font size slightly reduced from `clamp(2.5rem,5vw,4rem)` to `clamp(1.8rem,4vw,2.8rem)` since text phrases are longer than single numbers

**Step 2: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: rename Impact→What Changes, drop fabricated stats"
```

---

### Task 5: Tighten How It Works Copy

**Files:**
- Modify: `web/src/app/page.tsx:260-324` (line numbers will have shifted — find the `{/* ===== HOW IT WORKS ===== */}` comment)

**Step 1: Replace the three step descriptions**

Step 1 body:
```
Case manager logs the client — household size, budget,
language, location, accessibility needs. One form,
structured data from day one.
```

Step 2 body:
```
Placd scores every available unit across six factors and
surfaces the top matches. What took a week of phone calls
happens in seconds.
```

Step 3 heading: "Place" → "Place & Track"

Step 3 body:
```
Case manager proposes a unit, the client accepts, and the
placement moves through your pipeline — visible to your
whole team until move-in and beyond.
```

**Step 2: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: tighten How It Works — name actors, emphasize speed contrast"
```

---

### Task 6: Rewrite CTA Section

**Files:**
- Modify: `web/src/app/page.tsx` (find `{/* ===== CTA ===== */}`)

**Step 1: Replace CTA headline, body, and secondary CTA**

```tsx
<h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
  See what your placement
  <br />
  workflow could look like.
</h2>
<p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
  30-minute walkthrough with your org&apos;s data shape &mdash;
  not a generic slide deck. We&apos;ll show you intake to
  placed, with your caseload in mind.
</p>
<div className="flex items-center gap-5">
  <a
    href="mailto:demo@placd.io?subject=Placd Demo Request"
    className="inline-flex items-center gap-2.5 bg-white text-slate-950 font-semibold px-7 py-3.5 rounded-lg text-[15px] hover:bg-slate-100 transition-colors duration-200 shadow-2xl shadow-black/30"
  >
    Request a Demo
    <ArrowRight className="w-4 h-4" />
  </a>
  <a
    href="#how-it-works"
    className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium text-[15px] transition-colors duration-200"
  >
    See How It Works
    <ChevronRight className="w-4 h-4" />
  </a>
</div>
```

Key changes:
- H2: "Ready to modernize your placement workflow?" → "See what your placement workflow could look like."
- Body: Generic "tailored" → specific "30-minute walkthrough with your org's data shape"
- Secondary CTA: "Try the Dashboard" (Link to /login) → "See How It Works" (anchor to #how-it-works)

**Step 2: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: rewrite CTA — specific 30-min walkthrough, drop dashboard link"
```

---

### Task 7: Update Trust Strip and Footer

**Files:**
- Modify: `web/src/app/page.tsx` (find `{/* ===== TRUST STRIP ===== */}` and footer tagline)

**Step 1: Replace trust strip text**

```tsx
<span className="text-[12px] text-slate-600 tracking-wide">
  Veteran-Owned (SDVOSB in progress) &middot; Built for HUD &amp; ORR Compliance Standards &middot; AES-256 Encryption
</span>
```

**Step 2: Replace footer tagline**

Change:
```tsx
<span className="text-[13px] text-slate-500 tracking-wide">
  AI-Powered Housing Placement
</span>
```

To:
```tsx
<span className="text-[13px] text-slate-500 tracking-wide">
  Housing Placement Platform
</span>
```

**Step 3: Verify**

Run: `cd web && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "copy: update trust strip (truthful claims) and footer tagline"
```

---

### Task 8: Final Verification

**Step 1: Full build**

Run: `cd web && npm run build`
Expected: Build succeeds with zero errors and zero warnings.

**Step 2: Visual check**

Run: `cd web && npm run dev`
Open `http://localhost:3000` and verify:
- [ ] Nav reads: Platform · How it Works · What Changes
- [ ] Hero eyebrow: "Housing Placement Platform"
- [ ] Hero H1: "From intake to placed — in days, not weeks."
- [ ] Hero sub mentions spreadsheets, pipeline, AI, funder reports
- [ ] Hero secondary CTA: "See How It Works" scrolls to section
- [ ] Platform section: Pipeline is the lead (7-col) card with 6 stage tags
- [ ] Matching and Compliance are secondary (5-col) cards
- [ ] What Changes section: "Hours, not weeks" / "6 factors, 1 click" / "Always audit-ready"
- [ ] How It Works: Step 1 names case manager, Step 3 says "Place & Track"
- [ ] CTA: "See what your placement workflow could look like."
- [ ] Trust strip: Veteran-Owned · Built for HUD & ORR · AES-256
- [ ] Footer tagline: "Housing Placement Platform"
- [ ] All anchor links (#platform, #how-it-works, #what-changes, #demo) scroll correctly

**Step 3: Check for dead imports**

Verify that `Link` from `next/link` is still used (nav Sign In button). If not, remove the import.

**Step 4: Final commit (if any cleanup needed)**

```bash
git add web/src/app/page.tsx
git commit -m "chore: final cleanup after landing page messaging redesign"
```
