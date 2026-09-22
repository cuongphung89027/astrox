"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import type { AdminConfig } from "../../../../services/admin/config";
import type { summarizeAi } from "../../../../services/admin/metrics";
import { AdminDataTable } from "./AdminDataTable";
import s from "./AdminDashboard.module.css";
type Result = {
  summary: ReturnType<typeof summarizeAi>;
  from: string;
  to: string;
  loaded: number;
  truncated: boolean;
  options: { providers: string[]; models: string[]; services: string[] };
};
const date = (days = 0) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const number = (n: number | null, suffix = "") =>
  n === null
    ? "Chưa có dữ liệu"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n) +
      suffix;
export function AiMetrics({ config }: { config: AdminConfig }) {
  const [filters, setFilters] = useState({
    from: date(6),
    to: date(),
    provider: "",
    model: "",
    service: "",
  });
  const [query, setQuery] = useState(() =>
    new URLSearchParams(filters).toString(),
  );
  const [refresh, setRefresh] = useState(0),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      adminRequest<Result>(`data/ai-metrics?${query}`)
        .then((r) => {
          if (active) setResult(r);
        })
        .catch((e) => {
          if (active) {
            setResult(null);
            setError(e.message);
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, refresh]);
  const summary = result?.summary;
  const choices = result?.options || {
    providers: [],
    models: [],
    services: [],
  };
  return (
    <section aria-label="Thống kê AI" className={s.metrics}>
      <form
        className={s.dataToolbar}
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(new URLSearchParams(filters).toString());
          setRefresh((n) => n + 1);
        }}
      >
        <label>
          Từ ngày
          <input
            type="date"
            required
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            required
            value={filters.to}
            min={filters.from}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        {(
          [
            ["provider", "Provider", choices.providers],
            ["model", "Model", choices.models],
            ["service", "Dịch vụ", choices.services],
          ] as const
        ).map(([key, label, values]) => (
          <label key={key}>
            {label}
            <select
              aria-label={label}
              value={filters[key]}
              onChange={(e) =>
                setFilters({ ...filters, [key]: e.target.value })
              }
            >
              <option value="">Tất cả</option>
              {values.map((value) => (
                <option key={value} value={value}>
                  {key === "provider"
                    ? config.ai.providers.find((p) => p.id === value)?.name ||
                      value
                    : key === "service"
                      ? config.billing.services.find((p) => p.id === value)
                          ?.name || value
                      : value}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className={s.primary} disabled={busy}>
          {busy ? "Đang tải…" : "Xem thống kê"}
        </button>
      </form>
      <p className={s.help}>
        Ngày theo UTC · tối đa 90 ngày. Thống kê các request qua AI gateway đã
        nối Admin; không bao gồm API cũ hoặc các lượt đọc cache trong trình
        duyệt.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {result && summary && (
        <div aria-busy={busy}>
          <p className={s.help} role="status">
            {result.from} → {result.to} · {result.loaded} bản ghi đã tải ·{" "}
            {summary.requests} request khớp bộ lọc
          </p>
          {result.truncated && (
            <p className={s.error} role="alert">
              Khoảng thời gian vượt 5.000 bản ghi. Chỉ thống kê 5.000 request
              mới nhất; hãy thu hẹp ngày để xem số liệu đầy đủ.
            </p>
          )}
          <div className={s.metricCards}>
            {[
              [
                "Request",
                number(summary.requests),
                `${summary.success} thành công · ${summary.failed} lỗi`,
              ],
              [
                "Tỷ lệ request lỗi",
                number(summary.errorRate, "%"),
                "Request lỗi / tổng request",
              ],
              [
                "Lần gọi provider",
                number(summary.attempts),
                `${summary.attemptErrors} lần lỗi · ${summary.retries} retry`,
              ],
              [
                "Tỷ lệ lỗi provider",
                number(summary.attemptErrorRate, "%"),
                "Lần gọi lỗi / tổng lần gọi; không tính circuit skip",
              ],
              [
                "Request fallback",
                number(summary.fallbackRequests),
                "Đã gọi hơn một cấu hình model",
              ],
              [
                "Phản hồi trung bình",
                number(summary.averageMs, " ms"),
                `P95: ${number(summary.p95Ms, " ms")}`,
              ],
              [
                "Tổng token",
                number(summary.totalTokens),
                `${summary.completeUsageAttempts} lần gọi có đủ input và output`,
              ],
              [
                "Token input",
                number(summary.tokens.input),
                `Có usage: ${summary.usageRequests}/${summary.requests} request`,
              ],
              [
                "Token output",
                number(summary.tokens.output),
                "Chỉ cộng token provider đã báo",
              ],
              [
                "Token đọc cache",
                number(summary.tokens.cacheRead),
                `Có cache: ${number(summary.cacheHitRate, "%")} trên ${summary.cacheKnownAttempts} lần có dữ liệu`,
              ],
              [
                "Token ghi cache",
                number(summary.tokens.cacheWrite),
                "Tách riêng với token đọc cache",
              ],
              [
                "Chi phí ước tính (USD)",
                summary.costUsd === null
                  ? "Chưa có dữ liệu"
                  : summary.costUsd.toLocaleString("en-US", {
                      maximumFractionDigits: 6,
                    }),
                `${summary.pricedAttempts}/${summary.attempts} lần gọi đủ usage và giá; không phải hóa đơn`,
              ],
            ].map(([title, value, detail]) => (
              <article key={title}>
                <p>{title}</p>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <p className={s.info}>
            Cache kết quả AstroX: chưa thu thập vì hiện nằm trong trình duyệt.
            Các chỉ số cache phía trên là token do provider báo.
          </p>
          {summary.delegated > 0 && (
            <p className={s.info}>
              {summary.delegated} request chuyển tới Worker nghiệp vụ. Chỉ có
              kết quả gateway; chưa có usage/model từ Worker đó.
            </p>
          )}
          <section className={s.card}>
            <header className={s.cardHeader}>
              <div>
                <h2>Request theo ngày</h2>
              </div>
            </header>
            {summary.daily.length ? (
              <div className={s.dailyChart}>
                {summary.daily.map((day) => (
                  <div key={day.day}>
                    <span>{day.day}</span>
                    <meter
                      min={0}
                      max={Math.max(...summary.daily.map((d) => d.requests), 1)}
                      value={day.requests}
                      aria-label={`${day.day}: ${day.requests} request, ${day.failed} lỗi`}
                    />
                    <span>
                      {day.requests} · {day.failed} lỗi
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa có request trong khoảng đã chọn.</p>
            )}
          </section>
          <section className={s.card}>
            <header className={s.cardHeader}>
              <div>
                <h2>Theo provider & model</h2>
              </div>
            </header>
            {summary.groups.length ? (
              <AdminDataTable
                rows={summary.groups.map((g) => ({
                  ...g,
                  provider:
                    config.ai.providers.find((p) => p.id === g.provider)
                      ?.name || g.provider,
                  error_rate: `${((g.failed / g.attempts) * 100).toFixed(1)}%`,
                }))}
              />
            ) : (
              <p>Chưa có lần gọi provider phù hợp.</p>
            )}
          </section>
          {summary.errors.length > 0 && (
            <section className={s.card}>
              <header className={s.cardHeader}>
                <div>
                  <h2>Lỗi request</h2>
                </div>
              </header>
              <AdminDataTable rows={summary.errors} />
            </section>
          )}
        </div>
      )}
    </section>
  );
}
