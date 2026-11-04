'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Lo único que ve una cuenta de entrenador: su panel, los ajustes, el admin y las páginas legales. */
const ALLOWED = ['/trainer', '/settings', '/admin', '/privacy', '/terms', '/support'];

/** Si una cuenta de entrenador cae en una pantalla de cliente, la manda a su panel. */
export function TrainerRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) router.replace('/trainer');
  }, [pathname, router]);
  return null;
}
