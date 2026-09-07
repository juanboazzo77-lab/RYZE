'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { NotificationKind } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import type { NotificationPrefView } from './queries';
import { setNotificationPref } from './actions';

export function NotificationToggles({ initial }: { initial: NotificationPrefView[] }) {
  const t = useT();
  const [prefs, setPrefs] = useState(initial);
  const [, start] = useTransition();

  function patch(kind: NotificationKind, next: { enabled?: boolean; dayOfWeek?: number }) {
    setPrefs((p) => p.map((x) => (x.kind === kind ? { ...x, ...next } : x)));
    start(async () => {
      const res = await setNotificationPref({ kind, ...next });
      if (res.ok) toast.success(t.common.saved);
      else toast.error(t.common.error);
    });
  }

  const weekdays = t.training.weekdays as Record<string, string>;

  return (
    <Card className="divide-y">
      {prefs.map((p) => (
        <div key={p.kind} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t.notifications.kinds[p.kind]}</p>
              <p className="text-xs text-muted-foreground">{t.notifications.kindDesc[p.kind]}</p>
            </div>
            <Switch
              checked={p.enabled}
              onCheckedChange={(v) => patch(p.kind, { enabled: v })}
              aria-label={t.notifications.kinds[p.kind]}
            />
          </div>

          {p.kind === 'WEEKLY_CHECKIN' && p.enabled ? (
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="checkin-day" className="text-xs text-muted-foreground">
                {t.notifications.reminderDay}
              </label>
              <NativeSelect
                id="checkin-day"
                className="h-9 w-40 text-sm"
                value={String(p.dayOfWeek ?? 1)}
                onChange={(e) => patch(p.kind, { dayOfWeek: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {weekdays[String(d)]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </div>
      ))}
    </Card>
  );
}
