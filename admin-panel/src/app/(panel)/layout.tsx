import { LogOut } from 'lucide-react';
import { requireAdminPage } from '@/lib/admin';
import { signOutAction } from '@/features/auth/actions';
import { AdminNav } from '@/features/admin/admin-nav';
import { Button } from '@/components/ui/button';

/** Todo el panel queda detrás del login: sin sesión de administrador se va a /login. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdminPage();
  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Forza AI · Gestión</p>
        <form action={signOutAction} className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <Button type="submit" variant="ghost" size="icon" aria-label="Salir">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
