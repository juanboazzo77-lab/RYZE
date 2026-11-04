import 'server-only';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { forUser } from './user-db';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { listCoachMemories, type CoachMemoryItem } from '@/features/coach-memory/queries';
import { pathsOf, purgeClientCheckinPhotos, signedPhotoUrls } from './storage/checkin-photos';
import { TRIAL_DAYS } from './entitlements';
import {
  asTrainerStatus,
  attentionLevel,
  generateInviteCode,
  latestISO,
  normalizeInviteCode,
  weightChangeKg,
  type Attention,
  type TrainerStatus,
} from '@/features/trainer/logic';

/**
 * Modo entrenador (piloto). Son datos de DOS personas, así que no pasan por `forUser` sin más:
 * un entrenador sólo ve a un cliente si existe un vínculo ACTIVO con su consentimiento, y esa
 * comprobación se hace acá, en cada función, con el id que viene de la sesión (nunca con una lista
 * que mande el navegador). El entrenador es de sólo lectura: no modifica nada del cliente.
 */

/** Tope de clientes por entrenador durante el piloto. */
export const MAX_CLIENTS_PER_TRAINER = 50;

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

export interface TrainerProfileView {
  userId: string;
  displayName: string;
  bio: string | null;
  credential: string | null;
  status: TrainerStatus;
  inviteCode: string;
}

function toView(p: {
  userId: string;
  displayName: string;
  bio: string | null;
  credential: string | null;
  status: string;
  inviteCode: string;
}): TrainerProfileView {
  return { ...p, status: asTrainerStatus(p.status) };
}

export async function getTrainerProfile(userId: string): Promise<TrainerProfileView | null> {
  const p = await prisma.trainerProfile.findUnique({ where: { userId } });
  return p ? toView(p) : null;
}

/** El entrenador sólo puede usar el panel si el perfil está aprobado. */
export async function getActiveTrainer(userId: string): Promise<TrainerProfileView | null> {
  const p = await getTrainerProfile(userId);
  return p && p.status === 'ACTIVE' ? p : null;
}

/** Pide acceso como entrenador. Queda PENDIENTE hasta que se apruebe a mano. */
export async function createTrainerProfile(
  userId: string,
  input: { displayName: string; bio: string | null; credential: string | null },
): Promise<TrainerProfileView> {
  const existing = await getTrainerProfile(userId);
  if (existing) return existing;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const created = await prisma.trainerProfile.create({
        data: { userId, ...input, status: 'PENDING', inviteCode: generateInviteCode() },
      });
      return toView(created);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Otro request lo creó entre medio, o el código ya existía: se vuelve a mirar y a intentar.
      const again = await getTrainerProfile(userId);
      if (again) return again;
    }
  }
  throw new Error('[trainers] no se pudo generar un código de invitación único');
}

/**
 * Elige "soy entrenador" al crear la cuenta: la cuenta pasa a ser de entrenador (sin el cuestionario
 * de cliente) y queda pendiente de aprobación. Las cuentas son separadas: una cuenta de cliente que
 * ya completó su alta no se puede convertir.
 */
export async function becomeTrainerAccount(
  userId: string,
  input: { displayName: string; bio: string | null; credential: string | null },
): Promise<{ ok: true } | { error: 'ALREADY_CLIENT' | 'NOT_FOUND' }> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { accountType: true, onboardingCompletedAt: true, name: true },
  });
  if (!profile) return { error: 'NOT_FOUND' };
  if (profile.accountType !== 'TRAINER' && profile.onboardingCompletedAt) return { error: 'ALREADY_CLIENT' };

  await prisma.profile.update({
    where: { id: userId },
    data: {
      accountType: 'TRAINER',
      // Sin cuestionario de cliente: el alta queda completa.
      onboardingCompletedAt: profile.onboardingCompletedAt ?? new Date(),
      name: profile.name ?? input.displayName,
    },
  });
  await createTrainerProfile(userId, input);
  return { ok: true };
}

/**
 * El entrenador deja de serlo y su cuenta vuelve a ser de cliente. Se terminan todos sus vínculos
 * (cada cliente deja de estar "manejado" y se borran las fotos de sus revisiones), se borran su perfil
 * de entrenador, sus notas y su chat con clientes, y se le vuelve a pedir el cuestionario de cliente
 * que se había salteado. Las rutinas y dietas que armó siguen en la cuenta de cada cliente.
 *
 * Si la cuenta YA tenía su panel de cliente (usó la app como cliente antes de ser entrenador), vuelve a
 * ese panel con todos sus datos y NO se le vuelve a pedir el cuestionario.
 */
export async function cancelTrainerAccount(
  userId: string,
): Promise<{ ok: true; needsOnboarding: boolean } | { error: 'NOT_TRAINER' }> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { accountType: true, primaryGoal: true, heightCm: true, onboardingCompletedAt: true },
  });
  if (profile?.accountType !== 'TRAINER') return { error: 'NOT_TRAINER' };
  // Tiene panel de cliente si ya cargó sus datos (objetivo o altura): no hay nada que volver a preguntar.
  const hadClientPanel = profile.primaryGoal !== null || profile.heightCm !== null;

  const links = await prisma.trainerClient.findMany({
    where: { trainerId: userId, status: 'ACTIVE' },
    select: { clientId: true },
  });
  for (const l of links) await endClientLink({ clientId: l.clientId, trainerId: userId, by: 'TRAINER' });

  // Borra el perfil y, en cascada, los vínculos, los mensajes, las notas y los intentos bloqueados.
  await prisma.trainerProfile.deleteMany({ where: { userId } });
  await prisma.profile.update({
    where: { id: userId },
    data: {
      accountType: 'CLIENT',
      // Con panel de cliente previo se conserva la marca de cuestionario completo; si nunca lo hizo, lo hace ahora.
      onboardingCompletedAt: hadClientPanel ? (profile.onboardingCompletedAt ?? new Date()) : null,
    },
  });
  return { ok: true, needsOnboarding: !hadClientPanel };
}

/** El entrenador cambia su código (por ejemplo, si se lo pasó a alguien que no corresponde). */
export async function regenerateInviteCode(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode();
    try {
      const res = await prisma.trainerProfile.updateMany({ where: { userId }, data: { inviteCode: code } });
      return res.count > 0 ? code : null;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  return null;
}

export interface ClientLinkView {
  id: string;
  trainerId: string;
  trainerName: string;
  consentAt: string;
  /** El cliente dejó que el entrenador cree y edite su rutina y su dieta. */
  canEdit: boolean;
  /** El entrenador pidió ese permiso y el cliente todavía no respondió. */
  editRequested: boolean;
}

/** El entrenador que tiene hoy el cliente, si lo tiene. */
export async function getClientLink(clientId: string): Promise<ClientLinkView | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { clientId, status: 'ACTIVE' },
    select: {
      id: true,
      trainerId: true,
      consentAt: true,
      editConsentAt: true,
      editRequestedAt: true,
      trainer: { select: { displayName: true } },
    },
  });
  return link
    ? {
        id: link.id,
        trainerId: link.trainerId,
        trainerName: link.trainer.displayName,
        consentAt: link.consentAt.toISOString(),
        canEdit: !!link.editConsentAt,
        editRequested: !link.editConsentAt && !!link.editRequestedAt,
      }
    : null;
}

/**
 * ¿Este cliente está "manejado" por un entrenador? (vínculo activo con el entrenador aprobado). Un cliente
 * manejado no paga ningún plan y no puede usar la IA: de eso se encarga su entrenador.
 */
export async function isManagedClient(clientId: string): Promise<boolean> {
  const link = await prisma.trainerClient.findFirst({
    where: { clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true },
  });
  return !!link;
}

/** Quién es el entrenador de un código (para mostrárselo al cliente antes de que acepte). */
export async function previewInviteCode(rawCode: string): Promise<{ displayName: string; credential: string | null } | null> {
  const code = normalizeInviteCode(rawCode);
  if (!code) return null;
  const t = await prisma.trainerProfile.findUnique({
    where: { inviteCode: code },
    select: { displayName: true, credential: true, status: true },
  });
  return t && t.status === 'ACTIVE' ? { displayName: t.displayName, credential: t.credential } : null;
}

export type RedeemError = 'INVALID_CODE' | 'SELF' | 'ALREADY_LINKED' | 'TRAINER_FULL' | 'TRAINER_ACCOUNT';

/** El cliente acepta compartir sus datos con el entrenador del código. El consentimiento queda registrado. */
export async function redeemInviteCode(clientId: string, rawCode: string): Promise<{ ok: true } | { error: RedeemError }> {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { error: 'INVALID_CODE' };
  const trainer = await prisma.trainerProfile.findUnique({ where: { inviteCode: code } });
  if (!trainer || trainer.status !== 'ACTIVE') return { error: 'INVALID_CODE' };
  if (trainer.userId === clientId) return { error: 'SELF' };
  // Las cuentas de entrenador son aparte: no se conectan a otro entrenador como clientes.
  const me = await prisma.profile.findUnique({ where: { id: clientId }, select: { accountType: true } });
  if (me?.accountType === 'TRAINER') return { error: 'TRAINER_ACCOUNT' };

  const active = await prisma.trainerClient.findFirst({ where: { clientId, status: 'ACTIVE' }, select: { id: true } });
  if (active) return { error: 'ALREADY_LINKED' };
  const count = await prisma.trainerClient.count({ where: { trainerId: trainer.userId, status: 'ACTIVE' } });
  if (count >= MAX_CLIENTS_PER_TRAINER) return { error: 'TRAINER_FULL' };

  const now = new Date();
  try {
    await prisma.trainerClient.upsert({
      where: { trainerId_clientId: { trainerId: trainer.userId, clientId } },
      // Al conectarse, el cliente acepta que el entrenador vea sus datos Y arme su rutina y su dieta
      // (el texto del consentimiento lo dice). Puede quitar el permiso de edición cuando quiera.
      create: { trainerId: trainer.userId, clientId, status: 'ACTIVE', consentAt: now, editConsentAt: now },
      update: {
        status: 'ACTIVE',
        consentAt: now,
        editConsentAt: now,
        editRequestedAt: null,
        endedAt: null,
        endedBy: null,
      },
    });
  } catch (e) {
    // Dos pedidos a la vez: el índice único deja un solo entrenador activo por cliente.
    if (isUniqueViolation(e)) return { error: 'ALREADY_LINKED' };
    throw e;
  }
  return { ok: true };
}

/**
 * ¿Puede este entrenador crear y editar la rutina y la dieta de este cliente? Sólo con un vínculo
 * activo, el entrenador aprobado y el permiso de edición que dio el cliente.
 */
export async function trainerEditAccess(trainerId: string, clientId: string): Promise<boolean> {
  if (trainerId === clientId) return false;
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', editConsentAt: { not: null }, trainer: { status: 'ACTIVE' } },
    select: { id: true },
  });
  return !!link;
}

/** El entrenador pide permiso para editar (el cliente lo ve en Ajustes y decide). */
export async function requestEditPermission(trainerId: string, clientId: string): Promise<boolean> {
  const res = await prisma.trainerClient.updateMany({
    where: { trainerId, clientId, status: 'ACTIVE', editConsentAt: null, trainer: { status: 'ACTIVE' } },
    data: { editRequestedAt: new Date() },
  });
  return res.count > 0;
}

/** El cliente acepta o rechaza el pedido de permiso de edición. */
export async function respondEditPermission(clientId: string, allow: boolean): Promise<boolean> {
  const res = await prisma.trainerClient.updateMany({
    where: { clientId, status: 'ACTIVE', editConsentAt: null },
    data: allow ? { editConsentAt: new Date(), editRequestedAt: null } : { editRequestedAt: null },
  });
  return res.count > 0;
}

/** El cliente le saca el permiso de edición al entrenador (sigue pudiendo ver sus datos). */
export async function revokeEditPermission(clientId: string): Promise<boolean> {
  const res = await prisma.trainerClient.updateMany({
    where: { clientId, status: 'ACTIVE' },
    data: { editConsentAt: null, editRequestedAt: null },
  });
  return res.count > 0;
}

/**
 * Un cliente que deja de estar manejado por un entrenador (se desconectó, lo dio de baja el entrenador o
 * se suspendió al entrenador) tiene 3 días gratis desde ese momento y después paga como cualquiera. Se
 * da una sola vez por cuenta, y sólo a quien no tiene un plan pago.
 */
async function grantTrialAfterTrainer(clientId: string): Promise<void> {
  const ent = await prisma.entitlement.findUnique({
    where: { userId: clientId },
    select: { tier: true, bonusUntil: true, managedTrialGrantedAt: true },
  });
  if (!ent || ent.tier !== 'FREE' || ent.managedTrialGrantedAt) return;
  const until = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.entitlement.updateMany({
    where: { userId: clientId, managedTrialGrantedAt: null },
    data: {
      // No se le achica un regalo mayor que ya tuviera (por ejemplo, por invitar).
      bonusUntil: ent.bonusUntil && ent.bonusUntil > until ? ent.bonusUntil : until,
      managedTrialGrantedAt: new Date(),
    },
  });
}

/** Termina el vínculo: el entrenador deja de ver al cliente en el mismo momento. */
export async function endClientLink(args: { clientId: string; trainerId?: string; by: 'CLIENT' | 'TRAINER' | 'ADMIN' }): Promise<number> {
  const res = await prisma.trainerClient.updateMany({
    where: { clientId: args.clientId, status: 'ACTIVE', ...(args.trainerId ? { trainerId: args.trainerId } : {}) },
    data: { status: 'ENDED', endedAt: new Date(), endedBy: args.by },
  });
  // Las fotos de las revisiones eran para su entrenador: se borran al dejar de compartir.
  if (res.count > 0) {
    await grantTrialAfterTrainer(args.clientId).catch((e) =>
      console.error('[trainers] no se pudieron dar los días gratis', e instanceof Error ? e.message : e),
    );
    await purgeClientCheckinPhotos(args.clientId).catch((e) =>
      console.error('[trainers] no se pudieron borrar las fotos', e instanceof Error ? e.message : e),
    );
  }
  return res.count;
}

/** Los ids de los clientes con vínculo activo: la única puerta para saber a quién puede ver un entrenador. */
async function activeClientIds(trainerId: string): Promise<string[]> {
  const links = await prisma.trainerClient.findMany({
    where: { trainerId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { clientId: true },
    orderBy: { createdAt: 'asc' },
    take: MAX_CLIENTS_PER_TRAINER,
  });
  return links.map((l) => l.clientId);
}

export interface TrainerClientRow {
  clientId: string;
  name: string;
  goal: string | null;
  lastActivityISO: string | null;
  lastWorkoutISO: string | null;
  weightKg: number | null;
  weightChange30Kg: number | null;
  attention: Attention;
  /** El cliente mandó su revisión semanal y el entrenador todavía no le dio feedback. */
  pendingReview: boolean;
}

/** Lista de clientes del entrenador con lo justo para ver quién necesita atención. */
export async function listTrainerClients(trainerId: string, timezone: string): Promise<TrainerClientRow[]> {
  const ids = await activeClientIds(trainerId);
  if (ids.length === 0) return [];
  const todayISO = localTodayISO(timezone);
  const since = isoToUtcDate(addDaysISO(todayISO, -30));

  // Secuencial: el pool de conexiones es chico.
  const profiles = await prisma.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, primaryGoal: true },
  });
  const workouts = await prisma.workout.groupBy({
    by: ['userId'],
    where: { userId: { in: ids }, status: 'COMPLETED' },
    _max: { finishedAt: true },
  });
  const food = await prisma.foodEntry.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _max: { date: true } });
  const pending = await prisma.weeklyCheckin.findMany({
    where: { userId: { in: ids }, status: 'SUBMITTED' },
    select: { userId: true },
    distinct: ['userId'],
  });
  const weights = await prisma.weightEntry.findMany({
    where: { userId: { in: ids }, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { userId: true, date: true, weightKg: true },
  });

  const rows = ids.map((id): TrainerClientRow => {
    const p = profiles.find((x) => x.id === id);
    const w = workouts.find((x) => x.userId === id)?._max.finishedAt ?? null;
    const f = food.find((x) => x.userId === id)?._max.date ?? null;
    const mine = weights.filter((x) => x.userId === id).map((x) => ({ date: isoOf(x.date), weightKg: x.weightKg }));
    const lastWorkoutISO = w ? (DateTime.fromJSDate(w, { zone: 'utc' }).setZone(timezone).toISODate() ?? null) : null;
    const lastActivityISO = latestISO([lastWorkoutISO, f ? isoOf(f) : null, mine.at(-1)?.date]);
    return {
      clientId: id,
      name: p?.name?.trim() || 'Cliente',
      goal: p?.primaryGoal ?? null,
      lastActivityISO,
      lastWorkoutISO,
      weightKg: mine.at(-1)?.weightKg ?? null,
      weightChange30Kg: weightChangeKg(mine),
      attention: attentionLevel(lastActivityISO, todayISO),
      pendingReview: pending.some((p) => p.userId === id),
    };
  });

  // Primero los que más atención necesitan.
  const order: Record<Attention, number> = { INACTIVE: 0, LATE: 1, NEW: 2, OK: 3 };
  return rows.sort(
    (a, b) =>
      Number(b.pendingReview) - Number(a.pendingReview) ||
      order[a.attention] - order[b.attention] ||
      a.name.localeCompare(b.name),
  );
}

export interface ClientDetail {
  name: string;
  basics: {
    goal: string | null;
    sex: string | null;
    ageYears: number | null;
    heightCm: number | null;
    experience: string | null;
    daysAvailable: number | null;
    sessionMinutes: number | null;
    injuries: string | null;
  };
  goal: { type: string; startWeightKg: number | null; targetWeightKg: number | null; weeklyRateKg: number | null } | null;
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  weights: Array<{ date: string; weightKg: number }>;
  workouts: Array<{ name: string; finishedAt: string; minutes: number | null; effort: number | null }>;
  nutritionDays: Array<{ date: string; kcal: number; proteinG: number }>;
  plan: { name: string; days: Array<{ name: string; exercises: Array<{ name: string; sets: number; reps: string }> }> } | null;
  checkins: Array<{
    id: string;
    weekStart: string;
    periodStart: string | null;
    periodEnd: string | null;
    status: string;
    summary: string | null;
    stats: {
      avgWeightKg: number | null;
      weightChangeKg: number | null;
      kcalAdherencePct: number | null;
      proteinAdherencePct: number | null;
      workoutsCompleted: number;
      workoutsPlanned: number;
    };
    /** Cómo se sintió, de 1 a 5. */
    scores: Array<{ label: string; value: number }>;
    adherenceNote: string | null;
    notes: string | null;
    /** Enlaces (vencen en una hora) a las fotos que subió el cliente en esa revisión. */
    photoUrls: string[];
  }>;
  /** El cliente dejó que el entrenador cree y edite su rutina y su dieta. */
  canEdit: boolean;
  editRequested: boolean;
  memories: CoachMemoryItem[];
  attention: Attention;
  lastActivityISO: string | null;
}

/**
 * Ficha de un cliente. Si el entrenador no tiene un vínculo activo con ese cliente devuelve null,
 * aunque el id exista: no se distingue "no existe" de "no es tuyo".
 */
export async function getClientDetail(trainerId: string, clientId: string, timezone: string): Promise<ClientDetail | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true, editConsentAt: true, editRequestedAt: true },
  });
  if (!link) return null;

  const db = forUser(clientId);
  const todayISO = localTodayISO(timezone);
  const since60 = isoToUtcDate(addDaysISO(todayISO, -60));
  const since7 = isoToUtcDate(addDaysISO(todayISO, -6));

  // Secuencial: el pool de conexiones es chico.
  const profile = await prisma.profile.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      sex: true,
      birthdate: true,
      heightCm: true,
      primaryGoal: true,
      experienceLevel: true,
      daysAvailable: true,
      sessionMinutes: true,
      injuries: true,
    },
  });
  if (!profile) return null;
  const goal = await db.goal.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  const target = await db.nutritionTarget.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  const weights = await db.weightEntry.findMany({
    where: { date: { gte: since60 } },
    orderBy: { date: 'asc' },
    select: { date: true, weightKg: true },
  });
  const workouts = await db.workout.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { finishedAt: 'desc' },
    take: 10,
    select: { name: true, finishedAt: true, durationSeconds: true, perceivedEffort: true },
  });
  const food = await db.foodEntry.findMany({
    where: { date: { gte: since7 } },
    select: { date: true, kcal: true, proteinG: true },
  });
  const lastFood = await db.foodEntry.aggregate({ _max: { date: true } });
  const plan = await db.workoutPlan.findFirst({
    where: { isActive: true },
    select: {
      name: true,
      days: {
        orderBy: { orderIndex: 'asc' },
        select: {
          name: true,
          exercises: {
            orderBy: { orderIndex: 'asc' },
            select: { targetSets: true, targetRepsMin: true, targetRepsMax: true, exercise: { select: { name: true } } },
          },
        },
      },
    },
  });
  const checkins = await db.weeklyCheckin.findMany({
    orderBy: { weekStart: 'desc' },
    take: 4,
    select: {
      id: true,
      weekStart: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      aiSummary: true,
      avgWeightKg: true,
      weightChangeKg: true,
      kcalAdherencePct: true,
      proteinAdherencePct: true,
      workoutsCompleted: true,
      workoutsPlanned: true,
      hunger: true,
      energy: true,
      sleep: true,
      trainingFeel: true,
      dietAdherence: true,
      stress: true,
      outsideActivity: true,
      adherenceNote: true,
      notes: true,
      photoPaths: true,
    },
  });
  // Fotos: enlaces firmados que vencen (sólo las ve el entrenador con vínculo activo).
  const photoUrlsById = new Map<string, string[]>();
  for (const c of checkins) {
    photoUrlsById.set(c.id, await signedPhotoUrls(pathsOf(c.photoPaths)));
  }
  const memories = await listCoachMemories(clientId);

  const byDay = new Map<string, { kcal: number; proteinG: number }>();
  for (const e of food) {
    const k = isoOf(e.date);
    const cur = byDay.get(k) ?? { kcal: 0, proteinG: 0 };
    byDay.set(k, { kcal: cur.kcal + e.kcal, proteinG: cur.proteinG + e.proteinG });
  }
  const weightList = weights.map((w) => ({ date: isoOf(w.date), weightKg: w.weightKg }));
  const lastWorkoutISO = workouts[0]?.finishedAt
    ? (DateTime.fromJSDate(workouts[0].finishedAt, { zone: 'utc' }).setZone(timezone).toISODate() ?? null)
    : null;
  const lastActivityISO = latestISO([lastWorkoutISO, lastFood._max.date ? isoOf(lastFood._max.date) : null, weightList.at(-1)?.date]);
  const ageYears = profile.birthdate ? Math.floor(DateTime.now().diff(DateTime.fromJSDate(profile.birthdate), 'years').years) : null;

  return {
    name: profile.name?.trim() || 'Cliente',
    basics: {
      goal: profile.primaryGoal ?? null,
      sex: profile.sex ?? null,
      ageYears,
      heightCm: profile.heightCm ?? null,
      experience: profile.experienceLevel ?? null,
      daysAvailable: profile.daysAvailable ?? null,
      sessionMinutes: profile.sessionMinutes ?? null,
      injuries: profile.injuries ?? null,
    },
    goal: goal
      ? { type: goal.type, startWeightKg: goal.startWeightKg, targetWeightKg: goal.targetWeightKg, weeklyRateKg: goal.weeklyRateKg }
      : null,
    target: target ? { kcal: target.kcal, proteinG: target.proteinG, carbsG: target.carbsG, fatG: target.fatG } : null,
    weights: weightList,
    workouts: workouts.map((w) => ({
      name: w.name,
      finishedAt: (w.finishedAt ?? new Date()).toISOString(),
      minutes: w.durationSeconds ? Math.round(w.durationSeconds / 60) : null,
      effort: w.perceivedEffort ?? null,
    })),
    nutritionDays: [...byDay.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, v]) => ({ date, kcal: Math.round(v.kcal), proteinG: Math.round(v.proteinG) })),
    plan: plan
      ? {
          name: plan.name,
          days: plan.days.map((d) => ({
            name: d.name,
            exercises: d.exercises.map((e) => ({
              name: e.exercise.name,
              sets: e.targetSets,
              reps:
                e.targetRepsMin != null && e.targetRepsMax != null
                  ? e.targetRepsMin === e.targetRepsMax
                    ? String(e.targetRepsMin)
                    : `${e.targetRepsMin}-${e.targetRepsMax}`
                  : '—',
            })),
          })),
        }
      : null,
    checkins: checkins.map((c) => ({
      id: c.id,
      weekStart: isoOf(c.weekStart),
      periodStart: c.periodStart ? isoOf(c.periodStart) : null,
      periodEnd: c.periodEnd ? isoOf(c.periodEnd) : null,
      status: c.status,
      summary: c.aiSummary ?? null,
      stats: {
        avgWeightKg: c.avgWeightKg,
        weightChangeKg: c.weightChangeKg,
        kcalAdherencePct: c.kcalAdherencePct,
        proteinAdherencePct: c.proteinAdherencePct,
        workoutsCompleted: c.workoutsCompleted,
        workoutsPlanned: c.workoutsPlanned,
      },
      scores: (
        [
          ['Hambre', c.hunger],
          ['Energía', c.energy],
          ['Sueño', c.sleep],
          ['Sensación de entrenamiento', c.trainingFeel],
          ['Adherencia a la dieta', c.dietAdherence],
          ['Estrés', c.stress],
          ['Actividad fuera del gym', c.outsideActivity],
        ] as Array<[string, number | null]>
      )
        .filter((x): x is [string, number] => x[1] != null)
        .map(([label, value]) => ({ label, value })),
      adherenceNote: c.adherenceNote,
      notes: c.notes,
      photoUrls: photoUrlsById.get(c.id) ?? [],
    })),
    canEdit: !!link.editConsentAt,
    editRequested: !link.editConsentAt && !!link.editRequestedAt,
    memories,
    attention: attentionLevel(lastActivityISO, todayISO),
    lastActivityISO,
  };
}

/* ------------------------------------------------------------------ */
/* Administración (sólo ADMIN_EMAILS; se controla en la pantalla)      */
/* ------------------------------------------------------------------ */

export interface AdminTrainerRow extends TrainerProfileView {
  email: string;
  clients: number;
  createdAt: string;
}

export async function listTrainersForAdmin(): Promise<AdminTrainerRow[]> {
  const rows = await prisma.trainerProfile.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      displayName: true,
      bio: true,
      credential: true,
      status: true,
      inviteCode: true,
      createdAt: true,
      user: { select: { email: true } },
      _count: { select: { clients: { where: { status: 'ACTIVE' } } } },
    },
  });
  return rows.map((r) => ({
    ...toView(r),
    email: r.user.email,
    clients: r._count.clients,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function setTrainerStatus(userId: string, status: TrainerStatus): Promise<boolean> {
  // Un entrenador que no está ACTIVO deja de ver a sus clientes de inmediato (activeClientIds y
  // getClientDetail lo exigen), y si se lo vuelve a activar recupera sus vínculos.
  const wasActive = (await prisma.trainerProfile.findUnique({ where: { userId }, select: { status: true } }))?.status === 'ACTIVE';
  const res = await prisma.trainerProfile.updateMany({ where: { userId }, data: { status } });
  // Al dejar de estar activo, sus clientes dejan de estar manejados: tienen sus 3 días gratis.
  if (res.count > 0 && wasActive && status !== 'ACTIVE') {
    const links = await prisma.trainerClient.findMany({ where: { trainerId: userId, status: 'ACTIVE' }, select: { clientId: true } });
    for (const l of links) await grantTrialAfterTrainer(l.clientId).catch(() => {});
  }
  return res.count > 0;
}
