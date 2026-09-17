/**
 * WuxingBar — thanh tỷ lệ Ngũ Hành (đếm Thiên Can + Địa Chi của 4 trụ, port
 * cách đếm cũ) + chú giải có % pop-in (NumberPopIn).
 * Màu: Kim vàng, Mộc ngọc, Thuỷ chàm, Hoả son, Thổ nâu.
 */
import { NumberPopIn } from "@/components/motion";
import { BATU_WX_COLOR, BATU_WX_LABEL } from "@/lib/batu";
import type { WxKey } from "@/lib/batu";

const WX_ORDER: WxKey[] = ["moc", "hoa", "tho", "kim", "thuy"];

interface WuxingBarProps {
  wuxing: Record<WxKey, number>;
}

export function WuxingBar({ wuxing }: WuxingBarProps) {
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div
        role="img"
        aria-label={`Tỷ lệ ngũ hành: ${WX_ORDER.map((k) => `${BATU_WX_LABEL[k]} ${Math.round((wuxing[k] / total) * 100)}%`).join(", ")}`}
        className="flex h-3.5 overflow-hidden rounded-full bg-white/60"
      >
        {WX_ORDER.map((k) =>
          wuxing[k] > 0 ? (
            <span
              key={k}
              style={{ width: `${((wuxing[k] / total) * 100).toFixed(1)}%`, background: BATU_WX_COLOR[k] }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-5">
        {WX_ORDER.map((k) => {
          const pct = Math.round((wuxing[k] / total) * 100);
          return (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: BATU_WX_COLOR[k] }} />
              <span className="text-[12.5px] font-semibold text-muc">
                {BATU_WX_LABEL[k]}: {wuxing[k]}
              </span>
              <span className="ml-auto font-display text-sm font-extrabold text-muc-2 tabular-nums">
                <NumberPopIn key={`${k}-${pct}-${total}`} value={`${pct}%`} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
