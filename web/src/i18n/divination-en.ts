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

export const NUMEROLOGY_LABEL_EN: Record<string, string> = {
  'Số Chủ Đạo': 'Life Path',
  'Số Sứ Mệnh': 'Destiny',
  'Số Linh Hồn': 'Soul',
  'Số Nhân Cách': 'Personality',
  'Số Ngày Sinh': 'Birth Day',
  'Năm Cá Nhân': 'Personal Year',
  'Chu Kỳ': 'Cycle',
  'Đỉnh Cao': 'Pinnacle',
  'Thử Thách': 'Challenge',
};

// ---------------------------------------------------------- Compatibility ----
export const COMPAT_LABELS_EN = {
  pair: 'Zodiac compatibility',
  'tuvi-pair': 'Zi Wei pair reading',
  'batu-pair': 'Ba Zi pair reading',
  you: 'You',
  partner: 'Your partner',
  strengths: 'Strengths',
  watchouts: 'Watch-outs',
  advice: 'Advice',
  percent: 'Compatibility score',
};
