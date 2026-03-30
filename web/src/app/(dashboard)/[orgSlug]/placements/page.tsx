'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PipelineBoard } from '@/components/pipeline-board';
import api from '@/lib/api';

interface Placement {
  id: string;
  stage: string;
  client_first_name: string;
  client_last_name: string;
  unit_address: string | null;
  compatibility_score: number | null;
  case_manager_name: string | null;
  updated_at: string;
}

export default function PlacementsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCM, setFilterCM] = useState<string>('all');

  useEffect(() => {
    async function fetchPlacements() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/placements`);
        setPlacements(data.data || []);
      } catch {
        setPlacements([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPlacements();
  }, [orgSlug]);

  async function handleStageChange(id: string, newStage: string) {
    try {
      await api.patch(`/orgs/${orgSlug}/placements/${id}/stage`, {
        stage: newStage,
      });
      setPlacements((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, stage: newStage, updated_at: new Date().toISOString() } : p,
        ),
      );
    } catch {
      // Revert on error — refetch
      const { data } = await api.get(`/orgs/${orgSlug}/placements`);
      setPlacements(data.data || []);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading pipeline...</p>
      </div>
    );
  }

  const caseManagers = [...new Set(
    placements.filter((p) => p.case_manager_name).map((p) => p.case_manager_name!)
  )];

  const filtered = filterCM === 'all'
    ? placements
    : placements.filter((p) => p.case_manager_name === filterCM);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Placement Pipeline</h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} active placements
        </span>
      </div>
      {caseManagers.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto">
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
      )}
      <PipelineBoard
        placements={filtered}
        orgSlug={orgSlug}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
