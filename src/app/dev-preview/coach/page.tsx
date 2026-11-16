import { notFound } from 'next/navigation';
import { CoachChat } from '@/features/coach/chat';
import { COACH_TOPICS, isCoachTopic, type CoachTopic } from '@/features/coach/topics';
import type { CoachMessage } from '@/features/coach/queries';
import type { CoachHistoryItem } from '@/features/coach/topics';

/**
 * Cómo se ve el chat con el coach, con datos de ejemplo: SÓLO en desarrollo (sirve para revisar la pantalla sin una
 * cuenta real). En producción no existe (404).
 */

const day = (daysAgo: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const THREADS: Record<CoachTopic, CoachMessage[]> = {
  training: [
    { id: 't1', role: 'user', content: '¿Cómo puedo progresar en press banca?', createdAt: day(3, 19, 10) },
    { id: 't2', role: 'assistant', content: 'Probá sumar 1–2 repeticiones por serie cada semana. Cuando llegues a 12 en todas las series, subí 2,5 kg y volvé a 8.', createdAt: day(3, 19, 11) },
    { id: 't3', role: 'user', content: 'Quiero cambiar sentadilla por prensa', createdAt: day(1, 8, 30) },
    { id: 't4', role: 'assistant', content: 'Listo, la prensa 45° trabaja cuádriceps y glúteos con menos carga en la espalda. Probá 4 x 10.', createdAt: day(1, 8, 31) },
    { id: 't5', role: 'user', content: '¿Cuánto descanso entre series?', createdAt: day(0, 9, 5) },
    { id: 't6', role: 'assistant', content: 'En ejercicios pesados, 2 a 3 minutos; en accesorios, 60 a 90 segundos.', createdAt: day(0, 9, 6) },
  ],
  nutrition: [
    { id: 'n1', role: 'user', content: '¿Qué puedo comer hoy para llegar a mis proteínas?', createdAt: day(1, 13, 0) },
    { id: 'n2', role: 'assistant', content: 'Sumá 2 huevos al desayuno, una porción de pollo o atún al almuerzo y yogur griego a la tarde.', createdAt: day(1, 13, 1) },
  ],
  progress: [],
  health: [],
  general: [],
};

const HISTORY: CoachHistoryItem[] = [
  { id: 'h1', topic: 'health', title: 'Me duele la rodilla cuando bajo escaleras', updatedAt: day(2, 20, 0), messageCount: 8 },
  { id: 'h2', topic: 'nutrition', title: 'Qué puedo cenar liviano después de entrenar', updatedAt: day(6, 21, 30), messageCount: 4 },
  { id: 'h3', topic: 'training', title: 'Cómo organizar mi semana si trabajo de noche y duermo poco…', updatedAt: day(20, 18, 0), messageCount: 12 },
  { id: 'h4', topic: 'general', title: '', updatedAt: day(400, 10, 0), messageCount: 1 },
];

export default async function DevCoachPreview({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { t } = await searchParams;
  const topic = isCoachTopic(t) ? t : undefined;
  void COACH_TOPICS;
  return (
    <div className="min-h-screen bg-background px-4 pt-6 text-foreground" style={{ width: 390 }}>
      <style>{'nextjs-portal { display: none !important; }'}</style>
      <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
      <p className="pb-3 text-sm text-muted-foreground">Tu entrenador y guía de nutrición. Responde con tus datos reales.</p>
      <CoachChat initialThreads={THREADS} initialHistory={HISTORY} usage={{ used: 2, limit: 5 }} autoApply={false} initialTopic={topic} />
    </div>
  );
}
