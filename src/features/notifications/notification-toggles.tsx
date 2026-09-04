'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { NotificationKind } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/provider';
import type { NotificationPrefView } from './queries';
import { setNotificationPref } from './actions';

export function NotificationToggles({ initial }: { initial: NotificationPrefView[] }) {
  const t = useT();
  const [prefs, setPrefs] = useState(initial);
  const [, start] = useTransition();

  function toggle(kind: NotificationKind, enabled: boolean) {
    setPrefs((p) => p.map((x) => (x.kind === kind ? { ...x, enabled } : x)));
    start(async () => {
      const res = await setNotificationPref({ kind, enabled });
      if (res.ok) toast.success(t.common.saved);
      else toast.error(t.common.error);
    });
  }

  return (
    <Card className="divide-y">
      {prefs.map((p) => (
        <div key={p.kind} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{t.notifications.kinds[p.kind]}</p>
            <p className="text-xs text-muted-foreground">{t.notifications.kindDesc[p.kind]}</p>
          </div>
          <Switch
            checked={p.enabled}
            onCheckedChange={(v) => toggle(p.kind, v)}
            aria-label={t.notifications.kinds[p.kind]}
          />
        </div>
      ))}
    </Card>
  );
}
