import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FORZA AI',
    short_name: 'FORZA AI',
    description: 'Alimentación, entrenamiento, progreso y un entrenador con IA.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-48.webp', sizes: '48x48', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-72.webp', sizes: '72x72', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-96.webp', sizes: '96x96', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-128.webp', sizes: '128x128', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'maskable' },
      { src: '/icons/icon-256.webp', sizes: '256x256', type: 'image/webp', purpose: 'any' },
      { src: '/icons/icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'maskable' },
    ],
  };
}
