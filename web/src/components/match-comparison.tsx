import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBreakdown } from './score-breakdown';

interface MatchUnit {
  unitId: string;
  address: string;
  city: string;
  bedrooms: number;
  rent_amount: number;
  totalScore: number;
  breakdown: Record<string, number>;
}

interface MatchComparisonProps {
  matches: MatchUnit[];
  onPropose: (unitId: string) => void;
}

export function MatchComparison({ matches, onPropose }: MatchComparisonProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No matching units found
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {matches.map((match, index) => (
        <Card
          key={match.unitId}
          className={index === 0 ? 'border-green-300 border-2' : ''}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {index === 0 ? 'Best Match' : `Match #${index + 1}`}
              </CardTitle>
              <Badge
                variant="secondary"
                className={
                  match.totalScore >= 0.8
                    ? 'bg-green-100 text-green-800'
                    : match.totalScore >= 0.6
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                }
              >
                {Math.round(match.totalScore * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm">{match.address}</p>
              <p className="text-sm text-muted-foreground">{match.city}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span>{match.bedrooms} bed</span>
              <span>${match.rent_amount.toLocaleString()}/mo</span>
            </div>
            <ScoreBreakdown breakdown={match.breakdown} />
            <button
              onClick={() => onPropose(match.unitId)}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Propose This Unit
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
