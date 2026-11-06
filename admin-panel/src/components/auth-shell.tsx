import { BrandMark } from './brand';

/** Marco de las pantallas públicas (ingresar, pedir autorización, elegir contraseña): logo, título y una tarjeta. */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--accent),transparent)] px-4 py-10 sm:justify-center">
      <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <p className="mt-3 text-lg font-bold tracking-tight">Forza AI</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Necesitás ayuda?{' '}
          <a className="underline hover:text-foreground" href="mailto:soporte@forzaai.app">
            soporte@forzaai.app
          </a>
        </p>
      </div>
    </div>
  );
}
