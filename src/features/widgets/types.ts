/**
 * Foto de datos que la app le deja a los widgets del teléfono (iOS). La escribe la web (ver
 * `snapshot.ts`), la guarda el plugin nativo en el grupo compartido y la lee la extensión de widgets
 * (`ios/App/ForzaWidget/Snapshot.swift` espeja este formato: si se cambia acá, cambiar allá).
 *
 * Los textos ya vienen traducidos al idioma de la persona, así que el widget no tiene idiomas propios.
 */
export interface WidgetSnapshot {
  v: 1;
  updatedAt: string;
  /** Hoy (yyyy-mm-dd) en la zona de la persona, al momento de generar la foto. */
  todayISO: string;
  /** Textos con claves planas, p. ej. `review.due`. Los huecos van como `{n}`, `{day}`, `{name}`. */
  strings: Record<string, string>;
  today: {
    kcalTarget: number | null;
    kcalEaten: number;
    proteinTarget: number | null;
    proteinEaten: number;
    /** null = sin entrenamiento hoy (descanso o sin rutina). */
    workout: { name: string; state: 'planned' | 'active' | 'done' } | null;
    streak: number;
  };
  review: {
    /** locked = su plan no incluye la revisión · off = recordatorio apagado · active = normal. */
    status: 'locked' | 'off' | 'active';
    /** Día de la revisión de la semana en curso (yyyy-mm-dd) y su nombre en el idioma de la persona. */
    dayISO: string;
    dayName: string;
    /** Día de la revisión siguiente. */
    nextDayISO: string;
    nextDayName: string;
    /** Primer día de la semana siguiente: a partir de ahí esta foto ya es de una semana vieja. */
    weekEndISO: string;
    /** Ya la hizo esta semana (o su plan no la pide esta semana). */
    done: boolean;
    /** Toca hacerla ahora. */
    dueNow: boolean;
    /** Cómo viene la semana. */
    week: {
      workouts: number;
      planned: number;
      dietPct: number | null;
      weightChange: string | null;
    };
  };
}
