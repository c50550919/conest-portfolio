'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users, Clock, AlertTriangle, CheckCircle, ArrowRight,
  ListTodo, MessageSquare, Activity,
} from 'lucide-react';
import { DataQualityBadge } from '@/components/data-quality-badge';
import api from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  client_first_name?: string;
  client_last_name?: string;
  client_id?: string;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  title: string | null;
  body: string | null;
  created_at: string;
  actor_email?: string;
  client_first_name?: string;
  client_last_name?: string;
}

interface DashboardData {
  stageCounts: Record<string, number>;
  clientCounts: Record<string, number>;
  myTasks: TaskItem[];
  overdueTasks: number;
  openTasks: number;
  taskCounts: Array<{ assigned_to: string; total: number; overdue: number }>;
  recentActivity: ActivityEvent[];
}

interface PlacementItem {
  id: string;
  stage: string;
  client_first_name: string;
  client_last_name: string;
  unit_address: string | null;
  compatibility_score: number | null;
  updated_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function urgency(days: number): 'overdue' | 'due' | 'ok' {
  if (days >= 7) return 'overdue';
  if (days >= 3) return 'due';
  return 'ok';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const urgencyStyles = {
  overdue: 'border-l-red-500 bg-red-50/50 dark:bg-red-500/10',
  due: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/10',
  ok: 'border-l-green-500',
};

const urgencyBadges: Record<string, React.ReactNode> = {
  overdue: <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>,
  due: <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/30">Due soon</Badge>,
  ok: <Badge variant="secondary" className="text-[10px] px-1.5 py-0">On track</Badge>,
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-blue-500/20 text-blue-400',
  low: 'bg-gray-500/20 text-gray-400',
};

const eventIcons: Record<string, string> = {
  note: 'bg-blue-500/20 text-blue-400',
  stage_change: 'bg-purple-500/20 text-purple-400',
  task: 'bg-amber-500/20 text-amber-400',
  document: 'bg-green-500/20 text-green-400',
};

// ── Main Component ──────────────────────────────────────────────────

export default function DashboardHome() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, placementsRes] = await Promise.all([
          api.get(`/orgs/${orgSlug}/dashboard`),
          api.get(`/orgs/${orgSlug}/placements`),
        ]);
        setDashboard(dashRes.data.data);
        setPlacements(placementsRes.data.data || []);
      } catch {
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const activePlacements = placements
    .filter((p) => p.stage !== 'closed')
    .map((p) => ({ ...p, days: daysAgo(p.updated_at), urg: urgency(daysAgo(p.updated_at)) }))
    .sort((a, b) => b.days - a.days);

  const overduePlacementCount = activePlacements.filter((p) => p.urg === 'overdue').length;
  const dueSoonCount = activePlacements.filter((p) => p.urg === 'due').length;
  const totalActive = activePlacements.length;
  const placed = dashboard?.stageCounts?.placed ?? 0;

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
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.overdueTasks ?? overduePlacementCount}</p>
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <ListTodo className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.openTasks ?? dueSoonCount}</p>
                <p className="text-xs text-muted-foreground">Open Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
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

      {/* Dual-mode tabs */}
      <Tabs defaultValue="my-view">
        <TabsList variant="line">
          <TabsTrigger value="my-view">My View</TabsTrigger>
          <TabsTrigger value="org-overview">Org Overview</TabsTrigger>
        </TabsList>

        {/* ── My View ─────────────────────────────────────────────── */}
        <TabsContent value="my-view" className="pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* My Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTodo className="h-4 w-4" /> My Tasks
                  </CardTitle>
                  {dashboard?.myTasks && dashboard.myTasks.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {dashboard.myTasks.length} open
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!dashboard?.myTasks || dashboard.myTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No open tasks</p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.myTasks.slice(0, 8).map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                      return (
                        <div
                          key={task.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                            isOverdue ? 'border-red-500/30 bg-red-500/5' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-[10px] py-0 ${priorityColors[task.priority] || ''}`}>
                                {task.priority}
                              </Badge>
                              {task.client_first_name && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {task.client_first_name} {task.client_last_name}
                                </span>
                              )}
                              {task.due_date && (
                                <span className={`text-[10px] flex items-center gap-0.5 ml-auto ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Caseload */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">My Caseload</CardTitle>
                  <Link href={`/${orgSlug}/placements`} className="text-sm text-primary hover:underline flex items-center gap-1">
                    Pipeline <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {activePlacements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active placements</p>
                ) : (
                  <div className="space-y-2">
                    {activePlacements.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        href={`/${orgSlug}/placements/${p.id}`}
                        className={`flex items-center justify-between p-2.5 rounded-lg border border-l-4 hover:bg-accent/50 transition-colors ${urgencyStyles[p.urg]}`}
                      >
                        <div>
                          <p className="font-medium text-sm">{p.client_first_name} {p.client_last_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.stage}</p>
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
        </TabsContent>

        {/* ── Org Overview ────────────────────────────────────────── */}
        <TabsContent value="org-overview" className="pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Stage breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pipeline by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['intake', 'matching', 'proposed', 'accepted', 'placed', 'closed'].map((stage) => {
                    const count = dashboard?.stageCounts?.[stage] ?? 0;
                    const total = Object.values(dashboard?.stageCounts ?? {}).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{stage}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent org activity feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!dashboard?.recentActivity || dashboard.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.recentActivity.slice(0, 8).map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${eventIcons[ev.event_type] || 'bg-muted text-muted-foreground'}`}>
                          <MessageSquare className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {ev.client_first_name && (
                              <span className="font-medium">{ev.client_first_name} {ev.client_last_name}: </span>
                            )}
                            {ev.title || ev.body || ev.event_type.replace('_', ' ')}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{timeAgo(ev.created_at)}</span>
                            {ev.actor_email && (
                              <span className="text-[10px] text-muted-foreground">{ev.actor_email.split('@')[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff workload */}
            {dashboard?.taskCounts && dashboard.taskCounts.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Staff Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {dashboard.taskCounts.map((tc) => (
                      <div key={tc.assigned_to} className="p-3 rounded-lg border">
                        <p className="text-sm font-medium truncate">{tc.assigned_to?.slice(0, 8) || 'Unassigned'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold">{tc.total}</span>
                          <span className="text-xs text-muted-foreground">open tasks</span>
                          {tc.overdue > 0 && (
                            <Badge variant="destructive" className="text-[10px] py-0 ml-auto">
                              {tc.overdue} overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
