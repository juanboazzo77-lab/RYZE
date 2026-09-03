'use client';

import { useEffect, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function RestTimer({
  endsAt,
  onSkip,
  onExtend,
}: {
  endsAt: number;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(h);
  }, []);

  const remaining = (endsAt - now) / 1000;
  useEffect(() => {
    if (remaining <= 0) {
      const h = setTimeout(onSkip, 400);
      return () => clearTimeout(h);
    }
  }, [remaining, onSkip]);

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-3xl px-4 md:bottom-4">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
        <Timer className="size-5 text-primary" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{t.training.session.restTitle}</p>
          <p className="text-lg font-bold tabular-nums">{fmt(remaining)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onExtend(15)}>
          {t.training.session.plus15}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t.training.session.skip} onClick={onSkip}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
