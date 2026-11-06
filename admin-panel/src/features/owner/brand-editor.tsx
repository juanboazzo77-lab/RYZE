'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_BRAND_COLOR, MAX_LOGO_BYTES, normalizeHexColor, readableOn } from '@/features/gym/brand';
import { removeLogoAction, saveBrandColorAction, uploadLogoAction } from './brand-actions';

const ERRORS: Record<string, string> = {
  NOT_CONFIGURED: 'La subida de logos todavía no está lista. Escribinos a soporte@forzaai.app.',
  TOO_BIG: 'El logo pesa demasiado: usá uno de hasta 400 KB.',
  BAD_TYPE: 'Usá una imagen PNG, JPG o WEBP.',
  NO_FILE: 'Elegí un archivo primero.',
};

/** La marca del gimnasio: logo y color. Abajo se ve cómo lo ve el socio dentro de la app. */
export function BrandEditor({ gymName, logoUrl, color }: { gymName: string; logoUrl: string | null; color: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState(color ?? DEFAULT_BRAND_COLOR);
  const [typed, setTyped] = useState(color ?? '');
  const valid = normalizeHexColor(picked) ?? DEFAULT_BRAND_COLOR;

  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) return void toast.error(ERRORS.TOO_BIG);
    const fd = new FormData();
    fd.set('logo', file);
    start(async () => {
      const res = await uploadLogoAction(fd);
      if (res.ok) {
        toast.success('Logo actualizado.');
        router.refresh();
      } else toast.error(ERRORS[res.error ?? ''] ?? 'No se pudo subir el logo. Probá de nuevo.');
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  function saveColor(next: string | null) {
    start(async () => {
      const res = await saveBrandColorAction({ color: next ?? '' });
      if (res.ok) {
        toast.success(next ? 'Color guardado.' : 'Volvió al color de Forza AI.');
        router.refresh();
      } else toast.error('Ese color no es válido.');
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border p-4">
        <div>
          <p className="font-semibold">Logo</p>
          <p className="text-sm text-muted-foreground">PNG, JPG o WEBP de hasta 400 KB. Mejor cuadrado y con fondo transparente o blanco.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
            {logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="size-full object-contain p-1" /> : <span className="text-xs text-muted-foreground">Sin logo</span>}
          </span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {logoUrl ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await removeLogoAction();
                  router.refresh();
                })
              }
            >
              Quitar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div>
          <p className="font-semibold">Color de tu marca</p>
          <p className="text-sm text-muted-foreground">Es el color de tu tarjeta dentro de la app de tus socios.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Elegir color"
            value={valid}
            onChange={(e) => {
              setPicked(e.target.value);
              setTyped(e.target.value);
            }}
            className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              const n = normalizeHexColor(e.target.value);
              if (n) setPicked(n);
            }}
            placeholder="#1d9a5f"
            maxLength={7}
            className="h-10 w-28 rounded-md border border-input bg-background px-3 font-mono text-sm"
            aria-label="Color en formato #rrggbb"
          />
          <Button disabled={pending || !normalizeHexColor(typed)} onClick={() => saveColor(normalizeHexColor(typed))}>
            Guardar color
          </Button>
          {color ? (
            <Button variant="ghost" disabled={pending} onClick={() => saveColor(null)}>
              Usar el de Forza AI
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Así lo ve tu socio</p>
        <div className="space-y-3 rounded-2xl border bg-card p-4" style={{ borderLeft: `6px solid ${valid}` }}>
          <div className="flex items-center gap-2.5">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
              {logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl} alt="" className="size-full object-contain p-1" /> : <span className="text-lg font-bold" style={{ color: valid }}>{gymName.charAt(0).toUpperCase()}</span>}
            </span>
            <span className="text-lg font-light text-muted-foreground" aria-hidden="true">×</span>
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt="" className="size-9" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{gymName} × Forza AI</p>
              <p className="text-xs text-muted-foreground">Tu entrenador con IA</p>
            </div>
          </div>
          <span className="inline-block rounded-full px-3.5 py-1.5 text-xs font-semibold" style={{ background: valid, color: readableOn(valid) }}>
            Ver rutinas de {gymName}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Además, los botones y detalles de la app de tus socios toman el color de tu marca.</p>
      </div>
    </div>
  );
}
