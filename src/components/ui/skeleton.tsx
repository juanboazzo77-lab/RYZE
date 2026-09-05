import { cn } from '@/lib/utils';

/** Bloque de esqueleto para estados de carga. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-secondary', className)} />;
}
