import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { getOwnerCtx } from '@/lib/owner';
import { signOutAction } from '@/features/auth/actions';
import { GymNav } from '@/features/owner/gym-nav';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand';
import { hasAcceptedTerms } from '@/server/gym-terms';
import { TermsGate } from '@/features/legal/terms-gate';

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

  // Hasta que no acepte la versión vigente de los términos, no ve el panel.
  if (!(await hasAcceptedTerms(ctx.gym.id))) return <TermsGate gymName={ctx.gym.name} />;

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-4 px-4 pb-24 pt-4 lg:space-y-6 lg:px-8 lg:py-6">
      <header className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size={36} />
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

      <div className="space-y-4 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0 print:block">
        <div className="print:hidden lg:sticky lg:top-6">
          <GymNav />
        </div>
        <div className="min-w-0 space-y-4">
          {children}

          <footer className="border-t pt-4 text-center text-xs text-muted-foreground print:hidden">
            <a href="mailto:gimnasios@forzaai.app" className="underline hover:text-foreground">
              Ayuda: gimnasios@forzaai.app
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}
