'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Deja sólo dígitos y un separador decimal (coma o punto). */
export function sanitizeDecimal(raw: string, maxDecimals: number): string {
  let out = '';
  let sep = false;
  let decimals = 0;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (sep) {
        if (decimals >= maxDecimals) continue;
        decimals++;
      }
      out += ch;
    } else if ((ch === ',' || ch === '.') && !sep) {
      sep = true;
      out += ch;
    }
  }
  return out;
}

export function parseDecimal(text: string): number | null {
  if (text.trim() === '') return null;
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const fmt = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '' : String(v);

type Props = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode' | 'defaultValue'
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
  maxDecimals?: number;
};

/**
 * Número decimal para celular: teclado decimal y acepta coma o punto. Un
 * `type="number"` en iOS con teclado en español no deja escribir la coma.
 * Mantiene el texto tal cual se escribe ("1," no se pierde) y sólo se
 * resincroniza con `value` si cambia desde afuera y el campo no está en foco.
 */
export function DecimalInput({ value, onValueChange, maxDecimals = 2, onFocus, onBlur, ...rest }: Props) {
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    if (parseDecimal(text) !== value) setText(fmt(value));
    // sólo cuando cambia el valor externo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(fmt(parseDecimal(text)));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const clean = sanitizeDecimal(e.target.value, maxDecimals);
        setText(clean);
        onValueChange(parseDecimal(clean));
      }}
    />
  );
}
