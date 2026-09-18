'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/server/supabase/client';
import { useT } from '@/i18n/provider';
import { Button } from '@/components/ui/button';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.48-1.13 2.74-2.4 3.58v2.98h3.87c2.27-2.09 3.58-5.17 3.58-8.75Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-2.98c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.24v3.07C3.2 21.3 7.26 24 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.31A7.16 7.16 0 0 1 4.9 12c0-.8.14-1.58.37-2.31V6.62H1.24A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.24 5.38l4.03-3.07Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.26 0 3.2 2.7 1.24 6.62l4.03 3.07C6.22 6.84 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.06 1.68-3.04 1.76-3.09-.96-1.4-2.45-1.6-2.98-1.62-1.36-.14-2.65.79-3.34.79-.71 0-1.79-.77-2.94-.75-1.51.02-2.9.88-3.67 2.23-1.57 2.72-.4 6.75 1.11 8.96.74 1.08 1.62 2.29 2.78 2.24 1.11-.04 1.53-.72 2.87-.72 1.34 0 1.72.72 2.9.7 1.2-.02 1.96-1.09 2.7-2.18a9.86 9.86 0 0 0 1.19-2.45c-.03-.01-2.32-.89-2.38-3.11Zm-3.1-9.86c.6-.73.99-1.74.88-2.75-.85.03-1.88.57-2.5 1.29-.55.64-1.02 1.67-.89 2.65.96.08 1.94-.49 2.5-1.19Z" />
    </svg>
  );
}

export function SocialAuthButtons({ next = '/dashboard' }: { next?: string }) {
  const t = useT();
  const ta = t.auth;
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  async function signInWith(provider: 'google' | 'apple') {
    setLoading(provider);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    // Si no hay error, el navegador ya está siendo redirigido al proveedor;
    // si lo hay, liberamos los botones para que pueda reintentar.
    if (error) setLoading(null);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading !== null}
          onClick={() => signInWith('google')}
        >
          <GoogleIcon />
          {loading === 'google' ? ta.connecting : ta.continueWithGoogle}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading !== null}
          onClick={() => signInWith('apple')}
        >
          <AppleIcon />
          {loading === 'apple' ? ta.connecting : ta.continueWithApple}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {ta.orContinueWith}
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
