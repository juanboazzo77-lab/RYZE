import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Dumbbell, LogOut } from 'lucide-react';
import { requireUser } from '@/server/context';
import { signOutAction } from '@/app/(auth)/actions';
import { GymNav } from '@/features/gym/gym-nav';
import { Button } from '@/components/ui/button';

/**
 * Panel del gimnasio: lo que ve el dueño. Es aparte de la app de socio (no pasa por su menú ni por su
 * cuestionario). Si la cuenta no es dueña de ningún gimnasio, vuelve a la app normal.
 */
export default async function GymLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  if (!ctx.ownedGym) redirect('/dashboard');

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ctx.ownedGym.name}</p>
            <p className="text-xs text-muted-foreground">Panel del gimnasio · Forza AI</p>
          </div>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>

      <GymNav />
      {children}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        {ctx.needsOnboarding ? (
          <Link href="/onboarding" className="underline hover:text-foreground">
            Completar mi perfil para usar Forza AI como socio
          </Link>
        ) : (
          <Link href="/api/mode?to=member" className="underline hover:text-foreground">
            Usar Forza AI como socio
          </Link>
        )}
        <span className="mx-2">·</span>
        <a href="mailto:gimnasios@forzaai.app" className="underline hover:text-foreground">
          Ayuda: gimnasios@forzaai.app
        </a>
      </footer>
    </div>
  );
}
