import { notFound } from 'next/navigation';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { AdminNav } from '@/features/admin/admin-nav';

/** Centro de gestión: todo lo de /admin queda detrás de ADMIN_EMAILS, con un menú común. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  // Sin ADMIN_EMAILS definido, o con otro mail, las páginas directamente no existen.
  if (!isAdmin(ctx.email)) notFound();
  return (
    <div className="space-y-4">
      <AdminNav />
      {children}
    </div>
  );
}
