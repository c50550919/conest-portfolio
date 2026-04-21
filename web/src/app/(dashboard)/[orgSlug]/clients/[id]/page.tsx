'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ClientAvatar } from '@/components/client-avatar';
import {
  ArrowLeft, Home, Globe, DollarSign, Users, Accessibility,
  MapPin, Phone, Mail, Sparkles, Briefcase, Pencil, Trash2,
  Save, X, Send, MessageSquare, CheckCircle2, Circle,
  Clock, FileText, AlertTriangle, Plus,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────

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
  photo_url: string | null;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  origin: string;
  title: string | null;
  body: string | null;
  note_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_email?: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  auto_generated: boolean;
  created_by_name: string;
  created_at: string;
}

interface ClientPlacement {
  id: string;
  stage: string;
  unit_address: string | null;
  compatibility_score: number | null;
  created_at: string;
  updated_at: string;
  outcome: string | null;
  document_checklist?: {
    version: number;
    items: Array<{ type: string; label: string; status: string; updated_at: string | null }>;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  intake: 'bg-yellow-500/20 text-yellow-300',
  ready: 'bg-blue-500/20 text-blue-300',
  placed: 'bg-green-500/20 text-green-300',
  exited: 'bg-gray-500/20 text-gray-300',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-blue-500/20 text-blue-400',
  low: 'bg-gray-500/20 text-gray-400',
};

const eventTypeIcons: Record<string, { bg: string; label: string }> = {
  note: { bg: 'bg-blue-500/20 text-blue-400', label: 'Note' },
  stage_change: { bg: 'bg-purple-500/20 text-purple-400', label: 'Stage Change' },
  task: { bg: 'bg-amber-500/20 text-amber-400', label: 'Task' },
  document: { bg: 'bg-green-500/20 text-green-400', label: 'Document' },
  field_edit: { bg: 'bg-cyan-500/20 text-cyan-400', label: 'Edit' },
  assignment: { bg: 'bg-indigo-500/20 text-indigo-400', label: 'Assignment' },
  status_change: { bg: 'bg-pink-500/20 text-pink-400', label: 'Status' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function InfoItem({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [placements, setPlacements] = useState<ClientPlacement[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ClientDetail>>({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Note input
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Timeline filter
  const [eventFilter, setEventFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [clientRes, eventsRes, tasksRes, placementsRes] = await Promise.all([
        api.get(`/orgs/${orgSlug}/clients/${clientId}`),
        api.get(`/orgs/${orgSlug}/clients/${clientId}/activity?limit=50`).catch(() => ({ data: { data: [] } })),
        api.get(`/orgs/${orgSlug}/clients/${clientId}/tasks`).catch(() => ({ data: { data: [] } })),
        api.get(`/orgs/${orgSlug}/placements`).catch(() => ({ data: { data: [] } })),
      ]);
      setClient(clientRes.data.data);
      setEvents(eventsRes.data.data || []);
      setTasks(tasksRes.data.data || []);
      const clientPlacements = (placementsRes.data.data || []).filter(
        (p: any) => p.client_id === clientId,
      );
      setPlacements(clientPlacements);
    } catch {
      // handled by loading state
    } finally {
      setLoading(false);
    }
  }, [orgSlug, clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEditing() {
    if (!client) return;
    setEditData({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      email: client.email,
      household_size: client.household_size,
      language_primary: client.language_primary,
      budget_max: client.budget_max,
      preferred_area: client.preferred_area,
      income_range: client.income_range,
      status: client.status,
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.patch(`/orgs/${orgSlug}/clients/${clientId}`, editData);
      setClient(data.data);
      setEditing(false);
    } catch {
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/orgs/${orgSlug}/clients/${clientId}`);
      router.push(`/${orgSlug}/clients`);
    } catch {
      alert('Failed to delete client.');
      setDeleting(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    try {
      await api.post(`/orgs/${orgSlug}/clients/${clientId}/activity`, {
        event_type: 'note',
        note_type: noteType,
        body: noteText.trim(),
      });
      setNoteText('');
      const { data } = await api.get(`/orgs/${orgSlug}/clients/${clientId}/activity?limit=50`);
      setEvents(data.data || []);
    } catch {
      alert('Failed to add note.');
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: string) {
    try {
      if (currentStatus !== 'completed') {
        await api.post(`/orgs/${orgSlug}/tasks/${taskId}/complete`);
      } else {
        await api.patch(`/orgs/${orgSlug}/tasks/${taskId}`, { status: 'pending' });
      }
      const { data } = await api.get(`/orgs/${orgSlug}/clients/${clientId}/tasks`);
      setTasks(data.data || []);
    } catch {
      // silently fail for demo
    }
  }

  async function handleToggleDoc(placementId: string, docType: string, currentStatus: string) {
    try {
      await api.post(`/orgs/${orgSlug}/placements/${placementId}/documents/toggle`, {
        doc_type: docType,
        new_status: currentStatus === 'collected' ? 'missing' : 'collected',
      });
      fetchData(); // refresh placements
    } catch {
      // silently fail
    }
  }

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

  const filteredEvents = eventFilter === 'all'
    ? events
    : events.filter((e) => e.event_type === eventFilter);

  const activePlacement = placements.find((p) => p.stage !== 'closed');

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <Link href={`/${orgSlug}/clients`}>
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Clients
        </Button>
      </Link>

      {/* Hero header — fixed */}
      <div className="flex items-start gap-5">
        <ClientAvatar
          clientId={client.id}
          orgSlug={orgSlug}
          firstName={client.first_name}
          lastName={client.last_name}
          photoUrl={client.photo_url}
          size="xl"
          editable
          onPhotoChange={(url) => setClient((c) => c ? { ...c, photo_url: url } : c)}
        />
        <div className="flex-1 min-w-0 pt-1">
          {editing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={editData.first_name ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, first_name: e.target.value }))}
                className="w-40 text-lg font-bold"
                placeholder="First name"
              />
              <Input
                value={editData.last_name ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, last_name: e.target.value }))}
                className="w-40 text-lg font-bold"
                placeholder="Last name"
              />
              <select
                value={editData.status ?? client.status}
                onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="intake">Intake</option>
                <option value="ready">Ready</option>
                <option value="placed">Placed</option>
                <option value="exited">Exited</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold truncate">
                {client.first_name} {client.last_name}
              </h2>
              <Badge className={statusColors[client.status] ?? 'bg-gray-500/20'}>
                {client.status}
              </Badge>
              {client.intake_date && (
                <span className="text-xs text-muted-foreground">
                  {daysSince(client.intake_date)} days in system
                </span>
              )}
            </div>
          )}
          {/* Contact */}
          {editing ? (
            <div className="flex items-center gap-2 mt-2">
              <Input value={editData.phone ?? ''} onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))} className="w-44" placeholder="Phone" />
              <Input value={editData.email ?? ''} onChange={(e) => setEditData((d) => ({ ...d, email: e.target.value }))} className="w-56" placeholder="Email" />
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-1">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </a>
              )}
            </div>
          )}
          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={startEditing} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList variant="line" className="w-full justify-start border-b pb-0">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {tasks.filter((t) => t.status !== 'completed').length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {tasks.filter((t) => t.status !== 'completed').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* ── Timeline Tab ────────────────────────────────────────── */}
        <TabsContent value="timeline" className="pt-4 space-y-4">
          {/* Quick-add note */}
          <form onSubmit={handleAddNote} className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Add a note... (try /phone, /visit, /lease)"
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  if (e.target.value.startsWith('/phone')) setNoteType('phone_call');
                  else if (e.target.value.startsWith('/visit')) setNoteType('site_visit');
                  else if (e.target.value.startsWith('/lease')) setNoteType('lease_update');
                  else setNoteType('general');
                }}
              />
              {noteType !== 'general' && (
                <Badge variant="outline" className="text-[10px]">
                  {noteType.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <Button type="submit" size="sm" disabled={submittingNote || !noteText.trim()} className="mt-0.5">
              <Send className="h-3.5 w-3.5 mr-1" /> Send
            </Button>
          </form>

          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'note', 'stage_change', 'task', 'document'].map((type) => (
              <button
                key={type}
                onClick={() => setEventFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  eventFilter === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {type === 'all' ? 'All' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Events list */}
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity events yet</p>
            ) : (
              filteredEvents.map((ev) => {
                const typeInfo = eventTypeIcons[ev.event_type] || { bg: 'bg-muted text-muted-foreground', label: ev.event_type };
                return (
                  <div key={ev.id} className="flex gap-3 group">
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${typeInfo.bg}`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] py-0">{typeInfo.label}</Badge>
                        {ev.origin === 'system' && (
                          <Badge variant="secondary" className="text-[10px] py-0">Auto</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(ev.created_at)}</span>
                      </div>
                      {ev.title && <p className="text-sm font-medium mt-0.5">{ev.title}</p>}
                      {ev.body && <p className="text-sm text-muted-foreground mt-0.5">{ev.body}</p>}
                      {ev.event_type === 'stage_change' && ev.metadata && (
                        <p className="text-sm mt-0.5">
                          <span className="text-muted-foreground">{String(ev.metadata.from || '?')}</span>
                          {' → '}
                          <span className="font-medium">{String(ev.metadata.to || '?')}</span>
                        </p>
                      )}
                      {ev.actor_email && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          by {ev.actor_email.split('@')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Profile Tab ─────────────────────────────────────────── */}
        <TabsContent value="profile" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Household Size</Label><Input type="number" min={1} value={editData.household_size ?? ''} onChange={(e) => setEditData((d) => ({ ...d, household_size: parseInt(e.target.value, 10) }))} /></div>
                  <div className="space-y-2"><Label>Primary Language</Label><Input value={editData.language_primary ?? ''} onChange={(e) => setEditData((d) => ({ ...d, language_primary: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Monthly Budget ($)</Label><Input type="number" min={0} value={editData.budget_max ?? ''} onChange={(e) => setEditData((d) => ({ ...d, budget_max: e.target.value ? parseInt(e.target.value, 10) : null }))} /></div>
                  <div className="space-y-2"><Label>Income Range</Label><Input value={editData.income_range ?? ''} onChange={(e) => setEditData((d) => ({ ...d, income_range: e.target.value }))} placeholder="e.g., 35000-45000" /></div>
                  <div className="space-y-2"><Label>Preferred Area</Label><Input value={editData.preferred_area ?? ''} onChange={(e) => setEditData((d) => ({ ...d, preferred_area: e.target.value }))} /></div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoItem icon={Users} label="Household Size" value={`${client.household_size} person${client.household_size !== 1 ? 's' : ''}`} />
                  <InfoItem icon={Globe} label="Primary Language" value={client.language_primary ?? 'Not specified'} sub={client.language_secondary ? `Also: ${client.language_secondary}` : undefined} />
                  <InfoItem icon={DollarSign} label="Monthly Budget" value={client.budget_max ? `$${client.budget_max.toLocaleString()}` : 'Not specified'} />
                  <InfoItem icon={Briefcase} label="Income Range" value={client.income_range ? `$${client.income_range}` : 'Not specified'} />
                  <InfoItem icon={MapPin} label="Preferred Area" value={client.preferred_area ?? 'No preference'} />
                </div>
              )}
              {accessibilityList.length > 0 && (
                <div className="mt-5 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Accessibility className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Accessibility Needs</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accessibilityList.map((need) => (
                      <Badge key={need} variant="outline" className="capitalize">{need}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Placements Tab ──────────────────────────────────────── */}
        <TabsContent value="placements" className="pt-4">
          {placements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No placements yet.</p>
          ) : (
            <div className="space-y-3">
              {placements.map((p) => (
                <Card key={p.id} className={p.stage !== 'closed' ? 'border-primary/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{p.stage}</Badge>
                        {p.stage !== 'closed' && (
                          <span className="text-xs text-muted-foreground">
                            {daysSince(p.updated_at)}d in stage
                          </span>
                        )}
                      </div>
                      {p.compatibility_score != null && (
                        <div className="flex items-center gap-1 text-sm">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold">{Math.round(p.compatibility_score)}%</span>
                        </div>
                      )}
                    </div>
                    {p.unit_address && <p className="text-sm font-medium">{p.unit_address}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(p.created_at)}
                      {p.outcome && ` — ${p.outcome}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tasks Tab ───────────────────────────────────────────── */}
        <TabsContent value="tasks" className="pt-4 space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>
          ) : (
            tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    task.status === 'completed' ? 'opacity-60' : isOverdue ? 'border-red-500/30 bg-red-500/5' : ''
                  }`}
                >
                  <button
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="mt-0.5 shrink-0"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`text-[10px] py-0 ${priorityColors[task.priority] || ''}`}>
                        {task.priority}
                      </Badge>
                      {task.auto_generated && (
                        <Badge variant="outline" className="text-[10px] py-0">Auto</Badge>
                      )}
                      {task.due_date && (
                        <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                          <Clock className="h-3 w-3" /> {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ── Documents Tab ───────────────────────────────────────── */}
        <TabsContent value="documents" className="pt-4">
          {activePlacement?.document_checklist ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Document Checklist
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {activePlacement.document_checklist.items.filter((i) => i.status === 'collected').length}/{activePlacement.document_checklist.items.length} collected
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activePlacement.document_checklist.items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleToggleDoc(activePlacement.id, item.type, item.status)}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  >
                    {item.status === 'collected' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${item.status === 'collected' ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                        {item.label}
                      </p>
                      {item.updated_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Updated {formatDate(item.updated_at)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active placement with document checklist.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{client.first_name} {client.last_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
