'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MatchComparison } from '@/components/match-comparison';
import api from '@/lib/api';

interface ClientDetail {
  first_name: string;
  last_name: string;
  household_size: number;
  language_primary: string | null;
  budget_max: number | null;
  preferred_area: string | null;
  status: string;
  accessibility_needs: Record<string, unknown>;
}

interface MatchUnit {
  unitId: string;
  address: string;
  city: string;
  bedrooms: number;
  rent_amount: number;
  totalScore: number;
  breakdown: Record<string, number>;
}

export default function PlacementDetailPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const placementId = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [matches, setMatches] = useState<MatchUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [placementRes, matchesRes] = await Promise.all([
          api.get(`/orgs/${orgSlug}/placements/${placementId}`),
          api.get(`/orgs/${orgSlug}/placements/${placementId}/matches`),
        ]);
        setClient(placementRes.data.data?.client || null);
        setMatches(matchesRes.data.data || []);
      } catch {
        // API not ready yet
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgSlug, placementId]);

  async function handlePropose(unitId: string) {
    try {
      await api.patch(`/orgs/${orgSlug}/placements/${placementId}/stage`, {
        stage: 'proposed',
        unit_id: unitId,
      });
      alert('Placement proposed successfully');
    } catch {
      alert('Failed to propose placement');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading match data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Match View</h2>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Client Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client ? (
              <>
                <div>
                  <p className="font-medium text-lg">
                    {client.first_name} {client.last_name}
                  </p>
                  <Badge variant="secondary">{client.status}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Household</span>
                    <span>{client.household_size} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language</span>
                    <span>{client.language_primary || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span>
                      {client.budget_max
                        ? `$${client.budget_max.toLocaleString()}/mo`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Area</span>
                    <span>{client.preferred_area || '—'}</span>
                  </div>
                  {Object.keys(client.accessibility_needs || {}).length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        Accessibility Needs
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.keys(client.accessibility_needs).map((need) => (
                          <Badge key={need} variant="outline" className="text-xs">
                            {need}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Client data unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* Matching Units */}
        <div>
          <h3 className="text-lg font-medium mb-4">Top Matching Units</h3>
          <MatchComparison matches={matches} onPropose={handlePropose} />
        </div>
      </div>
    </div>
  );
}
