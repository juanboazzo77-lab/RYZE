import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // La revisión semanal puede mandar fotos de físico (ya reducidas en el
    // cliente). Nunca se persisten; sólo van al modelo para el análisis.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
