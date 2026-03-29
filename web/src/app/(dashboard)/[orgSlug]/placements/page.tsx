'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Placement Pipeline</h2>
        <span className="text-sm text-muted-foreground">
          {placements.length} active placements
        </span>
      </div>
      <PipelineBoard
        placements={placements}
        orgSlug={orgSlug}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
