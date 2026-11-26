'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** La tarjeta de una comida: nombre, total, sus alimentos y los botones de abajo. La usan la web y la app. */
export function MealCard({
  label,
  kcal,
  emptyText,
  headerAction,
  footer,
  children,
}: {
  label: string;
  kcal: number;
  emptyText: string;
  headerAction?: React.ReactNode;
  footer: React.ReactNode;
  /** Las filas; null si no hay ninguna. */
  children: React.ReactNode[] | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold">{label}</h2>
          {kcal > 0 ? <span className="text-sm text-muted-foreground tabular-nums">{kcal} kcal</span> : null}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent className="pt-0">
        {!children || children.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="divide-y">{children}</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">{footer}</div>
      </CardContent>
    </Card>
  );
}
