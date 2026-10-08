import { handleTarotSelection } from '../../../services/admin/tarot-selection.mjs';
export function onRequest({ request, env }) {
  return handleTarotSelection(request, env);
}
