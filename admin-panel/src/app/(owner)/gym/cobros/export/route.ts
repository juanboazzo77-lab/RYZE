import { getSessionUser } from '@/lib/owner';
import { getOwnedGym } from '@/server/owner';
import { pathAllowed } from '@/features/gym/staff';
import { exportPayments, paymentsCsv } from '@/server/gym-finance';

export const dynamic = 'force-dynamic';

/** Baja los pagos del último año en un archivo que abre Excel. Solo para la dueña del gimnasio. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const gym = await getOwnedGym(user.userId);
  if (!gym || !pathAllowed(gym.role, '/gym/cobros/export')) return new Response('No autorizado', { status: 403 });
  const payments = await exportPayments(gym.ownerUserId, gym.id);
  if (!payments) return new Response('No autorizado', { status: 403 });
  return new Response(paymentsCsv(payments), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cobros-forza-ai.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
