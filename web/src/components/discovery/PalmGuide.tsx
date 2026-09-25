import { useId } from "react";
import s from "./Discovery.module.css";

const HAND_PATH =
  "M79 290c0-33-5-47-24-71l-27-48c-8-17 10-25 20-13l25 31-9-101c-2-22 19-24 22-3l10 69-1-117c0-22 23-22 24 0l3 110 7-128c1-20 23-19 23 2l-2 130 15-108c3-19 25-16 22 6l-11 114 18-71c5-20 26-15 21 7l-13 80c-3 50-15 84-30 113l-1 21Z";

function MiniHand({ transform, opacity = 1 }: { transform?: string; opacity?: number }) {
  return (
    <path d={HAND_PATH} transform={transform} opacity={opacity} fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
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
            <MiniHand transform="translate(120 160) scale(0.86) translate(-120 -160)" />
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
