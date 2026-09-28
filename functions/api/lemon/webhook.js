import { handleLemonWebhook } from '../../../services/backend/lemon-webhook.mjs';
export async function onRequestPost(context) {
  return handleLemonWebhook(context.env, context.request);
}
