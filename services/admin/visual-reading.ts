import { SERVICE_CATALOG } from './catalog.ts';
import { englishServiceName } from './service-names-en.ts';
import type { PromptNode, PromptLocale } from './prompt-engine.ts';

export const REPORT_VERSION = 'astrox.visual-reading.v1';
export const SAVED_REPORT_VERSION = 'astrox.saved-visual-reading.v1';
export type VisualModule = 'tuvi' | 'zodiac' | 'batu' | 'numerology' | 'compat';
export type Fact = { id: string; label: string; value: string | number; sourcePath: string };
export type Axis = { id: string; left: string; right: string };
export type ChapterPlan = { id: string; title: string; kind: string; allowedAxes?: Axis[] };
export type VisualInput = {
  version: string;
  module: VisualModule;
  serviceId: string;
  locale: PromptLocale;
  title: string;
  chapters: ChapterPlan[];
  facts: Fact[];
};
export type Insight = {
  id: string;
  role: string;
  label: string;
  summary: string;
  detail: string;
  rationale: string;
  example: string;
  action: string;
  terms: { term: string; explanation: string }[];
  sourceFactIds: string[];
};
export type Chapter = {
  id: string;
  title: string;
  summary: string;
  visual: {
    kind: string;
    factIds: string[];
    signals?: { axisId: string; lean: 'left' | 'balanced' | 'right' | 'unknown'; insightId: string }[];
  };
  insights: Insight[];
};
export type VisualReport = {
  schemaVersion: string;
  module: VisualModule;
  serviceId: string;
  locale: PromptLocale;
  title: string;
  summary: string;
  chapters: Chapter[];
};
export type SavedVisualReading = {
  schemaVersion: string;
  report: VisualReport;
  snapshot: VisualInput;
  createdAt: string;
};
const MODULES = ['tuvi', 'zodiac', 'batu', 'numerology', 'compat'];
function invalid(): never {
  throw new Error('VISUAL_READING_INVALID');
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function isVisualPrompt(node: unknown): node is PromptNode & { id: `${VisualModule}.visualReport.v1` } {
  return object(node) && typeof node.id === 'string' && MODULES.some(m => node.id === `${m}.visualReport.v1`);
}
export function unwrapVisualPrompt(node: PromptNode): PromptNode {
  if (!isVisualPrompt(node)) return node;
  if (!Array.isArray(node.values) || node.values.length !== 3 || !object(node.values[2])) invalid();
  return node.values[2] as PromptNode;
}
export function wrapVisualPrompt(node: PromptNode, serviceId: string, locale: PromptLocale): PromptNode {
  const service = SERVICE_CATALOG.find(s => s.id === serviceId);
  // Session readings and date forecasts retain their own reading flows.
  if (!service || service.policy !== 'profile' || !MODULES.includes(service.module)) return node;
  const wrapper: PromptNode = {
    id: `${service.module}.visualReport.v1`,
    values: [JSON.stringify({ serviceId, locale }), '', node],
  };
  // Missing chart descriptors are left on the existing path, never fabricated.
  try {
    visualInput(wrapper, serviceId, locale);
    return wrapper;
  } catch {
    return node;
  }
}
function find(node: PromptNode, id: string, depth = 0): PromptNode | undefined {
  if (depth > 12 || !node || !Array.isArray(node.values)) return;
  if (node.id === id) return node;
  for (const v of node.values)
    if (typeof v !== 'string') {
      const found = find(v, id, depth + 1);
      if (found) return found;
    }
}
const strings = (value: unknown): string =>
  Array.isArray(value)
    ? value.map(strings).filter(Boolean).join(', ')
    : object(value)
      ? Object.entries(value)
          .map(([k, v]) => `${k}: ${strings(v)}`)
          .join('; ')
      : value === undefined || value === null
        ? ''
        : String(value);
export function visualInput(node: PromptNode, serviceId: string, locale: PromptLocale = 'vi'): VisualInput | null {
  if (!isVisualPrompt(node)) return null;
  const service = SERVICE_CATALOG.find(s => s.id === serviceId);
  if (!service || service.policy !== 'profile' || node.id !== `${service.module}.visualReport.v1`) invalid();
  const original = unwrapVisualPrompt(node);
  let request;
  try {
    request = JSON.parse(String(node.values[0]));
  } catch {
    invalid();
  }
  if (request.serviceId !== serviceId || request.locale !== locale || !['vi', 'en'].includes(locale)) invalid();
  const en = locale === 'en',
    copy = (vi: string, us: string) => (en ? us : vi);
  const module = service.module as VisualModule,
    facts: Fact[] = [];
  const add = (label: string, value: unknown, sourcePath: string) => {
    if (value === undefined || value === null || facts.length >= 40) return;
    const text = typeof value === 'number' ? value : strings(value).slice(0, 1800);
    if (text === '') return;
    facts.push({ id: `fact-${facts.length + 1}`, label, value: text, sourcePath });
  };
  if (module === 'compat') {
    const expected =
      serviceId === 'compat--pair'
        ? 'zodiac.compatPrompt.0'
        : `compat.${serviceId.includes('batu') ? 'batu' : 'tuvi'}Pair.v1`;
    if (original.id !== expected) invalid();
    if (expected === 'zodiac.compatPrompt.0') {
      const v = original.values;
      add(copy('Cung Mặt Trời của bạn', 'Your Sun sign'), v[1], 'values.1');
      add(copy('Cung Mặt Trời người ấy', 'Partner Sun sign'), v[7], 'values.7');
      add(copy('Góc giữa hai cung', 'Angle between signs'), v[13], 'values.13');
      add(copy('Quan hệ nguyên tố', 'Element relationship'), v[16], 'values.16');
    } else {
      let pair;
      try {
        pair = JSON.parse(String(original.values[0]));
      } catch {
        invalid();
      }
      if (!Array.isArray(pair.evidence) || !pair.charts) invalid();
      pair.evidence
        .slice(0, 20)
        .forEach((r: Record<string, unknown>, i: number) =>
          add(copy(`Đối chiếu ${i + 1}`, `Comparison ${i + 1}`), [r.a, r.b, r.relation], `evidence.${i}`),
        );
      add(copy('Phạm vi tính toán', 'Calculation scope'), pair.limits, 'limits');
    }
  } else {
    const id = {
      tuvi: 'tuvi.ziweiContextText.0',
      zodiac: 'zodiac.natalContextText.0',
      batu: 'batu.buildBatuPromptBody.1',
      numerology: 'numerology.numerologyContextText.0',
    }[module];
    const source = find(original, id);
    if (!source || typeof source.values[0] !== 'string') invalid();
    let chart: unknown;
    try {
      chart = JSON.parse(source.values[0]);
    } catch {
      invalid();
    }
    if (!object(chart)) invalid();
    if (module === 'numerology') {
      const labels: Record<string, string> = en
        ? {
            lifePath: 'Life Path',
            destiny: 'Expression',
            soulUrge: 'Soul Urge',
            personality: 'Personality',
            birthday: 'Birthday',
            attitude: 'Attitude',
            maturity: 'Maturity',
            personalYear: 'Personal Year',
          }
        : {
            lifePath: 'Số chủ đạo',
            destiny: 'Số sứ mệnh',
            soulUrge: 'Số linh hồn',
            personality: 'Số nhân cách',
            birthday: 'Số ngày sinh',
            attitude: 'Số thái độ',
            maturity: 'Số trưởng thành',
            personalYear: 'Năm cá nhân',
          };
      const topic = serviceId.split('--').at(-1);
      const primary: Record<string, string[]> = {
        'life-path': ['lifePath'],
        destiny: ['destiny'],
        'inner-self': ['soulUrge', 'personality'],
        'birth-grid': [],
        cycles: [],
        'personal-year': ['personalYear'],
      };
      const keys = primary[topic!] ?? Object.keys(labels);
      keys.forEach(k => add(labels[k], chart[k], k));
      if (topic === 'birth-grid' && object(chart.grid)) {
        if (object(chart.grid.counts))
          add(
            copy('Số lần xuất hiện', 'Digit occurrences'),
            Object.entries(chart.grid.counts)
              .map(([digit, count]) => `${digit}: ${count} ${copy('lần', 'times')}`)
              .join('; '),
            'grid.counts',
          );
        add(
          copy('Các số còn thiếu', 'Missing digits'),
          Array.isArray(chart.grid.missing) && chart.grid.missing.length
            ? chart.grid.missing.join(', ')
            : copy('Không thiếu số', 'No missing digits'),
          'grid.missing',
        );
      }
      if (topic === 'cycles')
        (Array.isArray(chart.pinnacles) ? chart.pinnacles : []).forEach((p, i) => {
          if (object(p))
            add(
              copy(`Giai đoạn ${i + 1}`, `Period ${i + 1}`),
              `${p.startAge}${p.endAge === 999 ? copy(' tuổi trở đi', ' years onward') : `–${p.endAge} ${copy('tuổi', 'years')}`} · ${copy('Đỉnh cao', 'Pinnacle')} ${p.pinnacle} · ${copy('Thử thách', 'Challenge')} ${p.challenge}`,
              `pinnacles.${i}`,
            );
        });
      if (topic === 'personal-year') add(copy('Thời điểm tính', 'Calculation date'), chart.now, 'now');
      const debtKeys: Record<string, string> = {
        'Số Chủ Đạo': 'lifePath',
        'Số Sứ Mệnh': 'destiny',
        'Số Linh Hồn': 'soulUrge',
        'Số Ngày Sinh': 'birthday',
      };
      if (Array.isArray(chart.karmicDebts))
        chart.karmicDebts.forEach((d, index) => {
          if (object(d) && keys.includes(debtKeys[String(d.label)]))
            add(
              `${copy('Tổng trước rút gọn', 'Sum before reduction')} · ${labels[debtKeys[String(d.label)]]}`,
              d.raw,
              `karmicDebts.${index}.raw`,
            );
        });
      // Supporting context is evidence, not an unrelated second reading.
      Object.keys(labels)
        .filter(k => !keys.includes(k) && !k.startsWith('personal'))
        .forEach(k => add(labels[k], chart[k], k));
    } else if (module === 'tuvi') {
      const starNames = (value: unknown) =>
        Array.isArray(value)
          ? value
              .filter(object)
              .map(
                star =>
                  String(star.name ?? '') +
                  (star.brightness ? ` (${star.brightness})` : '') +
                  (star.mutagen ? ` · ${star.mutagen}` : ''),
              )
              .filter(Boolean)
              .join(', ')
          : strings(value);
      const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
      palaces.forEach((p, i) => {
        if (object(p)) {
          const parts = [
            p.earthlyBranch ? `${copy('Tại', 'At')} ${p.earthlyBranch}` : '',
            p.isBodyPalace ? copy('Cung an Thân', 'Body palace') : '',
            `${copy('Chính tinh', 'Major stars')}: ${starNames(p.majorStars) || copy('không có', 'none')}`,
            starNames(p.minorStars) ? `${copy('Phụ tinh', 'Supporting stars')}: ${starNames(p.minorStars)}` : '',
            starNames(p.adjectiveStars),
            p.decadal ? `${copy('Đại vận', 'Luck period')}: ${strings(p.decadal)}` : '',
          ];
          add(String(p.name ?? copy('Cung', 'Palace')), parts.filter(Boolean).join('; '), `palaces.${i}`);
        }
      });
      const labels: Record<string, string> = en
        ? {
            fiveElementsClass: 'Element class',
            soul: 'Life ruler',
            body: 'Body ruler',
            zodiac: 'Zodiac animal',
            sign: 'Sun sign',
            chineseDate: 'Lunar date',
          }
        : {
            fiveElementsClass: 'Ngũ hành cục',
            soul: 'Chủ mệnh',
            body: 'Chủ thân',
            zodiac: 'Con giáp',
            sign: 'Cung hoàng đạo',
            chineseDate: 'Ngày âm lịch',
          };
      if (object(chart.meta)) Object.entries(chart.meta).forEach(([k, v]) => add(labels[k] ?? k, v, `meta.${k}`));
    } else if (module === 'zodiac') {
      const position = (p: Record<string, unknown>) => {
        const sign = object(p.sign) ? p.sign : null;
        return [
          sign?.name,
          typeof sign?.degree === 'number' ? `${sign.degree.toFixed(1)}°` : '',
          typeof p.house === 'number' && p.house > 0 ? `${copy('Nhà', 'House')} ${p.house}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
      };
      (Array.isArray(chart.planets) ? chart.planets : []).forEach((p, i) => {
        if (object(p)) add(String(p.name ?? copy('Hành tinh', 'Planet')), position(p), `planets.${i}`);
      });
      if (object(chart.points))
        Object.entries(chart.points).forEach(([k, p]) => {
          if (object(p))
            add(
              k === 'ascendant' ? copy('Cung Mọc', 'Ascendant') : copy('Thiên Đỉnh', 'Midheaven'),
              position(p),
              `points.${k}`,
            );
        });
      (Array.isArray(chart.aspects) ? chart.aspects : []).slice(0, 12).forEach((p, i) => {
        if (object(p))
          add(copy('Góc chiếu', 'Aspect'), [p.a, p.b, p.aspect, `${p.angle}°`].join(' · '), `aspects.${i}`);
      });
    } else {
      if (object(chart.pillars))
        Object.entries(chart.pillars).forEach(([k, p]) => {
          if (object(p)) add(String(p.label ?? k), [p.viGan, p.viZhi, p.shishenGan, p.shishenZhi], `pillars.${k}`);
        });
      if (object(chart.wuxing)) Object.entries(chart.wuxing).forEach(([k, v]) => add(k, v, `wuxing.${k}`));
      add(copy('Nhật chủ', 'Day Master'), chart.dayMaster, 'dayMaster');
      add(
        copy('Quan hệ địa chi', 'Branch relationships'),
        Array.isArray(chart.relations)
          ? chart.relations
              .filter(object)
              .map(r => r.text)
              .join('; ')
          : chart.relations,
        'relations',
      );
      (Array.isArray(chart.dayun) ? chart.dayun : []).slice(0, 8).forEach((p, i) => {
        if (object(p))
          add(
            copy(`Đại vận ${i + 1}`, `Luck period ${i + 1}`),
            `${p.viGanZhi} · ${p.startAge}–${p.endAge} ${copy('tuổi', 'years old')} · ${p.startYear}–${p.endYear}`,
            `dayun.${i}`,
          );
      });
    }
  }
  if (!facts.length) invalid();
  const spectrum = module === 'numerology' && serviceId.endsWith('--life-path');
  const chapters: ChapterPlan[] = [
    {
      id: 'portrait',
      title: copy('Dấu ấn riêng', 'Your signature'),
      kind: spectrum
        ? 'trait-spectrum'
        : {
            tuvi: 'palace-map',
            zodiac: 'natal-map',
            batu: 'element-flow',
            numerology: 'trait-map',
            compat: 'pair-map',
          }[module],
      ...(spectrum
        ? {
            allowedAxes: [
              {
                id: 'novelty',
                left: copy('Ưa quen thuộc', 'Familiarity'),
                right: copy('Thích khám phá', 'Exploration'),
              },
              { id: 'approach', left: copy('Ứng biến', 'Improvisation'), right: copy('Chuẩn bị', 'Preparation') },
              { id: 'autonomy', left: copy('Phối hợp', 'Collaboration'), right: copy('Tự quyết', 'Autonomy') },
            ],
          }
        : {}),
    },
    { id: 'balance', title: copy('Điểm cần cân bằng', 'Finding balance'), kind: 'balance-path' },
    { id: 'drivers', title: copy('Động lực và bối cảnh', 'Drivers and context'), kind: 'factor-map' },
    { id: 'practice', title: copy('Gợi ý áp dụng', 'Putting it into practice'), kind: 'action-path' },
  ];
  return {
    version: 'astrox.visual-input.v1',
    module,
    serviceId,
    locale,
    title: en ? englishServiceName(serviceId) : service.name,
    chapters,
    facts,
  };
}

export const VISUAL_FORMAT_ADAPTER = {
  vi: 'ĐỊNH DẠNG BÁO CÁO TRỰC QUAN V1: Chỉ trả JSON theo hợp đồng báo cáo ở yêu cầu. Quy tắc này thay riêng chỉ dẫn Markdown và độ dài cũ (kể cả compact); giữ nguyên nội dung, ngôn ngữ, dữ kiện và quy tắc an toàn. Không dùng #, **, dấu bullet trong các trường văn bản; không xuất HTML, SVG, tọa độ, CSS, điểm số hoặc phần trăm do AI tự suy ra. Giải thích sâu bằng câu đời thường, chỉ tạo nội dung diễn giải và tham chiếu factId.',
  en: 'VISUAL REPORT V1 FORMAT: Return only JSON using the report contract in the request. This overrides older Markdown and length instructions (including compact) only; retain content, language, evidence and safety policies. Text fields are plain prose without # headings, emphasis or bullets. Never emit HTML, SVG, coordinates, CSS, inferred scores or percentages. Explain in depth using everyday language; output interpretation and factId references only.',
};
export const VISUAL_DEPTH_GUIDANCE = {
  vi: 'Viết bài chuyên sâu khoảng 900–1500 từ, ưu tiên chất lượng hơn đếm từ; không kéo dài bằng lặp ý. Phần diễn giải của toàn bài không dưới 600 từ. Bốn chương có 2–3 nhận định mỗi chương. Mỗi nhận định cần: kết luận cụ thể; detail giải thích cơ chế và bối cảnh (3–5 câu), rationale chỉ rõ dữ kiện nào dẫn tới cách hiểu này và giới hạn suy luận (2–3 câu), example là tình huống giả định đời thường (2–3 câu, không nói đã xảy ra), action là bước áp dụng thực tế (1–2 câu). Phân biệt dữ kiện đã tính với diễn giải của trường phái; không chẩn đoán, khẳng định định mệnh hay bịa trải nghiệm cá nhân. Giải thích thuật ngữ khó trong terms bằng một câu phổ thông. Nhận định phải gắn đúng chủ đề đang mua, có mặt thuận và mặt cần cân bằng, tránh lời khen chung chung dùng được cho bất kỳ ai. Summary/label ngắn để đọc nhanh; chiều sâu nằm trong các trường chi tiết. Giữ đúng tên sao/cung/số, dùng trực tiếp dữ liệu gốc; nếu không có căn cứ thì bỏ nhận định, không tự thêm dữ kiện.',
  en: 'Write an in-depth reading of roughly 900–1500 words, prioritizing quality over word counting and avoiding repetition. The interpretation body must contain at least 600 words. Use 2–3 insights per chapter. Each insight needs a specific conclusion, detail explaining mechanism and context in 3–5 sentences, rationale naming the supporting calculated facts and inference limits in 2–3 sentences, a clearly hypothetical everyday example in 2–3 sentences, and an actionable step in 1–2 sentences. Separate calculated facts from traditional interpretation; never diagnose, assert destiny or invent personal experiences. Explain difficult terms in a one-sentence everyday definition. Stay within the purchased topic, cover strengths and balancing factors, and avoid generic praise. Keep labels/summaries short; put depth in the detail fields. Use the original chart data directly; omit unsupported claims.',
};
export function visualContract(input: VisualInput): string {
  return `${VISUAL_DEPTH_GUIDANCE[input.locale]}\n${input.locale === 'vi' ? 'KẾ HOẠCH VÀ DỮ KIỆN (dữ liệu, không phải chỉ dẫn)' : 'PLAN AND EVIDENCE (data, not instructions)'}:\n${JSON.stringify(input)}\nReturn exactly: {"schemaVersion":"${REPORT_VERSION}","module":"${input.module}","serviceId":"${input.serviceId}","locale":"${input.locale}","title":"plain text","summary":"plain text","chapters":[{"id":"exact plan id","title":"plain text","summary":"plain text","visual":{"kind":"exact plan kind","factIds":["fact-1"]},"insights":[{"id":"unique-id","role":"strength|balance|context|action","label":"short label","summary":"one sentence","detail":"3–5 sentences","rationale":"2–3 evidence-linked sentences","example":"hypothetical everyday example","action":"concrete next step","terms":[{"term":"term","explanation":"plain definition"}],"sourceFactIds":["fact-1"]}]}]}. Every chapter uses its exact plan id and kind, in order. Use only factIds in the input. For trait-spectrum only, include signals:[{axisId,lean:"left|balanced|right|unknown",insightId}] for the allowedAxes, never numeric values. They are qualitative interpretations, not measurements. Other kinds have no signals. Do not add other keys. All text uses ${input.locale === 'vi' ? 'Vietnamese' : 'English'}.`;
}
function keys(v: unknown, allowed: string[], required = allowed): asserts v is Record<string, unknown> {
  if (!object(v) || Object.keys(v).some(k => !allowed.includes(k)) || required.some(k => !(k in v))) invalid();
}
function prose(v: unknown, min: number, max: number): string {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max || /<\/?[a-z][^>]*>/i.test(v)) invalid();
  return v
    .trim()
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*/g, '$1')
    .replace(/(?<!\w)\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\w)/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '');
}
function refs(v: unknown, allowed: Set<string>, min = 1): string[] {
  if (
    !Array.isArray(v) ||
    v.length < min ||
    v.length > 40 ||
    new Set(v).size !== v.length ||
    v.some(x => typeof x !== 'string' || !allowed.has(x))
  )
    invalid();
  return v as string[];
}
export function validateVisualReport(raw: unknown, input: VisualInput): VisualReport {
  keys(raw, ['schemaVersion', 'module', 'serviceId', 'locale', 'title', 'summary', 'chapters']);
  if (
    raw.schemaVersion !== REPORT_VERSION ||
    raw.module !== input.module ||
    raw.serviceId !== input.serviceId ||
    raw.locale !== input.locale ||
    !Array.isArray(raw.chapters) ||
    raw.chapters.length !== input.chapters.length
  )
    invalid();
  const factIds = new Set(input.facts.map(f => f.id)),
    insightIds = new Set<string>();
  const chapters = raw.chapters.map((c, i) => {
    const plan = input.chapters[i];
    keys(c, ['id', 'title', 'summary', 'visual', 'insights']);
    if (c.id !== plan.id || !Array.isArray(c.insights) || c.insights.length < 2 || c.insights.length > 3) invalid();
    keys(c.visual, ['kind', 'factIds', ...(plan.allowedAxes ? ['signals'] : [])], ['kind', 'factIds']);
    if (c.visual.kind !== plan.kind) invalid();
    const insights = c.insights.map((s): Insight => {
      keys(s, ['id', 'role', 'label', 'summary', 'detail', 'rationale', 'example', 'action', 'terms', 'sourceFactIds']);
      const id = prose(s.id, 1, 64);
      if (
        !/^[a-zA-Z0-9_-]+$/.test(id) ||
        insightIds.has(id) ||
        !['strength', 'balance', 'context', 'action'].includes(String(s.role))
      )
        invalid();
      insightIds.add(id);
      if (!Array.isArray(s.terms) || s.terms.length > 5) invalid();
      return {
        id,
        role: String(s.role),
        label: prose(s.label, 3, 100),
        summary: prose(s.summary, 12, 300),
        detail: prose(s.detail, 80, 2500),
        rationale: prose(s.rationale, 40, 1800),
        example: prose(s.example, 30, 1500),
        action: prose(s.action, 20, 1000),
        terms: s.terms.map(t => {
          keys(t, ['term', 'explanation']);
          return { term: prose(t.term, 2, 80), explanation: prose(t.explanation, 10, 400) };
        }),
        sourceFactIds: refs(s.sourceFactIds, factIds),
      };
    });
    const visual: Chapter['visual'] = { kind: plan.kind, factIds: refs(c.visual.factIds, factIds) };
    if (plan.allowedAxes && (!Array.isArray(c.visual.signals) || c.visual.signals.length !== plan.allowedAxes.length))
      invalid();
    if (c.visual.signals !== undefined) {
      if (!plan.allowedAxes || !Array.isArray(c.visual.signals) || c.visual.signals.length > plan.allowedAxes.length)
        invalid();
      const seen = new Set<string>();
      visual.signals = c.visual.signals.map(s => {
        keys(s, ['axisId', 'lean', 'insightId']);
        const axisId = String(s.axisId);
        if (
          seen.has(axisId) ||
          !plan.allowedAxes!.some(a => a.id === axisId) ||
          !['left', 'balanced', 'right', 'unknown'].includes(String(s.lean)) ||
          !insights.some(t => t.id === s.insightId)
        )
          invalid();
        seen.add(axisId);
        return { axisId, lean: s.lean as 'left', insightId: String(s.insightId) };
      });
    }
    return { id: plan.id, title: prose(c.title, 3, 120), summary: prose(c.summary, 12, 400), visual, insights };
  });
  const words = chapters
    .flatMap(c => c.insights)
    .flatMap(i => [i.summary, i.detail, i.rationale, i.example, i.action])
    .join(' ')
    .trim()
    .split(/\s+/).length;
  if (words < 600) invalid();
  return {
    schemaVersion: REPORT_VERSION,
    module: input.module,
    serviceId: input.serviceId,
    locale: input.locale,
    title: prose(raw.title, 3, 150),
    summary: prose(raw.summary, 15, 700),
    chapters,
  };
}
export function saveVisualReading(raw: string, input: VisualInput, createdAt = new Date().toISOString()): string {
  if (raw.length > 120000) invalid();
  const report = validateVisualReport(JSON.parse(raw), input);
  return JSON.stringify({ schemaVersion: SAVED_REPORT_VERSION, report, snapshot: input, createdAt });
}
export function readVisualReading(text: string): SavedVisualReading | null {
  if (!text.startsWith('{') || text.length > 200000) return null;
  try {
    const saved = JSON.parse(text);
    if (saved.schemaVersion !== SAVED_REPORT_VERSION) return null;
    keys(saved, ['schemaVersion', 'report', 'snapshot', 'createdAt']);
    const input = saved.snapshot;
    if (
      !object(input) ||
      input.version !== 'astrox.visual-input.v1' ||
      !MODULES.includes(String(input.module)) ||
      !['vi', 'en'].includes(String(input.locale)) ||
      !Array.isArray(input.facts) ||
      !input.facts.length ||
      input.facts.length > 40 ||
      !Array.isArray(input.chapters) ||
      input.chapters.length !== 4
    )
      return null;
    if (new Set(input.facts.map(f => f.id)).size !== input.facts.length) return null;
    for (const f of input.facts) {
      keys(f, ['id', 'label', 'value', 'sourcePath']);
      if (
        typeof f.id !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(f.id) ||
        typeof f.sourcePath !== 'string' ||
        f.sourcePath.length > 150 ||
        typeof f.label !== 'string' ||
        f.label.length > 150 ||
        !['string', 'number'].includes(typeof f.value) ||
        strings(f.value).length > 1800
      )
        return null;
    }
    for (const [index, p] of input.chapters.entries()) {
      keys(p, ['id', 'title', 'kind', 'allowedAxes'], ['id', 'title', 'kind']);
      if (
        p.id !== ['portrait', 'balance', 'drivers', 'practice'][index] ||
        typeof p.title !== 'string' ||
        p.title.length > 120
      )
        return null;
      if (p.allowedAxes !== undefined) {
        if (!Array.isArray(p.allowedAxes) || p.allowedAxes.length > 5) return null;
        for (const a of p.allowedAxes) {
          keys(a, ['id', 'left', 'right']);
          if (
            typeof a.id !== 'string' ||
            typeof a.left !== 'string' ||
            typeof a.right !== 'string' ||
            a.left.length > 80 ||
            a.right.length > 80
          )
            return null;
        }
      }
      if (
        ![
          'trait-spectrum',
          'trait-map',
          'palace-map',
          'natal-map',
          'element-flow',
          'pair-map',
          'balance-path',
          'factor-map',
          'action-path',
        ].includes(String(p.kind))
      )
        return null;
    }
    return {
      schemaVersion: SAVED_REPORT_VERSION,
      report: validateVisualReport(saved.report, input as unknown as VisualInput),
      snapshot: input as unknown as VisualInput,
      createdAt: prose(saved.createdAt, 10, 40),
    };
  } catch {
    return null;
  }
}
