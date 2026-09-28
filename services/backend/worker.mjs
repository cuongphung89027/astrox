import { recoverRegistrationRewards } from './rewards.mjs';
import { reconcileAi } from './ai-operations.mjs';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { publicFetch, internalFetch } from './handler.mjs';
import { handlePayosWebhook, expirePendingTopups } from './payments.mjs';
import { handleLemonWebhook } from './lemon-webhook.mjs';
import { reconcileLemon } from './lemon-reconcile.mjs';
// This named entrypoint is only reachable through a Cloudflare service binding.
// Never expose internalFetch from the default public handler.
export class AdminBackend extends WorkerEntrypoint {
  async fetch(request) {
    return internalFetch(request, this.env);
  }
}
export class PaymentWebhook extends WorkerEntrypoint {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    return handlePayosWebhook(this.env, request);
  }
}
export class LemonWebhook extends WorkerEntrypoint {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    return handleLemonWebhook(this.env, request);
  }
}
export default {
  fetch: publicFetch,
  async scheduled(controller, env) {
    await expirePendingTopups(env, controller.scheduledTime);
    if (Math.floor(controller.scheduledTime / 60000) % 5 !== 0) return;
    await env.DB.prepare('DELETE FROM zalo_browser_pending WHERE expires_at<=?').bind(controller.scheduledTime).run();
    await reconcileAi(env, controller.scheduledTime);
    await reconcileLemon(env, { now: controller.scheduledTime }).catch(error =>
      console.error(JSON.stringify({ event: 'lemon.reconcile_failed', error: String(error?.message || error) })),
    );
    await recoverRegistrationRewards(env);
    await env.DB.prepare('DELETE FROM client_error_counts WHERE day<?')
      .bind(Math.floor(controller.scheduledTime / 86400000) - 30)
      .run();
  },
};
