import { z } from 'zod';

/** String con largo máximo: si el modelo se pasa, se recorta en vez de descartar todo. */
const str = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .catch((ctx) => (typeof ctx.input === 'string' ? ctx.input.trim().slice(0, max) : ''));

/** Análisis de físico por foto (IA). Fotos efímeras: nunca se guardan. */
export const physiqueAnalysisSchema = z.object({
  /** Rango aproximado de % graso, ej. "18-22%". Estimación visual, no medición. */
  bodyFatEstimate: str(2, 60),
  /** 2-4 puntos débiles a mejorar (grupos rezagados, postura), en prosa breve. */
  weakPoints: str(5, 500),
});
export type PhysiqueAnalysis = z.infer<typeof physiqueAnalysisSchema>;

export const analyzePhysiqueSchema = z.object({
  photos: z.array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)).min(1).max(4),
});
