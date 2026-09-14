'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { exportUserData } from './actions';

export function ExportButton() {
  const t = useT();
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const res = await exportUserData();
      if (!res.ok || !res.data) {
        toast.error(t.account.exportError);
        return;
      }
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymo-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button variant="outline" onClick={download} disabled={pending} className="w-full">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {pending ? t.account.exportPending : t.account.exportButton}
    </Button>
  );
}
