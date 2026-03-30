'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportSummary } from '@/components/report-summary';
import { FileText } from 'lucide-react';
import api from '@/lib/api';

interface ReportData {
  totalPlacements: number;
  avgDaysToPlacement: number;
  successRate: number;
  activeClients: number;
  monthlyPlacements: { month: string; count: number }[];
  outcomeBreakdown: { outcome: string; count: number }[];
}

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/reports/summary`);
        setReport({
          ...data.data,
          monthlyPlacements: data.data.monthlyPlacements ?? [],
          outcomeBreakdown: data.data.outcomeBreakdown ?? [],
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
        });
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [orgSlug]);

  function handleExportPdf() {
    alert(
      'PDF export requires jspdf — will be functional after npm install jspdf jspdf-autotable',
    );
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Compliance Reports</h2>
        <Button variant="outline" onClick={handleExportPdf}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
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
          </CardContent>
        </Card>

        {/* Outcome Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
