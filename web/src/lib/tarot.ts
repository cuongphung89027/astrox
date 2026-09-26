import { managedPrompt, managedJoin } from "./managed-prompts";
/**
 * Tarot — port trung thực từ index.html (MODULE — TAROT): bộ bài, kiểu trải,
 * rút bài ngẫu nhiên + chiều xuôi/ngược, prompt luận giải AI và khoá cache.
 * Ảnh từng bộ: /assets/tarot/{deck}/{id}.webp + back.webp (shiba, raccoon);
 * dữ liệu lá: fetch runtime /assets/tarot/cards.json (như app cũ).
 */

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu                                                        */
/* ------------------------------------------------------------------ */

export interface TarotMeaning {
  kw: string[];
  text: string;
}

export interface TarotCard {
  id: string;
  arcana: "major" | "minor" | string;
  suit: string | null;
  number: number | null;
  nameEn: string;
  nameVi: string;
  up: TarotMeaning;
  rev: TarotMeaning;
}

export interface TarotDeck {
  id: string;
  name: string;
  nameVi: string;
  status: "available" | "soon";
  base: string;
  ext: string;
  back: string;
  desc: string;
  /** Bộ vừa ra mắt — DeckPicker gắn nhãn "Mới" trên slide. */
  isNew?: boolean;
}

export interface TarotFrame {
  id: string;
  label: string;
  positions: string[];
}

export interface TarotSpread {
  id: string;
  name: string;
  count: number;
  layout: "row" | "cross5" | "5rel" | "celtic";
  desc: string;
  /** Trải 3 lá dùng frames — positions để trống như app cũ. */
  positions?: { label: string }[];
  frames?: TarotFrame[];
}

export interface DrawnCard {
  id: string;
  reversed: boolean;
}

/* ------------------------------------------------------------------ */
/* Bộ bài + kiểu trải (port TAROT_DECKS / TAROT_SPREADS)               */
/* ------------------------------------------------------------------ */

export const TAROT_DECKS: TarotDeck[] = [
  {
    id: "shiba",
    name: "The Shiba Tarot",
    nameVi: "Tarot Chó Shiba",
    status: "available",
    base: "/assets/tarot/shiba/",
    ext: ".webp",
    back: "/assets/tarot/shiba/back.webp",
    desc: "Chú Shiba phiêu bạt giữa núi non và hoa đào theo phong cách tranh khắc gỗ Nhật Bản.",
    isNew: true,
  },
  {
    id: "raccoon",
    name: "The Raccoon Tarot",
    nameVi: "Tarot Gấu Mèo",
    status: "available",
    base: "/assets/tarot/raccoon/",
    ext: ".webp",
    back: "/assets/tarot/raccoon/back.webp",
    desc: "Bộ bài kinh điển — chú gấu mèo ấm áp giữa khung cảnh đồng quê mùa thu.",
  },

];

export const TAROT_SPREADS: TarotSpread[] = [
  {
    id: "one",
    name: "Rút 1 lá",
    count: 1,
    layout: "row",
    desc: "Trả lời nhanh, rõ ràng cho một câu hỏi cụ thể.",
    positions: [{ label: "Thông điệp" }],
  },
  {
    id: "three",
    name: "Trải 3 lá",
    count: 3,
    layout: "row",
    desc: "Trải phổ biến nhất — chọn khung diễn giải bên dưới.",
    frames: [
      { id: "ppf", label: "Quá khứ – Hiện tại – Tương lai", positions: ["Quá khứ", "Hiện tại", "Tương lai"] },
      { id: "sao", label: "Tình huống – Hành động – Kết quả", positions: ["Tình huống", "Hành động", "Kết quả"] },
      { id: "soa", label: "Bản thân – Trở ngại – Lời khuyên", positions: ["Bản thân", "Trở ngại", "Lời khuyên"] },
    ],
  },
  {
    id: "cross5",
    name: "Thánh Giá Đơn Giản",
    count: 5,
    layout: "cross5",
    desc: "Tổng quan hiện tại, thách thức, nền tảng và xu hướng kết quả.",
    positions: [
      { label: "Hiện tại" },
      { label: "Thách thức" },
      { label: "Nền tảng (quá khứ gần)" },
      { label: "Định hướng (tương lai gần)" },
      { label: "Kết quả" },
    ],
  },
  {
    id: "relationship5",
    name: "Tình Yêu & Mối Quan Hệ",
    count: 5,
    layout: "5rel",
    desc: "Khám phá động lực giữa bạn và đối phương trong một mối quan hệ.",
    positions: [
      { label: "Bạn" },
      { label: "Đối phương" },
      { label: "Nền tảng mối quan hệ" },
      { label: "Thách thức chung" },
      { label: "Tiềm năng / hướng đi" },
    ],
  },
  {
    id: "celtic10",
    name: "Celtic Cross",
    count: 10,
    layout: "celtic",
    desc: "Trải chuyên sâu 10 lá cho vấn đề phức tạp, nhiều tầng lớp.",
    positions: [
      { label: "Hiện tại" },
      { label: "Thách thức" },
      { label: "Nền tảng / tiềm thức" },
      { label: "Quá khứ gần" },
      { label: "Mục tiêu / điều mong muốn" },
      { label: "Tương lai gần" },
      { label: "Bản thân / thái độ" },
      { label: "Ảnh hưởng ngoại cảnh" },
      { label: "Hy vọng & lo sợ" },
      { label: "Kết quả cuối cùng" },
    ],
  },
];

export function tarotDeckById(id: string): TarotDeck | undefined {
  return TAROT_DECKS.find((d) => d.id === id);
}

export function tarotSpreadById(id: string): TarotSpread | undefined {
  return TAROT_SPREADS.find((s) => s.id === id);
}

/** Vị trí của trải bài theo khung diễn giải đang chọn (port tarotPositionsForFlow). */
export function tarotPositionsForFlow(spread: TarotSpread, frameId: string): string[] {
  if (spread.id === "three") {
    const frame = spread.frames?.find((f) => f.id === frameId) || spread.frames?.[0];
    if (frame) return frame.positions;
  }
  return (spread.positions ?? []).map((p) => p.label);
}

/* ------------------------------------------------------------------ */
/* Dữ liệu lá bài (fetch runtime như app cũ — tarotCardsPromise)       */
/* ------------------------------------------------------------------ */

let tarotCardsData: TarotCard[] | null = null;
let tarotCardsPromise: Promise<TarotCard[]> | null = null;

export function peekTarotCards(): TarotCard[] | null {
  return tarotCardsData;
}

export function loadTarotCards(): Promise<TarotCard[]> {
  if (tarotCardsData) return Promise.resolve(tarotCardsData);
  if (tarotCardsPromise) return tarotCardsPromise;
  tarotCardsPromise = fetch("/assets/tarot/cards.json")
    .then((r) => {
      if (!r.ok) throw new Error(`http ${r.status}`);
      return r.json() as Promise<TarotCard[]>;
    })
    .then((data) => {
      tarotCardsData = data;
      return data;
    })
    .catch((e) => {
      tarotCardsPromise = null; // cho phép retry ở lần gọi sau
      throw e;
    });
  return tarotCardsPromise;
}

export function tarotCardById(id: string): TarotCard | undefined {
  return (tarotCardsData || []).find((c) => c.id === id);
}

export function tarotCardImage(deck: TarotDeck, id: string): string {
  return `${deck.base}${id}${deck.ext}`;
}

/* ------------------------------------------------------------------ */
/* Rút bài (port startTarotDraw: xáo Fisher–Yates + ngẫu nhiên ngược)  */
/* ------------------------------------------------------------------ */

export function drawCards(cards: TarotCard[], count: number): DrawnCard[] {
  const idx = Array.from({ length: cards.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count).map((i) => ({ id: cards[i].id, reversed: Math.random() < 0.5 }));
}

/* ------------------------------------------------------------------ */
/* Cache key (port stableHash của app cũ) + prompt luận giải           */
/* ------------------------------------------------------------------ */

export function tarotCacheKey(value: string): string {
  const hash = (seed: number) => {
    let h = seed;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return hash(2166136261) + hash(374761393) + hash(668265263) + hash(2246822519);
}

export interface TarotPromptInput {
  spread: TarotSpread;
  frameLabel?: string;
  deck: TarotDeck;
  question: string;
  cards: DrawnCard[];
  positionLabels: string[];
  profileContext?: string;
}

export function buildTarotPrompt(input: TarotPromptInput): string {
  const { spread, deck, cards, positionLabels } = input;
  const question = input.question || "(không có câu hỏi cụ thể — luận giải tổng quát)";
  const cardLines = managedJoin(cards
    .map((c, i) => {
      const card = tarotCardById(c.id);
      if (!card) return managedPrompt("tarot.buildTarotPrompt.0", [i + 1, positionLabels[i], c.id]);
      const dir = c.reversed ? "NGƯỢC" : "XUÔI";
      const meaning = c.reversed ? card.rev : card.up;
      return managedPrompt("tarot.buildTarotPrompt.1", [i + 1, positionLabels[i], card.nameEn, dir, meaning.kw.join(", "), meaning.text]);
    })
    , "\n");
  const lengthHint = spread.count <= 1 ? "200-350" : spread.count <= 5 ? "420-650" : "750-1100";
  const profileLine = input.profileContext ? managedPrompt("tarot.buildTarotPrompt.2", [input.profileContext]) : "";
  return managedPrompt("tarot.buildTarotPrompt.3", [profileLine, spread.name, spread.count, deck.name, question, cardLines, lengthHint]);
}
