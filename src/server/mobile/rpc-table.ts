import 'server-only';
import type { RpcFunction, RpcTable } from './rpc-call';

/**
 * La lista completa de funciones de la web que la app puede llamar (necesitan internet). Cada una ya valida lo que
 * recibe, identifica a la persona con `requireUser` y aplica los límites de su plan: es la misma que usa la web.
 * Para sumar una, revisar que no dependa de cookies ni redirija.
 */
const from =
  <M>(load: () => Promise<M>, name: keyof M) =>
  async () =>
    (await load())[name] as unknown as RpcFunction;

const coach = () => import('@/features/coach/actions');
const coachScreen = () => import('./coach-screen');
const nutrition = () => import('@/features/nutrition/actions');

export const RPC_TABLE: RpcTable = {
  'coach.screen': from(coachScreen, 'coachScreen'),
  'coach.sendCoachMessage': from(coach, 'sendCoachMessage'),
  'coach.applyCoachEdit': from(coach, 'applyCoachEdit'),
  'coach.undoCoachEdit': from(coach, 'undoCoachEdit'),
  'coach.setCoachAutoApply': from(coach, 'setCoachAutoApply'),
  'coach.addCoachExerciseToPlan': from(coach, 'addCoachExerciseToPlan'),
  'coach.addCoachFoodToToday': from(coach, 'addCoachFoodToToday'),
  'coach.archiveCoachConversation': from(coach, 'archiveCoachConversation'),
  'coach.loadCoachConversation': from(coach, 'loadCoachConversation'),
  'coach.reopenCoachConversation': from(coach, 'reopenCoachConversation'),
  // De la alimentación sólo lo que necesita internet: anotar pasa por la sincronización.
  'food.lookupBarcode': from(nutrition, 'lookupBarcodeAction'),
  'food.estimatePhoto': from(nutrition, 'estimateMealPhotoAction'),
  'food.estimateText': from(nutrition, 'estimateMealTextAction'),
  'food.create': from(nutrition, 'createCustomFood'),
};
