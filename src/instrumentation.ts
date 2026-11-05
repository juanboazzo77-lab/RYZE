export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (
  ...args: Parameters<
    typeof import('@sentry/nextjs').captureRequestError
  >
) => {
  const { captureRequestError } = await import('@sentry/nextjs');
  captureRequestError(...args);

  // Además de Sentry, se guarda en nuestra base para verlo y trabajarlo en /admin/errores.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const [err, request, context] = args;
      const e = err as { message?: string; stack?: string; digest?: string };
      const { recordError } = await import('./server/app-errors');
      await recordError({
        source: 'server',
        message: e?.message ?? String(err),
        stack: e?.stack,
        digest: e?.digest,
        path: request?.path ? `${request.method ?? ''} ${request.path.split('?')[0]}`.trim() : (context?.routePath ?? null),
        userAgent: typeof request?.headers?.['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      });
    } catch {
      /* registrar el error nunca debe romper la respuesta */
    }
  }
};
