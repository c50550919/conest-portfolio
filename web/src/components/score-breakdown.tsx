interface ScoreBreakdownProps {
  breakdown: Record<string, number>;
}

const FACTOR_LABELS: Record<string, string> = {
  location: 'Location',
  budget: 'Budget',
  householdSize: 'Household Size',
  languageCultural: 'Language/Cultural',
  accessibility: 'Accessibility',
  servicesProximity: 'Services Nearby',
};

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {FACTOR_LABELS[key] || key}
            </span>
            <span className="font-medium">{Math.round(value * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all ${
                value >= 0.8
                  ? 'bg-green-500'
                  : value >= 0.5
                    ? 'bg-blue-500'
                    : 'bg-yellow-500'
              }`}
              style={{ width: `${value * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
