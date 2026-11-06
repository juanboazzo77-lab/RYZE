import { getSessionUser } from '@/lib/owner';
import { getOwnedGym } from '@/server/owner';
import { exportPayments, paymentsCsv } from '@/server/gym-finance';

export const dynamic = 'force-dynamic';

/** Baja los pagos del último año en un archivo que abre Excel. Solo para la dueña del gimnasio. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const gym = await getOwnedGym(user.userId);
  if (!gym) return new Response('No autorizado', { status: 403 });
  const payments = await exportPayments(user.userId, gym.id);
  if (!payments) return new Response('No autorizado', { status: 403 });
  return new Response(paymentsCsv(payments), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cobros-forza-ai.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
