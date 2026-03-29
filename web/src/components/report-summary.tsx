import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportSummaryProps {
  totalPlacements: number;
  avgDaysToPlacement: number;
  successRate: number;
  activeClients: number;
}

export function ReportSummary({
  totalPlacements,
  avgDaysToPlacement,
  successRate,
  activeClients,
}: ReportSummaryProps) {
  const cards = [
    {
      title: 'Total Placements',
      value: totalPlacements.toString(),
      subtitle: 'all time',
    },
    {
      title: 'Avg Days to Placement',
      value: avgDaysToPlacement.toString(),
      subtitle: 'intake to placed',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      subtitle: 'placed / total closed',
    },
    {
      title: 'Active Clients',
      value: activeClients.toString(),
      subtitle: 'intake + ready',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
