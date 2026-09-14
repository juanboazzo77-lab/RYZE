import { z } from 'zod';

/** Análisis de físico por foto (IA). Fotos efímeras: nunca se guardan. */
export const physiqueAnalysisSchema = z.object({
  /** Rango aproximado de % graso, ej. "18-22%". Estimación visual, no medición. */
  bodyFatEstimate: z.string().min(2).max(60),
  /** 2-4 puntos débiles a mejorar (grupos rezagados, postura), en prosa breve. */
  weakPoints: z.string().min(5).max(500),
});
export type PhysiqueAnalysis = z.infer<typeof physiqueAnalysisSchema>;

export const analyzePhysiqueSchema = z.object({
  photos: z.array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)).min(1).max(4),
});
