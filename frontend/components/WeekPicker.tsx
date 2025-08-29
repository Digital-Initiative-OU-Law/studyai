'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from 'lucide-react';

interface WeekPickerProps {
  value?: number;
  onChange: (week: number) => void;
  min?: number;
  max?: number;
}

export default function WeekPicker({ value, onChange, min = 1, max = 16 }: WeekPickerProps) {
  const weeks = useMemo(() => {
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    const length = Math.max(0, safeMax - safeMin + 1);
    
    return Array.from({ length }, (_, i) => safeMin + i);
  }, [min, max]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Select Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {weeks.map((week) => (
            <button
              key={week}
              onClick={() => onChange(week)}
              className={`p-3 rounded-lg border-2 transition-all font-semibold ${
                value === week
                  ? 'border-ou-crimson bg-ou-crimson text-white'
                  : 'border-ou-panel hover:border-ou-crimson/50 hover:bg-ou-panel'
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}