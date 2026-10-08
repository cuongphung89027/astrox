export type TarotSelection = {
  status: 'selected' | 'needs_context' | 'unsupported_comparison';
  spreadId?: string;
  frameId?: string;
  reasonCode?: string;
  source: 'jev' | 'general' | 'manual' | 'fallback';
};
const spreads = ['one', 'three', 'cross5', 'relationship5', 'celtic10'];
const frames = ['ppf', 'sao', 'soa'];
export function tarotSelectionService(spreadId: string, frameId?: string) {
  if (!spreads.includes(spreadId) || (spreadId === 'three' && !frames.includes(frameId || '')))
    throw Error('invalid_selection');
  return spreadId === 'three' ? `tarot--three--${frameId}` : `tarot--${spreadId}`;
}
export function parseTarotSelection(value: unknown): TarotSelection {
  const data = value as TarotSelection | null;
  if (!data || !['jev', 'general'].includes(data.source)) throw Error('invalid_selection');
  if (data.status === 'needs_context' || data.status === 'unsupported_comparison')
    return { status: data.status, source: data.source };
  if (data.status !== 'selected' || typeof data.spreadId !== 'string') throw Error('invalid_selection');
  tarotSelectionService(data.spreadId, data.frameId);
  const reasons = ['focus', 'timeline', 'action', 'obstacle', 'perspective', 'relationship', 'depth', 'general'];
  if (!reasons.includes(data.reasonCode || '')) throw Error('invalid_selection');
  return {
    status: 'selected',
    spreadId: data.spreadId,
    frameId: data.frameId,
    reasonCode: data.reasonCode,
    source: data.source,
  };
}
export async function requestTarotSelection(
  input: { question: string; context: string; locale: 'vi' | 'en' },
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
) {
  signal.throwIfAborted();
  const response = await fetchImpl('/api/tarot/select', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, market: input.locale === 'en' ? 'US' : 'VN' }),
    signal,
  });
  if (!response.ok) throw Error(response.status === 429 ? 'rate_limited' : 'selection_unavailable');
  const data = await response.json();
  signal.throwIfAborted();
  return parseTarotSelection(data);
}
/** One lap plus settling steps. The itinerary never determines the decision. */
export function selectionTour(from: number, target: number) {
  const count = 5 + ((target - from + 5) % 5);
  return Array.from({ length: count }, (_, i) => ({
    index: (from + i + 1) % 5,
    delay: 130 + Math.round(130 * (i / count) ** 2),
  }));
}
export function selectionReason(code: string | undefined, en: boolean) {
  const copy: Record<string, [string, string]> = {
    focus: ['Một thông điệp cho điều bạn đang quan tâm.', 'One message for your present focus.'],
    timeline: ['Phù hợp để nhìn lại diễn biến và hướng đi.', 'A perspective on how things unfold over time.'],
    action: ['Phù hợp để tìm bước tiếp theo.', 'A perspective to help find your next step.'],
    obstacle: ['Làm rõ trở ngại và điều bạn có thể thay đổi.', 'Explore the obstacle and what you can change.'],
    perspective: ['Nhìn vấn đề từ những khía cạnh liên quan.', 'Explore the connected sides of this situation.'],
    relationship: [
      'Tìm hiểu góc nhìn của hai người và mối quan hệ.',
      'Explore both people and the relationship between them.',
    ],
    depth: ['Góc nhìn sâu cho nhiều yếu tố đang đan xen.', 'A deeper view of the factors at play.'],
    general: ['Thông điệp chung cho hiện tại.', 'A general message for the present.'],
    fallback: ['Khung tổng quát do bạn chọn.', 'A general structure you selected.'],
  };
  return copy[code || '']?.[en ? 1 : 0] || '';
}
