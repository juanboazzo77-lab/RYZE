import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getActiveTrainer, listTrainerClients } from '@/server/trainers';
import { AssistantChat } from '@/features/trainer/assistant-chat';
import { AIC } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Asistente', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TrainerAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const ctx = await requireUser();
  const trainer = await getActiveTrainer(ctx.userId);
  if (!trainer) redirect('/settings/trainer');

  const clients = await listTrainerClients(ctx.userId, ctx.profile.timezone);
  const { client } = await searchParams;
  const parsed = z.string().uuid().safeParse(client);
  // Sólo se acepta un cliente que sea del entrenador.
  const initial = parsed.success && clients.some((c) => c.clientId === parsed.data) ? parsed.data : null;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{AIC.title}</h1>
        <p className="text-sm text-muted-foreground">{AIC.subtitle}</p>
      </div>
      <AssistantChat clients={clients.map((c) => ({ id: c.clientId, name: c.name }))} initialClientId={initial} />
    </div>
  );
}

/** El asistente llama a la IA con el resumen de los clientes: necesita más que los 10 s por defecto. */
export const maxDuration = 60;
