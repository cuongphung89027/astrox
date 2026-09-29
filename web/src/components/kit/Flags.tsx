/**
 * Cờ khu vực cho bước chọn khu vực trước đăng nhập (Sơn 29/09: mỗi lựa chọn
 * có cờ quốc gia ở trước). Vẽ SVG thuần — không dùng emoji cờ vì Windows Chrome
 * render emoji cờ thành chữ "VN"/"US".
 */
export function FlagVN({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 14) / 20}
      viewBox="0 0 20 14"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="14" rx="2" fill="#da251d" />
      <polygon
        fill="#ff0"
        points="10,3.6 10.76,5.95 13.24,5.95 11.24,7.4 12,9.75 10,8.3 8,9.75 8.76,7.4 6.76,5.95 9.24,5.95"
      />
    </svg>
  );
}

export function FlagUS({ size = 24, className }: { size?: number; className?: string }) {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg
      className={className}
      width={size}
      height={(size * 14) / 20}
      viewBox="0 0 20 14"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="flag-us-rounded">
          <rect width="20" height="14" rx="2" />
        </clipPath>
      </defs>
      <g clipPath="url(#flag-us-rounded)">
        <rect width="20" height="14" fill="#fff" />
        {stripes.map(i =>
          i % 2 === 0 ? <rect key={i} y={(i * 14) / 13} width="20" height={14 / 13} fill="#b22234" /> : null,
        )}
        <rect width="8" height={7.54} fill="#3c3b6e" />
        {[1.7, 3.2, 4.7, 6.2].map((x, col) =>
          [1.4, 3.1, 4.8].map((y, row) => (
            <circle key={`${col}-${row}`} cx={col % 2 === 0 ? x : x + 0.75} cy={y} r="0.42" fill="#fff" />
          )),
        )}
      </g>
    </svg>
  );
}
