import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitAI',
    short_name: 'FitAI',
    description: 'Alimentación, entrenamiento, progreso y un entrenador con IA.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
