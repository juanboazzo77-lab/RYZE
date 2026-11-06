import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';

/** La pantalla donde la persona acepta la invitación de su gimnasio: hace falta haber iniciado sesión. */
export default async function InviteLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  return (
    <div className="min-h-screen w-full px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] sm:pt-[calc(3rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
