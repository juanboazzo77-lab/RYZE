import { useState, type FormEvent } from 'react';
import { parseDecimal, type AppData } from '@/lib/sync/data';
import { localTodayISO } from '@/lib/date';
import { displayWeight, inputWeightToKg, weightUnitLabel } from '@/lib/units';
import { Button, Card, Input } from '../ui';

const SHOWN_WEIGHTS = 10;

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

export function Weight({ data, pendingDates, onSave }: { data: AppData; pendingDates: Set<string>; onSave: (date: string, weightKg: number) => Promise<void> }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const system = data.profile.unitSystem;
  const unit = weightUnitLabel(system);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseDecimal(text);
    const kg = value === null ? null : Math.round(inputWeightToKg(value, system) * 100) / 100;
    if (kg === null || kg < 20 || kg > 500) {
      setError('Escribí un peso válido.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave(localTodayISO(data.profile.timezone), kg);
      setText('');
    } catch {
      setError('No se pudo guardar en el teléfono. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="peso" className="text-sm font-semibold">Tu peso de hoy ({unit})</label>
        <div className="flex gap-2">
          <Input id="peso" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} placeholder={unit === 'kg' ? '78,4' : '172,8'} className="flex-1" />
          <Button type="submit" disabled={busy || !text.trim()}>Guardar</Button>
        </div>
        {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
      </form>
      {data.weights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no cargaste ningún peso.</p>
      ) : (
        <ul className="divide-y">
          {data.weights.slice(0, SHOWN_WEIGHTS).map((w) => (
            <li key={w.date} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-muted-foreground">{shortDate(w.date)}</span>
              <span className="flex items-center gap-2 font-semibold tabular-nums">
                {pendingDates.has(w.date) ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">sin subir</span> : null}
                {displayWeight(w.weightKg, system).value.toLocaleString('es-AR')} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
