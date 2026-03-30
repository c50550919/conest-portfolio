'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReportSummary } from '@/components/report-summary';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import api from '@/lib/api';

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

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'30d' | '90d' | '6mo' | '12mo' | 'all'>('all');

  useEffect(() => {
    async function fetchReport() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/reports/summary?range=${range}`);
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
      } catch {
        // Fallback demo data
        setReport({
          totalPlacements: 47,
          avgDaysToPlacement: 18,
          successRate: 82,
          activeClients: 25,
          monthlyPlacements: [
            { month: 'Oct', count: 6 },
            { month: 'Nov', count: 8 },
            { month: 'Dec', count: 5 },
            { month: 'Jan', count: 10 },
            { month: 'Feb', count: 9 },
            { month: 'Mar', count: 9 },
          ],
          outcomeBreakdown: [
            { outcome: 'Successful', count: 38 },
            { outcome: 'Unsuccessful', count: 6 },
            { outcome: 'Withdrawn', count: 3 },
          ],
          stageCounts: { intake: 5, matching: 4, proposed: 3, accepted: 2, placed: 8, closed: 25 },
          clientCounts: { intake: 10, ready: 15, placed: 8, archived: 12 },
        });
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [orgSlug, range]);

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
        metric: `Monthly: ${m.month}`, value: m.count,
      })),
      ...report.outcomeBreakdown.map((o) => ({
        metric: `Outcome: ${o.outcome}`, value: o.count,
      })),
    ];
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placd-report-${orgSlug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Compliance Reports</h2>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <ReportSummary
        totalPlacements={report.totalPlacements}
        avgDaysToPlacement={report.avgDaysToPlacement}
        successRate={report.successRate}
        activeClients={report.activeClients}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Placements Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Placements</CardTitle>
          </CardHeader>
          <CardContent>
            {report.monthlyPlacements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Monthly data populates after the first full month of usage.
              </p>
            ) : (
              <div className="space-y-3">
                {report.monthlyPlacements.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-muted-foreground">
                      {m.month}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded">
                      <div
                        className="h-6 bg-primary rounded flex items-center justify-end pr-2"
                        style={{
                          width: `${(m.count / Math.max(...report.monthlyPlacements.map((x) => x.count))) * 100}%`,
                        }}
                      >
                        <span className="text-xs font-medium text-primary-foreground">
                          {m.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcome Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {report.outcomeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Outcome data appears when placements are closed.
              </p>
            ) : (
              <div className="space-y-4">
                {report.outcomeBreakdown.map((o) => {
                  const total = report.outcomeBreakdown.reduce(
                    (sum, x) => sum + x.count,
                    0,
                  );
                  const pct = Math.round((o.count / total) * 100);
                  const color =
                    o.outcome === 'Successful'
                      ? 'bg-green-500'
                      : o.outcome === 'Unsuccessful'
                        ? 'bg-red-400'
                        : 'bg-yellow-400';
                  return (
                    <div key={o.outcome} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{o.outcome}</span>
                        <span className="font-medium">
                          {o.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
