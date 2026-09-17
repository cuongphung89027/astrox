/** Định dạng ngày sinh ISO (YYYY-MM-DD) → DD-MM-YYYY như app cũ. */
export function formatDob(iso: string): string {
  if (!iso) return "—";
  const p = iso.split("-");
  return `${p[2]}-${p[1]}-${p[0]}`;
}

/** 12 can giờ chuẩn của app cũ — dùng cho step giờ sinh trong hồ sơ. */
export const HOUR_CHI_OPTIONS = [
  "Tí (23:00–00:59)",
  "Sửu (01:00–02:59)",
  "Dần (03:00–04:59)",
  "Mão (05:00–06:59)",
  "Thìn (07:00–08:59)",
  "Tỵ (09:00–10:59)",
  "Ngọ (11:00–12:59)",
  "Mùi (13:00–14:59)",
  "Thân (15:00–16:59)",
  "Dậu (17:00–18:59)",
  "Tuất (19:00–20:59)",
  "Hợi (21:00–22:59)",
];
