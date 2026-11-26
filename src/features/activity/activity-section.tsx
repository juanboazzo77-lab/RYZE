'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { useT } from '@/i18n/provider';
import type { ActivityView } from './queries';
import { deleteActivity, logActivity } from './actions';
import { ActivityCard } from './activity-card';
import type { LogActivityInput } from './schema';

export function ActivitySection({ data }: { data: ActivityView }) {
  const t = useT();
  const [pending, start] = useTransition();

  async function log(values: LogActivityInput) {
    const res = await logActivity(values);
    if (res.ok) toast.success(t.common.saved);
    else toast.error(t.common.error);
    return Boolean(res.ok);
  }

  return (
    <ActivityCard
      data={data}
      dimmed={pending}
      onLog={log}
      onInvalid={() => toast.error(t.activity.invalid)}
      onDelete={(date) =>
        start(async () => {
          const res = await deleteActivity({ date });
          if (!res.ok) toast.error(t.common.error);
        })
      }
    />
  );
}
