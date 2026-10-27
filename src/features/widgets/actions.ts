'use server';

import { requireUser } from '@/server/context';
import { buildWidgetSnapshot } from './snapshot';
import type { WidgetSnapshot } from './types';

/** Para el sincronizador de widgets (app nativa): la foto de datos actual de la persona. */
export async function getWidgetSnapshot(): Promise<WidgetSnapshot> {
  return buildWidgetSnapshot(await requireUser());
}
