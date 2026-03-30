'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, User, Home, Globe, DollarSign, Users,
  Accessibility, MapPin, Phone, Mail,
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
    async function fetchData() {
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
    fetchData();
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
                      {p.outcome && ` \u2014 ${p.outcome}`}
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
