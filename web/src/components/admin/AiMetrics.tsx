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
  coverage: "full-period";
  timezone: "UTC" | "Asia/Ho_Chi_Minh";
  generatedAt: string;
  optionsTruncated: boolean;
  options: { providers: string[]; models: string[]; services: string[] };
};
const date = (days = 0) =>
  new Date(Date.now() + 7 * 3600000 - days * 86400000).toISOString().slice(0, 10);
const number = (n: number | null, suffix = "") =>
  n === null
    ? "Chưa có dữ liệu"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n) +
      suffix;
const validDate = (value: string | null): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const urlFilters = () => {
  const params = new URLSearchParams(window.location.search);
  const rawTo = params.get("to"), rawFrom = params.get("from");
  const to = validDate(rawTo) && rawTo <= date() ? rawTo : date();
  const from = validDate(rawFrom) && rawFrom <= to && Date.parse(to) - Date.parse(rawFrom) < 90 * 86400000
    ? rawFrom : new Date(Date.parse(to) - 6 * 86400000).toISOString().slice(0, 10);
  return { from, to, provider: (params.get("provider") || "").slice(0, 200),
    model: (params.get("model") || "").slice(0, 200), service: (params.get("service") || "").slice(0, 200),
    timezone: "Asia/Ho_Chi_Minh" };
};
export function AiMetrics({ config }: { config: AdminConfig }) {
  const [filters, setFilters] = useState({
    from: date(6),
    to: date(),
    provider: "",
    model: "",
    service: "",
    timezone: "Asia/Ho_Chi_Minh",
  });
  const [query, setQuery] = useState<string | null>(null);
  useEffect(() => {
    const restore = () => {
      const next = urlFilters();
      setFilters(next);
      setQuery(new URLSearchParams(next).toString());
    };
    const timer = setTimeout(restore, 0);
    window.addEventListener("popstate", restore);
    return () => { clearTimeout(timer); window.removeEventListener("popstate", restore); };
  }, []);
  const [refresh, setRefresh] = useState(0),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    if (query === null) return;
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
          const url = new URL(window.location.href);
          for (const [key, value] of Object.entries(filters)) {
            if (value) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
          }
          url.searchParams.set("view", "aiMetrics");
          window.history.pushState({}, "", url);
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
            max={date()}
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
            max={date()}
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
              {[...new Set([...values, filters[key]].filter(Boolean))].map((value) => (
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
        Ngày theo giờ Việt Nam (UTC+7) · tối đa 90 ngày. Tổng hợp toàn bộ request qua AI gateway đã
        nối Admin; không bao gồm API cũ hoặc các lượt đọc cache trong trình
        duyệt.
      </p>
      {error && (
        <div className={s.error} role="alert">
          <p>{error}</p>
          <button type="button" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>
            {busy ? "Đang thử lại…" : "Thử lại"}
          </button>
        </div>
      )}
      {result && summary && (
        <div aria-busy={busy}>
          <p className={s.help} role="status">
            {result.from} → {result.to} · {number(summary.requests)} request khớp bộ lọc, toàn kỳ ·{" "}
            Cập nhật {new Date(result.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            {busy ? " · Đang cập nhật…" : error ? " · Dữ liệu của lần tải trước" : ""}
          </p>
          {result.truncated && (
            <p className={s.error} role="alert">
              Báo cáo chưa bao phủ toàn kỳ. Hãy tải lại trước khi sử dụng số liệu.
            </p>
          )}
          {result.optionsTruncated && (
            <p className={s.info}>
              Mỗi danh sách bộ lọc hiển thị tối đa 500 giá trị. Tổng số request vẫn được tính toàn kỳ.
            </p>
          )}
          {summary.language&&<section aria-label="Chất lượng tiếng Việt" className={s.info}>
            <strong>Chất lượng tiếng Việt</strong>
            <p>{number(summary.language.checked)} lượt đã kiểm tra · {number(summary.language.detected)} phát hiện chữ Hán ({number(summary.language.detectionRate,'%')}) · {number(summary.language.repaired)} sửa thành công · {number(summary.language.blocked)} bị chặn.</p>
            <p>Sửa ngôn ngữ: {number(summary.language.repairAttempts)} lần gọi · {number(summary.language.repairCostUsd,' USD')} ({number(summary.language.pricedRepairs)} lần có đủ dữ liệu giá) · trung bình {number(summary.language.averageRepairMs,' ms')}. Chi phí sửa đã nằm trong tổng chi phí; dữ liệu lịch sử chưa ghi chính sách không được coi là đã kiểm tra.</p>
          </section>}
          <div className={s.metricCards}>
            {[
              [
                "Request",
                number(summary.requests),
                `${summary.success} thành công · ${summary.failed} lỗi · ${summary.blocked} bị chặn`,
              ],
              [
                "Tỷ lệ request lỗi",
                number(summary.errorRate, "%"),
                `${summary.failed} lỗi / ${summary.completedRequests} lượt thành công hoặc lỗi; loại lượt bị chặn`,
              ],
              [
                "Lần gọi provider",
                number(summary.attempts),
                `${summary.attemptErrors} lần lỗi · ${summary.retries} retry`,
              ],
              [
                "Tỷ lệ lỗi provider",
                number(summary.attemptErrorRate, "%"),
                "Lần gọi lỗi / tổng lần gọi thực tế; loại bỏ circuit skip và đối soát Point",
              ],
              [
                "Trả lại kết quả đã xử lý",
                number(summary.replayed),
                "Được tính thành công; không gọi provider mới",
              ],
              [
                "Request bị chặn",
                number(summary.blocked),
                "Giới hạn lượt, giá đổi, quyền hoặc trạng thái dịch vụ; không tính là lỗi",
              ],
              [
                "Lỗi hoàn tất dịch vụ",
                number(summary.serviceFailures),
                "Lỗi xử lý, lưu kết quả hoặc đối soát; tách khỏi lỗi provider",
              ],
              [
                "Request lỗi phía AI",
                number(summary.providerFailures),
                "Request kết thúc bằng mã lỗi provider hoặc vượt ngân sách gọi AI",
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
            Lượt đọc cache trong trình duyệt không nằm trong báo cáo gateway này.
            Các chỉ số cache phía trên là token do provider báo; lượt trả lại kết quả đã xử lý là replay từ backend.
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
            {summary.groupsTruncated && (
              <p className={s.help}>Hiển thị 500 nhóm provider/model; các nhóm còn lại được cộng vào “Khác”. Tổng vẫn đầy đủ.</p>
            )}
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
              {summary.errorsTruncated && (
                <p className={s.help}>Hiển thị 100 mã lỗi; các mã còn lại được cộng vào “other”.</p>
              )}
              <AdminDataTable rows={summary.errors} />
            </section>
          )}
        </div>
      )}
    </section>
  );
}
