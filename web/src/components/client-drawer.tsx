'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientAvatar } from '@/components/client-avatar';
import {
  X, Phone, Mail, Users, DollarSign, MapPin,
  MessageSquare, ArrowRight, Send, Clock,
} from 'lucide-react';
import api from '@/lib/api';

interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  household_size: number;
  phone: string | null;
  email: string | null;
  budget_max: number | null;
  preferred_area: string | null;
  intake_date: string | null;
  photo_url: string | null;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  title: string | null;
  body: string | null;
  created_at: string;
  actor_email?: string;
}

interface DrawerPlacement {
  id: string;
  stage: string;
  unit_address: string | null;
  compatibility_score: number | null;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  intake: 'bg-yellow-500/20 text-yellow-300',
  ready: 'bg-blue-500/20 text-blue-300',
  placed: 'bg-green-500/20 text-green-300',
  exited: 'bg-gray-500/20 text-gray-300',
};

const eventIcons: Record<string, string> = {
  note: 'bg-blue-500/20 text-blue-400',
  stage_change: 'bg-purple-500/20 text-purple-400',
  task: 'bg-amber-500/20 text-amber-400',
  document: 'bg-green-500/20 text-green-400',
  assignment: 'bg-cyan-500/20 text-cyan-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ClientDrawer({
  clientId,
  orgSlug,
  onClose,
}: {
  clientId: string | null;
  orgSlug: string;
  onClose: () => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [placement, setPlacement] = useState<DrawerPlacement | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    Promise.all([
      api.get(`/orgs/${orgSlug}/clients/${clientId}`),
      api.get(`/orgs/${orgSlug}/clients/${clientId}/activity?limit=5`).catch(() => ({ data: { data: [] } })),
      api.get(`/orgs/${orgSlug}/placements`).catch(() => ({ data: { data: [] } })),
    ]).then(([clientRes, activityRes, placementsRes]) => {
      setClient(clientRes.data.data);
      setEvents(activityRes.data.data || []);
      const clientPlacements = (placementsRes.data.data || []).filter(
        (p: any) => p.client_id === clientId && p.stage !== 'closed',
      );
      setPlacement(clientPlacements[0] || null);
    }).catch(() => {
      setClient(null);
    }).finally(() => setLoading(false));
  }, [clientId, orgSlug]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !clientId) return;
    setSubmitting(true);
    try {
      await api.post(`/orgs/${orgSlug}/clients/${clientId}/activity`, {
        event_type: 'note',
        note_type: 'general',
        body: noteText.trim(),
      });
      setNoteText('');
      const { data } = await api.get(`/orgs/${orgSlug}/clients/${clientId}/activity?limit=5`);
      setEvents(data.data || []);
    } catch {
      // silently fail for demo
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {clientId && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          clientId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : client ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start gap-3 p-4 border-b">
              <ClientAvatar
                clientId={client.id}
                orgSlug={orgSlug}
                firstName={client.first_name}
                lastName={client.last_name}
                photoUrl={client.photo_url}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate">
                  {client.first_name} {client.last_name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[client.status] || ''}`}>
                    {client.status}
                  </Badge>
                  {client.intake_date && (
                    <span className="text-xs text-muted-foreground">
                      Since {new Date(client.intake_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick info */}
              <div className="grid grid-cols-2 gap-3">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                    <Phone className="h-3.5 w-3.5" /> {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary truncate">
                    <Mail className="h-3.5 w-3.5" /> {client.email}
                  </a>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {client.household_size} person{client.household_size !== 1 ? 's' : ''}
                </div>
                {client.budget_max && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" /> ${client.budget_max.toLocaleString()}/mo
                  </div>
                )}
                {client.preferred_area && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                    <MapPin className="h-3.5 w-3.5" /> {client.preferred_area}
                  </div>
                )}
              </div>

              {/* Current placement */}
              {placement && (
                <Card className="bg-accent/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Current Placement</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="capitalize text-[10px] mb-1">
                          {placement.stage}
                        </Badge>
                        {placement.unit_address && (
                          <p className="text-sm">{placement.unit_address}</p>
                        )}
                      </div>
                      {placement.compatibility_score != null && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{Math.round(placement.compatibility_score)}%</p>
                          <p className="text-[10px] text-muted-foreground">match</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick add note */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input
                  placeholder="Add a quick note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button type="submit" size="sm" disabled={submitting || !noteText.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>

              {/* Recent activity */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2">
                        <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${eventIcons[ev.event_type] || 'bg-muted text-muted-foreground'}`}>
                          <MessageSquare className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
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
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t">
              <Link href={`/${orgSlug}/clients/${client.id}`}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  Open Full Profile <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
