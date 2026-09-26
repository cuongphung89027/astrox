import s from "./Palm.module.css";

const HAND_OUTLINE =
  "M103 313 C103 299 99 286 92 275 C78 255 64 237 51 218 L33 191 C27 181 27 172 34 167 C41 162 48 165 54 173 L82 204 C88 211 94 204 92 192 L73 85 C71 73 74 63 83 61 C92 59 98 65 100 77 L117 160 C118 168 121 174 124 173 C128 172 128 165 127 157 L116 48 C115 35 119 25 128 24 C138 23 144 31 145 43 L155 155 C156 165 158 172 162 172 C166 172 167 165 167 157 L172 57 C173 45 178 38 187 39 C196 40 200 48 199 60 L193 164 C192 173 194 180 198 180 C202 180 205 174 207 166 L218 115 C220 105 226 99 233 101 C241 103 245 111 243 121 L231 198 C227 222 215 244 203 267 C196 282 193 297 193 313";

const JOINT_CREASES = [
  "M85 120 Q96 124 107 119",
  "M79 90 Q89 94 100 89",
  "M128 111 Q140 115 151 110",
  "M123 75 Q134 79 145 75",
  "M174 117 Q185 121 195 117",
  "M176 81 Q187 85 196 81",
  "M213 146 Q225 151 237 147",
];

const PALM_CREASES = [
  "M104 193 C132 211 179 210 216 188",
  "M101 216 C128 209 164 225 190 246",
  "M98 212 C124 228 126 263 116 284",
  "M52 209 Q60 201 68 200",
];

export function PalmIllustration() {
  return (
    <svg
      className={s.illustration}
      viewBox="0 0 280 340"
      role="img"
      aria-label="Minh họa bàn tay mở hướng lên với năm ngón tách nhẹ"
    >
      <path
        d={HAND_OUTLINE}
        fill="none"
        stroke="var(--color-muc)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="none" stroke="var(--color-muc-2)" strokeWidth="1.3" strokeLinecap="round" opacity=".5">
        {JOINT_CREASES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" stroke="var(--color-muc)" strokeWidth="1.4" strokeLinecap="round" opacity=".55">
        {PALM_CREASES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function PalmGuide() {
  return (
    <ol className={s.guideSteps}>
      <li>Mở tay, tách nhẹ các ngón.</li>
      <li>Lấy đủ đầu ngón và cổ tay.</li>
      <li>Ánh sáng đều, không lóa.</li>
    </ol>
  );
}
