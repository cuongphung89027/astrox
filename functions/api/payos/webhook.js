export async function onRequestPost({ request, env }) {
  if (!env.ASTROX_PAYMENTS) return Response.json({ error: 'payment_backend_unavailable' }, { status: 503 });
  return env.ASTROX_PAYMENTS.fetch(request);
}
