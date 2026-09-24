"use client";

/**
 * Lớp gọi API — port từ callAiText/runAiPrompt/aiHedgeRace + topup của
 * index.html. Toàn bộ chạy client-side (static export).
 */
import {trackFeature} from "./feature-telemetry";
import {confirmReading} from "./reading-consent";
import {pendingAiOperation,finishAiOperation} from "./ai-operation";
import { promptDescriptor } from "./managed-prompts";
import { AI_BASE, AUTH_API_BASE, DEFAULT_MODEL } from "./config";
import { getState, getAccountEpoch, setState, setPromptRevision, recordPromptResult } from "./state";
import type { AstroxUser } from "./types";
import { routeModule } from "../../../services/admin/modules.ts";

/* ------------------------------------------------------------------ */
/* AstroX                                                                  */
/* ------------------------------------------------------------------ */

const AI_REQUEST_TIMEOUT = 120000;
const AI_PARTIAL_MIN_RATIO = 0.25;

export const SYSTEM_PROMPT_BASE = `Bạn là một chuyên gia chiêm tinh & dịch lý kỳ cựu, viết tiếng Việt tự nhiên, thẳng thắn.
QUY TẮC BẮT BUỘC:
1. Chỉ luận giải dựa trên dữ liệu được cung cấp — KHÔNG tự bịa thêm dữ kiện không có trong dữ liệu.
2. Nếu ảnh mờ hoặc thiếu thông tin, nói rõ "không đọc được rõ phần này" thay vì đoán bừa.
3. Đi thẳng vào nội dung phân tích. CẤM chào hỏi mở đầu kiểu "Chào bạn/Cường ơi", CẤM đoạn kết disclaimer kiểu "đây chỉ là góc nhìn tham khảo", "không phải phán xét tuyệt đối", "hãy cân nhắc khi áp dụng".
4. Văn phong: đoạn ngắn, dùng **in đậm** cho tiêu đề nhỏ và gạch đầu dòng bằng dấu "-".
5. Không đưa dự đoán y tế, pháp lý, tài chính mang tính khẳng định tuyệt đối — dùng ngôn ngữ khả năng.
6. Trả lời đúng độ dài được yêu cầu, không lan man.
7. Gọi dịch vụ là AstroX. Dùng thuật ngữ "tứ trụ" trong Bát Tự. Giữ nguyên tên tiếng Anh gốc của các lá Tarot.`;

type AiPart = { text?: string; inline_data?: { mime_type?: string; data: string } };

function aiParts(parts: AiPart[]) {
  return parts
    .map((part) => {
      if (part && part.text != null) return { type: "text", text: String(part.text) };
      if (part && part.inline_data && part.inline_data.data) {
        return { type: "text", text: "[Ảnh lá số đính kèm để đối chiếu — dữ liệu JSON trong tin nhắn vẫn là nguồn chính.]" };
      }
      return null;
    })
    .filter(Boolean) as { type: "text"; text: string }[];
}

async function aiRequest(body: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const ownerEpoch=getAccountEpoch();
  const assertOwner=()=>{if(getAccountEpoch()!==ownerEpoch)throw new Error("Tài khoản đã thay đổi. Vui lòng mở lại lượt luận giải.");};
  const prices=await servicePrices(true),price=prices[String(body.serviceId||'')];
  if(!price)throw new Error("Chưa xác nhận được giá dịch vụ. Vui lòng thử lại sau.");
  if(price.status==='paid'){
    await confirmReading({name:price.name||'Luận giải AstroX',points:price.points},signal);
  }
  body={...body,expectedPoints:price.status==='paid'?price.points:0};
  assertOwner();
  // Fetch per operation; never persist the credential in localStorage.
  const auth=await fetch(`${AUTH_API_BASE}/api/ai/session`,{method:"POST",credentials:"include",signal});
  if(!auth.ok&&auth.status!==401)throw new Error("Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.");
  const ticket=auth.ok?await auth.json():null;
  const headers:Record<string,string>={"Content-Type":"application/json"};
  if(typeof ticket?.token==="string")headers.Authorization=`Bearer ${ticket.token}`;
  assertOwner();
  const operation=await pendingAiOperation(ticket?.userId||"guest",body);
  body={...body,operationId:operation.id};
  trackFeature("feature_start", String(body.serviceId || ""), "ai", operation.id);
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(AI_BASE, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, model: DEFAULT_MODEL }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw new Error("Không kết nối được máy chủ AstroX. Kiểm tra kết nối mạng và thử lại.");
    }
    if(res&&!res.ok){
      const failure=await res.clone().json().catch(()=>null);
      if(failure?.code==="operation_refunded"){finishAiOperation(operation.key);break;}
    }
    if (
      res &&
      [429, 500, 502, 503, 504].includes(res.status) &&
      attempt < 1
    ) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      await new Promise((r) =>
        setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 10 ? retryAfter * 1000 : 1000),
      );
      continue;
    }
    break;
  }
  if (!res) throw new Error("Không kết nối được máy chủ AstroX.");
  if (!res.ok) {
    let msg = String(res.status);
    try {
      const j = await res.json();
      const detail = j.error || j.message;
      msg = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : msg;
    } catch {
      /* giữ msg mặc định */
    }
    throw new Error(`Lỗi dịch vụ AstroX ${res.status}: ${msg}`);
  }
  const data = await res.json();
  assertOwner();
  if(Number.isSafeInteger(data.configRevision))setPromptRevision(data.configRevision);
  const choice = data?.choices?.[0];
  const finish = choice?.finish_reason || choice?.finishReason;
  const content = typeof choice?.message?.content === "string" ? choice.message.content : "";
  if (content && content.trim() !== "") {
    if(Number.isSafeInteger(data.configRevision))recordPromptResult(content,data.configRevision);
    if (finish !== "length") {finishAiOperation(operation.key);void import("./points").then(m=>m.refreshPoints(true));return content;}
    const ceiling = Math.max(Number(body.max_tokens) || 0, 2400);
    if (content.length / ceiling >= AI_PARTIAL_MIN_RATIO) {finishAiOperation(operation.key);return content;}
    throw new Error("AstroX dừng sớm (length).");
  }
  throw new Error(finish && finish !== "stop" ? `AstroX dừng sớm (${finish}).` : "AstroX không trả về nội dung.");
}

export async function callAiText(opts: {
  parts: AiPart[];
  compact?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  serviceId?: string;
}): Promise<string> {
  const temperature = opts.temperature === undefined ? 0.7 : opts.temperature;
  const compact = opts.compact === true;
  const AI_TOKEN_CEILING = compact ? 1500 : 16000;
  const maxTokens = opts.maxTokens ? Math.max(opts.maxTokens, AI_TOKEN_CEILING) : AI_TOKEN_CEILING;
  getState();
  const body = {
    operationId: crypto.randomUUID(),
    promptDescriptor: promptDescriptor(opts.parts?.[0]?.text || ""),
    compact,
    serviceId: opts.serviceId || routeModule(window.location.pathname) || undefined,
    messages: [
      {
        role: "system",
        content:
          SYSTEM_PROMPT_BASE +
          (compact
            ? "\nViết NGẮN GỌN: tổng cộng tối thiểu 150 từ, tối đa 200 từ, đúng nội dung chính, không mở rộng."
            : ""),
      },
      { role: "user", content: aiParts(opts.parts || []) },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort);
  if (opts.signal?.aborted) controller.abort();
  try {
    const text = await aiRequest(body, controller.signal);
    setState({ lastAiModel: DEFAULT_MODEL });
    return text;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export async function runAiPrompt(
  userQuestion: string,
  opts: { withChartImage?: boolean; compact?: boolean; temperature?: number; signal?: AbortSignal; serviceId?: string } = {},
): Promise<string> {
  const state = getState();
  if (!state.profile) throw new Error("Chưa có hồ sơ. Vui lòng lưu hồ sơ trước khi dùng AstroX.");
  const parts: AiPart[] = [{ text: userQuestion }];
  if (opts.withChartImage && state.chartImageBase64) {
    parts.push({ inline_data: { mime_type: state.chartImageMime || "image/jpeg", data: state.chartImageBase64 } });
  }
  const result = await callAiText({
    parts,
    compact: opts.compact === true,
    temperature: opts.temperature,
    signal: opts.signal,
    serviceId: opts.serviceId,
  });
  // Captive: hồ sơ bị xoá giữa chừng (đăng xuất) thì huỷ kết quả.
  if (!getState().profile) throw new Error("Hồ sơ đã bị xoá trong khi xử lý — đã huỷ kết quả.");
  return result;
}

/* ------------------------------------------------------------------ */
/* Auth AstroX (Zalo) + module access + topup                          */
/* ------------------------------------------------------------------ */

export async function fetchAstroxUser(): Promise<AstroxUser | null> {
  if (!AUTH_API_BASE) return null;
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function fetchModuleAccessAstrox(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/module-access`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data?.access) return data.access;
    }
  } catch {
    /* mặc định rỗng = cho phép */
  }
  return {};
}

export async function fetchMeWithPoints(): Promise<{ user: AstroxUser | null; points: number }> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      return { user: d?.user || null, points: d?.points || 0 };
    }
  } catch {
    /* bỏ qua */
  }
  return { user: null, points: 0 };
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
  order_code?: number;
  created_at?: string;
}

export async function loadTopupHistory(): Promise<TopupOrder[]> {
  const res = await fetch(`${AUTH_API_BASE}/api/topup/history`, { credentials: "include" });
  if (!res.ok) throw new Error("history_failed");
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
export async function loadPointsHistory(cursor?: string): Promise<{ transactions: PointTxn[]; nextCursor: string | null }> {
  const res = await fetch(`${AUTH_API_BASE}/api/points/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { credentials: "include" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("history_failed");
  const d = await res.json();
  return { transactions: d?.transactions || [], nextCursor: d?.nextCursor || null };
}

/** Tạo lệnh nạp PayOS; trả về checkoutUrl hoặc mã lỗi promo. */
export async function createTopup(amountVnd: number, promoCode?: string): Promise<{ checkoutUrl?: string; error?: string }> {
  const res = await fetch(`${AUTH_API_BASE}/api/topup/create`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount_vnd: Number(amountVnd), promo_code: promoCode || undefined }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d?.checkoutUrl) {
    if (["invalid_promo", "promo_expired", "promo_exhausted"].includes(d?.error)) return { error: "promo" };
    if (d?.error === "payos_not_configured") return { error: "payos" };
    return { error: "create_failed" };
  }
  return { checkoutUrl: d.checkoutUrl };
}

export async function promoCheck(code: string): Promise<{ ok: boolean; bonus?: number; error?: string }> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/topup/promo-check`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promo_code: code }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d?.ok) return { ok: true, bonus: d.bonus_points };
    return { ok: false, error: d?.error || "invalid" };
  } catch {
    return { ok: false, error: "network" };
  }
}

/* ------------------------------------------------------------------ */
/* Rewards — điểm danh + giới thiệu (engine backend, cấu hình admin)   */
/* ------------------------------------------------------------------ */

export interface RewardsSummary {
  enabled: boolean;
  ads?: {enabled:boolean;points:number;dailyLimit:number;used:number;cooldownSeconds:number};
  attendance: {
    enabled: boolean;
    daily: number;
    lastDay: string | null;
    streak: number;
    claimed: number[];
    today: boolean;
    milestones: { day: number; points: number; inviterPoints?:number }[];
  };
  referral: {
    enabled: boolean;
    code: string;
    invited: number;
    earned: number;
    registrationInviter: number;
    registrationUser?:number;
    firstTopupMinVnd?:number;
    firstTopupEnabled: boolean;
    firstTopupInviter: number;
  };
}

export async function fetchRewardsSummary(): Promise<RewardsSummary> {
  const res = await fetch(`${AUTH_API_BASE}/api/rewards/summary`, { credentials: "include" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("rewards_failed");
  return await res.json();
}

export async function rewardsCheckin(): Promise<{ ok: boolean; day: string; streak: number; points: number; milestones: number[] } | { error: string }> {
  const res = await fetch(`${AUTH_API_BASE}/api/rewards/checkin`, { method: "POST", credentials: "include" });
  const d = await res.json().catch(() => ({}));
  if (res.ok && d?.ok) return d;
  return { error: d?.error || "checkin_failed" };
}

export async function rewardedAdAction(action:'start'|'ready'|'grant'|'cancel',id?:string,signal?:AbortSignal):Promise<{id:string;points:number;adUnit:string}> {
 const res=await fetch(`${AUTH_API_BASE}/api/rewards/ads/${action}`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(id?{id}:{}),signal});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.message||({ads_unavailable:'Quảng cáo nhận Point chưa sẵn sàng.',ad_not_ready:'Chưa đủ điều kiện nhận thưởng.',ad_session_expired_or_closed:'Phiên quảng cáo đã đóng hoặc hết hạn.',unauthorized:'Vui lòng đăng nhập lại.'} as Record<string,string>)[data.error]||'Chưa xác nhận được lượt quảng cáo. Vui lòng kiểm tra lịch sử Point trước khi thử lại.');
 return data;
}

/** Giá dịch vụ trả phí từ cấu hình đã publish — cache theo phiên tab. */
type PriceInfo = { status: string; points: number; name?:string };
let priceCache: Promise<Record<string, PriceInfo>> | null = null;
export function servicePrices(force=false): Promise<Record<string, PriceInfo>> {
  if (force) priceCache=null;
  if (!priceCache) {
    priceCache = fetch("/api/site-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const map: Record<string, PriceInfo> = {};
        for (const s of d?.config?.billing?.services || []) {
          if (s && typeof s.id === "string" && s.id) map[s.id] = { status: String(s.status || ""), points: Number(s.points) || 0,name:String(s.name||"") };
        }
        return map;
      })
      .catch(() => {priceCache=null;return {};});
  }
  return priceCache;
}
