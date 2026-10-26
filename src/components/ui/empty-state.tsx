import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Illustration, type IllustrationKind } from './illustrations';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: React.ReactNode;
  /** Dibujo del estado vacío (reemplaza al ícono). */
  illustration?: IllustrationKind;
  compact?: boolean;
  className?: string;
}

/** Estado vacío estándar: ninguna sección del dashboard muestra paneles rotos. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  illustration,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed bg-secondary/40 text-center',
        compact ? 'gap-2 p-4' : 'gap-3 p-8',
        className,
      )}
    >
      {illustration ? <Illustration kind={illustration} size={compact ? 72 : 96} /> : null}
      {!illustration && icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-1 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
