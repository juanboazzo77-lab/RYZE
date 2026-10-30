/** Se dispara cuando cambia algo que afecta a los avisos del teléfono (p. ej. un interruptor de Ajustes). */
export const REMINDERS_CHANGED_EVENT = 'forza:reminders-changed';

export function notifyRemindersChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT));
}
