'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Sin i18n ni Tailwind a propósito: puede renderizarse si el layout raíz
// (que carga los providers y estilos) es lo que falló.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Algo salió mal / Something went wrong
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid #ccc',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          Reintentar / Retry
        </button>
      </body>
    </html>
  );
}
