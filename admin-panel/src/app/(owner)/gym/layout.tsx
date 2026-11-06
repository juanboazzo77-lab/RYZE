import Link from 'next/link';
import { Dumbbell, LogOut } from 'lucide-react';
import { getOwnerCtx } from '@/lib/owner';
import { signOutAction } from '@/features/auth/actions';
import { GymNav } from '@/features/owner/gym-nav';
import { Button } from '@/components/ui/button';

/**
 * Panel del gimnasio: lo que ve el dueño. Vive en el mismo sitio que la gestión, pero cada uno ve solo lo suyo:
 * el dueño, su gimnasio; la gestión, solo el administrador.
 */
export default async function GymLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOwnerCtx();

  if (!ctx.gym) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="text-xl font-bold tracking-tight">Esta cuenta no tiene un gimnasio</h1>
        <p className="text-sm text-muted-foreground">
          Entraste con {ctx.email}. Si tu gimnasio ya está anotado en Forza AI, entrá con el mail con el que te dimos acceso. Si no, escribinos a gimnasios@forzaai.app.
        </p>
        {ctx.isAdmin ? (
          <Link href="/" className="text-sm font-medium underline">
            Ir a Gestión
          </Link>
        ) : null}
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Salir
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ctx.gym.name}</p>
            <p className="text-xs text-muted-foreground">Panel del gimnasio · Forza AI</p>
          </div>
        </div>
        <form action={signOutAction} className="flex items-center gap-2">
          {ctx.isAdmin ? (
            <Link href="/" className="text-xs underline">
              Gestión
            </Link>
          ) : null}
          <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>

      <GymNav />
      {children}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        <a href="mailto:gimnasios@forzaai.app" className="underline hover:text-foreground">
          Ayuda: gimnasios@forzaai.app
        </a>
      </footer>
    </div>
  );
}
