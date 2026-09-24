/** Both engines accept Gregorian dates and an explicit supported calculation parameter. */
export function validateChartBirth(input: { dob: string; gender: string; hourChi: string }) {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input.dob)) throw new Error('Ngày sinh dương lịch không hợp lệ.');
  const [year, month, day] = input.dob.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Ngày sinh dương lịch không hợp lệ (1900–2100).');
  if (input.gender !== 'Nam' && input.gender !== 'Nữ') throw new Error('Hãy chọn tham số Nam hoặc Nữ cho bộ tính truyền thống.');
  const label = String(input.hourChi || '').split(' (')[0].trim().replace(/^Tí$/, 'Tý');
  const hour = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'].indexOf(label);
  if (hour < 0) throw new Error('Cần biết giờ sinh để lập đủ lá số. Không tự quy đổi giờ chưa rõ thành giờ Tý.');
  return hour;
}
export function assertVietnameseChart<T>(value: T): T {
  if (/\p{Script=Han}/u.test(JSON.stringify(value))) throw new Error('Dữ liệu lá số còn thuật ngữ chưa Việt hóa. Vui lòng thử lại sau.');
  return value;
}
