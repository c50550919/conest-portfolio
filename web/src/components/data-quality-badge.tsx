'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  orgSlug: string;
}

export function DataQualityBadge({ orgSlug }: Props) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    async function compute() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/clients`);
        const clients = data.data as Array<Record<string, unknown>>;
        if (clients.length === 0) { setScore(100); return; }

        const requiredFields = [
          'first_name', 'last_name', 'household_size',
          'language_primary', 'budget_max', 'preferred_area',
          'intake_date', 'status',
        ];
        let filled = 0;
        let total = 0;
        for (const c of clients) {
          for (const f of requiredFields) {
            total++;
            if (c[f] !== null && c[f] !== undefined && c[f] !== '') filled++;
          }
        }
        setScore(Math.round((filled / total) * 100));
      } catch {
        setScore(null);
      }
    }
    compute();
  }, [orgSlug]);

  if (score === null) return null;

  const color = score >= 90 ? 'text-green-600' : score >= 75 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 90 ? 'bg-green-100' : score >= 75 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <ShieldCheck className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{score}%</p>
            <p className="text-xs text-muted-foreground">Data Quality</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
