'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveError } from './actions';

/** Marca un error como resuelto (o lo reabre). */
export function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={resolved ? 'outline' : 'default'}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await resolveError({ id, resolved: !resolved });
          if (res.ok) router.refresh();
          else toast.error('No se pudo actualizar.');
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {resolved ? 'Reabrir' : 'Marcar resuelto'}
    </Button>
  );
}
