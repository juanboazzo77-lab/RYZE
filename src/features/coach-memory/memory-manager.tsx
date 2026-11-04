'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { addCoachMemory, clearCoachMemories, deleteCoachMemory } from './actions';
import { MAX_MEMORIES, MAX_MEMORY_LEN, MEMORY_CATEGORIES, type MemoryCategory } from './schema';
import type { CoachMemoryItem } from './queries';

export function MemoryManager({ initial }: { initial: CoachMemoryItem[] }) {
  const t = useT();
  const tm = t.coach.memory;
  const [items, setItems] = useState(initial);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('OTHER');
  const [pending, start] = useTransition();

  const full = items.length >= MAX_MEMORIES;

  function add() {
    const value = text.trim();
    if (value.length < 3 || full) return;
    start(async () => {
      const res = await addCoachMemory({ text: value, category });
      if (res.ok) {
        // Se muestra al toque; el servidor lo vuelve a traer en la próxima visita.
        setItems((list) => [
          ...list,
          { id: `local-${Date.now()}`, category, content: value, source: 'USER', createdAt: new Date().toISOString() },
        ]);
        setText('');
        toast.success(tm.saved);
        return;
      }
      toast.error(
        res.error === 'FULL'
          ? interpolate(tm.full, { max: MAX_MEMORIES })
          : res.error === 'DUPLICATE'
            ? tm.duplicate
            : t.coach.error,
      );
    });
  }

  function remove(item: CoachMemoryItem) {
    // Los recién agregados todavía no tienen su id real: se borran al recargar la pantalla.
    if (item.id.startsWith('local-')) {
      setItems((list) => list.filter((x) => x.id !== item.id));
      return;
    }
    start(async () => {
      const res = await deleteCoachMemory({ id: item.id });
      if (res.ok) {
        setItems((list) => list.filter((x) => x.id !== item.id));
        toast.success(tm.removed);
      } else toast.error(t.coach.error);
    });
  }

  function clearAll() {
    if (!confirm(tm.clearConfirm)) return;
    start(async () => {
      const res = await clearCoachMemories();
      if (res.ok) {
        setItems([]);
        toast.success(tm.removed);
      } else toast.error(t.coach.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-2xl border bg-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder={tm.addPlaceholder}
            maxLength={MAX_MEMORY_LEN}
            disabled={pending || full}
            className="flex-1"
          />
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            className="h-10 sm:w-48"
            aria-label={tm.categoryLabel}
          >
            {MEMORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tm.categories[c]}
              </option>
            ))}
          </NativeSelect>
          <Button onClick={add} disabled={pending || full || text.trim().length < 3}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {tm.add}
          </Button>
        </div>
        {full ? <p className="text-xs text-warning">{interpolate(tm.full, { max: MAX_MEMORIES })}</p> : null}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tm.empty}</p>
      ) : (
        <div className="space-y-4">
          {MEMORY_CATEGORIES.map((c) => {
            const rows = items.filter((i) => i.category === c);
            if (rows.length === 0) return null;
            return (
              <section key={c} className="space-y-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tm.categories[c]}
                </h2>
                <ul className="divide-y rounded-xl border bg-card">
                  {rows.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                      <span className="min-w-0">
                        <span className="block break-words">{item.content}</span>
                        {item.source === 'CHAT' ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">{tm.learnedFromChat}</span>
                        ) : null}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => remove(item)}
                        disabled={pending}
                        aria-label={tm.delete}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={pending} className="text-destructive">
            <Trash2 className="size-4" />
            {tm.clear}
          </Button>
        </div>
      )}
    </div>
  );
}
