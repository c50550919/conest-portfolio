import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlacementCardProps {
  clientName: string;
  unitAddress: string | null;
  score: number | null;
  caseManager: string | null;
  daysInStage: number;
}

export function PlacementCard({
  clientName,
  unitAddress,
  score,
  caseManager,
  daysInStage,
}: PlacementCardProps) {
  return (
    <Card className="mb-2 cursor-grab active:cursor-grabbing">
      <CardContent className="p-3 space-y-2">
        <div className="font-medium text-sm">{clientName}</div>
        {unitAddress && (
          <div className="text-xs text-muted-foreground truncate">
            {unitAddress}
          </div>
        )}
        <div className="flex items-center justify-between">
          {score !== null && (
            <Badge
              variant="secondary"
              className={
                score >= 0.8
                  ? 'bg-green-100 text-green-800'
                  : score >= 0.6
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
              }
            >
              {Math.round(score * 100)}%
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
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
