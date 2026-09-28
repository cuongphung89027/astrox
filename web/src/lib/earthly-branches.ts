/** Vietnamese earthly branches and the existing twelve zodiac illustrations. */
export const EARTHLY_BRANCHES = [
  { name: 'Tý', animal: 'Chuột', asset: 'chuot', han: '子' },
  { name: 'Sửu', animal: 'Trâu', asset: 'trau', han: '丑' },
  { name: 'Dần', animal: 'Hổ', asset: 'ho', han: '寅' },
  { name: 'Mão', animal: 'Mèo', asset: 'meo', han: '卯' },
  { name: 'Thìn', animal: 'Rồng', asset: 'rong', han: '辰' },
  { name: 'Tỵ', animal: 'Rắn', asset: 'ran', han: '巳' },
  { name: 'Ngọ', animal: 'Ngựa', asset: 'ngua', han: '午' },
  { name: 'Mùi', animal: 'Dê', asset: 'de', han: '未' },
  { name: 'Thân', animal: 'Khỉ', asset: 'khi', han: '申' },
  { name: 'Dậu', animal: 'Gà', asset: 'ga', han: '酉' },
  { name: 'Tuất', animal: 'Chó', asset: 'cho', han: '戌' },
  { name: 'Hợi', animal: 'Lợn', asset: 'lon', han: '亥' },
] as const;

export function earthlyBranch(value: string) {
  const en = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'woo', 'wei', 'shen', 'you', 'xu', 'hai'];
  const animals = [
    'rat',
    'ox',
    'tiger',
    'rabbit',
    'dragon',
    'snake',
    'horse',
    'goat',
    'monkey',
    'rooster',
    'dog',
    'pig',
  ];
  const normalized = value.trim().toLocaleLowerCase('vi');
  const token = normalized.split(' (')[0];
  const index = en.indexOf(token === 'wu' ? 'woo' : token);
  if (index >= 0) return EARTHLY_BRANCHES[index];
  const animalIndex = animals.indexOf(token);
  if (animalIndex >= 0) return EARTHLY_BRANCHES[animalIndex];
  const alias = ({ tí: 'tý', tị: 'tỵ', thỏ: 'mão', heo: 'hợi' } as Record<string, string>)[normalized] ?? normalized;
  return EARTHLY_BRANCHES.find(branch =>
    [branch.name, branch.animal, branch.han].some(name => name.toLocaleLowerCase('vi') === alias),
  );
}

export function branchName(value: string): string {
  return earthlyBranch(value)?.name ?? value;
}

export function zodiacAsset(value: string): string | undefined {
  const branch = earthlyBranch(value);
  return branch ? `/assets/zodiac/${branch.asset}.png` : undefined;
}
