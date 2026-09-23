/**
 * Điều khoản & Thoả thuận — phiên bản + sự đồng ý của người dùng.
 *
 * TERMS_VERSION đổi khi nội dung trang /dieukhoan thay đổi materially —
 * khi đó người dùng phải tích đồng ý lại lần nữa (checkbox reset về bỏ trống).
 */
export const TERMS_VERSION = "2026-09-23-r2";
const TERMS_CONSENT_KEY = "astrox_terms_consent_v1";

export const TERMS_PATH = "/dieukhoan";

/** Anchor các khối chính của trang điều khoản — dùng cho link ở popup đăng nhập. */
export const TERMS_SECTIONS = {
  terms: { id: "dieu-khoan-su-dung", label: "Điều khoản sử dụng" },
  disclaimer: { id: "mien-tru-trach-nhiem", label: "Tuyên bố miễn trừ trách nhiệm" },
  privacy: {
    id: "thoa-thuan-bao-mat",
    label: "Thoả thuận xử lý và bảo mật thông tin cá nhân",
  },
} as const;

export type TermsSectionKey = keyof typeof TERMS_SECTIONS;

export function termsHref(key: TermsSectionKey): string {
  return `${TERMS_PATH}#${TERMS_SECTIONS[key].id}`;
}

/** Chỉ gọi sau mount (đọc localStorage — không dùng trong render đầu tiên). */
export function hasTermsConsent(): boolean {
  try {
    return localStorage.getItem(TERMS_CONSENT_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

export function saveTermsConsent(): void {
  try {
    localStorage.setItem(TERMS_CONSENT_KEY, TERMS_VERSION);
  } catch {
    /* storage bị chặn — vẫn cho đăng nhập, lần sau hỏi lại */
  }
}
