'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareCodeText } from '@/features/gym/code-share';

/** El código del gimnasio, para copiarlo y compartirlo por WhatsApp o donde quiera. */
export function CodeShare({ gymName, code, appUrl }: { gymName: string; code: string; appUrl: string }) {
  const [copied, setCopied] = useState(false);
  const text = shareCodeText({ gymName, code, url: appUrl });

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(message);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Mantené apretado el código para copiarlo.');
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <p className="font-semibold">Código de tu gimnasio</p>
        <p className="text-xs text-muted-foreground">Compartilo por WhatsApp, Instagram o donde quieras.</p>
      </div>
      <p className="select-all rounded-xl border bg-secondary/40 px-3 py-3 text-center font-mono text-2xl font-bold tracking-widest">{code}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => copy(code, 'Código copiado.')}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copiar código
        </Button>
        <Button variant="outline" onClick={() => copy(text, 'Mensaje copiado, ya lo podés pegar.')}>
          <Copy className="size-4" />
          Copiar mensaje
        </Button>
        <Button onClick={share}>
          <Share2 className="size-4" />
          Compartir
        </Button>
      </div>
    </div>
  );
}
