/**
 * English label tables for the astrology modules (plan Task 08). Keys are the
 * stable Vietnamese/Chinese source terms from the engine libs — ids never
 * change, only their display. Parity with the Vietnamese tables is enforced by
 * web/tests/astrology-locale.test.mjs.
 */
import type { Locale } from '../../../services/admin/markets.ts';

export const ZODIAC_ELEMENT_EN: Record<string, string> = {
  Hoả: 'Fire',
  Hỏa: 'Fire',
  Thổ: 'Earth',
  Khí: 'Air',
  Thuỷ: 'Water',
  Thủy: 'Water',
  Mộc: 'Wood',
  Kim: 'Metal',
};
export const ZODIAC_QUALITY_EN: Record<string, string> = {
  'Khai triển': 'Cardinal',
  'Cố định': 'Fixed',
  'Biến đổi': 'Mutable',
};
export const ZODIAC_TRAITS_EN: Record<string, string> = {
  'bach-duong': 'decisive, passionate, pioneering',
  'kim-nguu': 'steadfast, sensual, patient',
  'song-tu': 'curious, adaptable, expressive',
  'cu-giai': 'nurturing, intuitive, protective',
  'su-tu': 'radiant, generous, proud',
  'xu-nu': 'analytical, precise, helpful',
  'thien-binh': 'harmonious, charming, fair-minded',
  'bo-cap': 'intense, strategic, transformative',
  'nhan-ma': 'adventurous, candid, philosophical',
  'ma-ket': 'ambitious, disciplined, enduring',
  'bao-binh': 'innovative, independent, humane',
  'song-ngu': 'compassionate, imaginative, boundless',
};

/** Planet Vietnamese name → English (keys of the zodiac PLANETS table). */
export const PLANET_NAME_EN: Record<string, string> = {
  'Mặt Trời': 'Sun',
  'Mặt Trăng': 'Moon',
  'Thuỷ Tinh': 'Mercury',
  'Thủy Tinh': 'Mercury',
  'Kim Tinh': 'Venus',
  'Hoả Tinh': 'Mars',
  'Hỏa Tinh': 'Mars',
  'Mộc Tinh': 'Jupiter',
  'Thổ Tinh': 'Saturn',
  'Thiên Vương': 'Uranus',
  'Hải Vương': 'Neptune',
  'Diêm Vương': 'Pluto',
};

export const ASPECT_LABEL_EN: Record<string, string> = {
  'Trùng tụ': 'Conjunction',
  'Lục hợp': 'Sextile',
  'Tam hợp': 'Trine',
  'Vuông góc': 'Square',
  Vuông: 'Square',
  'Đối đỉnh': 'Opposition',
};

export const ZIWEI_MUTAGEN_EN = ['Hua Lu', 'Hua Quan', 'Hua Ke', 'Hua Ji'] as const;

export const TUVI_PERIOD_LABELS_EN: Record<string, string> = { today: 'today', week: 'this week', month: 'this month' };

/** Zi Wei hour-chi labels: stable pinyin names with EN clock ranges. */
export const HOUR_CHI_EN: Record<string, string> = {
  Tí: 'Zi (11pm–1am)',
  Tý: 'Zi (11pm–1am)',
  Sửu: 'Chou (1–3am)',
  Dần: 'Yin (3–5am)',
  Mão: 'Mao (5–7am)',
  Thìn: 'Chen (7–9am)',
  Tỵ: 'Si (9–11am)',
  Ngọ: 'Wu (11am–1pm)',
  Mùi: 'Wei (1–3pm)',
  Thân: 'Shen (3–5pm)',
  Dậu: 'You (5–7pm)',
  Tuất: 'Xu (7–9pm)',
  Hợi: 'Hai (9–11pm)',
};
export const hourChiLabel = (hourChi: string, locale: Locale): string => {
  if (locale !== 'en') return hourChi;
  const bare = hourChi.split(' (')[0].trim().replace(/^Tí$/, 'Tý');
  return HOUR_CHI_EN[bare] ?? hourChi;
};

/** Ba Zi tables — EN mirrors of BATU_STEM_VI / BATU_BRANCH_VI / BATU_SHISHEN_VI. */
/** Ba Zi EN labels keyed by the SAME Han keys as BATU_STEM_VI / BATU_BRANCH_VI /
 * BATU_SHISHEN_VI — engine ids never change, only display. */
export const BATU_STEM_EN: Record<string, string> = {
  甲: 'Jia (Yang Wood)',
  乙: 'Yi (Yin Wood)',
  丙: 'Bing (Yang Fire)',
  丁: 'Ding (Yin Fire)',
  戊: 'Wu (Yang Earth)',
  己: 'Ji (Yin Earth)',
  庚: 'Geng (Yang Metal)',
  辛: 'Xin (Yin Metal)',
  壬: 'Ren (Yang Water)',
  癸: 'Gui (Yin Water)',
};
export const BATU_BRANCH_EN: Record<string, string> = {
  子: 'Zi (Rat)',
  丑: 'Chou (Ox)',
  寅: 'Yin (Tiger)',
  卯: 'Mao (Rabbit)',
  辰: 'Chen (Dragon)',
  巳: 'Si (Snake)',
  午: 'Wu (Horse)',
  未: 'Wei (Goat)',
  申: 'Shen (Monkey)',
  酉: 'You (Rooster)',
  戌: 'Xu (Dog)',
  亥: 'Hai (Pig)',
};
export const BATU_SHISHEN_EN: Record<string, string> = {
  比肩: 'Friend',
  劫财: 'Rob Wealth',
  食神: 'Eating God',
  伤官: 'Hurting Officer',
  正财: 'Direct Wealth',
  偏财: 'Indirect Wealth',
  正官: 'Direct Officer',
  七杀: 'Seven Killings',
  正印: 'Direct Seal',
  偏印: 'Indirect Seal',
  偏官: 'Seven Killings',
  日主: 'Day Master (self)',
};
export const BATU_WX_EN: Record<string, string> = {
  Mộc: 'Wood',
  Hoả: 'Fire',
  Hỏa: 'Fire',
  Thổ: 'Earth',
  Kim: 'Metal',
  Thuỷ: 'Water',
  Thủy: 'Water',
};
export const BATU_TOPICS_EN: Record<string, { title: string; desc: string }> = {
  'tinh-cach': { title: 'Character', desc: 'Temperament through the Day Master, elements and Ten Gods.' },
  'su-nghiep-tien-tai': {
    title: 'Career & wealth',
    desc: 'Career and wealth from the Month pillar and Wealth/Officer gods.',
  },
  'tinh-duyen': { title: 'Love', desc: 'Love and marriage from the Day Branch and related gods.' },
  'suc-khoe': { title: 'Well-being', desc: 'Well-being tendencies from the Five Elements balance.' },
};

/** Tử Vi topics — EN titles/labels keyed by the stable topic/sub ids. */
export const TUVI_TOPICS_EN: Record<string, { title: string; subs: Record<string, string> }> = {
  'tim-hieu-ban-than': {
    title: 'Understanding yourself',
    subs: {
      'tinh-cach': 'Character & tendencies',
      'thu-thach': 'Challenges & growth path',
      'yeu-to-tac-dong': 'Life-shaping factors',
      'no-nghiep': 'Karmic lessons',
    },
  },
  'su-nghiep-tai-loc': {
    title: 'Career & wealth',
    subs: {
      'tong-quan': 'Wealth & career overview',
      'con-nguoi-cong-viec': 'You at work',
      'nganh-nghe': 'Fitting industries',
      'loi-khuyen-tc': 'Career & finance advice',
    },
  },
  'van-trinh-su-nghiep': { title: 'Career trajectory', subs: { 'van-trinh-cong-danh': 'Career trajectory' } },
  'hieu-ban-doi': {
    title: 'Understanding your partner',
    subs: {
      'hieu-ban-doi-sub': 'Your potential partner',
      'tac-dong-nguoi-ngoai': 'Outside influences',
      'hai-nguoi': 'Two people — relationship dynamics',
    },
  },
  'tinh-duyen-hon-nhan': {
    title: 'Love & marriage',
    subs: {
      'ban-trong-tinh-yeu': 'You in love',
      'ai-thu-hut': 'Who is drawn to you',
      'kieu-nguoi-gap': 'Partner types you meet',
      'ca-tinh-phu-hop': 'Complementary personalities',
      'tong-quan-ban-doi': 'Partner overview',
      'nhan-dinh-hon-nhan': 'Marriage outlook',
      'tinh-cach-con-cai': "Children's character",
    },
  },
  'vi-sao-toi-la-toi': { title: 'Why I am me', subs: { 'su-menh': 'Why I am me' } },
  'hoc-hanh-thi-cu': { title: 'Study & exams 2026', subs: { 'hoc-hanh-2026': 'Study & exams 2026' } },
  'doi-cong-viec-2026': { title: 'Change jobs in 2026?', subs: { 'doi-viec-2026': 'Change jobs in 2026?' } },
  'tieu-van-2026': {
    title: '2026 annual fortune',
    subs: {
      'tong-quan-2026': '2026 overview',
      'sunghiep-2026': 'Career 2026',
      'tienbac-2026': 'Money 2026',
      'tinhcam-2026': 'Love 2026',
      'vanhan-2026': 'Watch-outs 2026',
    },
  },
  'cau-hoi-xuat-ngoai': {
    title: 'Going abroad',
    subs: {
      'danh-gia-co-hoi': 'Assessing opportunities abroad',
      'co-nen-di-xa': 'Should you go far?',
      'nam-co-loi': 'Favorable years for relocation',
    },
  },
  'cau-hoi-tien-tai': {
    title: 'Money questions',
    subs: {
      'tiem-nang-giau': 'Wealth potential',
      'hop-lam-chu': 'Are you built to be your own boss?',
      'co-thua-huong': 'Inheritance outlook',
      'hop-bds': 'Fit with real estate',
      'xu-huong-nha': 'Home & assets',
    },
  },
  'cau-hoi-su-nghiep': {
    title: 'Career questions',
    subs: {
      'moi-truong-phu-hop': 'Best-fit environment',
      'hop-to-chuc': 'Traditional vs. startup fit',
      'don-bay': 'Career levers',
      'nen-hoc-cao': 'Should you study further?',
    },
  },
  'xu-huong-dai-van': {
    title: 'Decade outlook',
    subs: {
      'dien-bien-40nam': 'The arc of 40 years',
      'thien-thoi-dia-loi': 'Timing & place advantage',
      'bieu-do-10nam': 'The next 10 years, year by year',
    },
  },
};

/** Zodiac topic groups — EN titles for the topics panel (ids stable). */
export const ZODIAC_TOPICS_EN: Record<string, { title: string; subs: Record<string, string> }> = {
  'tong-quan-la-so': {
    title: 'Chart overview',
    subs: { 'bo-ba-loi': 'The Big Three', 'diem-noi-bat': 'Chart highlights' },
  },
  'big-3': {
    title: 'The Big Three',
    subs: { 'mat-troi': 'Sun', 'mat-trang': 'Moon', 'cung-moc': 'Ascendant', 'ket-hop': 'How they blend' },
  },
  'hanh-tinh': {
    title: 'Planets',
    subs: { 'hanh-tinh-ca-nhan': 'Personal planets', 'hanh-tinh-xa-xi': 'Social & outer planets' },
  },
  '12-nha': { title: 'The 12 houses', subs: { 'nhac-trung-tam': 'Angular houses', 'nha-khac': 'Other houses' } },
  'goc-chieu': { title: 'Aspects', subs: { 'goc-thuan-loi': 'Flowing aspects', 'goc-thach-thuc': 'Tense aspects' } },
  'tinh-cach-cung': {
    title: 'Sign character',
    subs: { 'dac-diem-cot-loi': 'Core traits', 'diem-manh-yeu': 'Strengths & watch-outs' },
  },
  'tinh-yeu-cung': {
    title: 'Love & relationships',
    subs: { 'phong-cach-yeu': 'Love style', 'nhu-cau-cam-xuc': 'Emotional needs' },
  },
  'su-nghiep-cung': { title: 'Work & money', subs: { 'huong-su-nghiep': 'Career direction', 'tai-chinh': 'Money' } },
};

export const ZODIAC_PERIOD_LABELS_EN: Record<string, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
};

export const TUVI_TOPIC_DESCRIPTIONS_EN: Record<string, string> = {
  'tim-hieu-ban-than': 'Understand your character, strengths and personal growth.',
  'su-nghiep-tai-loc': 'Explore your work, career direction and relationship with money.',
  'van-trinh-su-nghiep': 'Look at the course of your career through your chart.',
  'hieu-ban-doi': 'Explore partnership, connection and outside influences.',
  'tinh-duyen-hon-nhan': 'Reflect on love, marriage and family relationships.',
  'vi-sao-toi-la-toi': 'Explore the influences that shape your identity and purpose.',
  'hoc-hanh-thi-cu': 'Study and examination themes for 2026.',
  'doi-cong-viec-2026': 'Consider career changes and opportunities in 2026.',
  'tieu-van-2026': 'Your annual overview: career, money, relationships and watch-outs.',
  'cau-hoi-xuat-ngoai': 'Explore opportunities to travel, relocate or live abroad.',
  'cau-hoi-tien-tai': 'Reflect on earning, ownership, inheritance and property.',
  'cau-hoi-su-nghiep': 'Find environments and learning paths that suit your career.',
  'xu-huong-dai-van': 'Explore long-term patterns and the next stages of life.',
};
