/**
 * Reemplaza `{clave}` en `template` por `vars.clave`. Vive en su propio
 * archivo (sin importar los diccionarios) para que los ~15 componentes
 * cliente que sólo necesitan esta función no arrastren los 6 idiomas al
 * bundle del navegador — ver `./index.ts`.
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
