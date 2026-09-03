'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Texto editable in situ: click para editar, Enter/blur para guardar. */
export function InlineText({
  value,
  onSave,
  className,
  inputClassName,
  placeholder,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        placeholder={placeholder}
        className={cn('h-8', inputClassName)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const v = draft.trim();
          if (v && v !== value) onSave(v);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn('rounded px-1 -mx-1 text-left hover:bg-secondary', className)}
    >
      {value}
    </button>
  );
}
