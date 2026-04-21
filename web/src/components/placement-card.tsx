import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface PlacementCardProps {
  clientName: string;
  unitAddress: string | null;
  score: number | null;
  caseManager: string | null;
  daysInStage: number;
  stage?: string;
}

const AT_RISK_THRESHOLDS: Record<string, number> = {
  intake: 7,
  matching: 10,
  proposed: 5,
  accepted: 3,
};

export function PlacementCard({
  clientName,
  unitAddress,
  score,
  caseManager,
  daysInStage,
  stage,
}: PlacementCardProps) {
  const threshold = stage ? AT_RISK_THRESHOLDS[stage] : undefined;
  const isAtRisk = threshold !== undefined && daysInStage > threshold;

  return (
    <Card className={`mb-2 cursor-grab active:cursor-grabbing ${isAtRisk ? 'ring-1 ring-red-400/50 dark:ring-red-500/40' : ''}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[9px] text-white font-bold shrink-0">
              {clientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="font-medium text-sm truncate">{clientName}</div>
          </div>
          {isAtRisk && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400" title={`${daysInStage} days in stage (threshold: ${threshold}d)`}>
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        {unitAddress && (
          <div className="text-xs text-muted-foreground truncate">
            {unitAddress}
          </div>
        )}
        <div className="flex items-center justify-between">
          {score !== null && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                score >= 0.8
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                  : score >= 0.6
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                    : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {Math.round(score * 100)}% match
            </div>
          )}
          <span className={`text-xs ${isAtRisk ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
            {daysInStage}d
          </span>
        </div>
        {caseManager && (
          <div className="text-xs text-muted-foreground">{caseManager}</div>
        )}
      </CardContent>
    </Card>
  );
}
