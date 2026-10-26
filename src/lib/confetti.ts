/**
 * Confeti de celebración (récord personal, entrenamiento terminado): un canvas a pantalla
 * completa que se borra solo. Sin dependencias. No hace nada si el sistema pide menos movimiento.
 */
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#eab308'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
}

export function fireConfetti(count = 90): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch {
    // seguir
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '100',
  });
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const pieces: Piece[] = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.35,
    y: h * 0.38,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 11 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
  }));

  const start = performance.now();
  const DURATION = 2000;
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, w, h);
    const fade = t > DURATION - 500 ? Math.max(0, (DURATION - t) / 500) : 1;
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx!.save();
      ctx!.globalAlpha = fade;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
