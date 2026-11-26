/**
 * En la app, este archivo reemplaza a `src/features/coach/actions.ts` al armarla (ver `vite.config.ts`): mismos nombres
 * y mismas respuestas, pero pidiéndoselo al servidor. Así la pantalla del coach es la misma que la de la web.
 */
import type * as web from '@/features/coach/actions';
import { APP_TEXT, currentAppLocale } from '../strings';
import { rpc, RpcError, serverChanged } from './rpc';

type Actions = typeof web;
type Name =
  | 'sendCoachMessage'
  | 'applyCoachEdit'
  | 'undoCoachEdit'
  | 'setCoachAutoApply'
  | 'addCoachExerciseToPlan'
  | 'addCoachFoodToToday'
  | 'archiveCoachConversation'
  | 'loadCoachConversation'
  | 'reopenCoachConversation';

/** Nunca rompe la pantalla: una falla vuelve como las de la web, con un mensaje para mostrar. */
function remote<N extends Name>(name: N, changesData: boolean): Actions[N] {
  return (async (...args: unknown[]) => {
    try {
      const result = await rpc<{ ok?: boolean }>(`coach.${name}`, ...args);
      // Lo que cambió el coach (rutina, comidas) tiene que verse en el resto de la app.
      if (changesData && result.ok) serverChanged();
      return result;
    } catch (e) {
      const s = APP_TEXT[currentAppLocale()];
      const kind = e instanceof RpcError ? e.kind : 'server';
      return { error: kind === 'offline' ? s.cannotConnect : kind === 'auth' ? s.sessionExpired : s.onlineFailed };
    }
  }) as unknown as Actions[N];
}

export const sendCoachMessage = remote('sendCoachMessage', true);
export const applyCoachEdit = remote('applyCoachEdit', true);
export const undoCoachEdit = remote('undoCoachEdit', true);
export const setCoachAutoApply = remote('setCoachAutoApply', false);
export const addCoachExerciseToPlan = remote('addCoachExerciseToPlan', true);
export const addCoachFoodToToday = remote('addCoachFoodToToday', true);
export const archiveCoachConversation = remote('archiveCoachConversation', false);
export const loadCoachConversation = remote('loadCoachConversation', false);
export const reopenCoachConversation = remote('reopenCoachConversation', false);
