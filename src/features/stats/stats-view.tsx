import Link from 'next/link';
import type { Dictionary } from '@/i18n';
import { EmptyState } from '@/components/ui/empty-state';
import type { StatsPageData } from './queries';
import { StatsBody } from './stats-body';

export function StatsView(props: { t: Dictionary; locale: string; data: StatsPageData; header: React.ReactNode }) {
  return (
    <StatsBody
      {...props}
      emptyPrs={<EmptyState compact illustration="trophy" title={props.t.stats.noPrs} />}
      prRow={(pr, className, content) => (
        <Link key={pr.id} href={`/training/exercises/${pr.exerciseId}`} className={className}>
          {content}
        </Link>
      )}
    />
  );
}
