import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnline } from './platform/use-online';
import { useText } from './strings';

export function Screen({ children }: { children: ReactNode }) {
  const online = useOnline();
  const s = useText();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Forza AI</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${online ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'}`}
        >
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? s.withSignal : s.noSignal}
        </span>
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</section>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-w-0 rounded-lg border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary ${props.className ?? ''}`}
    />
  );
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }) {
  const look = variant === 'primary' ? 'bg-primary text-primary-foreground' : 'border';
  return <button type="button" {...props} className={`rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${look} ${className}`} />;
}
