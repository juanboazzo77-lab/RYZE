import { jsPDF } from 'jspdf';
import type { MealPlan } from '@/features/nutrition/meal-plan-schema';
import type { Dictionary } from '@/i18n';

type Target = { kcal: number; proteinG: number; carbsG: number; fatG: number };

const MARGIN = 15;
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Arma el PDF del día de comidas generado por IA (mismos datos que se ven en
 * pantalla) y dispara la descarga en el navegador. Sin round-trip al server:
 * jsPDF corre 100% del lado del cliente.
 */
export function downloadMealPlanPdf(args: {
  plan: MealPlan;
  target: Target;
  dateISO: string;
  mealLabel: (type: MealPlan['meals'][number]['type']) => string;
  t: Dictionary;
}) {
  const { plan, target, dateISO, mealLabel, t } = args;
  const tm = t.nutrition.mealPlan;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: number; gap?: number } = {},
  ) => {
    const { size = 10, bold = false, color = 20, gap = 5 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    const wrapped = doc.splitTextToSize(text, CONTENT_W) as string[];
    ensureSpace(wrapped.length * gap + 1);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * gap;
  };

  line(`${t.common.appName} — ${tm.title}`, { size: 16, bold: true, color: 20, gap: 7 });
  line(dateISO, { size: 10, color: 100, gap: 8 });

  line(
    `${tm.target}: ${target.kcal} kcal · ${t.nutrition.protein} ${target.proteinG} g · ${t.nutrition.carbs} ${target.carbsG} g · ${t.nutrition.fat} ${target.fatG} g`,
    { size: 10, color: 90, gap: 8 },
  );

  for (const meal of plan.meals) {
    ensureSpace(10);
    line(`${mealLabel(meal.type)} — ${meal.title}`, { size: 12, bold: true, gap: 6 });
    for (const item of meal.items) {
      const measure = item.householdMeasure ? `${item.householdMeasure} · ` : '';
      line(`•  ${item.name}`, { size: 10, gap: 5 });
      line(
        `   ${measure}${Math.round(item.grams)} g · ${Math.round(item.kcal)} kcal · P ${Math.round(item.proteinG)} · C ${Math.round(item.carbsG)} · G ${Math.round(item.fatG)}`,
        { size: 9, color: 100, gap: 5 },
      );
    }
    y += 2;
  }

  const totals = plan.meals
    .flatMap((m) => m.items)
    .reduce(
      (a, i) => ({
        kcal: a.kcal + i.kcal,
        proteinG: a.proteinG + i.proteinG,
        carbsG: a.carbsG + i.carbsG,
        fatG: a.fatG + i.fatG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
  ensureSpace(10);
  line(
    `${tm.dayTotal}: ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.proteinG)} · C ${Math.round(totals.carbsG)} · G ${Math.round(totals.fatG)}`,
    { size: 11, bold: true, gap: 8 },
  );

  if (plan.shoppingList.length > 0) {
    ensureSpace(10);
    line(tm.shopping, { size: 12, bold: true, gap: 6 });
    for (const s of plan.shoppingList) line(`•  ${s}`, { size: 10, gap: 5 });
    y += 2;
  }

  if (plan.notes) {
    ensureSpace(10);
    line(plan.notes, { size: 9, color: 100, gap: 4.5 });
  }

  ensureSpace(10);
  line(t.nutrition.estimatedBadge.toUpperCase(), { size: 8, color: 150, gap: 4 });

  doc.save(`gymo-plan-comidas-${dateISO}.pdf`);
}
