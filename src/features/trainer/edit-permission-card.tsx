'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { answerEditPermission, removeEditPermission } from './followup-actions';
import { FU } from './copy';

/** Lo que ve el cliente sobre el permiso de edición de su entrenador: pedido, aceptado o solo lectura. */
export function EditPermissionCard({ canEdit, requested }: { canEdit: boolean; requested: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function answer(allow: boolean) {
    start(async () => {
      const res = await answerEditPermission({ allow });
      if (res.ok) router.refresh();
      else toast.error(FU.error);
    });
  }

  function revoke() {
    if (!confirm(FU.permRevokeConfirm)) return;
    start(async () => {
      const res = await removeEditPermission();
      if (res.ok) router.refresh();
      else toast.error(FU.error);
    });
  }

  if (requested) {
    return (
      <Card className="space-y-3 border-primary/40 bg-primary/5 p-4">
        <p className="text-sm font-medium">{FU.permRequestedTitle}</p>
        <p className="text-sm text-muted-foreground">{FU.permRequestedText}</p>
        <div className="flex gap-2">
          <Button onClick={() => answer(true)} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {FU.permAllow}
          </Button>
          <Button variant="ghost" onClick={() => answer(false)} disabled={pending}>
            {FU.permDeny}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-2 p-4">
      <p className="text-sm font-medium">{FU.permTitle}</p>
      <p className="text-sm text-muted-foreground">{canEdit ? FU.permCan : FU.permCannot}</p>
      {canEdit ? (
        <Button variant="outline" size="sm" onClick={revoke} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {FU.permRevoke}
        </Button>
      ) : null}
    </Card>
  );
}
