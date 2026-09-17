"use client";

/**
 * ChartFormPanel — nguồn dữ liệu lập lá số: nút "Dùng hồ sơ đã lưu" + form chỉnh
 * tay (giới tính, ngày sinh, giờ sinh, nơi sinh). Form KHÔNG ghi đè hồ sơ đã
 * lưu — chỉ làm đầu vào tính toán (giữ ràng buộc với use-store cũ).
 */
import { Btn } from "@/components/kit";
import { HOUR_CHI_OPTIONS } from "@/lib/utils";
import { useProfileModal } from "@/components/profile/ProfileModal";

export interface ChartFormValue {
  gender: string;
  dob: string;
  hourChi: string;
  place: string;
}

interface ChartFormPanelProps {
  value: ChartFormValue;
  onChange: (patch: Partial<ChartFormValue>) => void;
  onUseProfile: () => void;
  hasProfile: boolean;
}

const labelCls = "text-[11px] font-extrabold uppercase tracking-[0.14em] text-muc-2";
const fieldCls =
  "glass w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-muc placeholder:font-normal placeholder:text-muc-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-son";

export function ChartFormPanel({ value, onChange, onUseProfile, hasProfile }: ChartFormPanelProps) {
  const { open } = useProfileModal();

  return (
    <div className="glass rounded-[var(--radius-card)] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muc">Dữ liệu lập lá số</p>
        {hasProfile ? (
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" size="sm" onClick={onUseProfile}>
              Dùng hồ sơ đã lưu
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => open()}>
              Sửa hồ sơ
            </Btn>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <span className={labelCls} id="tuvi-gender-label">
            Giới tính
          </span>
          <div role="group" aria-labelledby="tuvi-gender-label" className="mt-2 flex gap-2">
            {["Nam", "Nữ"].map((g) => {
              const active = value.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ gender: g })}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-son ${
                    active ? "bg-son text-white shadow-[var(--shadow-pop)]" : "glass text-muc-2 hover:text-muc"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="tuvi-dob">
            Ngày sinh dương lịch
          </label>
          <input
            id="tuvi-dob"
            type="date"
            value={value.dob}
            onChange={(e) => onChange({ dob: e.target.value })}
            className={`mt-2 ${fieldCls}`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="tuvi-hour">
            Giờ sinh
          </label>
          <select
            id="tuvi-hour"
            value={value.hourChi}
            onChange={(e) => onChange({ hourChi: e.target.value })}
            className={`mt-2 ${fieldCls}`}
          >
            {HOUR_CHI_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="tuvi-place">
            Nơi sinh
          </label>
          <input
            id="tuvi-place"
            type="text"
            value={value.place}
            placeholder="Ví dụ: Hà Nội"
            onChange={(e) => onChange({ place: e.target.value })}
            className={`mt-2 ${fieldCls}`}
          />
        </div>
      </div>
    </div>
  );
}
