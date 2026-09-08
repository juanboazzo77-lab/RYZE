'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useT } from '@/i18n/provider';

/** Barra fija que aparece cuando el dispositivo pierde la conexión. */
export function OfflineIndicator() {
  const t = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-center text-xs font-medium text-white">
      <WifiOff className="size-3.5" />
      {t.common.offline}
    </div>
  );
}
