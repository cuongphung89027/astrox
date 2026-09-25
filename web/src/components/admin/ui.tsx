"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AdminConfig } from "../../../../services/admin/config";
import { providerRoutes, routeLabel } from "../../../../services/admin/provider-models";
import { adminRequest } from "@/lib/admin-client";
import s from "./AdminDashboard.module.css";

export const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export type Spec = [
  string,
  string,
  "text" | "number" | "textarea" | "boolean" | string[],
];
export function Fields({
  value,
  specs,
  onChange,
}: {
  value: object;
  specs: Spec[];
  onChange: (key: string, value: unknown) => void;
}) {
  const data = value as Record<string, unknown>;
  return (
    <div className={s.fields}>
      {specs.map(([key, label, type]) =>
        type === "boolean" ? (
          <label key={key} className={s.toggle}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={!!data[key]}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <i />
          </label>
        ) : (
          <label key={key} className={type === "textarea" ? s.full : undefined}>
            <span>{label}</span>
            {Array.isArray(type) ? (
              <select
                aria-label={label}
                value={String(data[key] ?? "")}
                onChange={(e) => onChange(key, e.target.value)}
              >
                {type.map((v) => (
                  <option key={v} value={v}>
                    {optionLabels[v] || v}
                  </option>
                ))}
              </select>
            ) : type === "textarea" ? (
              <textarea
                rows={4}
                value={String(data[key] ?? "")}
                onChange={(e) => onChange(key, e.target.value)}
              />
            ) : (
              <input
                type={type}
                step={type === "number" ? "any" : undefined}
                value={String(data[key] ?? "")}
                onChange={(e) =>
                  onChange(
                    key,
                    type === "number" ? Number(e.target.value) : e.target.value,
                  )
                }
              />
            )}
          </label>
        ),
      )}
    </div>
  );
}
export const optionLabels: Record<string, string> = {
  all: "Toàn bộ website",
  tuvi: "Tử Vi",
  zodiac: "Cung Hoàng Đạo",
  kinhdich: "Kinh Dịch",
  batu: "Bát Tự",
  numerology: "Thần Số Học",
  tarot: "Tarot",
  compat: "Tương Hợp",
  rate: "Theo tỷ giá",
  fixed: "Point cố định",
  topup_bonus: "Thưởng Point khi nạp",
  direct_points: "Cộng Point trực tiếp",
  responses: "Responses API",
  chat: "Chat Completions",
  anthropic: "Anthropic Messages",
  draft: "Chưa mở / nháp",
  free: "Miễn phí",
  paid: "Thu Point",
  maintenance: "Bảo trì",
  hidden: "Ẩn",
  profile: "Mua một lần / hồ sơ",
  session: "Mỗi lượt sử dụng",
  period: "Theo kỳ",
  unlimited: "Không giới hạn",
  limited: "Có giới hạn",
  day: "Theo ngày",
  month: "Theo tháng",
  lifetime: "Toàn thời gian",
};
export function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={s.card}>
      <header className={s.cardHeader}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className={s.empty}>
      <span aria-hidden>✧</span>
      <p>{children}</p>
    </div>
  );
}

export function AdminLogo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- same static brand asset as the public site */}
      <img src="/assets/logo.png" alt="AstroX" width={104} height={104} />
    </>
  );
}

export function SecretInput({
  label,
  reference,
  configured,
  save,
  allowed,
}: {
  label: string;
  reference: string;
  configured: boolean;
  save: (ref: string, value: string) => Promise<void>;
  allowed: boolean;
}) {
  const [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className={s.secret}>
      <label>
        {label}
        <input
          type="password"
          disabled={!allowed}
          autoComplete="new-password"
          placeholder={
            configured
              ? "•••••••• · Đã có khóa, nhập để thay thế"
              : "Chưa cấu hình khóa"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button
        disabled={!allowed || !value.trim() || busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await save(reference, value);
            setValue("");
            setMessage("Đã lưu khóa bảo mật.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang lưu…" : "Lưu khóa"}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
export function Chain({
  value,
  config,
  onChange,
}: {
  value: string[];
  config: AdminConfig;
  onChange: (value: string[]) => void;
}) {
  return (
    <div className={s.chain}>
      {value.map((id, i) => (
        <div key={id}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          <strong>
            {providerRoutes(config.ai.providers).find((p) => p.id === id)
              ? routeLabel(
                  providerRoutes(config.ai.providers).find((p) => p.id === id)!,
                )
              : id}
          </strong>
          <button
            aria-label={`Đưa ${id} lên`}
            disabled={i === 0}
            onClick={() => {
              const next = [...value];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange(next);
            }}
          >
            ↑
          </button>
          <button
            aria-label={`Đưa ${id} xuống`}
            disabled={i === value.length - 1}
            onClick={() => {
              const next = [...value];
              [next[i + 1], next[i]] = [next[i], next[i + 1]];
              onChange(next);
            }}
          >
            ↓
          </button>
          <button
            aria-label={`Bỏ ${id} khỏi fallback`}
            onClick={() => onChange(value.filter((v) => v !== id))}
          >
            ×
          </button>
        </div>
      ))}
      <label>
        <span>Thêm vào chuỗi</span>
        <select
          aria-label="Thêm vào chuỗi"
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...value, e.target.value]);
          }}
        >
          <option value="">Chọn provider · model · giao thức…</option>
          {providerRoutes(config.ai.providers)
            .filter((p) => p.enabled && !value.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {routeLabel(p)}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
export function IntegrationTest({
  kind,
  csrf,
  disabled,
}: {
  kind: "payos" | "zalo";
  csrf: string;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className={s.rowActions}>
      <small role="status">{message}</small>
      <button
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await adminRequest<{
              message?: string;
              checks?: { label: string; ok: boolean }[];
            }>(`integrations/${kind}`, csrf, {});
            setMessage(
              [
                result.message,
                ...(result.checks || []).map(
                  (c) => `${c.ok ? "✓" : "○"} ${c.label}`,
                ),
              ]
                .filter(Boolean)
                .join(" · "),
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang kiểm tra…" : "Kiểm tra cấu hình đã lưu"}
      </button>
    </div>
  );
}

export function ModelPricing({
  value,
  onChange,
}: {
  value?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  onChange: (value?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  }) => void;
}) {
  return (
    <details className={s.advanced}>
      <summary>
        Giá token để ước tính chi phí{" "}
        {value ? "· Đã cấu hình" : "· Chưa cấu hình"}
      </summary>
      <label>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
                : undefined,
            )
          }
        />{" "}
        Tính chi phí ước tính cho model này
      </label>
      {value && (
        <>
          <p className={s.help}>
            USD / 1 triệu token. Giá 0 nghĩa là miễn phí. Nhập theo bảng giá hợp
            đồng; không phải hóa đơn từ provider.
          </p>
          <div className={s.fields}>
            {(
              [
                ["input", "Input không cache"],
                ["output", "Output"],
                ["cacheRead", "Đọc cache"],
                ["cacheWrite", "Ghi cache"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="any"
                  value={value[key]}
                  onChange={(e) =>
                    onChange({ ...value, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
        </>
      )}
    </details>
  );
}

export function Members({
  csrf,
  roles,
  allowed,
}: {
  csrf: string;
  roles: AdminConfig["access"]["roles"];
  allowed: boolean;
}) {
  const [members, setMembers] = useState<
      { email: string; roleId: string; source: string }[]
    >([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("support"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const data = await adminRequest<{
        members: { email: string; roleId: string; source: string }[];
      }>("members");
      setMembers(data.members);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  const mutate = async (method: "PUT" | "DELETE", address: string) => {
    setBusy(true);
    setMessage("");
    try {
      await adminRequest(
        "members",
        csrf,
        method === "PUT"
          ? { email: address, roleId: role }
          : { email: address },
        method,
      );
      setEmail("");
      await refresh();
      setMessage("Đã cập nhật thành viên quản trị.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Thành viên quản trị"
      description="Gán vai trò cho email đã được xác thực qua Cloudflare Access."
    >
      <div className={s.fields}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Vai trò
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.rowActions}>
        <button
          className={s.secondary}
          disabled={!allowed || busy || !email.includes("@")}
          onClick={() => void mutate("PUT", email)}
        >
          Thêm / cập nhật thành viên
        </button>
      </div>
      {message && (
        <p className={s.help} role="status">
          {message}
        </p>
      )}
      {members.map((m) => (
        <div className={s.versionRow} key={m.email}>
          <div>
            <strong>{m.email}</strong>
            <p>
              {roles.find((r) => r.id === m.roleId)?.name || m.roleId} ·{" "}
              {m.source}
            </p>
          </div>
          {m.source !== "env" && m.source !== "environment" && (
            <button
              disabled={!allowed || busy}
              onClick={() => void mutate("DELETE", m.email)}
            >
              Thu hồi quyền
            </button>
          )}
        </div>
      ))}
    </Card>
  );
}
