"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  endsAt: string; // ISO timestamp from API
};

export default function TimerBar({ endsAt }: Props) {
  const end = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = 300_000; // 5m default
  const remaining = Math.max(0, end - now);
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, opacity: 0.8 }}>
        <span>Time Remaining</span>
        <span>{label}</span>
      </div>
      <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#841617', transition: 'width .5s linear' }} />
      </div>
    </div>
  );
}

