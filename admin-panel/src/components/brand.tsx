import Image from 'next/image';

/** El logo de Forza AI en su cuadro blanco (el mismo de la app). */
export function BrandMark({ size = 36 }: { size?: number }) {
  const inner = Math.round(size * 0.72);
  return (
    <span className="grid shrink-0 place-items-center rounded-xl border bg-white shadow-sm" style={{ width: size, height: size }}>
      <Image src="/brand/logo.png" alt="" width={inner} height={inner} priority />
    </span>
  );
}

/** Logo + nombre, para encabezados. */
export function BrandLockup({ sub }: { sub?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark size={36} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold tracking-tight">Forza AI</span>
        {sub ? <span className="block truncate text-xs text-muted-foreground">{sub}</span> : null}
      </span>
    </span>
  );
}
