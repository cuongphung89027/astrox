/**
 * SunSpinner — loading state: Mặt Trời Đông Sơn quay chậm + nhãn tuỳ chọn.
 */
import { LoadingWhisper } from "./LoadingWhisper";
import { DongSonSun } from "./motifs/DongSonSun";

export function SunSpinner({ size = 44, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <DongSonSun size={size} className="ax-spin-slow text-son" />
      {label ? <span className="text-sm font-semibold text-muc-2">{label}</span> : null}
      <small className="text-xs text-muc-2"><LoadingWhisper/></small>
    </div>
  );
}
