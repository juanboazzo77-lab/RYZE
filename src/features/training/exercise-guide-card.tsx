import Link from 'next/link';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getExerciseGuide } from './exercise-guide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/** Async: puede disparar una generación con IA la 1ª vez. Envolver en <Suspense>. */
export async function ExerciseGuideCard({ exerciseId }: { exerciseId: string }) {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const guide = await getExerciseGuide(ctx.profile, exerciseId);
  if (!guide) return null;

  const tg = t.training.guide;
  const muscleLabel = (m: string) => t.training.muscles[m as 'CHEST'] ?? m;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tg.muscles}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 pt-0">
          <Badge>{muscleLabel(guide.primaryMuscle)}</Badge>
          {guide.secondaryMuscles.map((m) => (
            <Badge key={m} variant="secondary">
              {muscleLabel(m)}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {guide.cues.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tg.howTo}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {guide.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {guide.alternatives.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tg.alternatives}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {guide.alternatives.map((a) => (
              <Link
                key={a.id}
                href={`/training/exercises/${a.id}`}
                className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent"
              >
                {a.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

export function ExerciseGuideSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-xl bg-secondary" />
      <div className="h-40 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}
