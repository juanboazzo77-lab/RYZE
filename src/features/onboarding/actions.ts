'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { computeTargets, ageFromBirthdate } from '@/lib/nutrition/targets';
import { onboardingSchema, type OnboardingPayload } from './schema';

export interface OnboardingResult {
  error?: string;
}

export async function submitOnboarding(raw: OnboardingPayload): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const data = parsed.data;

  const { userId, profile } = await requireUser();
  const db = forUser(userId);

  const birthdate = new Date(`${data.birthdate}T00:00:00Z`);
  const ageYears = ageFromBirthdate(birthdate);

  const targets = computeTargets({
    sex: data.sex,
    ageYears,
    heightCm: data.heightCm,
    weightKg: data.currentWeightKg,
    activityLevel: data.activityLevel,
    goal: data.primaryGoal,
    weeklyRateKg: data.weeklyRateKg,
    sportSessionsPerWeek: data.sport?.sessionsPerWeek ?? null,
  });

  const today = new Date();
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  await db.$transaction([
    prisma.profile.update({
      where: { id: userId },
      data: {
        name: data.name,
        sex: data.sex,
        birthdate,
        heightCm: data.heightCm,
        experienceLevel: data.experienceLevel,
        primaryGoal: data.primaryGoal,
        trainingPlace: data.trainingPlace,
        activityLevel: data.activityLevel,
        daysAvailable: data.daysAvailable,
        sessionMinutes: data.sessionMinutes,
        equipment: data.equipment,
        musclePriorities: data.musclePriorities,
        dislikedExercises: data.dislikedExercises,
        routineStyle: data.routineStyle,
        dietaryPrefs: data.dietaryPrefs,
        excludedFoods: data.excludedFoods,
        allergies: data.allergies,
        mealsPerDay: data.mealsPerDay,
        injuries: data.injuries || null,
        trainingExperienceNote: data.trainingExperienceNote || null,
        unitSystem: data.unitSystem,
        locale: data.locale,
        onboardingCompletedAt: new Date(),
      },
    }),
    db.goal.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'SUPERSEDED' } }),
    db.goal.create({
      data: {
        userId,
        type: data.primaryGoal,
        startWeightKg: data.currentWeightKg,
        targetWeightKg: data.targetWeightKg,
        weeklyRateKg: data.weeklyRateKg,
        status: 'ACTIVE',
      },
    }),
    db.weightEntry.deleteMany({ where: { date: todayDate } }),
    db.weightEntry.create({
      data: { userId, date: todayDate, weightKg: data.currentWeightKg },
    }),
    db.nutritionTarget.updateMany({ where: { active: true }, data: { active: false } }),
    db.nutritionTarget.create({
      data: {
        userId,
        effectiveFrom: todayDate,
        kcal: targets.kcal,
        proteinG: targets.proteinG,
        carbsG: targets.carbsG,
        fatG: targets.fatG,
        source: 'CALCULATED',
        active: true,
      },
    }),
  ]);

  // Deporte + competencia (opcionales, fuera de la transacción principal).
  if (data.sport) {
    const sport = await db.sportProfile.create({
      data: {
        userId,
        name: data.sport.name,
        level: data.sport.level ?? null,
        sessionsPerWeek: data.sport.sessionsPerWeek,
        sessionDays: data.sport.sessionDays,
        goal: data.sport.goal ?? null,
        isPrimary: true,
      },
      select: { id: true },
    });
    if (data.competition) {
      await db.competition.create({
        data: {
          userId,
          sportProfileId: sport.id,
          name: data.competition.name,
          date: new Date(`${data.competition.date}T00:00:00.000Z`),
          priority: data.competition.priority,
        },
      });
    }
  }

  // Objetivo "indeciso": el Coach recomienda uno concreto a partir de los datos
  // y las fotos (efímeras, no se guardan). Best-effort: no bloquea el onboarding.
  if (data.primaryGoal === 'UNDECIDED') {
    try {
      const { recommendGoalFromPhotos } = await import('@/server/ai/gateway');
      const profileFacts = [
        `Sexo: ${data.sex}`,
        `Edad: ${ageYears} años`,
        `Altura: ${data.heightCm} cm`,
        `Peso: ${data.currentWeightKg} kg`,
        `Experiencia: ${data.experienceLevel}`,
        `Actividad diaria: ${data.activityLevel}`,
        `Días de entrenamiento por semana: ${data.daysAvailable}`,
      ].join(' · ');

      const { advice } = await recommendGoalFromPhotos({
        userId,
        locale: data.locale,
        timezone: profile.timezone,
        profileFacts,
        photos: data.photos ?? [],
      });

      if (advice) {
        const note =
          `Recomendación del Coach: ${advice.recommendedGoal}. ${advice.reasoning}\n\n` +
          `A mejorar: ${advice.improvements}`;
        await db.goal.updateMany({ where: { status: 'ACTIVE' }, data: { note } });
      }
    } catch (e) {
      console.error('[onboarding] recomendación de objetivo falló', e instanceof Error ? e.message : e);
    }
    redirect('/settings/goals');
  }

  redirect('/dashboard');
}
