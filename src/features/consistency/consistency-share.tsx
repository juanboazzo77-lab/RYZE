'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import type { YearGridView } from './view';

// Formato vertical (9:16): entra bien como historia de Instagram / estado de WhatsApp.
const W = 1080;
const H = 1920;
const GREEN = '#22c55e';
const MAX_YEARS = 4;

export interface ShareLabels {
  title: string;
  streak: string; // "Racha de 12 días"
  trained: string; // "{n} días entrenados" (n = días del año)
  rest: string;
  training: string;
}

function drawCard(
  canvas: HTMLCanvasElement,
  { name, streak, years, monthNames, labels }: { name: string; streak: number; years: YearGridView[]; monthNames: string[]; labels: ShareLabels },
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, '#0a1020');
  bg.addColorStop(0.55, '#0b1c2c');
  bg.addColorStop(1, '#0d2c20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.9, H * 0.06, 0, W * 0.9, H * 0.06, 700);
  glow.addColorStop(0, 'rgba(34,197,94,0.28)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const MX = 60;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GREEN;
  ctx.font = `700 40px ${font}`;
  ctx.fillText('FORZA AI', MX, 130);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 84px ${font}`;
  ctx.fillText(labels.title, MX, 250);
  if (name) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 46px ${font}`;
    ctx.fillText(name, MX, 318);
  }

  // Racha
  ctx.font = `700 130px ${font}`;
  ctx.fillStyle = '#ffffff';
  const flame = '🔥';
  ctx.fillText(flame, MX, 500);
  const flameW = ctx.measureText(flame + ' ').width;
  ctx.fillText(String(streak), MX + flameW, 500);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 44px ${font}`;
  ctx.fillText(labels.streak, MX, 565);

  // Un bloque por año
  const shown = years.slice(0, MAX_YEARS);
  let y = 650;
  for (const g of shown) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 54px ${font}`;
    ctx.fillText(String(g.year), MX, y + 40);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 34px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(labels.trained.replace('{n}', String(g.trainedDays)), W - MX, y + 38);
    ctx.textAlign = 'left';

    const gridW = W - MX * 2;
    const step = gridW / g.cols;
    const r = step * 0.36;
    const top = y + 100;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `500 22px ${font}`;
    for (const m of g.months) ctx.fillText(monthNames[m.month - 1] ?? '', MX + m.col * step, top - 12);
    for (const c of g.cells) {
      ctx.fillStyle =
        c.state === 'trained' ? GREEN : c.state === 'rest' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(MX + c.col * step + step / 2, top + c.row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    y = top + 7 * step + 60;
  }

  // Leyenda
  const ly = Math.min(y + 30, H - 190);
  ctx.font = `500 32px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(MX + 14, ly - 11, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(labels.rest, MX + 42, ly);
  const restW = ctx.measureText(labels.rest).width;
  const gx = MX + 42 + restW + 50;
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(gx + 14, ly - 11, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(labels.training, gx + 42, ly);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 38px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('forzaai.app', W / 2, H - 90);
  ctx.textAlign = 'left';
}

export function ConsistencyShare({
  name,
  streak,
  years,
  monthNames,
  labels,
  shareText,
  canDownload = true,
}: {
  name: string;
  streak: number;
  years: YearGridView[];
  monthNames: string[];
  labels: ShareLabels;
  shareText: string;
  /** En la app no hay descargas: la imagen se guarda desde el menú de compartir. */
  canDownload?: boolean;
}) {
  const t = useT();
  const r = t.report;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    drawCard(canvas, { name, streak, years, monthNames, labels });
    setUrl(canvas.toDataURL('image/png'));
  }, [name, streak, years, monthNames, labels]);

  async function toFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    return blob ? new File([blob], 'forza-constancia.png', { type: 'image/png' }) : null;
  }

  async function share() {
    try {
      const file = await toFile();
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
    toast.message(r.saveHint);
  }

  async function download() {
    const file = await toFile();
    if (!file) return;
    const href = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = href;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    toast.message(r.saveHint);
  }

  if (!url) return null;
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={labels.title} className="mx-auto w-full max-w-xs rounded-2xl border shadow-sm" />
      <div className={canDownload ? 'mx-auto grid max-w-xs grid-cols-2 gap-2' : 'mx-auto grid max-w-xs gap-2'}>
        <Button onClick={() => void share()}>
          <Share2 />
          {r.share}
        </Button>
        {canDownload ? (
          <Button variant="outline" onClick={() => void download()}>
            <Download />
            {r.download}
          </Button>
        ) : null}
      </div>
      <p className="mx-auto max-w-xs text-center text-xs text-muted-foreground">{r.saveHint}</p>
    </div>
  );
}
