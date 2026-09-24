/*
 * Cloudflare Pages Function — proxy AI request tới nhà cung cấp DevQuote.
 * Thay thế netlify/functions/ai.mjs (Netlify Functions -> Cloudflare Pages Functions).
 *
 * File này tự động được route tới đường dẫn /api/ai theo quy ước file-based
 * routing của Cloudflare Pages Functions (functions/api/ai.js -> /api/ai).
 * Không cần khai báo redirect nào thêm (khác với netlify.toml trước đây).
 *
 * Biến môi trường cần đặt (Cloudflare Pages → Settings → Environment variables,
 * hoặc qua `wrangler pages secret put DEVQUOTE_API_KEY`):
 *   DEVQUOTE_API_KEY
 */
import { executeProviderChain } from '../../services/admin/runtime.mjs';
import { limitAi } from '../../services/admin/ai-rate-limit.mjs';
import { handleConfiguredAi } from '../../services/admin/integration-api.mjs';

const ENDPOINT = 'https://opencode.ai/zen/go/v1/responses';
const DEFAULT_MODEL = 'muse-spark-1.3-contributor';
const MAX_BYTES = 900_000;
const RETRYABLE_STATUS = new Set([429, 500, 501, 502, 503, 504]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Once published, admin configuration is authoritative. Never fall back to
  // legacy credentials when the configured service is disabled or failing.
  const configured = await handleConfiguredAi(request, env);
  if (configured) return configured;

  const limited = await limitAi(request, env);
  if (limited) return limited;

  const key = env.DEVQUOTE_API_KEY;
  if (!key) return json(500, { error: 'Máy chủ chưa cấu hình DEVQUOTE_API_KEY trong Environment Variables.' });

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: 'Không đọc được yêu cầu.' });
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return json(413, { error: 'Yêu cầu quá lớn.' });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: 'JSON không hợp lệ.' });
  }
  if (!payload || !Array.isArray(payload.messages) || !payload.messages.length)
    return json(400, { error: 'Thiếu messages.' });

  const input = payload.messages.map(m => {
    const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user';
    let text = '';
    if (typeof m.content === 'string') text = m.content;
    else if (Array.isArray(m.content)) {
      text = m.content
        .map(part => {
          if (typeof part === 'string') return part;
          if (part && typeof part.text === 'string') return part.text;
          if (part && part.type === 'text' && typeof part.text === 'string') return part.text;
          if (part && part.type === 'input_text' && typeof part.text === 'string') return part.text;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    } else if (m.content != null) text = String(m.content);
    return { role, content: text };
  });

  // Use the same guarded output contract even before an Admin config is published.
  const config = {
    ai: {
      enabled: true,
      systemPrompt: '',
      chain: ['legacy'],
      providers: [
        {
          id: 'legacy',
          name: 'Legacy',
          baseUrl: ENDPOINT.replace(/\/responses$/, ''),
          protocol: 'responses',
          model: DEFAULT_MODEL,
          enabled: true,
          secretRef: 'legacy',
          timeoutMs: 90000,
          retries: 1,
          maxTokens: Math.min(Number(payload.max_tokens) || 4000, 16000),
          temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.7,
        },
      ],
      totalTimeoutMs: 90000,
      maxAttempts: 3,
      cooldownSeconds: 0,
      failureThreshold: 3,
      retryStatuses: [...RETRYABLE_STATUS],
    },
    billing: { services: [{ id: 'legacy', module: 'legacy', prompt: '', chain: [] }] },
  };
  try {
    const result = await executeProviderChain(config, { serviceId: 'legacy', messages: input }, async () => key, {
      allowHosts: [new URL(ENDPOINT).hostname],
    });
    return json(200, {
      choices: result.choices,
      model: result.model,
      usage: result.usage,
      languagePolicyVersion: result.languagePolicyVersion,
    });
  } catch (error) {
    return json(error?.status || 502, {
      error:
        error?.code === 'READING_LANGUAGE_INVALID'
          ? 'Luận giải chưa đạt yêu cầu tiếng Việt. Vui lòng thử lại.'
          : 'Không nhận được luận giải hợp lệ. Vui lòng thử lại.',
    });
  }
}

// Mọi phương thức khác /api/ai đều không được hỗ trợ (giữ đúng hành vi bản Netlify).
export async function onRequestGet() {
  return json(405, { error: 'Phương thức không được hỗ trợ.' });
}
export async function onRequestPut() {
  return json(405, { error: 'Phương thức không được hỗ trợ.' });
}
export async function onRequestDelete() {
  return json(405, { error: 'Phương thức không được hỗ trợ.' });
}
