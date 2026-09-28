import { buildBatuChart, batuAiDto, detectBatuRelations, englishBatuRelation, type BatuChart } from './batu';
import { buildZiweiChart, ziweiAiDto } from './tuvi';
import { managedPrompt } from './managed-prompts';
import type { Profile } from './types';
export type CoupleMode = 'tuvi' | 'batu';
export type CouplePerson = Pick<Profile, 'name' | 'gender' | 'dob' | 'hourChi' | 'place'>;
export const COUPLE_VERSION = 'pair-v1';
export const COUPLE_PLACES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
export interface CoupleEvidence {
  a: string;
  b: string;
  relation: string;
}
export function coupleCacheKey(mode: CoupleMode, a: CouplePerson, b: CouplePerson, scope: string) {
  const person = (p: CouplePerson) => [p.name.trim(), p.gender, p.dob, p.hourChi, p.place];
  return JSON.stringify([COUPLE_VERSION, mode, person(a), person(b), scope]);
}
export function detectCrossBatuRelations(a: BatuChart, b: BatuChart): CoupleEvidence[] {
  const evidence: CoupleEvidence[] = [
    {
      a: `Nhật Chủ A: ${a.pillars.day.viGan}`,
      b: `Nhật Chủ B: ${b.pillars.day.viGan}`,
      relation: 'Đối chiếu Nhật Chủ; không phải điểm số tương hợp.',
    },
  ];
  for (const pa of Object.values(a.pillars))
    for (const pb of Object.values(b.pillars)) {
      const stemPairs = [
        ['Giáp', 'Kỷ'],
        ['Ất', 'Canh'],
        ['Bính', 'Tân'],
        ['Đinh', 'Nhâm'],
        ['Mậu', 'Quý'],
      ];
      if (stemPairs.some(([x, y]) => (pa.viGan === x && pb.viGan === y) || (pa.viGan === y && pb.viGan === x)))
        evidence.push({
          a: `A · ${pa.label}: ${pa.viGan}`,
          b: `B · ${pb.label}: ${pb.viGan}`,
          relation: 'Thiên Can ngũ hợp: chỉ ghi nhận cặp can, không mặc định hợp hóa hoặc kết luận chất lượng quan hệ.',
        });
      for (const r of detectBatuRelations([
        { label: `A · ${pa.label}`, zhi: pa.viZhi },
        { label: `B · ${pb.label}`, zhi: pb.viZhi },
      ]).filter(r => r.type !== 'none'))
        evidence.push({
          a: `A · ${pa.label}: ${pa.viGan} ${pa.viZhi}`,
          b: `B · ${pb.label}: ${pb.viGan} ${pb.viZhi}`,
          relation: r.text,
        });
    }
  return evidence;
}
export function buildCoupleReading(mode: CoupleMode, a: CouplePerson, b: CouplePerson, locale: 'vi' | 'en' = 'vi') {
  const en = locale === 'en';
  for (const p of [a, b]) {
    if (!p.name.trim()) throw new Error(en ? 'Enter both names.' : 'Điền tên gọi của cả hai người.');
    if (mode === 'batu' && !COUPLE_PLACES.includes(p.place))
      throw new Error(
        en
          ? 'Choose a supported birthplace for the Ba Zi longitude correction.'
          : 'Chọn một nơi sinh được hỗ trợ để hiệu chỉnh kinh độ Bát Tự.',
      );
  }
  if (mode === 'batu') {
    const ca = buildBatuChart(a),
      cb = buildBatuChart(b);
    return {
      version: COUPLE_VERSION,
      method: mode,
      people: { a, b },
      charts: { a: batuAiDto(en ? buildBatuChart(a, 'en') : ca), b: batuAiDto(en ? buildBatuChart(b, 'en') : cb) },
      evidence: detectCrossBatuRelations(ca, cb).map(row =>
        en ? { a: englishEvidence(row.a), b: englishEvidence(row.b), relation: englishEvidence(row.relation) } : row,
      ),
      limits: en
        ? 'Birth times use the midpoint of each two-hour interval, UTC+7 and the selected city’s longitude. Cross-chart relations are listed by pillar pair; no three-way combination or compatibility percentage is inferred.'
        : 'Giờ dùng điểm giữa can giờ, UTC+7 và kinh độ thành phố đã chọn. Quan hệ liên cá nhân chỉ liệt kê từng cặp trụ; không suy diễn Tam Hợp hoặc chấm phần trăm.',
    };
  }
  const ca = ziweiAiDto(buildZiweiChart(a)),
    cb = ziweiAiDto(buildZiweiChart(b));
  const ea = en ? ziweiAiDto(buildZiweiChart(a, 'en')) : ca,
    eb = en ? ziweiAiDto(buildZiweiChart(b, 'en')) : cb;
  const evidence: CoupleEvidence[] = ca.palaces
    .filter(p => ['Mệnh', 'Phu Thê', 'Phúc Đức'].includes(p.name) || p.isBodyPalace)
    .flatMap(pa => {
      const pb = cb.palaces.find(p => p.name === pa.name);
      if (!pb) return [];
      const describe = (p: typeof pa) =>
        `${p.name} ${en ? 'at' : 'tại'} ${p.earthlyBranch}: ${p.majorStars.map(s => s.name + (s.mutagen ? ` (${s.mutagen})` : '')).join(', ') || (en ? 'no major star' : 'không có chính tinh')}`;
      return [
        {
          a: `A · ${describe(ea.palaces[ca.palaces.indexOf(pa)])}`,
          b: `B · ${describe(eb.palaces[cb.palaces.indexOf(pb)])}`,
          relation: en
            ? 'The same palace is compared across two charts. This is descriptive evidence, not a rule for judging compatibility.'
            : 'Đối chiếu cùng cung giữa hai lá số; dữ kiện mô tả, không phải quy tắc kết luận hợp hay khắc.',
        },
      ];
    });
  return {
    version: COUPLE_VERSION,
    method: mode,
    people: { a, b },
    charts: { a: ea, b: eb },
    evidence,
    limits: en
      ? 'Two independent charts based on Gregorian birth dates and birth-hour intervals. There is no validated compatibility scoring scale; no percentage or claim of destiny is produced.'
      : 'Hai lá số độc lập theo ngày dương lịch và can giờ. Chưa có thang điểm tương hợp được kiểm chứng; không tạo phần trăm hay khẳng định định mệnh.',
  };
}
export function couplePrompt(reading: ReturnType<typeof buildCoupleReading>) {
  return managedPrompt(`compat.${reading.method}Pair.v1`, [JSON.stringify(reading)]);
}

function englishEvidence(text: string): string {
  const phrases: Record<string, string> = {
    'Nhật Chủ A:': 'Day Master A:',
    'Nhật Chủ B:': 'Day Master B:',
    'Đối chiếu Nhật Chủ; không phải điểm số tương hợp.': 'Day Master comparison, not a compatibility score.',
    'Thiên Can ngũ hợp: chỉ ghi nhận cặp can, không mặc định hợp hóa hoặc kết luận chất lượng quan hệ.':
      'Five stem combinations: identifies a stem pair without assuming transformation or judging relationship quality.',
    'Trụ năm': 'Year pillar',
    'Trụ tháng': 'Month pillar',
    'Trụ ngày': 'Day pillar',
    'Trụ giờ': 'Hour pillar',
    Giáp: 'Jia',
    Ất: 'Yi',
    Bính: 'Bing',
    Đinh: 'Ding',
    Mậu: 'Wu',
    Kỷ: 'Ji',
    Canh: 'Geng',
    Tân: 'Xin',
    Nhâm: 'Ren',
    Quý: 'Gui',
  };
  for (const [vi, en] of Object.entries(phrases)) text = text.replaceAll(vi, en);
  return englishBatuRelation(text);
}
