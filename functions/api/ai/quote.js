import { handleAiQuote } from '../../../services/admin/integration-api.mjs';
export async function onRequestPost({ request, env }) {
  return handleAiQuote(request, env);
}
