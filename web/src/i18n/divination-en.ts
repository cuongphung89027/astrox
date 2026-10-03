/**
 * English label tables for Tarot / I Ching / Numerology / Compatibility
 * (plan Task 09). Keys are stable ids or the Vietnamese source terms used by
 * the engine libs; ids never change, only display. Parity is enforced by
 * web/tests/divination-locale.test.mjs.
 */

// ---------------------------------------------------------------- Tarot ----
export const TAROT_SPREADS_EN: Record<
  string,
  { name: string; desc: string; positions: string[]; frames?: Record<string, { label: string; positions: string[] }> }
> = {
  one: { name: 'Single card', desc: 'A quick, clear answer to one specific question.', positions: ['Message'] },
  three: {
    name: 'Three cards',
    desc: 'The most popular spread — pick a frame below.',
    positions: [],
    frames: {
      ppf: { label: 'Past – Present – Future', positions: ['Past', 'Present', 'Future'] },
      sao: { label: 'Situation – Action – Outcome', positions: ['Situation', 'Action', 'Outcome'] },
      soa: { label: 'Self – Obstacle – Advice', positions: ['Self', 'Obstacle', 'Advice'] },
    },
  },
  cross5: {
    name: 'Simple Cross',
    desc: 'Overview of the present, challenge, foundation and likely outcome.',
    positions: ['Present', 'Challenge', 'Foundation (recent past)', 'Direction (near future)', 'Outcome'],
  },
  relationship5: {
    name: 'Love & Relationships',
    desc: 'Explore the dynamics between you and the other person.',
    positions: ['You', 'The other person', 'Foundation of the bond', 'Shared challenge', 'Potential / direction'],
  },
  celtic10: {
    name: 'Celtic Cross',
    desc: 'A deep 10-card spread for layered, complex questions.',
    positions: [
      'Present',
      'Challenge',
      'Foundation / subconscious',
      'Recent past',
      'Goal / desire',
      'Near future',
      'Self / attitude',
      'Outside influences',
      'Hopes & fears',
      'Final outcome',
    ],
  },
};

export const TAROT_DECK_DESC_EN: Record<string, string> = {
  shiba: 'A Shiba wanders through mountains and peach blossoms in Japanese woodblock style.',
  raccoon: 'The classic deck — warm raccoons among autumn countryside scenes.',
};

// --------------------------------------------------------------- I Ching ----
export const TRIGRAMS_EN: Record<number, { name: string; nature: string; elem: string; dir: string }> = {
  1: { name: 'Qian', nature: 'Heaven', elem: 'Metal', dir: 'Northwest' },
  2: { name: 'Dui', nature: 'Lake', elem: 'Metal', dir: 'West' },
  3: { name: 'Li', nature: 'Fire', elem: 'Fire', dir: 'South' },
  4: { name: 'Zhen', nature: 'Thunder', elem: 'Wood', dir: 'East' },
  5: { name: 'Xun', nature: 'Wind', elem: 'Wood', dir: 'Southeast' },
  6: { name: 'Kan', nature: 'Water', elem: 'Water', dir: 'North' },
  7: { name: 'Gen', nature: 'Mountain', elem: 'Earth', dir: 'Northeast' },
  8: { name: 'Kun', nature: 'Earth', elem: 'Earth', dir: 'Southwest' },
};

export const HAO_NAMES_EN: Record<number, string> = {
  1: 'Line 1',
  2: 'Line 2',
  3: 'Line 3',
  4: 'Line 4',
  5: 'Line 5',
  6: 'Line 6 (top)',
};

export const KD_RELATION_EN: Record<string, { label: string; desc: string }> = {
  'dong-hanh': {
    label: 'Body and Use in the same element',
    desc: 'Very favorable. You are on the right track; things are in harmony.',
  },
  'dung-sinh-the': { label: 'Use generates Body', desc: 'Very favorable. The outer situation actively supports you.' },
  'the-sinh-dung': { label: 'Body generates Use', desc: 'Slow, energy-draining. You give more than you receive.' },
  'the-khac-dung': {
    label: 'Body controls Use',
    desc: 'Favorable. You hold the initiative and control the situation.',
  },
  'dung-khac-the': { label: 'Use controls Body', desc: 'Difficult, unfavorable. Pressure from outside is strong.' },
  khac: { label: 'Neutral', desc: 'A neutral elemental relation.' },
};

/** 64 classical hexagram names keyed by hexagram number (1–64, King Wen order). */
export const HEXAGRAM_NAMES_EN = [
  'The Creative (Qian)',
  'The Receptive (Kun)',
  'Difficulty at the Beginning',
  'Youthful Folly',
  'Waiting',
  'Conflict',
  'The Army',
  'Holding Together',
  'Small Taming',
  'Treading',
  'Peace',
  'Standstill',
  'Fellowship',
  'Great Possession',
  'Modesty',
  'Enthusiasm',
  'Following',
  'Work on the Decayed',
  'Approach',
  'Contemplation',
  'Biting Through',
  'Grace',
  'Splitting Apart',
  'Return',
  'Innocence',
  'Great Taming',
  'Nourishment',
  'Great Excess',
  'The Abysmal (Kan)',
  'The Clinging (Li)',
  'Influence',
  'Duration',
  'Retreat',
  'Great Power',
  'Progress',
  'Darkening of the Light',
  'The Family',
  'Opposition',
  'Obstruction',
  'Deliverance',
  'Decrease',
  'Increase',
  'Breakthrough',
  'Coming to Meet',
  'Gathering',
  'Pushing Upward',
  'Oppression',
  'The Well',
  'Revolution',
  'The Cauldron',
  'The Arousing (Zhen)',
  'Keeping Still (Gen)',
  'Gradual Progress',
  'The Marrying Maiden',
  'Abundance',
  'The Wanderer',
  'The Gentle (Xun)',
  'The Joyous (Dui)',
  'Dispersion',
  'Limitation',
  'Inner Truth',
  'Small Excess',
  'After Completion',
  'Before Completion',
];

// ------------------------------------------------------------ Numerology ----
export const NUMEROLOGY_TOPICS_EN: Record<string, { title: string; desc: string }> = {
  'life-path': {
    title: 'Life Path — the journey of a lifetime',
    desc: 'The biggest lesson and your natural direction.',
  },
  destiny: { title: 'Destiny & innate talents', desc: 'What you are here to accomplish, shown by your name.' },
  'inner-self': { title: 'Your inner world', desc: 'Soul desire versus the Personality others see.' },
  'birth-grid': { title: 'Birth grid', desc: 'Strengths from repeated numbers, gaps from missing ones.' },
  cycles: { title: 'Pinnacles & challenges', desc: "Four great phases and each phase's obstacle." },
  'personal-year': { title: 'Your current personal year', desc: "This year's theme within the 9-year cycle." },
};

export const NUMEROLOGY_EXTRA_EN: Record<string, { desc: string }> = {
  birthday: { desc: 'The particular abilities associated with your day of birth.' },
  attitude: { desc: 'How you approach life during your early years.' },
  maturity: { desc: 'A theme of later life, combining your Life Path and Destiny numbers.' },
  'extra-personal-day': { desc: 'The number coloring today.' },
  'extra-personal-month': { desc: 'The theme of this month.' },
  'extra-personal-year': { desc: 'Where you are in the 9-year cycle.' },
  'extra-birth-day': { desc: 'A gift you brought along.' },
  'extra-maturity': { desc: 'What grows stronger after 35.' },
  'extra-attitude': { desc: 'The first impression you give.' },
};

export const NUMEROLOGY_LABEL_EN: Record<string, string> = {
  'Số Chủ Đạo': 'Life Path',
  'Số Sứ Mệnh': 'Destiny',
  'Số Linh Hồn': 'Soul',
  'Số Nhân Cách': 'Personality',
  'Số Ngày Sinh': 'Birth Day',
  'Năm Cá Nhân': 'Personal Year',
  'Năm cá nhân': 'Personal year',
  'Tháng cá nhân': 'Personal month',
  'Ngày cá nhân': 'Personal day',
  'Số Thái Độ': 'Attitude',
  'Số Trưởng Thành': 'Maturity',
  'Chu Kỳ': 'Cycle',
  'Đỉnh Cao': 'Pinnacle',
  'Thử Thách': 'Challenge',
};

// ------------------------------------------------------- Lunar calendar ----
/** Day-officer gods (Thiên tướng), solar terms, holiday and taboo glosses. */
export const GODS_EN = [
  'Azure Dragon',
  'Bright Hall',
  'Heavenly Punisher',
  'Vermilion Bird',
  'Golden Treasury',
  'Heavenly Virtue',
  'White Tiger',
  'Jade Hall',
  'Heavenly Prison',
  'Dark Warrior',
  'Commander',
  'Hooked Array',
];
export const STEMS_SHORT_EN = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const BRANCHES_SHORT_EN = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
export const HOLIDAYS_EN: Record<string, string> = {
  '01-01': "New Year's Day (Gregorian)",
  '03-08': "International Women's Day",
  '04-30': 'Reunification Day (VN)',
  '05-01': 'International Labor Day',
  '06-01': "International Children's Day",
  '09-02': 'Vietnam National Day',
  '10-20': "Vietnamese Women's Day",
  '11-20': "Vietnamese Teachers' Day",
  '12-25': 'Christmas',
};
export const TABOOS_EN: Record<string, string> = { 'Tam nương': 'Tam Nuong days', 'Nguyệt kỵ': 'Moon-taboo days' };
export const FESTIVALS_EN: Record<string, string> = {
  '1/1': 'Lunar New Year (Tet)',
  '15/1': 'First Full Moon',
  '10/3': 'Hung Kings Commemoration',
  '5/5': 'Mid-Year Festival (Doan Ngo)',
  '15/7': 'Vu Lan Festival',
  '15/8': 'Mid-Autumn Festival',
  '23/12': 'Kitchen Gods Day',
};

export const KD_METHODS_EN: Record<string, string> = {
  tube: 'Oracle sticks (automatic)',
  coins: 'Three coins (automatic)',
  numbers: 'Plum Blossom numbers (automatic)',
  time: 'Plum Blossom time (automatic)',
  serial: 'Banknote serial number',
  phone: 'Phone number',
  digits: 'Custom digits',
};
