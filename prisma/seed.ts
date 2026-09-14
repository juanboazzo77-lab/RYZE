/**
 * FitAI — Seed base (datos independientes de cualquier usuario):
 *   - Catálogo de logros
 *   - Biblioteca inicial de ejercicios
 *   - Biblioteca inicial de alimentos (valores por 100 g/ml)
 *
 * Idempotente. Las bibliotecas sólo se cargan si la tabla está vacía; los
 * logros se hacen upsert por `key`.
 *
 *   pnpm db:seed
 */
import { PrismaClient, type MuscleGroup } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS: Array<{
  key: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  threshold?: number;
}> = [
  { key: 'first_workout', category: 'training', title: 'Primer entrenamiento', description: 'Completaste tu primer entrenamiento.', icon: '🏋️', threshold: 1 },
  { key: 'workouts_10', category: 'training', title: '10 entrenamientos', description: 'Llegaste a 10 entrenamientos completados.', icon: '🔥', threshold: 10 },
  { key: 'workouts_30', category: 'training', title: '30 entrenamientos', description: 'Llegaste a 30 entrenamientos completados.', icon: '💪', threshold: 30 },
  { key: 'first_pr', category: 'training', title: 'Primer récord personal', description: 'Registraste tu primer PR.', icon: '🏆', threshold: 1 },
  { key: 'streak_7', category: 'consistency', title: 'Racha de 7 días', description: '7 días seguidos registrando actividad.', icon: '⚡', threshold: 7 },
  { key: 'streak_30', category: 'consistency', title: 'Racha de 30 días', description: '30 días seguidos registrando actividad.', icon: '🌟', threshold: 30 },
  { key: 'weight_log_30', category: 'progress', title: '30 días de peso', description: 'Registraste tu peso durante 30 días.', icon: '⚖️', threshold: 30 },
  { key: 'first_meal_logged', category: 'nutrition', title: 'Primera comida', description: 'Registraste tu primera comida.', icon: '🍽️', threshold: 1 },
  { key: 'protein_goal_7', category: 'nutrition', title: 'Semana proteica', description: '7 días cumpliendo tu objetivo de proteína.', icon: '🥩', threshold: 7 },
  { key: 'first_ai_plan', category: 'coach', title: 'Plan con IA', description: 'Generaste tu primer plan con el AI Coach.', icon: '🤖', threshold: 1 },
];

const EXERCISES: Array<{ name: string; primaryMuscle: MuscleGroup; equipment: string }> = [
  { name: 'Press de banca', primaryMuscle: 'CHEST', equipment: 'Barra' },
  { name: 'Press inclinado con mancuernas', primaryMuscle: 'CHEST', equipment: 'Mancuernas' },
  { name: 'Aperturas en polea', primaryMuscle: 'CHEST', equipment: 'Polea' },
  { name: 'Dominadas', primaryMuscle: 'BACK', equipment: 'Peso corporal' },
  { name: 'Remo con barra', primaryMuscle: 'BACK', equipment: 'Barra' },
  { name: 'Jalón al pecho', primaryMuscle: 'BACK', equipment: 'Polea' },
  { name: 'Remo en polea baja', primaryMuscle: 'BACK', equipment: 'Polea' },
  { name: 'Press militar', primaryMuscle: 'SHOULDERS', equipment: 'Barra' },
  { name: 'Elevaciones laterales', primaryMuscle: 'SHOULDERS', equipment: 'Mancuernas' },
  { name: 'Curl de bíceps con barra', primaryMuscle: 'BICEPS', equipment: 'Barra' },
  { name: 'Curl martillo', primaryMuscle: 'BICEPS', equipment: 'Mancuernas' },
  { name: 'Extensión de tríceps en polea', primaryMuscle: 'TRICEPS', equipment: 'Polea' },
  { name: 'Fondos en paralelas', primaryMuscle: 'TRICEPS', equipment: 'Peso corporal' },
  { name: 'Sentadilla', primaryMuscle: 'QUADS', equipment: 'Barra' },
  { name: 'Prensa de piernas', primaryMuscle: 'QUADS', equipment: 'Máquina' },
  { name: 'Extensión de cuádriceps', primaryMuscle: 'QUADS', equipment: 'Máquina' },
  { name: 'Peso muerto rumano', primaryMuscle: 'HAMSTRINGS', equipment: 'Barra' },
  { name: 'Curl femoral', primaryMuscle: 'HAMSTRINGS', equipment: 'Máquina' },
  { name: 'Hip thrust', primaryMuscle: 'GLUTES', equipment: 'Barra' },
  { name: 'Elevación de talones', primaryMuscle: 'CALVES', equipment: 'Máquina' },
  { name: 'Plancha', primaryMuscle: 'ABS', equipment: 'Peso corporal' },
  { name: 'Crunch en polea', primaryMuscle: 'ABS', equipment: 'Polea' },
  { name: 'Peso muerto convencional', primaryMuscle: 'BACK', equipment: 'Barra' },
];

// Valores aproximados por 100 g (crudo salvo aclaración). Fuente: tablas
// nutricionales de referencia. Marcados como no verificados.
type FoodSeed = {
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  verified?: boolean;
  servingQty?: number;
  servingUnit?: string;
  servingLabel?: string;
};

const FOODS: FoodSeed[] = [
  { name: 'Pechuga de pollo (cocida)', kcal: 165, p: 31, c: 0, f: 3.6 },
  { name: 'Huevo entero', kcal: 143, p: 12.6, c: 0.7, f: 9.5, servingQty: 50, servingUnit: 'g', servingLabel: '1 unidad' },
  { name: 'Arroz blanco (cocido)', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { name: 'Avena', kcal: 389, p: 16.9, c: 66, f: 6.9 },
  { name: 'Banana', kcal: 89, p: 1.1, c: 23, f: 0.3, servingQty: 120, servingUnit: 'g', servingLabel: '1 unidad' },
  { name: 'Manzana', kcal: 52, p: 0.3, c: 14, f: 0.2, servingQty: 150, servingUnit: 'g', servingLabel: '1 unidad' },
  { name: 'Yogur natural descremado', kcal: 56, p: 5.7, c: 7.7, f: 0.2 },
  { name: 'Leche descremada', kcal: 34, p: 3.4, c: 5, f: 0.1 },
  { name: 'Atún al natural (escurrido)', kcal: 116, p: 26, c: 0, f: 1 },
  { name: 'Lomo de cerdo (cocido)', kcal: 143, p: 26, c: 0, f: 3.5 },
  { name: 'Carne magra de vaca (cocida)', kcal: 187, p: 30, c: 0, f: 7 },
  { name: 'Lentejas (cocidas)', kcal: 116, p: 9, c: 20, f: 0.4 },
  { name: 'Pan integral', kcal: 247, p: 13, c: 41, f: 3.4, servingQty: 30, servingUnit: 'g', servingLabel: '1 rebanada' },
  { name: 'Palta', kcal: 160, p: 2, c: 9, f: 15 },
  { name: 'Aceite de oliva', kcal: 884, p: 0, c: 0, f: 100, servingQty: 10, servingUnit: 'ml', servingLabel: '1 cda' },
  { name: 'Almendras', kcal: 579, p: 21, c: 22, f: 50 },
  { name: 'Papa (cocida)', kcal: 87, p: 1.9, c: 20, f: 0.1 },
  { name: 'Batata (cocida)', kcal: 90, p: 2, c: 21, f: 0.2 },
  { name: 'Queso port salut light', kcal: 245, p: 24, c: 2, f: 16 },
  { name: 'Proteína de suero (polvo)', kcal: 400, p: 80, c: 8, f: 6, servingQty: 30, servingUnit: 'g', servingLabel: '1 scoop' },
];

/**
 * Verduras y hortalizas. Valores por 100 g de porción comestible, crudas salvo
 * que se aclare "(cocida/o)". Fuente: tablas nutricionales de referencia
 * (USDA / composición de alimentos). Marcadas como verificadas.
 */
const VEGETABLES: FoodSeed[] = [
  // Hojas / ensalada
  { name: 'Lechuga', kcal: 15, p: 1.4, c: 2.9, f: 0.2, verified: true },
  { name: 'Rúcula', kcal: 25, p: 2.6, c: 3.7, f: 0.7, verified: true },
  { name: 'Espinaca (cruda)', kcal: 23, p: 2.9, c: 3.6, f: 0.4, verified: true },
  { name: 'Espinaca (cocida)', kcal: 23, p: 3, c: 3.8, f: 0.3, verified: true },
  { name: 'Acelga (cruda)', kcal: 19, p: 1.8, c: 3.7, f: 0.2, verified: true },
  { name: 'Acelga (cocida)', kcal: 20, p: 1.9, c: 4.1, f: 0.1, verified: true },
  { name: 'Berro', kcal: 11, p: 2.3, c: 1.3, f: 0.1, verified: true },
  { name: 'Radicheta', kcal: 23, p: 1.7, c: 4.7, f: 0.3, verified: true },
  { name: 'Kale', kcal: 49, p: 4.3, c: 8.8, f: 0.9, verified: true },
  { name: 'Repollo blanco', kcal: 25, p: 1.3, c: 5.8, f: 0.1, verified: true },
  { name: 'Repollo colorado', kcal: 31, p: 1.4, c: 7.4, f: 0.2, verified: true },
  { name: 'Endivia', kcal: 17, p: 1.3, c: 3.4, f: 0.2, verified: true },
  { name: 'Pak choi', kcal: 13, p: 1.5, c: 2.2, f: 0.2, verified: true },
  // Crucíferas
  { name: 'Brócoli (crudo)', kcal: 34, p: 2.8, c: 6.6, f: 0.4, verified: true },
  { name: 'Brócoli (cocido)', kcal: 35, p: 2.4, c: 7.2, f: 0.4, verified: true },
  { name: 'Coliflor (cruda)', kcal: 25, p: 1.9, c: 5, f: 0.3, verified: true },
  { name: 'Coliflor (cocida)', kcal: 23, p: 1.8, c: 4.1, f: 0.5, verified: true },
  { name: 'Repollitos de Bruselas (cocidos)', kcal: 36, p: 2.6, c: 7.1, f: 0.5, verified: true },
  // Frutos
  { name: 'Tomate', kcal: 18, p: 0.9, c: 3.9, f: 0.2, verified: true },
  { name: 'Tomate cherry', kcal: 18, p: 0.9, c: 3.9, f: 0.2, verified: true },
  { name: 'Morrón rojo', kcal: 31, p: 1, c: 6, f: 0.3, verified: true },
  { name: 'Morrón verde', kcal: 20, p: 0.9, c: 4.6, f: 0.2, verified: true },
  { name: 'Morrón amarillo', kcal: 27, p: 1, c: 6.3, f: 0.2, verified: true },
  { name: 'Berenjena (cruda)', kcal: 25, p: 1, c: 5.9, f: 0.2, verified: true },
  { name: 'Berenjena (cocida)', kcal: 35, p: 0.8, c: 8.7, f: 0.2, verified: true },
  { name: 'Zapallito / Zucchini', kcal: 17, p: 1.2, c: 3.1, f: 0.3, verified: true },
  { name: 'Zapallo (cocido)', kcal: 26, p: 1, c: 6.5, f: 0.1, verified: true },
  { name: 'Zapallo anco (cocido)', kcal: 45, p: 1, c: 12, f: 0.1, verified: true },
  { name: 'Pepino', kcal: 15, p: 0.7, c: 3.6, f: 0.1, verified: true },
  { name: 'Chaucha (cocida)', kcal: 35, p: 1.9, c: 7.9, f: 0.3, verified: true },
  // Raíces / bulbos
  { name: 'Zanahoria (cruda)', kcal: 41, p: 0.9, c: 9.6, f: 0.2, verified: true },
  { name: 'Zanahoria (cocida)', kcal: 35, p: 0.8, c: 8.2, f: 0.2, verified: true },
  { name: 'Remolacha (cruda)', kcal: 43, p: 1.6, c: 9.6, f: 0.2, verified: true },
  { name: 'Remolacha (cocida)', kcal: 44, p: 1.7, c: 10, f: 0.2, verified: true },
  { name: 'Cebolla', kcal: 40, p: 1.1, c: 9.3, f: 0.1, verified: true },
  { name: 'Cebolla morada', kcal: 40, p: 1.1, c: 9.3, f: 0.1, verified: true },
  { name: 'Cebolla de verdeo', kcal: 32, p: 1.8, c: 7.3, f: 0.2, verified: true },
  { name: 'Puerro', kcal: 61, p: 1.5, c: 14, f: 0.3, verified: true },
  { name: 'Ajo', kcal: 149, p: 6.4, c: 33, f: 0.5, verified: true, servingQty: 3, servingUnit: 'g', servingLabel: '1 diente' },
  { name: 'Rabanito', kcal: 16, p: 0.7, c: 3.4, f: 0.1, verified: true },
  { name: 'Nabo', kcal: 28, p: 0.9, c: 6.4, f: 0.1, verified: true },
  { name: 'Jengibre', kcal: 80, p: 1.8, c: 18, f: 0.8, verified: true },
  // Otras
  { name: 'Apio', kcal: 16, p: 0.7, c: 3, f: 0.2, verified: true },
  { name: 'Hinojo', kcal: 31, p: 1.2, c: 7.3, f: 0.2, verified: true },
  { name: 'Espárragos (cocidos)', kcal: 22, p: 2.4, c: 4.1, f: 0.2, verified: true },
  { name: 'Alcaucil (cocido)', kcal: 53, p: 2.9, c: 12, f: 0.3, verified: true },
  { name: 'Palmito (en conserva)', kcal: 28, p: 2.5, c: 4.6, f: 0.6, verified: true },
  { name: 'Champiñón', kcal: 22, p: 3.1, c: 3.3, f: 0.3, verified: true },
  { name: 'Portobello', kcal: 22, p: 2.1, c: 3.9, f: 0.4, verified: true },
  { name: 'Choclo (cocido)', kcal: 96, p: 3.4, c: 21, f: 1.5, verified: true },
  { name: 'Arvejas (cocidas)', kcal: 84, p: 5.4, c: 15.6, f: 0.2, verified: true },
  { name: 'Habas (cocidas)', kcal: 88, p: 8, c: 15, f: 0.5, verified: true },
  // Hierbas frescas
  { name: 'Perejil', kcal: 36, p: 3, c: 6.3, f: 0.8, verified: true },
  { name: 'Cilantro', kcal: 23, p: 2.1, c: 3.7, f: 0.5, verified: true },
  { name: 'Albahaca', kcal: 23, p: 3.2, c: 2.7, f: 0.6, verified: true },
  // Legumbres de uso frecuente
  { name: 'Garbanzos (cocidos)', kcal: 164, p: 8.9, c: 27, f: 2.6, verified: true },
  { name: 'Poroto negro (cocido)', kcal: 132, p: 8.9, c: 24, f: 0.5, verified: true },
  { name: 'Poroto colorado (cocido)', kcal: 127, p: 8.7, c: 23, f: 0.5, verified: true },
  { name: 'Poroto blanco (cocido)', kcal: 139, p: 9.7, c: 25, f: 0.4, verified: true },
];

/**
 * Carnes. Valores por 100 g de porción comestible, "(crudo/a)" o "(cocido/a)".
 * Al cocinarse la carne pierde agua: los valores cocidos vienen más
 * concentrados (más kcal / proteína / grasa por 100 g que en crudo).
 * Fuente: USDA FoodData Central y tablas de composición de referencia.
 * Fiambres y embutidos van listos para consumir (sin crudo/cocido).
 */
const MEATS: FoodSeed[] = [
  // --- Vaca / res ---
  { name: 'Carne picada común 80/20 (cruda)', kcal: 254, p: 17.2, c: 0, f: 20, verified: true },
  { name: 'Carne picada común 80/20 (cocida)', kcal: 254, p: 25.7, c: 0, f: 16.2, verified: true },
  { name: 'Carne picada magra 90/10 (cruda)', kcal: 176, p: 20, c: 0, f: 10, verified: true },
  { name: 'Carne picada magra 90/10 (cocida)', kcal: 217, p: 26.1, c: 0, f: 11.8, verified: true },
  { name: 'Carne picada extra magra 95/5 (cruda)', kcal: 137, p: 21.4, c: 0, f: 5, verified: true },
  { name: 'Carne picada extra magra 95/5 (cocida)', kcal: 171, p: 26.6, c: 0, f: 6.2, verified: true },
  { name: 'Nalga de vaca (cruda)', kcal: 116, p: 22, c: 0, f: 2.9, verified: true },
  { name: 'Nalga de vaca (cocida)', kcal: 178, p: 30, c: 0, f: 5.5, verified: true },
  { name: 'Cuadril de vaca (crudo)', kcal: 123, p: 21.5, c: 0, f: 3.6, verified: true },
  { name: 'Cuadril de vaca (cocido)', kcal: 183, p: 29.5, c: 0, f: 6.4, verified: true },
  { name: 'Lomo de vaca (crudo)', kcal: 120, p: 22, c: 0, f: 3, verified: true },
  { name: 'Lomo de vaca (cocido)', kcal: 200, p: 29, c: 0, f: 8.7, verified: true },
  { name: 'Bife ancho / Ojo de bife (crudo)', kcal: 250, p: 19.5, c: 0, f: 19, verified: true },
  { name: 'Bife ancho / Ojo de bife (cocido)', kcal: 291, p: 25, c: 0, f: 20.7, verified: true },
  { name: 'Bife de chorizo (crudo)', kcal: 200, p: 20, c: 0, f: 13, verified: true },
  { name: 'Bife de chorizo (cocido)', kcal: 250, p: 27, c: 0, f: 15.5, verified: true },
  { name: 'Vacío de vaca (crudo)', kcal: 172, p: 20, c: 0, f: 10, verified: true },
  { name: 'Vacío de vaca (cocido)', kcal: 225, p: 26, c: 0, f: 13, verified: true },
  { name: 'Falda / Matambre de vaca (crudo)', kcal: 210, p: 18, c: 0, f: 15, verified: true },
  { name: 'Entraña (cruda)', kcal: 220, p: 18, c: 0, f: 16, verified: true },
  { name: 'Entraña (cocida)', kcal: 280, p: 24, c: 0, f: 20, verified: true },
  { name: 'Asado de tira (crudo)', kcal: 290, p: 16, c: 0, f: 25, verified: true },
  { name: 'Asado de tira (cocido)', kcal: 373, p: 22.5, c: 0, f: 31, verified: true },
  { name: 'Peceto (crudo)', kcal: 116, p: 22, c: 0, f: 2.9, verified: true },
  { name: 'Roast beef / Peceto (cocido)', kcal: 155, p: 27, c: 0, f: 4.5, verified: true },
  { name: 'Osobuco de vaca (crudo)', kcal: 150, p: 21, c: 0, f: 7, verified: true },
  { name: 'Osobuco de vaca (cocido)', kcal: 215, p: 28, c: 0, f: 11, verified: true },
  { name: 'Hígado de vaca (crudo)', kcal: 135, p: 20.4, c: 3.9, f: 3.6, verified: true },
  { name: 'Hígado de vaca (cocido)', kcal: 175, p: 26.5, c: 5.1, f: 4.7, verified: true },
  { name: 'Lengua de vaca (cocida)', kcal: 284, p: 22, c: 0, f: 21, verified: true },
  { name: 'Mondongo (cocido)', kcal: 85, p: 12, c: 1.7, f: 3.4, verified: true },
  { name: 'Riñón de vaca (cocido)', kcal: 144, p: 24, c: 0.4, f: 4.7, verified: true },
  { name: 'Corazón de vaca (cocido)', kcal: 165, p: 24, c: 0.5, f: 6.4, verified: true },
  // --- Ternera ---
  { name: 'Ternera magra (cruda)', kcal: 112, p: 20, c: 0, f: 3, verified: true },
  { name: 'Ternera magra (cocida)', kcal: 172, p: 31, c: 0, f: 4.5, verified: true },
  // --- Pollo ---
  { name: 'Pechuga de pollo sin piel (cruda)', kcal: 120, p: 22.5, c: 0, f: 2.6, verified: true },
  { name: 'Pechuga de pollo sin piel (cocida)', kcal: 165, p: 31, c: 0, f: 3.6, verified: true },
  { name: 'Pechuga de pollo con piel (cruda)', kcal: 172, p: 20.8, c: 0, f: 9.2, verified: true },
  { name: 'Pechuga de pollo con piel (cocida)', kcal: 197, p: 29.8, c: 0, f: 7.8, verified: true },
  { name: 'Muslo de pollo sin piel (crudo)', kcal: 121, p: 19.7, c: 0, f: 4.1, verified: true },
  { name: 'Muslo de pollo sin piel (cocido)', kcal: 209, p: 26, c: 0, f: 10.9, verified: true },
  { name: 'Muslo de pollo con piel (crudo)', kcal: 211, p: 16.5, c: 0, f: 15.5, verified: true },
  { name: 'Muslo de pollo con piel (cocido)', kcal: 247, p: 25, c: 0, f: 15.5, verified: true },
  { name: 'Pata muslo de pollo con piel (cruda)', kcal: 187, p: 16.8, c: 0, f: 13, verified: true },
  { name: 'Ala de pollo con piel (cruda)', kcal: 222, p: 18.3, c: 0, f: 16, verified: true },
  { name: 'Ala de pollo con piel (cocida)', kcal: 290, p: 26.9, c: 0, f: 19.5, verified: true },
  { name: 'Pollo entero con piel (crudo)', kcal: 215, p: 18.6, c: 0, f: 15.1, verified: true },
  { name: 'Pollo entero con piel (cocido)', kcal: 239, p: 27.3, c: 0, f: 13.6, verified: true },
  { name: 'Hígado de pollo (crudo)', kcal: 116, p: 16.9, c: 0.7, f: 4.8, verified: true },
  { name: 'Hígado de pollo (cocido)', kcal: 167, p: 24.5, c: 0.9, f: 6.5, verified: true },
  { name: 'Carne picada de pollo (cruda)', kcal: 143, p: 17.4, c: 0, f: 8.1, verified: true },
  { name: 'Carne picada de pollo (cocida)', kcal: 189, p: 23.9, c: 0, f: 10.9, verified: true },
  // --- Pavo ---
  { name: 'Pechuga de pavo sin piel (cruda)', kcal: 111, p: 24, c: 0, f: 1.5, verified: true },
  { name: 'Pechuga de pavo sin piel (cocida)', kcal: 147, p: 30, c: 0, f: 2, verified: true },
  { name: 'Pechuga de pavo con piel (cruda)', kcal: 157, p: 21.8, c: 0, f: 7, verified: true },
  { name: 'Pechuga de pavo con piel (cocida)', kcal: 189, p: 28.7, c: 0, f: 7.4, verified: true },
  { name: 'Muslo de pavo sin piel (crudo)', kcal: 144, p: 19.5, c: 0, f: 6.8, verified: true },
  { name: 'Muslo de pavo sin piel (cocido)', kcal: 177, p: 28.6, c: 0, f: 6.2, verified: true },
  { name: 'Carne picada de pavo (cruda)', kcal: 148, p: 19.7, c: 0, f: 7.7, verified: true },
  { name: 'Carne picada de pavo (cocida)', kcal: 203, p: 27, c: 0, f: 10.4, verified: true },
  { name: 'Carne picada de pavo magra 93/7 (cruda)', kcal: 120, p: 18.7, c: 0, f: 4.7, verified: true },
  { name: 'Carne picada de pavo magra 93/7 (cocida)', kcal: 176, p: 24.5, c: 0, f: 8.3, verified: true },
  // --- Cerdo ---
  { name: 'Lomo / Solomillo de cerdo (crudo)', kcal: 120, p: 20.9, c: 0, f: 3.4, verified: true },
  { name: 'Carré / Chuleta de cerdo (cruda)', kcal: 155, p: 21, c: 0, f: 7.5, verified: true },
  { name: 'Carré / Chuleta de cerdo (cocida)', kcal: 231, p: 27, c: 0, f: 13, verified: true },
  { name: 'Bondiola de cerdo (cruda)', kcal: 216, p: 17, c: 0, f: 16, verified: true },
  { name: 'Bondiola de cerdo (cocida)', kcal: 269, p: 24, c: 0, f: 18.5, verified: true },
  { name: 'Pechito / Costilla de cerdo (cruda)', kcal: 277, p: 15.5, c: 0, f: 23.4, verified: true },
  { name: 'Pechito / Costilla de cerdo (cocida)', kcal: 397, p: 29, c: 0, f: 30.3, verified: true },
  { name: 'Pernil / Jamón fresco de cerdo (crudo)', kcal: 136, p: 20.5, c: 0, f: 5.5, verified: true },
  { name: 'Pernil / Jamón fresco de cerdo (cocido)', kcal: 179, p: 25, c: 0, f: 8, verified: true },
  { name: 'Matambre de cerdo (crudo)', kcal: 250, p: 17, c: 0, f: 20, verified: true },
  { name: 'Panceta de cerdo fresca (cruda)', kcal: 518, p: 9.3, c: 0, f: 53, verified: true },
  { name: 'Panceta / Tocino (cocido)', kcal: 541, p: 37, c: 1.4, f: 42, verified: true },
  { name: 'Carne picada de cerdo (cruda)', kcal: 263, p: 16.9, c: 0, f: 21.2, verified: true },
  { name: 'Carne picada de cerdo (cocida)', kcal: 297, p: 25.7, c: 0, f: 20.8, verified: true },
  { name: 'Chorizo fresco de cerdo (crudo)', kcal: 330, p: 14, c: 1.9, f: 30, verified: true },
  { name: 'Chorizo (cocido)', kcal: 360, p: 19, c: 2, f: 30, verified: true },
  // --- Cordero ---
  { name: 'Cordero magro (crudo)', kcal: 134, p: 20.6, c: 0, f: 5.2, verified: true },
  { name: 'Cordero magro (cocido)', kcal: 191, p: 28.3, c: 0, f: 7.7, verified: true },
  { name: 'Costilla de cordero (cruda)', kcal: 291, p: 15, c: 0, f: 25, verified: true },
  { name: 'Costilla de cordero (cocida)', kcal: 361, p: 25, c: 0, f: 28, verified: true },
  { name: 'Paleta de cordero (cruda)', kcal: 176, p: 17.6, c: 0, f: 11.4, verified: true },
  { name: 'Paleta de cordero (cocida)', kcal: 259, p: 24.7, c: 0, f: 17, verified: true },
  // --- Conejo ---
  { name: 'Conejo (crudo)', kcal: 136, p: 20, c: 0, f: 5.5, verified: true },
  { name: 'Conejo (cocido)', kcal: 197, p: 29, c: 0, f: 8, verified: true },
  // --- Pato ---
  { name: 'Pechuga de pato sin piel (cruda)', kcal: 135, p: 18.3, c: 0, f: 6, verified: true },
  { name: 'Pechuga de pato sin piel (cocida)', kcal: 201, p: 23.5, c: 0, f: 11.2, verified: true },
  { name: 'Pato con piel (crudo)', kcal: 404, p: 11.5, c: 0, f: 39.3, verified: true },
  { name: 'Pato con piel (cocido)', kcal: 337, p: 19, c: 0, f: 28.4, verified: true },
  // --- Cabra / chivito ---
  { name: 'Cabra / Chivito (crudo)', kcal: 109, p: 20.6, c: 0, f: 2.3, verified: true },
  { name: 'Cabra / Chivito (cocido)', kcal: 143, p: 27.1, c: 0, f: 3, verified: true },
  // --- Fiambres y embutidos (listos para consumir) ---
  { name: 'Jamón cocido', kcal: 145, p: 18, c: 1.5, f: 7, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Jamón cocido natural (magro)', kcal: 107, p: 18.5, c: 1.3, f: 3, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Jamón crudo / Serrano', kcal: 241, p: 31, c: 0.3, f: 12.9, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Paleta cocida (fiambre)', kcal: 130, p: 16, c: 2, f: 6.5, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Lomito ahumado', kcal: 130, p: 22, c: 1, f: 4, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Salame', kcal: 407, p: 22, c: 1.6, f: 33, verified: true, servingQty: 10, servingUnit: 'g', servingLabel: '1 rodaja' },
  { name: 'Mortadela', kcal: 311, p: 16, c: 3, f: 25, verified: true, servingQty: 15, servingUnit: 'g', servingLabel: '1 feta' },
  { name: 'Salchicha tipo viena', kcal: 260, p: 11, c: 3, f: 23, verified: true, servingQty: 45, servingUnit: 'g', servingLabel: '1 unidad' },
  { name: 'Chorizo colorado / español', kcal: 455, p: 24, c: 1.9, f: 38, verified: true },
  { name: 'Morcilla', kcal: 379, p: 14.6, c: 1.3, f: 34.5, verified: true },
  { name: 'Panceta ahumada', kcal: 458, p: 13, c: 0.7, f: 45, verified: true, servingQty: 8, servingUnit: 'g', servingLabel: '1 lonja' },
];

async function main() {
  // Secuencial a propósito: DATABASE_URL usa connection_limit=15 (pooler).
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: {
        category: a.category,
        title: a.title,
        description: a.description,
        icon: a.icon,
        threshold: a.threshold ?? null,
      },
      create: { ...a, threshold: a.threshold ?? null },
    });
  }
  console.log(`✓ ${ACHIEVEMENTS.length} logros`);

  if ((await prisma.exercise.count()) === 0) {
    await prisma.exercise.createMany({
      data: EXERCISES.map((e) => ({ name: e.name, primaryMuscle: e.primaryMuscle, equipment: e.equipment })),
    });
    console.log(`✓ ${EXERCISES.length} ejercicios`);
  } else {
    console.log('· ejercicios: ya había datos, se omite');
  }

  // Alimentos: additivo por nombre (SYSTEM). Re-ejecutable; sólo crea los que
  // faltan. Secuencial por el connection_limit=15 del pooler.
  const allFoods = [...FOODS, ...VEGETABLES, ...MEATS];
  let addedFoods = 0;
  for (const f of allFoods) {
    const existing = await prisma.food.findFirst({
      where: { name: f.name, source: 'SYSTEM' },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.food.create({
      data: {
        name: f.name,
        source: 'SYSTEM',
        verified: f.verified ?? false,
        kcalPer100: f.kcal,
        proteinPer100: f.p,
        carbsPer100: f.c,
        fatPer100: f.f,
        servingQty: f.servingQty ?? null,
        servingUnit: f.servingUnit ?? null,
        servingLabel: f.servingLabel ?? null,
      },
    });
    addedFoods++;
  }
  console.log(
    `✓ alimentos: +${addedFoods} nuevos (${allFoods.length} en la lista; ` +
      `${VEGETABLES.length} verduras, ${MEATS.length} carnes)`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
