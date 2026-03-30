'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { DataQualityBadge } from '@/components/data-quality-badge';
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

const urgencyBadges: Record<string, React.ReactNode> = {
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
    async function fetchData() {
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
    fetchData();
  }, [orgSlug]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <DataQualityBadge orgSlug={orgSlug} />
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
                    {urgencyBadges[p.urg]}
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
