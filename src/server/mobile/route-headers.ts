import { corsHeaders } from './http';

/** Encabezados de las rutas de la app: permiso sólo para la app instalada y nada en caché. */
export const mobileHeaders = (request: Request): Record<string, string> => ({
  ...corsHeaders(request.headers.get('origin'), process.env.NODE_ENV === 'production'),
  'Cache-Control': 'no-store',
});
