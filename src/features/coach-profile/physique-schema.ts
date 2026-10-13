import { z } from 'zod';

/**
 * Informe de análisis de físico por foto (IA). Fotos efímeras: nunca se guardan,
 * sólo este informe. El modelo a veces se pasa de un límite o se saltea un campo:
 * todo es tolerante (recorta/rellena) para no perder un análisis entero por eso.
 */

/** String con largo máximo: recorta si se pasa y queda '' si falta. */
const str = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .catch((ctx) => (typeof ctx.input === 'string' ? ctx.input.trim().slice(0, max) : ''));

export const MUSCLE_LEVELS = ['rezagado', 'equilibrado', 'destacado'] as const;
export const CONFIDENCE_LEVELS = ['baja', 'media', 'alta'] as const;
export const RECOMMENDATION_AREAS = ['entrenamiento', 'nutricion', 'habitos'] as const;

/**
 * Lista tolerante: los elementos inválidos se descartan en vez de tirar abajo toda
 * la lista. Con `preprocess` el JSON Schema que se le manda al modelo conserva la
 * forma de cada elemento.
 */
const lenientList = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => item.safeParse(x).success).slice(0, max) : []),
    z.array(item).max(max),
  );

const muscleItem = z.object({
  /** Grupo muscular visible en la foto (pecho, espalda, hombros, brazos, abdomen, piernas…). */
  group: str(0, 30),
  level: z.enum(MUSCLE_LEVELS).catch('equilibrado'),
  note: str(0, 140),
});

const recommendationItem = z.object({
  area: z.enum(RECOMMENDATION_AREAS).catch('entrenamiento'),
  text: str(0, 240),
});

export const physiqueAnalysisSchema = z.object({
  /** Rango aproximado de % graso, ej. "18-22%". Estimación visual, no medición. */
  bodyFatEstimate: str(0, 60),
  bodyFatConfidence: z.enum(CONFIDENCE_LEVELS).catch('media'),
  /** Lectura general en 2-3 frases. */
  summary: str(0, 340),
  muscleBalance: lenientList(muscleItem, 8).transform((xs) => xs.filter((x) => x.group.length > 0)),
  /** Postura y simetría (descriptivo, sin diagnosticar). */
  posture: str(0, 320),
  strengths: lenientList(str(0, 130), 4).transform((xs) => xs.filter((x) => x.length > 0)),
  /** 2-4 puntos a mejorar, en prosa breve. */
  weakPoints: str(0, 520),
  recommendations: lenientList(recommendationItem, 5).transform((xs) => xs.filter((x) => x.text.length > 0)),
  /** Cómo sacar mejores fotos la próxima vez (o por qué esta no alcanzó). */
  photoTips: str(0, 260),
});
export type PhysiqueAnalysis = z.infer<typeof physiqueAnalysisSchema>;

/** ¿El informe tiene algo útil que mostrar? */
export function hasUsefulContent(a: PhysiqueAnalysis): boolean {
  return Boolean(
    a.bodyFatEstimate || a.summary || a.weakPoints.length >= 5 || a.recommendations.length > 0 || a.photoTips,
  );
}

export const analyzePhysiqueSchema = z.object({
  photos: z.array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)).min(1).max(4),
});
