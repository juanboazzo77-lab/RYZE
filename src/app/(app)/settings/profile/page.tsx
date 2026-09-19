import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { toStringArray } from '@/lib/json';
import { ProfileForm } from '@/features/settings/profile-form';
import type { ProfileUpdatePayload } from '@/features/settings/schema';
import type { MUSCLE_PRIORITIES, ROUTINE_STYLE } from '@/features/coach-profile/schema';

export const metadata: Metadata = { title: 'Perfil' };

export default async function ProfileSettingsPage() {
  const [{ t }, { profile }] = await Promise.all([getT(), requireUser()]);

  if (!profile.sex || !profile.birthdate || !profile.experienceLevel || !profile.trainingPlace || !profile.activityLevel) {
    redirect('/onboarding');
  }

  const initial: ProfileUpdatePayload = {
    name: profile.name ?? '',
    sex: profile.sex,
    birthdate: profile.birthdate.toISOString().slice(0, 10),
    heightCm: profile.heightCm ?? 170,
    experienceLevel: profile.experienceLevel,
    daysAvailable: profile.daysAvailable ?? 3,
    sessionMinutes: profile.sessionMinutes ?? 60,
    trainingPlace: profile.trainingPlace,
    equipment: toStringArray(profile.equipment),
    activityLevel: profile.activityLevel,
    musclePriorities: toStringArray(profile.musclePriorities) as (typeof MUSCLE_PRIORITIES)[number][],
    dislikedExercises: toStringArray(profile.dislikedExercises),
    routineStyle: profile.routineStyle as (typeof ROUTINE_STYLE)[number] | null,
    mealsPerDay: profile.mealsPerDay ?? 3,
    dietaryPrefs: toStringArray(profile.dietaryPrefs),
    excludedFoods: toStringArray(profile.excludedFoods),
    allergies: toStringArray(profile.allergies),
    injuries: profile.injuries ?? '',
    trainingExperienceNote: profile.trainingExperienceNote ?? '',
  };

  return (
    <div className="space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.profile.title}</h1>
      <ProfileForm initial={initial} unitSystem={profile.unitSystem} />
    </div>
  );
}
