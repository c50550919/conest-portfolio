# Dashboard Demo-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Placd dashboard from barebones MVP to demo-ready quality — functional charts, case manager workflow, client detail, drag-drop pipeline, and polished UI that proves the product is usable for daily work.

**Architecture:** All changes are frontend-only in `web/src/`. The backend API already returns the data we need — the gap is that the frontend doesn't use it fully. One backend endpoint needs enhancement (reports/monthly). No new dependencies except `papaparse` for CSV export. Keep light theme for dashboard (industry standard for B2B SaaS), polish with better typography, spacing, and card design.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Base UI, lucide-react, axios, papaparse (new)

**Priority Order:** Reports (prove compliance story) → My Caseload (prove daily workflow) → Client Detail (prove depth) → Data Quality (prove compliance awareness) → Pipeline DnD + Filters (prove usability) → Staff Workload (prove management view) → Client Intake (prove data entry)

---

### Task 1: Backend — Add Monthly Placement Data to Reports Endpoint

The reports API returns `stageCounts` and `clientCounts` but not `monthlyPlacements` or `outcomeBreakdown`. The frontend charts are empty without this data.

**Files:**
- Modify: `backend/src/features/placement/placement.controller.ts` (the `getReportSummary` method)

**Step 1: Add monthly placement aggregation to the report summary controller**

Find the `getReportSummary` method. After the existing `stageCounts` and `clientCounts` queries, add two more queries:

```typescript
// Monthly placements (last 6 months)
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const monthlyRaw = await db('placements')
  .select(db.raw("to_char(created_at, 'Mon') as month"))
  .select(db.raw("date_trunc('month', created_at) as month_start"))
  .count('id as count')
  .where('org_id', orgId)
  .where('created_at', '>=', sixMonthsAgo)
  .groupByRaw("date_trunc('month', created_at), to_char(created_at, 'Mon')")
  .orderBy('month_start', 'asc');

const monthlyPlacements = monthlyRaw.map((r: any) => ({
  month: r.month,
  count: parseInt(r.count, 10),
}));

// Outcome breakdown (closed placements only)
const outcomeRaw = await db('placements')
  .select('outcome')
  .count('id as count')
  .where('org_id', orgId)
  .where('stage', 'closed')
  .whereNotNull('outcome')
  .groupBy('outcome');

const outcomeBreakdown = outcomeRaw.map((r: any) => ({
  outcome: r.outcome.charAt(0).toUpperCase() + r.outcome.slice(1),
  count: parseInt(r.count, 10),
}));
```

Add `monthlyPlacements` and `outcomeBreakdown` to the response data object alongside the existing fields.

**Step 2: Verify**

```bash
curl -s http://localhost:3001/api/orgs/charlotte-housing-partners/reports/summary \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: Response now includes `monthlyPlacements` array and `outcomeBreakdown` array.

**Step 3: Commit**

```bash
git add backend/src/features/placement/placement.controller.ts
git commit -m "feat(api): add monthly placements and outcome breakdown to reports endpoint"
```

---

### Task 2: Reports Page — Functional Charts with Real Data

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx`

**Step 1: Update the ReportData interface and data fetching**

The API now returns `monthlyPlacements` and `outcomeBreakdown` alongside `stageCounts` and `clientCounts`. Update the `setReport` call to use them:

```typescript
setReport({
  totalPlacements: data.data.totalPlacements,
  avgDaysToPlacement: data.data.avgDaysToPlacement,
  successRate: data.data.successRate,
  activeClients: data.data.activeClients,
  monthlyPlacements: data.data.monthlyPlacements ?? [],
  outcomeBreakdown: data.data.outcomeBreakdown ?? [],
  stageCounts: data.data.stageCounts ?? {},
  clientCounts: data.data.clientCounts ?? {},
});
```

Update the `ReportData` interface to include `stageCounts` and `clientCounts`:

```typescript
interface ReportData {
  totalPlacements: number;
  avgDaysToPlacement: number;
  successRate: number;
  activeClients: number;
  monthlyPlacements: { month: string; count: number }[];
  outcomeBreakdown: { outcome: string; count: number }[];
  stageCounts: Record<string, number>;
  clientCounts: Record<string, number>;
}
```

**Step 2: Add a Pipeline Funnel visualization using stageCounts**

Below the two existing chart cards, add a third card showing the pipeline funnel:

```tsx
{/* Pipeline Distribution */}
<Card className="md:col-span-2">
  <CardHeader>
    <CardTitle className="text-base">Pipeline Distribution</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-end gap-3 h-40">
      {['intake', 'matching', 'proposed', 'accepted', 'placed', 'closed'].map((stage) => {
        const count = report.stageCounts[stage] ?? 0;
        const max = Math.max(...Object.values(report.stageCounts), 1);
        const colors: Record<string, string> = {
          intake: 'bg-yellow-400',
          matching: 'bg-orange-400',
          proposed: 'bg-blue-400',
          accepted: 'bg-indigo-400',
          placed: 'bg-green-400',
          closed: 'bg-gray-400',
        };
        return (
          <div key={stage} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium">{count}</span>
            <div
              className={`w-full rounded-t ${colors[stage]}`}
              style={{ height: `${(count / max) * 100}%`, minHeight: '4px' }}
            />
            <span className="text-[10px] text-muted-foreground capitalize">{stage}</span>
          </div>
        );
      })}
    </div>
  </CardContent>
</Card>
```

**Step 3: Handle empty monthlyPlacements and outcomeBreakdown gracefully**

Wrap the `.map()` calls in the Monthly Placements and Outcomes cards with empty-state checks:

```tsx
{report.monthlyPlacements.length === 0 ? (
  <p className="text-sm text-muted-foreground py-8 text-center">
    Monthly data populates after the first full month of usage.
  </p>
) : (
  /* existing .map() rendering */
)}
```

Same pattern for `outcomeBreakdown`.

**Step 4: Verify**

```bash
cd web && npm run build
```

Expected: Build succeeds. Navigate to `/charlotte-housing-partners/reports` — Pipeline Distribution chart shows bars for each stage.

**Step 5: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/reports/page.tsx
git commit -m "feat(reports): add pipeline distribution chart, handle empty chart data"
```

---

### Task 3: Reports Page — Date Range Picker and CSV Export

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx`

**Step 1: Install papaparse for CSV export**

```bash
cd web && npm install papaparse && npm install -D @types/papaparse
```

**Step 2: Add date range filter UI**

Add state for date range at the top of the component:

```typescript
const [range, setRange] = useState<'30d' | '90d' | '6mo' | '12mo' | 'all'>('all');
```

Add filter buttons in the header next to "Export PDF":

```tsx
<div className="flex items-center gap-2">
  {(['30d', '90d', '6mo', '12mo', 'all'] as const).map((r) => (
    <Button
      key={r}
      variant={range === r ? 'default' : 'outline'}
      size="sm"
      onClick={() => setRange(r)}
    >
      {r === 'all' ? 'All Time' : r}
    </Button>
  ))}
</div>
```

Pass `range` as a query param to the API call:

```typescript
const { data } = await api.get(`/orgs/${orgSlug}/reports/summary?range=${range}`);
```

Add `range` to the useEffect dependency array.

Note: The backend may not support the `range` param yet — that's OK. The UI is ready, and the backend can be updated later. The frontend gracefully handles whatever data comes back.

**Step 3: Add CSV export function**

```typescript
import Papa from 'papaparse';
import { Download } from 'lucide-react';

function handleExportCsv() {
  if (!report) return;
  const rows = [
    { metric: 'Total Placements', value: report.totalPlacements },
    { metric: 'Avg Days to Placement', value: report.avgDaysToPlacement },
    { metric: 'Success Rate', value: `${report.successRate}%` },
    { metric: 'Active Clients', value: report.activeClients },
    ...Object.entries(report.stageCounts).map(([stage, count]) => ({
      metric: `Pipeline: ${stage}`, value: count,
    })),
    ...report.monthlyPlacements.map((m) => ({
      metric: `Month: ${m.month}`, value: m.count,
    })),
    ...report.outcomeBreakdown.map((o) => ({
      metric: `Outcome: ${o.outcome}`, value: o.count,
    })),
  ];
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `placd-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Replace the "Export PDF" button with two buttons:

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={handleExportCsv}>
    <Download className="mr-2 h-4 w-4" />
    Export CSV
  </Button>
  <Button variant="outline" onClick={handleExportPdf}>
    <FileText className="mr-2 h-4 w-4" />
    Export PDF
  </Button>
</div>
```

**Step 4: Verify**

```bash
cd web && npm run build
```

Navigate to reports page, click "Export CSV" — a file downloads. Date range buttons render.

**Step 5: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/reports/page.tsx web/package.json web/package-lock.json
git commit -m "feat(reports): add date range picker and CSV export"
```

---

### Task 4: Reports Page — HUD Compliance Summary Card

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx`

**Step 1: Add a HUD APR Summary card below the pipeline distribution**

This card shows the key metrics a program director would need for their Annual Performance Report. Uses existing data from the report summary.

```tsx
{/* HUD APR Summary */}
<Card className="md:col-span-2 border-blue-200 bg-blue-50/50">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-base">HUD APR Summary Preview</CardTitle>
      <Badge variant="outline" className="text-blue-700 border-blue-300">
        Pre-Submission
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div>
        <p className="text-muted-foreground">Persons Served</p>
        <p className="text-xl font-bold">{report.activeClients + report.totalPlacements}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Exits to Permanent Housing</p>
        <p className="text-xl font-bold">{report.totalPlacements}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Avg Length of Stay</p>
        <p className="text-xl font-bold">{report.avgDaysToPlacement}d</p>
      </div>
      <div>
        <p className="text-muted-foreground">Successful Outcomes</p>
        <p className="text-xl font-bold">{report.successRate}%</p>
      </div>
    </div>
    <p className="text-xs text-muted-foreground mt-4">
      This is a preview based on current pipeline data. Full APR export with demographic
      breakdowns will be available after your first reporting period.
    </p>
  </CardContent>
</Card>
```

Add `Badge` to imports from `@/components/ui/badge`.

**Step 2: Verify**

```bash
cd web && npm run build
```

Expected: HUD APR Summary card renders with blue accent styling.

**Step 3: Commit**

```bash
git add web/src/app/(dashboard)/[orgSlug]/reports/page.tsx
git commit -m "feat(reports): add HUD APR summary preview card"
```

---

### Task 5: My Caseload — Dashboard Home Page

This is the page buyers judge within 10 seconds. Currently, `/[orgSlug]/placements` is the landing page. We'll make `/[orgSlug]` the dashboard home with a "My Caseload" view.

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/page.tsx`
- Modify: `web/src/components/sidebar.tsx` (add Dashboard nav item)

**Step 1: Create the dashboard home page**

Create `web/src/app/(dashboard)/[orgSlug]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

interface DashboardData {
  placements: Array<{
    id: string;
    stage: string;
    client_first_name: string;
    client_last_name: string;
    unit_address: string | null;
    compatibility_score: number | null;
    case_manager_name: string | null;
    updated_at: string;
  }>;
  clientCounts: Record<string, number>;
  stageCounts: Record<string, number>;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function urgency(days: number): 'overdue' | 'due' | 'ok' {
  if (days >= 7) return 'overdue';
  if (days >= 3) return 'due';
  return 'ok';
}

const urgencyStyles = {
  overdue: 'border-l-red-500 bg-red-50/50',
  due: 'border-l-amber-500 bg-amber-50/50',
  ok: 'border-l-green-500',
};

const urgencyBadge = {
  overdue: <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>,
  due: <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 hover:bg-amber-100">Due soon</Badge>,
  ok: <Badge variant="secondary" className="text-[10px] px-1.5 py-0">On track</Badge>,
};

export default function DashboardHome() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [placementsRes, reportRes] = await Promise.all([
          api.get(`/orgs/${orgSlug}/placements`),
          api.get(`/orgs/${orgSlug}/reports/summary`),
        ]);
        setData({
          placements: placementsRes.data.data,
          clientCounts: reportRes.data.data.clientCounts ?? {},
          stageCounts: reportRes.data.data.stageCounts ?? {},
        });
      } catch {
        setData({ placements: [], clientCounts: {}, stageCounts: {} });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [orgSlug]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Active placements (not closed) sorted by urgency
  const active = data.placements
    .filter((p) => p.stage !== 'closed')
    .map((p) => ({ ...p, days: daysAgo(p.updated_at), urg: urgency(daysAgo(p.updated_at)) }))
    .sort((a, b) => b.days - a.days);

  const overdue = active.filter((p) => p.urg === 'overdue').length;
  const dueSoon = active.filter((p) => p.urg === 'due').length;
  const totalActive = active.length;
  const placed = data.stageCounts.placed ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground text-sm">Your placement overview at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-xs text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueSoon}</p>
                <p className="text-xs text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{placed}</p>
                <p className="text-xs text-muted-foreground">Placed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Caseload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Caseload</CardTitle>
            <Link
              href={`/${orgSlug}/placements`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active placements. New intakes will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {active.slice(0, 15).map((p) => (
                <Link
                  key={p.id}
                  href={`/${orgSlug}/placements/${p.id}`}
                  className={`flex items-center justify-between p-3 rounded-lg border border-l-4 hover:bg-accent/50 transition-colors ${urgencyStyles[p.urg]}`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {p.client_first_name} {p.client_last_name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{p.stage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgencyBadge[p.urg]}
                    <span className="text-xs text-muted-foreground">{p.days}d</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Add Dashboard link to sidebar**

In `web/src/components/sidebar.tsx`, add a new nav item at the top of the `navItems` array:

```typescript
{ href: `/${orgSlug}`, label: 'Dashboard', icon: LayoutDashboard },
```

Add `LayoutDashboard` to the lucide-react import.

**Step 3: Verify**

```bash
cd web && npm run build
```

Navigate to `http://localhost:3000/charlotte-housing-partners` — Dashboard page renders with KPI cards and caseload list with color-coded urgency.

**Step 4: Commit**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/page.tsx web/src/components/sidebar.tsx
git commit -m "feat: add My Caseload dashboard home page with urgency flags"
```

---

### Task 6: Client Detail Page

Currently clicking a client name on the clients page does nothing. This task adds a full client detail page.

**Files:**
- Create: `web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx`
- Modify: `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx` (make names clickable)

**Step 1: Create the client detail page**

Create `web/src/app/(dashboard)/[orgSlug]/clients/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, User, Home, Globe, DollarSign, Users,
  Accessibility, MapPin, Calendar, Phone, Mail,
} from 'lucide-react';
import api from '@/lib/api';

interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  household_size: number;
  language_primary: string | null;
  language_secondary: string | null;
  budget_max: number | null;
  preferred_area: string | null;
  accessibility_needs: Record<string, boolean>;
  cultural_preferences: Record<string, unknown>;
  income_range: string | null;
  intake_date: string | null;
  phone: string | null;
  email: string | null;
  case_manager_id: string | null;
}

interface ClientPlacement {
  id: string;
  stage: string;
  unit_address: string | null;
  compatibility_score: number | null;
  created_at: string;
  outcome: string | null;
}

const statusColors: Record<string, string> = {
  intake: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  placed: 'bg-green-100 text-green-800',
  exited: 'bg-gray-100 text-gray-800',
};

export default function ClientDetailPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [placements, setPlacements] = useState<ClientPlacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const [clientRes, placementsRes] = await Promise.all([
          api.get(`/orgs/${orgSlug}/clients/${clientId}`),
          api.get(`/orgs/${orgSlug}/placements?client_id=${clientId}`).catch(() => ({ data: { data: [] } })),
        ]);
        setClient(clientRes.data.data);
        setPlacements(placementsRes.data.data ?? []);
      } catch {
        // handled by loading state
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [orgSlug, clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Link href={`/${orgSlug}/clients`} className="text-primary hover:underline text-sm">
          Back to clients
        </Link>
      </div>
    );
  }

  const accessibilityList = Object.entries(client.accessibility_needs ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, ' '));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}/clients`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Clients
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">
              {client.first_name} {client.last_name}
            </h2>
            <Badge className={statusColors[client.status] ?? 'bg-gray-100'}>
              {client.status}
            </Badge>
          </div>
          {client.intake_date && (
            <p className="text-sm text-muted-foreground">
              Intake: {new Date(client.intake_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Household</p>
                  <p className="font-medium">{client.household_size} person{client.household_size !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Language</p>
                  <p className="font-medium">{client.language_primary ?? 'Not specified'}</p>
                  {client.language_secondary && (
                    <p className="text-xs text-muted-foreground">Also: {client.language_secondary}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium">
                    {client.budget_max ? `$${client.budget_max.toLocaleString()}/mo` : 'Not specified'}
                  </p>
                  {client.income_range && (
                    <p className="text-xs text-muted-foreground">Income: {client.income_range}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Preferred Area</p>
                  <p className="font-medium">{client.preferred_area ?? 'No preference'}</p>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
            </div>
            {accessibilityList.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Accessibility className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Accessibility Needs</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {accessibilityList.map((need) => (
                    <Badge key={need} variant="outline" className="capitalize">
                      {need}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placement History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" /> Placement History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {placements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No placements yet.
              </p>
            ) : (
              <div className="space-y-3">
                {placements.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${orgSlug}/placements/${p.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {p.stage}
                      </Badge>
                      {p.compatibility_score && (
                        <span className="text-xs font-medium text-green-700">
                          {Math.round(p.compatibility_score)}%
                        </span>
                      )}
                    </div>
                    {p.unit_address && (
                      <p className="text-sm font-medium">{p.unit_address}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                      {p.outcome && ` — ${p.outcome}`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Make client names clickable in the clients list**

In `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx`, find where client name is rendered in the table cell and wrap it with a Link:

```tsx
<TableCell className="font-medium">
  <Link
    href={`/${orgSlug}/clients/${c.id}`}
    className="hover:underline text-primary"
  >
    {c.first_name} {c.last_name}
  </Link>
</TableCell>
```

Add `Link` to the imports from `next/link` and add `orgSlug` reference (use `useParams` if not already available).

**Step 3: Verify**

```bash
cd web && npm run build
```

Navigate to Clients page, click a name — detail page loads with profile and placement history.

**Step 4: Commit**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/clients/[id]/page.tsx web/src/app/'(dashboard)'/[orgSlug]/clients/page.tsx
git commit -m "feat: add client detail page with profile and placement history"
```

---

### Task 7: Data Quality Indicator

Add a data quality score to the dashboard home and reports page. Computed client-side from the client data completeness.

**Files:**
- Create: `web/src/components/data-quality-badge.tsx`
- Modify: `web/src/app/(dashboard)/[orgSlug]/page.tsx` (add to dashboard)
- Modify: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx` (add to reports)

**Step 1: Create the DataQualityBadge component**

Create `web/src/components/data-quality-badge.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  orgSlug: string;
}

export function DataQualityBadge({ orgSlug }: Props) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    async function compute() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/clients`);
        const clients = data.data as Array<Record<string, unknown>>;
        if (clients.length === 0) { setScore(100); return; }

        const requiredFields = [
          'first_name', 'last_name', 'household_size',
          'language_primary', 'budget_max', 'preferred_area',
          'intake_date', 'status',
        ];
        let filled = 0;
        let total = 0;
        for (const c of clients) {
          for (const f of requiredFields) {
            total++;
            if (c[f] !== null && c[f] !== undefined && c[f] !== '') filled++;
          }
        }
        setScore(Math.round((filled / total) * 100));
      } catch {
        setScore(null);
      }
    }
    compute();
  }, [orgSlug]);

  if (score === null) return null;

  const color = score >= 90 ? 'text-green-600' : score >= 75 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 90 ? 'bg-green-100' : score >= 75 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <ShieldCheck className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{score}%</p>
            <p className="text-xs text-muted-foreground">Data Quality</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Add to dashboard home page**

In `web/src/app/(dashboard)/[orgSlug]/page.tsx`, import `DataQualityBadge` and add it as a 5th card in the KPI grid. Change the grid from `grid-cols-4` to `grid-cols-5`:

```tsx
import { DataQualityBadge } from '@/components/data-quality-badge';

// In the KPI grid, change md:grid-cols-4 to md:grid-cols-5, then add:
<DataQualityBadge orgSlug={orgSlug} />
```

**Step 3: Verify**

```bash
cd web && npm run build
```

Dashboard shows data quality percentage with color coding.

**Step 4: Commit**

```bash
git add web/src/components/data-quality-badge.tsx web/src/app/'(dashboard)'/[orgSlug]/page.tsx
git commit -m "feat: add data quality indicator badge to dashboard"
```

---

### Task 8: Pipeline — Case Manager Filter

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/placements/page.tsx`

**Step 1: Add filter state and filter UI**

Add state for case manager filter:

```typescript
const [filterCM, setFilterCM] = useState<string>('all');
```

Extract unique case managers from placements:

```typescript
const caseManagers = [...new Set(
  placements.filter((p) => p.case_manager_name).map((p) => p.case_manager_name!)
)];
```

Add filter buttons above the pipeline board:

```tsx
<div className="flex items-center gap-2 mb-4 overflow-x-auto">
  <span className="text-sm text-muted-foreground whitespace-nowrap">Filter:</span>
  <Button
    variant={filterCM === 'all' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilterCM('all')}
  >
    All
  </Button>
  {caseManagers.map((cm) => (
    <Button
      key={cm}
      variant={filterCM === cm ? 'default' : 'outline'}
      size="sm"
      onClick={() => setFilterCM(cm)}
    >
      {cm}
    </Button>
  ))}
</div>
```

Filter placements before passing to PipelineBoard:

```typescript
const filtered = filterCM === 'all'
  ? placements
  : placements.filter((p) => p.case_manager_name === filterCM);
```

Pass `filtered` instead of `placements` to `<PipelineBoard>`.

**Step 2: Verify**

```bash
cd web && npm run build
```

Pipeline page shows filter buttons. Clicking a case manager name filters the board.

**Step 3: Commit**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/placements/page.tsx
git commit -m "feat(pipeline): add case manager filter to placement board"
```

---

### Task 9: Pipeline — Drag and Drop

**Files:**
- Modify: `web/src/components/pipeline-board.tsx`
- Modify: `web/src/components/placement-card.tsx`

**Step 1: Add drag-and-drop handlers to PipelineBoard**

Use native HTML drag-and-drop (no new dependencies). In `pipeline-board.tsx`:

Add drag state:

```typescript
const [dragId, setDragId] = useState<string | null>(null);
const [dragOver, setDragOver] = useState<string | null>(null);
```

Add handlers to each stage column:

```tsx
<div
  key={stage.key}
  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
  onDragLeave={() => setDragOver(null)}
  onDrop={(e) => {
    e.preventDefault();
    setDragOver(null);
    const placementId = e.dataTransfer.getData('text/plain');
    if (placementId && onStageChange) {
      onStageChange(placementId, stage.key);
    }
    setDragId(null);
  }}
  className={`... ${dragOver === stage.key ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
>
```

Pass drag props to each PlacementCard:

```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', placement.id);
    setDragId(placement.id);
  }}
  onDragEnd={() => setDragId(null)}
  className={dragId === placement.id ? 'opacity-50' : ''}
>
  <PlacementCard ... />
</div>
```

Wrap the Link around PlacementCard with the drag div, ensuring drag takes priority over click navigation. Use `onDragStart` to set a flag, and in the Link's `onClick`, prevent navigation if dragging:

```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', placement.id);
    setDragId(placement.id);
  }}
  onDragEnd={() => setDragId(null)}
  className={dragId === placement.id ? 'opacity-50' : ''}
>
  <Link href={`/${orgSlug}/placements/${placement.id}`}>
    <PlacementCard ... />
  </Link>
</div>
```

**Step 2: Verify**

```bash
cd web && npm run build
```

Drag a card from one column to another — it moves and the API is called.

**Step 3: Commit**

```bash
git add web/src/components/pipeline-board.tsx
git commit -m "feat(pipeline): add drag-and-drop between stages"
```

---

### Task 10: Staff Workload View

Add a simple workload table to the reports page showing caseload per case manager.

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/reports/page.tsx`

**Step 1: Fetch placements data alongside report data**

Add a second API call in the useEffect:

```typescript
const [placementsRes, reportRes] = await Promise.all([
  api.get(`/orgs/${orgSlug}/placements`),
  api.get(`/orgs/${orgSlug}/reports/summary?range=${range}`),
]);
```

Store placements in state:

```typescript
const [placements, setPlacements] = useState<Array<{ case_manager_name: string | null; stage: string }>>([]);
```

**Step 2: Compute and render workload table**

```typescript
const workload = Object.entries(
  placements.reduce<Record<string, { active: number; placed: number }>>((acc, p) => {
    const name = p.case_manager_name ?? 'Unassigned';
    if (!acc[name]) acc[name] = { active: 0, placed: 0 };
    if (p.stage === 'placed' || p.stage === 'closed') acc[name].placed++;
    else acc[name].active++;
    return acc;
  }, {})
).sort((a, b) => b[1].active - a[1].active);
```

Add a card:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">Staff Workload</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {workload.map(([name, counts]) => (
        <div key={name} className="flex items-center justify-between">
          <span className="text-sm font-medium">{name}</span>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{counts.active} active</Badge>
            <Badge variant="secondary">{counts.placed} placed</Badge>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Step 3: Verify**

```bash
cd web && npm run build
```

Reports page shows Staff Workload card with caseload per case manager.

**Step 4: Commit**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/reports/page.tsx
git commit -m "feat(reports): add staff workload distribution view"
```

---

### Task 11: Client Intake Form

Add an "Add Client" button to the clients page that opens a dialog form.

**Files:**
- Modify: `web/src/app/(dashboard)/[orgSlug]/clients/page.tsx`

**Step 1: Add dialog form with intake fields**

Import Dialog components and add form state:

```typescript
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

const [showAdd, setShowAdd] = useState(false);
const [newClient, setNewClient] = useState({
  first_name: '',
  last_name: '',
  household_size: 1,
  language_primary: 'English',
  budget_max: '',
  preferred_area: '',
  phone: '',
  email: '',
});
const [saving, setSaving] = useState(false);
```

Add the submit handler:

```typescript
async function handleAddClient(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  try {
    await api.post(`/orgs/${orgSlug}/clients`, {
      ...newClient,
      budget_max: newClient.budget_max ? parseInt(newClient.budget_max, 10) : null,
      status: 'intake',
      intake_date: new Date().toISOString().slice(0, 10),
    });
    setShowAdd(false);
    setNewClient({ first_name: '', last_name: '', household_size: 1, language_primary: 'English', budget_max: '', preferred_area: '', phone: '', email: '' });
    // Refetch clients
    const { data } = await api.get(`/orgs/${orgSlug}/clients`);
    setClients(data.data);
  } catch {
    alert('Failed to create client. The API endpoint may not be implemented yet.');
  } finally {
    setSaving(false);
  }
}
```

Add the button and dialog to the page header:

```tsx
<Dialog open={showAdd} onOpenChange={setShowAdd}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="mr-2 h-4 w-4" /> Add Client
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>New Client Intake</DialogTitle>
      <DialogDescription>
        Enter the client&apos;s basic information to start the placement process.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleAddClient} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            required
            value={newClient.first_name}
            onChange={(e) => setNewClient((p) => ({ ...p, first_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            required
            value={newClient.last_name}
            onChange={(e) => setNewClient((p) => ({ ...p, last_name: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="household_size">Household Size</Label>
          <Input
            id="household_size"
            type="number"
            min={1}
            required
            value={newClient.household_size}
            onChange={(e) => setNewClient((p) => ({ ...p, household_size: parseInt(e.target.value, 10) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Primary Language</Label>
          <Input
            id="language"
            value={newClient.language_primary}
            onChange={(e) => setNewClient((p) => ({ ...p, language_primary: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Monthly Budget ($)</Label>
          <Input
            id="budget"
            type="number"
            min={0}
            placeholder="1200"
            value={newClient.budget_max}
            onChange={(e) => setNewClient((p) => ({ ...p, budget_max: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Preferred Area</Label>
          <Input
            id="area"
            placeholder="e.g., NoDa, Plaza Midwood"
            value={newClient.preferred_area}
            onChange={(e) => setNewClient((p) => ({ ...p, preferred_area: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={newClient.phone}
            onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create Client'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**Step 2: Verify**

```bash
cd web && npm run build
```

Clients page shows "Add Client" button. Clicking opens a form dialog.

**Step 3: Commit**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/clients/page.tsx
git commit -m "feat(clients): add intake form dialog for new client creation"
```

---

### Task 12: Final Build Verification and Auth Bug Fixes Commit

**Step 1: Commit the auth fixes from earlier (token path + snake_case mapping)**

```bash
git add web/src/lib/auth.ts
git commit -m "fix(auth): correct token path and snake_case→camelCase org mapping"
```

**Step 2: Commit the reports empty-state fix from earlier**

```bash
git add web/src/app/'(dashboard)'/[orgSlug]/reports/page.tsx
git commit -m "fix(reports): guard monthlyPlacements and outcomeBreakdown against undefined"
```

**Step 3: Full build**

```bash
cd web && npm run build
```

Expected: Build succeeds with zero errors.

**Step 4: Smoke test all pages**

Open `http://localhost:3000/login`, sign in with demo credentials, then verify:
- [ ] `/charlotte-housing-partners` — Dashboard with KPI cards, urgency-flagged caseload, data quality badge
- [ ] `/charlotte-housing-partners/placements` — Pipeline with case manager filter, drag-drop between stages
- [ ] `/charlotte-housing-partners/placements/:id` — Match view with score breakdown
- [ ] `/charlotte-housing-partners/clients` — Client table with "Add Client" button, clickable names
- [ ] `/charlotte-housing-partners/clients/:id` — Client detail with profile and placement history
- [ ] `/charlotte-housing-partners/reports` — Charts with data, date range picker, CSV export, HUD APR card, staff workload
- [ ] `/charlotte-housing-partners/settings` — Org info, team, matching weights
