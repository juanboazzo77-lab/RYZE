'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';

export interface ReportStat {
  value: string;
  label: string;
}

// Formato vertical (9:16): entra bien como historia de Instagram / estado de WhatsApp.
const W = 1080;
const H = 1920;
const ACCENTS = ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa', '#fb7185'];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  // roundRect llega con iOS/Safari 16: en versiones anteriores, esquinas rectas.
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawCard(
  canvas: HTMLCanvasElement,
  { title, name, stats, site }: { title: string; name: string; stats: ReportStat[]; site: string },
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, '#0a1020');
  bg.addColorStop(0.55, '#0b1c2c');
  bg.addColorStop(1, '#0d2c20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = (cx: number, cy: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.9, H * 0.08, 700, 'rgba(34,197,94,0.30)');
  glow(W * 0.05, H * 0.7, 650, 'rgba(56,189,248,0.14)');
  glow(W * 0.8, H * 0.95, 600, 'rgba(34,197,94,0.18)');

  // Puntitos de fondo
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 40; y < H; y += 60) {
    for (let x = 40; x < W; x += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Logo: cuadrado verde con una mancuerna
  roundedRect(ctx, 80, 84, 76, 76, 20);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.fillStyle = '#06210f';
  roundedRect(ctx, 94, 112, 48, 10, 5);
  ctx.fill();
  roundedRect(ctx, 96, 100, 10, 34, 4);
  ctx.fill();
  roundedRect(ctx, 130, 100, 10, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 48px ${font}`;
  ctx.fillText('FORZA AI', 176, 140);

  // Título
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 124px ${font}`;
  let titleSize = 124;
  while (ctx.measureText(title).width > W - 160 && titleSize > 64) {
    titleSize -= 6;
    ctx.font = `800 ${titleSize}px ${font}`;
  }
  ctx.fillText(title, 80, 340);
  ctx.fillStyle = '#22c55e';
  roundedRect(ctx, 80, 372, 150, 10, 5);
  ctx.fill();
  if (name) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 48px ${font}`;
    ctx.fillText(name, 80, 450);
  }

  const [hero, ...rest] = stats;
  if (!hero) return;

  // Dato destacado
  const hx = 80;
  const hy = 520;
  const hw = W - 160;
  const hh = 400;
  const hg = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
  hg.addColorStop(0, 'rgba(34,197,94,0.30)');
  hg.addColorStop(1, 'rgba(34,197,94,0.06)');
  ctx.fillStyle = hg;
  roundedRect(ctx, hx, hy, hw, hh, 48);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,197,94,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Anillos decorativos a la derecha
  ctx.save();
  ctx.beginPath();
  roundedRect(ctx, hx, hy, hw, hh, 48);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(hx + hw - 40, hy + hh / 2, 90 + i * 55, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(34,197,94,${0.35 - i * 0.07})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  ctx.restore();

  let heroSize = 230;
  ctx.font = `900 ${heroSize}px ${font}`;
  while (ctx.measureText(hero.value).width > hw - 380 && heroSize > 90) {
    heroSize -= 6;
    ctx.font = `900 ${heroSize}px ${font}`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hero.value, hx + 56, hy + 250);
  ctx.fillStyle = '#86efac';
  ctx.font = `600 48px ${font}`;
  ctx.fillText(hero.label, hx + 60, hy + 330);

  // Resto de datos, en dos columnas con un acento de color cada uno
  const cols = 2;
  const gap = 28;
  const cellW = (W - 160 - gap) / cols;
  const cellH = 250;
  const top = hy + hh + 56;
  rest.slice(0, 6).forEach((s, i) => {
    const isLastOdd = i === rest.length - 1 && rest.length % 2 === 1;
    const col = isLastOdd ? 0 : i % cols;
    const x = 80 + col * (cellW + gap);
    const w = isLastOdd ? W - 160 : cellW;
    const y = top + Math.floor(i / cols) * (cellH + gap);
    const accent = ACCENTS[(i + 1) % ACCENTS.length]!;

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundedRect(ctx, x, y, w, cellH, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    roundedRect(ctx, x + 28, y + 40, 10, cellH - 80, 5);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    let size = 100;
    ctx.font = `800 ${size}px ${font}`;
    while (ctx.measureText(s.value).width > w - 110 && size > 44) {
      size -= 4;
      ctx.font = `800 ${size}px ${font}`;
    }
    ctx.fillText(s.value, x + 64, y + 136);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 36px ${font}`;
    ctx.fillText(s.label, x + 64, y + 202);
  });

  // Pie
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 38px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText(site, W / 2, H - 70);
  ctx.textAlign = 'left';
}

/** Arma la imagen del resumen mensual y la deja compartir o guardar. Todo ocurre en el dispositivo. */
export function ReportShare({
  title,
  name,
  stats,
  shareText,
}: {
  title: string;
  name: string;
  stats: ReportStat[];
  shareText: string;
}) {
  const t = useT();
  const r = t.report;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    drawCard(canvas, { title, name, stats, site: 'forzaai.app' });
    setUrl(canvas.toDataURL('image/png'));
  }, [title, name, stats]);

  async function toFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    return blob ? new File([blob], `forza-${title.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' }) : null;
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
      <img src={url} alt={title} className="mx-auto w-full max-w-sm rounded-2xl border shadow-sm" />
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        <Button onClick={() => void share()}>
          <Share2 />
          {r.share}
        </Button>
        <Button variant="outline" onClick={() => void download()}>
          <Download />
          {r.download}
        </Button>
      </div>
      <p className="mx-auto max-w-sm text-center text-xs text-muted-foreground">{r.saveHint}</p>
    </div>
  );
}
