import { limitAi } from './ai-rate-limit.mjs';
import { renderServicePrompt } from './prompt-engine.ts';
import { backendStatus, connectionSecretAvailable } from './backend.mjs';
import { state, readPublished, readSecret, recordAudit, sql } from './store.mjs';
import { publicConfig } from './config.ts';
import { executeProviderChain, testProvider, validateIntegration, RuntimeError } from './runtime.mjs';
import { providerHealth } from './health-store.mjs';
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const hosts = env =>
  String(env.PROVIDER_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
async function parse(request, max = 300000) {
  if (Number(request.headers.get('content-length')) > max) throw new RuntimeError('REQUEST_TOO_LARGE', 413);
  if (!request.body) throw new RuntimeError('INVALID_JSON', 400);
  const reader = request.body.getReader(),
    chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) throw new RuntimeError('REQUEST_TOO_LARGE', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new RuntimeError('INVALID_JSON', 400);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
function normalizedInput(input) {
  if (
    !input ||
    typeof input.serviceId !== 'string' ||
    input.serviceId.length > 80 ||
    !Array.isArray(input.messages) ||
    !input.messages.length ||
    input.messages.length > 100
  )
    throw new RuntimeError('INVALID_MESSAGES', 400);
  const messages = input.messages
    .map(m => {
      if (!m || !['system', 'user', 'assistant'].includes(m.role)) throw new RuntimeError('INVALID_MESSAGES', 400);
      let content = m.content;
      if (Array.isArray(content)) {
        if (
          !content.length ||
          content.some(
            p =>
              !p ||
              typeof p.text !== 'string' ||
              (p.type !== undefined && p.type !== 'text') ||
              Object.keys(p).some(k => !['type', 'text'].includes(k)),
          )
        )
          throw new RuntimeError('INVALID_MESSAGES', 400);
        content = content.map(p => p.text).join('\n');
      }
      if (typeof content !== 'string' || !content.trim() || content.length > 100000)
        throw new RuntimeError('INVALID_MESSAGES', 400);
      return { role: m.role, content };
    })
    .filter(m => m.role !== 'system');
  if (
    !messages.length ||
    (input.operationId !== undefined && (typeof input.operationId !== 'string' || input.operationId.length > 120))
  )
    throw new RuntimeError('INVALID_MESSAGES', 400);
  return {
    messages,
    serviceId: input.serviceId,
    operationId: input.operationId,
    expectedPoints: input.expectedPoints,
    promptDescriptor: input.promptDescriptor,
    compact: input.compact === true,
  };
}
export async function handleAdminRuntime(path, request, env, user) {
  if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
  if (!user.capabilities.includes('secrets.write')) return json({ error: 'Không có quyền kiểm tra kết nối.' }, 403);
  try {
    const draft = JSON.parse((await state(env)).draft);
    if (path === 'test-provider') {
      const b = await parse(request);
      const started = Date.now();
      try {
        const result = await testProvider(draft, b.providerId, ref => readSecret(env, ref), { allowHosts: hosts(env) });
        await recordAudit(env, user.email, 'provider.test', b.providerId, { ok: true });
        return json({
          ok: true,
          message: 'Provider đã phản hồi thành công.',
          latencyMs: Date.now() - started,
          model: result.model,
          attempts: result.attempts,
        });
      } catch (e) {
        await recordAudit(env, user.email, 'provider.test', String(b.providerId || ''), {
          ok: false,
          code: e.code || 'FAILED',
        });
        return json({ error: diagnostic(e.code), code: e.code || 'FAILED' }, e.status || 502);
      }
    }
    const kind = path.split('/')[1];
    if (!['payos', 'zalo', 'wallet'].includes(kind)) return json({ error: 'Không tìm thấy kết nối.' }, 404);
    const checks = [],
      backend = await backendStatus(env);
    if (kind !== 'wallet') {
      const errors = validateIntegration(kind, draft.integrations[kind]);
      checks.push({ label: 'Thông tin cấu hình hợp lệ', ok: errors.length === 0 });
      const refs = kind === 'payos' ? ['payos:apiKey', 'payos:checksumKey'] : ['zalo:appSecret'];
      for (const ref of refs)
        checks.push({ label: `Đã lưu ${ref.split(':')[1]}`, ok: await connectionSecretAvailable(env, ref, backend) });
    }
    const ready = backend.configVersioned;
    checks.push({ label: 'Backend nghiệp vụ đã hỗ trợ cấu hình phiên bản', ok: ready });
    await recordAudit(env, user.email, 'integration.check', kind, { ready });
    return json({
      ok: checks.every(c => c.ok),
      checks,
      message: checks.every(c => c.ok)
        ? 'Cấu hình sẵn sàng. Cần kiểm thử giao dịch/đăng nhập trên môi trường tích hợp.'
        : 'Chưa đủ điều kiện tích hợp. Kiểm tra các mục bên dưới.',
      scope: 'configuration-only',
    });
  } catch (e) {
    return json(
      { error: e instanceof RuntimeError ? diagnostic(e.code) : 'Không thể kiểm tra cấu hình.' },
      e.status || 500,
    );
  }
}
function diagnostic(code) {
  return (
    {
      READING_LANGUAGE_INVALID: 'Luận giải chưa đạt yêu cầu tiếng Việt. Vui lòng thử lại.',
      HOST_NOT_ALLOWED: 'Tên miền provider chưa nằm trong danh sách kết nối được phép của server.',
      SECRET_MISSING: 'Chưa lưu API key cho provider.',
      PROVIDER_REJECTED: 'Provider từ chối yêu cầu. Kiểm tra API key, model và giao thức.',
      AI_DISABLED: 'AI đang tạm tắt trong cấu hình.',
      PROVIDERS_EXHAUSTED: 'Các provider đều chưa phản hồi thành công. Vui lòng thử lại sau.',
      AI_BUDGET_EXHAUSTED: 'Yêu cầu vượt thời gian hoặc số lần thử cho phép.',
      INVALID_PROVIDER_RESPONSE: 'Provider trả về dữ liệu không hợp lệ.',
      PROVIDER_REFUSAL: 'Provider không thể xử lý nội dung này.',
      PROVIDER_REDIRECT: 'Endpoint chuyển hướng không được chấp nhận.',
    }[code] || 'Không thể hoàn tất yêu cầu. Kiểm tra cấu hình hoặc thử lại.'
  );
}
/** Returns null only when no admin configuration has ever been published. */
export async function handleConfiguredAi(request, env) {
  if (!env.DB) return null;
  let published;
  try {
    published = await readPublished(env);
  } catch (e) {
    if (String(e.message).includes('no such table: admin_')) return null;
    return json({ error: 'Không đọc được cấu hình dịch vụ.' }, 503);
  }
  if (!published) return null;
  const c = published.config,
    started = Date.now();
  let input;
  let attempts = [];
  let outcome = 'failed';
  try {
    if (c.operations.maintenance) throw new RuntimeError('MAINTENANCE', 503);
    if (!c.ai.enabled) throw new RuntimeError('AI_DISABLED', 503);
    input = normalizedInput(await parse(request));
    const service = c.billing.services.find(s => s.id === input.serviceId);
    if (!service || !['free', 'paid'].includes(service.status)) throw new RuntimeError('SERVICE_UNAVAILABLE', 403);
    const root = c.billing.services.find(s => s.id === service.module);
    if (root && !['free', 'paid'].includes(root.status)) throw new RuntimeError('SERVICE_UNAVAILABLE', 403);
    const engine =
      { 'compat--tuvi-pair': 'iztro', 'compat--batu-pair': 'lunar' }[input.serviceId] ||
      {
        tuvi: 'iztro',
        zodiac: 'astronomy',
        batu: 'lunar',
        numerology: 'numerology',
        kinhdich: 'kinhdich',
        tarot: 'tarot',
      }[service.module];
    if (engine && c.engines?.[engine]?.enabled === false) throw new RuntimeError('SERVICE_UNAVAILABLE', 403);
    const requestHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(
            JSON.stringify({
              serviceId: input.serviceId,
              messages: input.messages,
              promptDescriptor: input.promptDescriptor,
              compact: input.compact,
            }),
          ),
        ),
      ),
      b => b.toString(16).padStart(2, '0'),
    ).join('');
    if (input.promptDescriptor) {
      try {
        input.messages = [
          { role: 'user', content: renderServicePrompt(input.promptDescriptor, input.serviceId, c.prompts) },
        ];
      } catch {
        throw new RuntimeError('INVALID_MESSAGES', 400);
      }
    }
    if (input.compact) input.messages.push({ role: 'user', content: c.prompts.templates['shared.compact'] });
    const limited = await limitAi(request, env);
    if (limited) {
      outcome = limited.status === 429 ? 'rate_limited' : 'ai_safety_unavailable';
      return limited;
    }
    if (service.status === 'paid') {
      if (input.expectedPoints !== undefined && input.expectedPoints !== service.points) {
        outcome = 'price_changed';
        return json({ error: 'Giá vừa thay đổi. Vui lòng xem lại và xác nhận giá mới.', code: 'price_changed' }, 409);
      }
      if (!c.billing.enabled) throw new RuntimeError('SERVICE_UNAVAILABLE', 403);
      if (!env.ASTROX_BACKEND) throw new RuntimeError('BACKEND_UNAVAILABLE', 503);
      if (!/^[a-zA-Z0-9_-]{8,120}$/.test(input.operationId || '')) throw new RuntimeError('INVALID_MESSAGES', 400);
      const headers = new Headers({
        'content-type': 'application/json',
        'x-astrox-config-revision': String(published.revision),
      });
      for (const name of ['cookie', 'authorization']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      const backend = async (path, body) =>
        env.ASTROX_BACKEND.fetch(
          new Request(`https://astrox-internal/internal/ai/${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          }),
        );
      const chargeResponse = await backend('charge', {
        serviceId: input.serviceId,
        revision: published.revision,
        operationId: input.operationId,
        requestHash,
      });
      const charge = await chargeResponse.json().catch(() => null);
      if (!chargeResponse.ok) {
        const code = charge?.error || 'charge_failed';
        outcome = code;
        const messages = {
          unauthorized: 'Vui lòng đăng nhập lại trước khi dùng dịch vụ trả phí.',
          insufficient_points: `Không đủ Point — cần ${charge?.needed} Point cho lượt luận giải này.`,
          operation_in_progress: 'Lượt luận giải này đang được xử lý. Vui lòng chờ rồi thử lại.',
          operation_refunded: 'Lượt trước đã được hoàn Point. Bạn có thể thử một lượt mới.',
          operation_conflict: 'Thông tin của lượt luận giải đã thay đổi. Vui lòng tải lại trang.',
          result_expired: 'Lượt này đã xử lý trước đó. Hãy kiểm tra bài đã lưu hoặc liên hệ hỗ trợ.',
          revision_mismatch: 'Cấu hình vừa thay đổi. Vui lòng thử lại.',
        };
        return json(
          { error: messages[code] || 'Chưa xác nhận được giao dịch Point. Vui lòng thử lại.', code },
          [400, 401, 402, 403, 409, 410].includes(chargeResponse.status) ? chargeResponse.status : 503,
        );
      }
      if (charge?.replayed && charge.response) {
        outcome = 'replayed';
        return json(charge.response);
      }
      const chargeId = String(charge?.chargeId || '');
      if (!chargeId) throw new RuntimeError('BACKEND_UNAVAILABLE', 503);
      try {
        const result = await executeProviderChain(
          c,
          { messages: input.messages, serviceId: input.serviceId },
          ref => readSecret(env, ref),
          { allowHosts: hosts(env), healthStore: providerHealth(env) },
        );
        attempts = result.attempts;
        const { choices, model, usage, languagePolicyVersion } = result,
          response = {
            choices,
            model,
            usage,
            languagePolicyVersion,
            configRevision: published.revision,
            chargedPoints: charge.points,
          };
        const saved = await backend('complete', { chargeId, response });
        if (!saved.ok || !(await saved.json().catch(() => null))?.ok)
          throw new RuntimeError('RESULT_PERSIST_FAILED', 503);
        outcome = 'success';
        return json(response);
      } catch (e) {
        let refunded = false;
        for (let retry = 0; retry < 2 && !refunded; retry++)
          try {
            const r = await backend('refund', { chargeId });
            refunded = r.ok && (await r.json().catch(() => null))?.ok === true;
          } catch {}
        attempts = [
          ...(e.attempts || attempts),
          { providerId: '', model: '', outcome: refunded ? 'refunded' : 'refund_pending' },
        ];
        outcome = refunded ? e.code || 'failed' : 'refund_pending';
        if (!refunded) console.error(JSON.stringify({ event: 'ai.refund_pending', chargeId }));
        return json(
          {
            error: refunded
              ? `${diagnostic(e.code)} Point đã được hoàn lại.`
              : 'Chưa xác nhận được kết quả của lượt này. Hệ thống đang đối soát Point; vui lòng thử lại sau.',
            code: refunded ? 'operation_refunded' : 'refund_pending',
          },
          e.status || 503,
        );
      }
    }

    const result = await executeProviderChain(
      c,
      { messages: input.messages, serviceId: input.serviceId },
      ref => readSecret(env, ref),
      { allowHosts: hosts(env), healthStore: providerHealth(env) },
    );
    attempts = result.attempts;
    outcome = 'success';
    const { choices, model, usage, languagePolicyVersion } = result;
    return json({ choices, model, usage, languagePolicyVersion, configRevision: published.revision });
  } catch (e) {
    attempts = e.attempts || attempts;
    outcome = e.code || 'failed';
    return json({ error: diagnostic(e.code) }, e.status || 503);
  } finally {
    await sql(
      env,
      'INSERT INTO admin_ai_requests(id,service_id,config_revision,created_at,status,attempts,duration_ms) VALUES(?,?,?,?,?,?,?)',
      crypto.randomUUID(),
      String(input?.serviceId || ''),
      published.revision,
      new Date().toISOString(),
      outcome,
      JSON.stringify(attempts),
      Date.now() - started,
    )
      .run()
      .catch(() => {});
  }
}

/** The only public projection of the published config; served same-origin by Pages and the local dev server. */
export async function siteConfig(env) {
  try {
    const p = env.DB ? await readPublished(env) : null;
    return json(p ? { config: publicConfig(p.config), revision: p.revision } : { config: null, revision: null });
  } catch {
    return json({ error: 'config_unavailable' }, 503);
  }
}

export async function handlePublic(request, env) {
  const path = new URL(request.url).pathname;
  if (path === '/api/site-config' && request.method === 'GET') return siteConfig(env);
  if (path === '/api/ai' && request.method === 'POST')
    return (await handleConfiguredAi(request, env)) || json({ error: 'Chưa áp dụng cấu hình AI.' }, 503);
  return json({ error: 'Không tìm thấy API.' }, 404);
}
