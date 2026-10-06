'use client';

/**
 * Lớp gọi API — port từ callAiText/runAiPrompt/aiHedgeRace + topup của
 * index.html. Toàn bộ chạy client-side (static export).
 */
import { currentUiLocale, uiText } from './ui-locale';
import { aiParts, type AiPart } from './ai-parts';
import { trackFeature } from './feature-telemetry';
import { confirmReading } from './reading-consent';
import { pendingAiOperation, finishAiOperation } from './ai-operation';
import { readingPromptDescriptor } from './managed-prompts';
import { AI_BASE, AUTH_API_BASE, DEFAULT_MODEL } from './config';
import {
  getState,
  getAccountEpoch,
  setState,
  setPromptRevision,
  recordPromptResult,
  recordLanguageResult,
} from './state';
import type { AstroxUser } from './types';
import { routeModule } from '../../../services/admin/modules.ts';
import { resolveRoute } from '../../../services/admin/markets.ts';

/* ------------------------------------------------------------------ */
/* AstroX                                                                  */
/* ------------------------------------------------------------------ */

const AI_REQUEST_TIMEOUT = 120000;
const AI_PARTIAL_MIN_RATIO = 0.25;
const displayedPrices = new Map<string, number>();
const priceKey = (serviceId: string, descriptor: unknown) =>
  `${getAccountEpoch()}:${currentUiLocale()}:${serviceId}:${JSON.stringify(descriptor ?? null)}`;
export function rememberDisplayedPrice(serviceId: string, descriptor: unknown, points: number) {
  displayedPrices.set(priceKey(serviceId, descriptor), points);
  if (displayedPrices.size > 128) displayedPrices.delete(displayedPrices.keys().next().value!);
}
function assertDisplayedPrice(serviceId: string, descriptor: unknown, points: number) {
  const key = priceKey(serviceId, descriptor),
    shown = displayedPrices.get(key);
  if (shown !== undefined && shown !== points) {
    displayedPrices.delete(key);
    window.dispatchEvent(new Event('astrox:price-changed'));
    throw new Error(
      uiText(
        'Giá dịch vụ vừa thay đổi. Vui lòng xem lại số Point trên nút trước khi tiếp tục.',
        'The service price changed. Please review the Credits shown on the button before continuing.',
      ),
    );
  }
}

export const SYSTEM_PROMPT_BASE = `Bạn là một chuyên gia chiêm tinh & dịch lý kỳ cựu, viết tiếng Việt tự nhiên, thẳng thắn.
QUY TẮC BẮT BUỘC:
1. Chỉ luận giải dựa trên dữ liệu được cung cấp — KHÔNG tự bịa thêm dữ kiện không có trong dữ liệu.
2. Nếu ảnh mờ hoặc thiếu thông tin, nói rõ "không đọc được rõ phần này" thay vì đoán bừa.
3. Đi thẳng vào nội dung phân tích. CẤM chào hỏi mở đầu kiểu "Chào bạn/Cường ơi", CẤM đoạn kết disclaimer kiểu "đây chỉ là góc nhìn tham khảo", "không phải phán xét tuyệt đối", "hãy cân nhắc khi áp dụng".
4. Văn phong: đoạn ngắn, dùng **in đậm** cho tiêu đề nhỏ và gạch đầu dòng bằng dấu "-".
5. Không đưa dự đoán y tế, pháp lý, tài chính mang tính khẳng định tuyệt đối — dùng ngôn ngữ khả năng.
6. Trả lời đúng độ dài được yêu cầu, không lan man.
7. Gọi dịch vụ là AstroX. Dùng thuật ngữ "tứ trụ" trong Bát Tự. Giữ nguyên tên tiếng Anh gốc của các lá Tarot.`;

const SYSTEM_PROMPT_EN = `You are an experienced astrology and divination reader. Write natural, direct English.
Use only the supplied information; never invent missing facts. State clearly when an image cannot be read.
Begin with the analysis, without greetings or boilerplate closing disclaimers. Use short paragraphs, bold subheadings and simple bullets.
Avoid definitive medical, legal or financial predictions. Respect the requested length. Call the service AstroX. Use Four Pillars for Ba Zi and the original English Tarot card names.`;

async function aiRequest(body: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const ownerEpoch = getAccountEpoch(),
    ownerLocale = currentUiLocale();
  const assertOwner = () => {
    if (getAccountEpoch() !== ownerEpoch || currentUiLocale() !== ownerLocale)
      throw new Error(
        uiText(
          'Tài khoản đã thay đổi. Vui lòng mở lại lượt luận giải.',
          'Your account changed. Please reopen the reading.',
        ),
      );
  };
  const prices = await servicePrices(true),
    price = prices[String(body.serviceId || '')];
  if (!price)
    throw new Error(
      uiText(
        'Chưa xác nhận được giá dịch vụ. Vui lòng thử lại sau.',
        'The service price could not be confirmed. Please try again.',
      ),
    );

  assertOwner();
  // Fetch per operation; never persist the credential in localStorage.
  const auth = await fetch(`${AUTH_API_BASE}/api/ai/session`, { method: 'POST', credentials: 'include', signal });
  if (!auth.ok && auth.status !== 401)
    throw new Error(
      uiText(
        'Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.',
        'Your session could not be verified. Please try again.',
      ),
    );
  const ticket = auth.ok ? await auth.json() : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof ticket?.token === 'string') headers.Authorization = `Bearer ${ticket.token}`;
  if (price.status === 'paid') {
    if (price.unlocks && price.policy !== 'session') {
      const qr = await fetch('/api/ai/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceId: body.serviceId,
          promptDescriptor: body.promptDescriptor,
          market: (await currentMarket(ticket?.userId ?? null)) ?? undefined,
        }),
        signal,
      });
      if (!qr.ok)
        throw new Error(
          qr.status === 401
            ? uiText('Vui lòng đăng nhập để mở khóa dịch vụ.', 'Please sign in to unlock this service.')
            : uiText(
                'Chưa lấy được giá mở khóa. Vui lòng thử lại.',
                'The unlock price could not be loaded. Please try again.',
              ),
        );
      const quote = await qr.json();
      assertOwner();
      const leaf = quote.offers?.find((offer: { id: string; points: number }) => offer.id === body.serviceId);
      if (!leaf || !Number.isSafeInteger(leaf.points))
        throw new Error(
          uiText(
            'Chưa xác nhận được giá dịch vụ. Vui lòng thử lại sau.',
            'The service price could not be confirmed. Please try again.',
          ),
        );
      assertDisplayedPrice(String(body.serviceId), body.promptDescriptor, leaf.points);
      const selection = await confirmReading(
        {
          ...quote,
          market: price.market,
          name: price.name || uiText('Luận giải AstroX', 'AstroX reading'),
          points: price.points,
        },
        signal,
      );
      body = { ...body, selection, expectedPoints: selection?.points };
    } else {
      assertDisplayedPrice(String(body.serviceId), body.promptDescriptor, price.points);
      await confirmReading(
        {
          market: price.market,
          name: price.name || uiText('Luận giải AstroX', 'AstroX reading'),
          points: price.points,
        },
        signal,
      );
      body = { ...body, expectedPoints: price.points };
    }
  } else body = { ...body, expectedPoints: 0 };
  assertOwner();
  const operation = await pendingAiOperation(ticket?.userId || 'guest', body);
  body = { ...body, operationId: operation.id, market: (await currentMarket(ticket?.userId ?? null)) ?? undefined };
  trackFeature('feature_start', String(body.serviceId || ''), 'ai', operation.id);
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(AI_BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, model: DEFAULT_MODEL }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (attempt < 1) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      throw new Error(
        uiText(
          'Không kết nối được máy chủ AstroX. Kiểm tra kết nối mạng và thử lại.',
          'Could not connect to AstroX. Check your connection and try again.',
        ),
      );
    }
    if (res && !res.ok) {
      const failure = await res
        .clone()
        .json()
        .catch(() => null);
      if (
        [
          'operation_refunded',
          'quote_changed',
          'price_changed',
          'insufficient_points',
          'purchase_in_progress',
        ].includes(failure?.code)
      ) {
        finishAiOperation(operation.key);
        break;
      }
    }
    if (res && [429, 500, 502, 503, 504].includes(res.status) && attempt < 1) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      await new Promise(r =>
        setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 10 ? retryAfter * 1000 : 1000),
      );
      continue;
    }
    break;
  }
  if (!res) throw new Error(uiText('Không kết nối được máy chủ AstroX.', 'Could not connect to AstroX.'));
  if (!res.ok) {
    if (price.status === 'paid') void import('./points').then(m => m.refreshPoints(true));
    let msg = String(res.status);
    try {
      const j = await res.json();
      if (['quote_changed', 'price_changed'].includes(j?.code || j?.error)) {
        window.dispatchEvent(new Event('astrox:price-changed'));
        throw new Error(
          uiText(
            'Giá dịch vụ vừa thay đổi. Vui lòng xem lại số Point trên nút trước khi tiếp tục.',
            'The service price changed. Please review the Credits shown on the button before continuing.',
          ),
        );
      }
      const detail = j.error || j.message;
      msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : msg;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Giá dịch vụ vừa thay đổi') || error.message.startsWith('The service price changed'))
      )
        throw error;
      /* giữ msg mặc định */
    }
    throw new Error(`${uiText('Lỗi dịch vụ AstroX', 'AstroX service error')} ${res.status}: ${msg}`);
  }
  const data = await res.json();
  assertOwner();
  if (Number.isSafeInteger(data.configRevision)) setPromptRevision(data.configRevision);
  const choice = data?.choices?.[0];
  const finish = choice?.finish_reason || choice?.finishReason;
  const content = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  if (content && content.trim() !== '') {
    if (typeof data.languagePolicyVersion === 'string') recordLanguageResult(content, data.languagePolicyVersion);
    if (Number.isSafeInteger(data.configRevision)) recordPromptResult(content, data.configRevision);
    if (finish !== 'length') {
      finishAiOperation(operation.key);
      void import('./points').then(m => m.refreshPoints(true));
      return content;
    }
    const ceiling = Math.max(Number(body.max_tokens) || 0, 2400);
    if (content.length / ceiling >= AI_PARTIAL_MIN_RATIO) {
      finishAiOperation(operation.key);
      if (price.status === 'paid') void import('./points').then(m => m.refreshPoints(true));
      return content;
    }
    throw new Error(uiText('AstroX dừng sớm (length).', 'The AstroX response ended early (length).'));
  }
  throw new Error(
    finish && finish !== 'stop'
      ? `${uiText('AstroX dừng sớm', 'AstroX ended early')} (${finish}).`
      : uiText('AstroX không trả về nội dung.', 'AstroX returned no content.'),
  );
}

/** Service id for the current path, including /en routes ("" when unknown). */
export function aiServiceIdForPath(pathname: string): string {
  const vi = routeModule(pathname);
  if (vi) return vi;
  const resolved = resolveRoute(pathname);
  return resolved ? resolved.id : '';
}

export async function callAiText(opts: {
  parts: AiPart[];
  compact?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  serviceId?: string;
  locale?: 'vi' | 'en';
}): Promise<string> {
  const temperature = opts.temperature === undefined ? 0.7 : opts.temperature;
  const compact = opts.compact === true;
  const AI_TOKEN_CEILING = compact ? 1500 : 16000;
  const maxTokens = opts.maxTokens ? Math.max(opts.maxTokens, AI_TOKEN_CEILING) : AI_TOKEN_CEILING;
  getState();
  const locale = opts.locale ?? currentUiLocale();
  const serviceId = opts.serviceId || aiServiceIdForPath(window.location.pathname) || undefined;
  const body = {
    operationId: crypto.randomUUID(),
    locale,
    promptDescriptor: readingPromptDescriptor(opts.parts?.[0]?.text || '', serviceId || '', locale),
    compact,
    serviceId,
    messages: [
      {
        role: 'system',
        content:
          (locale === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_BASE) +
          (compact
            ? locale === 'en'
              ? '\nWrite a concise response of 150–200 words.'
              : '\nViết NGẮN GỌN: tổng cộng tối thiểu 150 từ, tối đa 200 từ, đúng nội dung chính, không mở rộng.'
            : ''),
      },
      { role: 'user', content: aiParts(opts.parts || [], opts.serviceId === 'palm') },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onExternalAbort);
  if (opts.signal?.aborted) controller.abort();
  try {
    const text = await aiRequest(body, controller.signal);
    setState({ lastAiModel: DEFAULT_MODEL });
    return text;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function runAiPrompt(
  userQuestion: string,
  opts: {
    withChartImage?: boolean;
    compact?: boolean;
    temperature?: number;
    signal?: AbortSignal;
    serviceId?: string;
  } = {},
): Promise<string> {
  const state = getState();
  if (!state.profile)
    throw new Error(
      uiText(
        'Chưa có hồ sơ. Vui lòng lưu hồ sơ trước khi dùng AstroX.',
        'Please save your profile before using AstroX.',
      ),
    );
  const parts: AiPart[] = [{ text: userQuestion }];
  if (opts.withChartImage && state.chartImageBase64) {
    parts.push({ inline_data: { mime_type: state.chartImageMime || 'image/jpeg', data: state.chartImageBase64 } });
  }
  const result = await callAiText({
    parts,
    compact: opts.compact === true,
    temperature: opts.temperature,
    signal: opts.signal,
    serviceId: opts.serviceId,
  });
  // Captive: hồ sơ bị xoá giữa chừng (đăng xuất) thì huỷ kết quả.
  if (!getState().profile)
    throw new Error(
      uiText(
        'Hồ sơ đã bị xoá trong khi xử lý — đã huỷ kết quả.',
        'Your profile was removed during processing. The result was discarded.',
      ),
    );
  return result;
}

export async function fetchModuleAccessAstrox(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/module-access?market=${currentUiLocale() === 'en' ? 'US' : 'VN'}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.access) return data.access;
    }
  } catch {
    /* mặc định rỗng = cho phép */
  }
  return {};
}

export async function fetchMeWithPoints(): Promise<{
  user: AstroxUser | null;
  points: number;
  market?: 'VN' | 'US' | null;
}> {
  const res = await fetch(`${AUTH_API_BASE}/api/me`, { credentials: 'include' });
  if (res.status === 401) return { user: null, points: 0 };
  if (!res.ok)
    throw new Error(
      uiText('Không tải được tài khoản và số dư Point.', 'Unable to load your account and Credits balance.'),
    );
  const d = await res.json();
  if (d?.user && (await currentMarket(d.user.id)) === 'US') {
    const wallet = await fetch(`${AUTH_API_BASE}/api/credits/summary`, { credentials: 'include' });
    if (!wallet.ok) throw new Error('wallet_failed');
    const credits = await wallet.json();
    return { user: d.user, points: credits.available, market: 'US' };
  }
  return { user: d?.user || null, points: Number.isSafeInteger(d?.points) ? d.points : 0, market: 'VN' };
}

export interface TopupPackage {
  amount_vnd: number;
  points: number;
  label?: string;
}

export async function loadTopupPackages(): Promise<TopupPackage[]> {
  const res = await fetch(`${AUTH_API_BASE}/api/topup/packages`);
  const d = await res.json();
  if (!res.ok || !d?.packages?.length) return [];
  return d.packages;
}

export interface TopupOrder {
  points: number;
  amount_vnd: number;
  status: string;
  order_code?: number | string;
  amount_usd_cents?: number;
  created_at?: string;
}

export async function loadTopupHistory(): Promise<TopupOrder[]> {
  if ((await currentMarket()) === 'US') {
    const res = await fetch(`${AUTH_API_BASE}/api/lemon/history`, { credentials: 'include' });
    if (!res.ok) throw new Error('history_failed');
    return (await res.json()).orders;
  }
  const res = await fetch(`${AUTH_API_BASE}/api/topup/history`, { credentials: 'include' });
  if (!res.ok) throw new Error('history_failed');
  const d = await res.json();
  return d?.orders || [];
}

export interface PointTxn {
  id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

/** Lịch sử Point (ledger zalo_point_ledger) — nạp/cộng/trừ, phân trang cursor. */
export async function loadPointsHistory(
  cursor?: string,
): Promise<{ transactions: PointTxn[]; nextCursor: string | null }> {
  if ((await currentMarket()) === 'US') {
    const res = await fetch(
      `${AUTH_API_BASE}/api/credits/history${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error('history_failed');
    const d = await res.json();
    return {
      transactions: (d.entries || []).map(
        (r: {
          id: string;
          delta: number;
          kind: string;
          operation_key: string;
          source_order: string | null;
          created_at: string;
        }) => ({
          id: r.id,
          delta: r.delta,
          reason:
            r.kind === 'purchase'
              ? 'topup_payos'
              : r.kind === 'adjustment'
                ? 'admin_adjust'
                : r.kind === 'spend'
                  ? 'ai_service'
                  : r.kind === 'bonus'
                    ? r.operation_key?.startsWith('reward:')
                      ? r.operation_key.split(':')[1]
                      : 'bonus'
                    : r.kind,
          reference_id: r.source_order?.replace(/^lemon:/, '') ?? null,
          created_at: r.created_at,
        }),
      ),
      nextCursor: d.nextCursor || null,
    };
  }
  const res = await fetch(
    `${AUTH_API_BASE}/api/points/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { credentials: 'include' },
  );
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('history_failed');
  const d = await res.json();
  return { transactions: d?.transactions || [], nextCursor: d?.nextCursor || null };
}

/** Tạo lệnh nạp PayOS; trả về checkoutUrl hoặc mã lỗi promo. */
export async function createTopup(
  amountVnd: number,
  promoCode?: string,
): Promise<{ checkoutUrl?: string; error?: string; minAmountVnd?: number }> {
  const res = await fetch(`${AUTH_API_BASE}/api/topup/create`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_vnd: Number(amountVnd), promo_code: promoCode || undefined }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d?.checkoutUrl) {
    if (String(d?.error || '').startsWith('promo_') || d?.error === 'invalid_promo')
      return { error: d.error, minAmountVnd: d.min_amount_vnd };
    if (d?.error === 'payos_not_configured') return { error: 'payos' };
    return { error: 'create_failed' };
  }
  return { checkoutUrl: d.checkoutUrl };
}

export async function promoCheck(
  code: string,
  amountVnd?: number,
): Promise<{ ok: boolean; kind?: string; bonus?: number; error?: string; minAmountVnd?: number }> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/topup/promo-check`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promo_code: code, amount_vnd: amountVnd ?? 0 }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d?.ok) return { ok: true, kind: d.kind, bonus: d.bonus_points };
    return { ok: false, error: d?.error || 'invalid', minAmountVnd: d?.min_amount_vnd };
  } catch {
    return { ok: false, error: 'network' };
  }
}
export async function redeemPromo(
  code: string,
  requestKey: string,
): Promise<{ ok: boolean; points?: number; error?: string }> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/promos/redeem`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promo_code: code, request_key: requestKey }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok ? { ok: true, points: data.points } : { ok: false, error: data.error || 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/* ------------------------------------------------------------------ */
/* Rewards — điểm danh + giới thiệu (engine backend, cấu hình admin)   */
/* ------------------------------------------------------------------ */

export interface RewardsSummary {
  enabled: boolean;
  ads?: { enabled: boolean; points: number; dailyLimit: number; used: number; cooldownSeconds: number };
  attendance: {
    enabled: boolean;
    daily: number;
    lastDay: string | null;
    streak: number;
    claimed: number[];
    today: boolean;
    milestones: { day: number; points: number; inviterPoints?: number }[];
  };
  referral: {
    enabled: boolean;
    code: string;
    invited: number;
    earned: number;
    registrationInviter: number;
    registrationUser?: number;
    firstTopupMinVnd?: number;
    firstTopupEnabled: boolean;
    firstTopupInviter: number;
  };
}

export async function fetchRewardsSummary(): Promise<RewardsSummary> {
  const res = await fetch(`${AUTH_API_BASE}/api/rewards/summary`, { credentials: 'include' });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('rewards_failed');
  return await res.json();
}

export async function rewardsCheckin(): Promise<
  { ok: boolean; day: string; streak: number; points: number; milestones: number[] } | { error: string }
> {
  const res = await fetch(`${AUTH_API_BASE}/api/rewards/checkin`, { method: 'POST', credentials: 'include' });
  const d = await res.json().catch(() => ({}));
  if (res.ok && d?.ok) return d;
  return { error: d?.error || 'checkin_failed' };
}

export async function rewardedAdAction(
  action: 'start' | 'ready' | 'grant' | 'cancel',
  id?: string,
  signal?: AbortSignal,
): Promise<{ id: string; points: number; adUnit: string }> {
  const res = await fetch(`${AUTH_API_BASE}/api/rewards/ads/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(id ? { id } : {}),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      data.message ||
        (
          {
            ads_unavailable: uiText('Quảng cáo nhận Point chưa sẵn sàng.', 'Rewarded ads are not available yet.'),
            ad_not_ready: uiText('Chưa đủ điều kiện nhận thưởng.', 'Reward requirements have not been met.'),
            ad_session_expired_or_closed: uiText(
              'Phiên quảng cáo đã đóng hoặc hết hạn.',
              'The ad session has closed or expired.',
            ),
            unauthorized: uiText('Vui lòng đăng nhập lại.', 'Please sign in again.'),
          } as Record<string, string>
        )[data.error] ||
        uiText(
          'Chưa xác nhận được lượt quảng cáo. Vui lòng kiểm tra lịch sử Point trước khi thử lại.',
          'The reward could not be confirmed. Check your Credits history before retrying.',
        ),
    );
  return data;
}

/** US Credits top-up via Lemon (plan Task 15): server-owned checkout, client sends no price. */
export async function createLemonTopup(
  packageId: string,
  requestKey: string,
  promoCode?: string,
): Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; status?: string; error?: string }> {
  const res = await fetch(`${AUTH_API_BASE}/api/lemon/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packageId, requestKey, promoCode }),
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

/** Market preference of the signed-in account (server-stored); null when unset. */
let marketCache: Promise<'US' | 'VN' | null> | null = null;
let marketCacheAccount: string | null | undefined = undefined; // undefined = never fetched

/** Market preference is account-scoped: the cache is keyed by the active account
 *  id so login/logout/account-switch automatically invalidates it. */
export function currentMarket(account?: string | number | null): Promise<'US' | 'VN' | null> {
  const key = `${getAccountEpoch()}:${account != null ? String(account) : 'session'}`;
  if (marketCache === null || marketCacheAccount !== key) {
    marketCacheAccount = key;
    marketCache = fetch(`${AUTH_API_BASE}/api/market`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { market?: string } | null) => (d?.market === 'US' || d?.market === 'VN' ? d.market : null))
      .catch(() => null);
  }
  return marketCache;
}

/** Giá dịch vụ trả phí từ cấu hình đã publish — cache theo phiên tab. */
type PriceInfo = {
  market?: 'VN' | 'US';
  status: string;
  points: number;
  name?: string;
  policy?: string;
  unlocks?: boolean;
};
let priceCache: Promise<Record<string, PriceInfo>> | null = null;
let priceCacheKey = '';
export async function servicePrices(force = false): Promise<Record<string, PriceInfo>> {
  const market =
    (await currentMarket()) ??
    (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/en') ? 'US' : 'VN');
  const key = `${getAccountEpoch()}:${market}`;
  if (force || key !== priceCacheKey) {
    priceCache = null;
    priceCacheKey = key;
  }
  if (!priceCache) {
    priceCache = fetch(`/api/site-config?market=${market}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const map: Record<string, PriceInfo> = {};
        for (const s of d?.config?.billing?.services || []) {
          if (s && typeof s.id === 'string' && s.id)
            map[s.id] = {
              market,
              status: String(s.status || ''),
              points: Number(s.points) || 0,
              name: String(s.name || ''),
              policy: s.policy,
              unlocks: !!d?.config?.billing?.unlocks?.enabled,
            };
        }
        return map;
      })
      .catch(() => {
        priceCache = null;
        return {};
      });
  }
  return priceCache;
}
