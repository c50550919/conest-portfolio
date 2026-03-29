'use client';

import { PlacementCard } from './placement-card';
import Link from 'next/link';

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

interface PipelineBoardProps {
  placements: Placement[];
  orgSlug: string;
  onStageChange: (id: string, newStage: string) => void;
}

const STAGES = [
  { key: 'intake', label: 'Intake', color: 'border-t-yellow-400' },
  { key: 'matching', label: 'Matching', color: 'border-t-orange-400' },
  { key: 'proposed', label: 'Proposed', color: 'border-t-blue-400' },
  { key: 'accepted', label: 'Accepted', color: 'border-t-indigo-400' },
  { key: 'placed', label: 'Placed', color: 'border-t-green-400' },
  { key: 'closed', label: 'Closed', color: 'border-t-gray-400' },
];

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function PipelineBoard({
  placements,
  orgSlug,
}: PipelineBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stagePlacements = placements.filter(
          (p) => p.stage === stage.key,
        );
        return (
          <div
            key={stage.key}
            className={`flex-shrink-0 w-64 rounded-lg border-t-4 ${stage.color} bg-gray-50`}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-medium text-sm">{stage.label}</h3>
              <span className="text-xs text-muted-foreground bg-white rounded-full px-2 py-0.5">
                {stagePlacements.length}
              </span>
            </div>
            <div className="p-2 min-h-[200px]">
              {stagePlacements.map((placement) => (
                <Link
                  key={placement.id}
                  href={`/${orgSlug}/placements/${placement.id}`}
                >
                  <PlacementCard
                    clientName={`${placement.client_first_name} ${placement.client_last_name}`}
                    unitAddress={placement.unit_address}
                    score={placement.compatibility_score}
                    caseManager={placement.case_manager_name}
                    daysInStage={daysSince(placement.updated_at)}
                  />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
