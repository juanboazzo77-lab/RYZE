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

const W = 1080;
const H = 1350;

function drawCard(
  canvas: HTMLCanvasElement,
  { title, name, stats, site }: { title: string; name: string; stats: ReportStat[]; site: string },
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(1, '#0e2a1f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Halo verde de fondo
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 600);
  glow.addColorStop(0, 'rgba(34,197,94,0.28)');
  glow.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#22c55e';
  ctx.font = `800 44px ${font}`;
  ctx.fillText('FORZA AI', 80, 130);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 96px ${font}`;
  ctx.fillText(title, 80, 270);
  if (name) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 44px ${font}`;
    ctx.fillText(name, 80, 340);
  }

  // Cuadrícula de 2 columnas
  const cols = 2;
  const gap = 28;
  const cellW = (W - 160 - gap) / cols;
  const cellH = 250;
  const top = 420;
  stats.slice(0, 6).forEach((s, i) => {
    const x = 80 + (i % cols) * (cellW + gap);
    const y = top + Math.floor(i / cols) * (cellH + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    // roundRect llega con iOS/Safari 16: en versiones anteriores, esquinas rectas.
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, cellW, cellH, 32);
    else ctx.rect(x, y, cellW, cellH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    let size = 96;
    ctx.font = `800 ${size}px ${font}`;
    while (ctx.measureText(s.value).width > cellW - 60 && size > 44) {
      size -= 4;
      ctx.font = `800 ${size}px ${font}`;
    }
    ctx.fillText(s.value, x + 34, y + 130);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `500 34px ${font}`;
    ctx.fillText(s.label, x + 34, y + 192);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 36px ${font}`;
  ctx.fillText(site, 80, H - 80);
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
