/**
 * Avisa al servidor que una pantalla falló (se ve en /admin/errores). No tira nunca: si el aviso falla,
 * no pasa nada. Lo usan los límites de error de Next.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  try {
    const body = JSON.stringify({
      message: String(error.message || error.name || 'Error').slice(0, 1000),
      stack: error.stack?.slice(0, 4000),
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      digest: error.digest,
    });
    void fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* nada */
  }
}
