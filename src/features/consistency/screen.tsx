import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Dictionary } from '@/i18n';
import { EmptyState } from '@/components/ui/empty-state';
import { ConsistencyBody } from './screen-body';
import type { ConsistencyView } from './view';

/** La pantalla de constancia de la web (y su vista de ejemplo de desarrollo). */
export function ConsistencyScreen(props: { t: Dictionary; locale: string; view: ConsistencyView; firstName: string }) {
  return (
    <ConsistencyBody
      {...props}
      back={
        <Link href="/progress" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          {props.t.nav.progress}
        </Link>
      }
      empty={<EmptyState compact illustration="workout" title={props.t.consistency.empty} />}
    />
  );
}
