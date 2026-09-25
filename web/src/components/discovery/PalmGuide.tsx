import { useId } from "react";
import s from "./Discovery.module.css";

/** Bàn tay 5 ngón (ngón giữa cao nhất) trong khung 240x320 — dùng chung với
 * PalmReader (ảnh minh hoạ) và màn loading của PalmCamera, tránh lệch hình. */
export const PALM_HAND_PATH =
  "M90 296 L68 242 C58 214 48 192 52 178 C56 164 70 166 76 180 C82 192 86 200 89 210 L89 56 Q89 42 97 42 Q105 42 105 56 L105 144 L105 34 Q105 24 113 24 Q121 24 121 34 L121 146 L121 44 Q121 32 129 32 Q137 32 137 44 L137 152 L137 72 Q137 61 144 61 Q151 61 151 72 L151 176 Q152 200 156 222 Q160 260 158 296";

function MiniHand({ transform, opacity = 1 }: { transform?: string; opacity?: number }) {
  return (
    <path d={PALM_HAND_PATH} transform={transform} opacity={opacity} fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
  );
}

const WRONG = [
  { label: "Tay nghiêng", t: "rotate(28 120 160)" },
  { label: "Tay xoay ngang", t: "rotate(90 120 160)" },
  { label: "Tay chật khung", t: "translate(-58 30)" },
];

export function PalmGuide() {
  const clip = useId();
  return (
    <div className={s.guide}>
      <div className={`${s.guideCard} ${s.guideGood}`}>
        <svg viewBox="0 0 240 320" aria-hidden="true">
          <rect x="18" y="18" width="204" height="284" rx="20" fill="none" stroke="currentColor" strokeWidth="4" opacity=".4" />
          <g clipPath={`url(#${clip})`}>
            <MiniHand />
          </g>
          <defs>
            <clipPath id={clip}>
              <rect x="18" y="18" width="204" height="284" rx="20" />
            </clipPath>
          </defs>
          <circle cx="196" cy="262" r="26" fill="#698360" />
          <path d="M185 262l8 8 14-16" fill="none" stroke="#f8f3e7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>Đúng: lòng bàn tay hướng máy, ngón dang, tay nằm gọn trong khung</p>
      </div>
      <div className={`${s.guideCard} ${s.guideBad}`}>
        {WRONG.map((bad) => (
          <figure key={bad.label}>
            <svg viewBox="0 0 240 320" aria-hidden="true">
              <rect x="18" y="18" width="204" height="284" rx="20" fill="none" stroke="currentColor" strokeWidth="4" opacity=".4" />
              <g clipPath={`url(#${clip})`}>
                <MiniHand transform={bad.t} opacity={0.8} />
              </g>
              <circle cx="196" cy="262" r="26" fill="#b3492f" />
              <path d="M186 252l20 20M206 252l-20 20" stroke="#f8f3e7" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <figcaption>{bad.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className={s.guideNote}>
        Nhận diện bàn tay chạy ngay trên thiết bị. Ảnh chỉ được gửi đi khi bạn bấm phân tích.
      </p>
    </div>
  );
}
