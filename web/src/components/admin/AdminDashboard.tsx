"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CAPABILITIES,
  MODULES,
  quotePackage,
  validateConfig,
  type AdminConfig,
} from "../../../../services/admin/config";
import {
  adminRequest,
  AdminError,
  type AdminSession,
  type ConfigSnapshot,
} from "@/lib/admin-client";
import s from "./AdminDashboard.module.css";
import {
  SERVICE_CATALOG,
  addMissingServices,
} from "../../../../services/admin/catalog";
import {
  providerRoutes,
  routeLabel,
  belongsToProvider,
} from "../../../../services/admin/provider-models";
import { AiMetrics } from "./AiMetrics";
import { AdminDataTable as DataTable } from "./AdminDataTable";

type View =
  | "overview"
  | "providers"
  | "aiMetrics"
  | "billing"
  | "services"
  | "payos"
  | "zalo"
  | "walletbackend"
  | "rewards"
  | "content"
  | "operations"
  | "access"
  | "users"
  | "wallet"
  | "reports"
  | "audit";
const navigation: [View, string, string, string][] = [
  ["overview", "Tổng quan", "◈", ""],
  ["services", "Dịch vụ & giá", "☷", "DỊCH VỤ & NỘI DUNG"],
  ["providers", "Cài đặt AI", "✧", "DỊCH VỤ & NỘI DUNG"],
  ["aiMetrics", "Thống kê AI", "↗", "DỊCH VỤ & NỘI DUNG"],
  ["content", "Nội dung & thông báo", "▤", "DỊCH VỤ & NỘI DUNG"],
  ["billing", "Gói nạp & ưu đãi", "◇", "THANH TOÁN & VÍ"],
  ["payos", "Thanh toán PayOS", "⇄", "THANH TOÁN & VÍ"],
  ["wallet", "Ví & giao dịch", "▱", "THANH TOÁN & VÍ"],
  ["users", "Người dùng", "◎", "NGƯỜI DÙNG & THƯỞNG"],
  ["zalo", "Đăng nhập Zalo", "⇥", "NGƯỜI DÙNG & THƯỞNG"],
  ["rewards", "Thưởng & giới thiệu", "☀", "NGƯỜI DÙNG & THƯỞNG"],
  ["reports", "Báo cáo", "↗", "HỆ THỐNG"],
  ["walletbackend", "Kết nối backend ví", "⇄", "HỆ THỐNG"],
  ["operations", "Vận hành", "⚙", "HỆ THỐNG"],
  ["access", "Phân quyền", "⌘", "HỆ THỐNG"],
  ["audit", "Nhật ký & phiên bản", "◷", "HỆ THỐNG"],
];
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
type Spec = [
  string,
  string,
  "text" | "number" | "textarea" | "boolean" | string[],
];
function Fields({
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
const optionLabels: Record<string, string> = {
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
function Card({
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
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className={s.empty}>
      <span aria-hidden>✧</span>
      <p>{children}</p>
    </div>
  );
}

function AdminLogo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- same static brand asset as the public site */}
      <img src="/assets/logo.png" alt="AstroX" width={104} height={104} />
    </>
  );
}

export function AdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null),
    [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null),
    [config, setConfig] = useState<AdminConfig | null>(null),
    [view, setView] = useState<View>("overview"),
    [drawer, setDrawer] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [publish, setPublish] = useState(false),
    [rollbackId, setRollbackId] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [remoteMessage, setRemoteMessage] = useState(""),
    [versions, setVersions] = useState<Record<string, unknown>[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [serviceModule, setServiceModule] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [dataRevision, setDataRevision] = useState(0);
  const [reportKind, setReportKind] = useState<"reports" | "rewards" | "ai">(
    "reports",
  );
  useEffect(() => {
    if (drawer) {
      sidebarRef.current?.querySelector<HTMLElement>("button,a")?.focus();
    }
  }, [drawer]);
  useEffect(() => {
    if (!publish && !drawer) opener.current?.focus();
  }, [publish, drawer]);
  const accept = (data: ConfigSnapshot) => {
    setSnapshot(data);
    setConfig(structuredClone(data.draft));
  };
  const boot = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const auth = await adminRequest<AdminSession>("session");
      setSession(auth);
      accept(await adminRequest<ConfigSnapshot>("config"));
    } catch (e) {
      if (!(e instanceof AdminError && e.status === 401))
        setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      void boot();
      const next = new URLSearchParams(location.search).get("view");
      if (navigation.some(([id]) => id === next)) setView(next as View);
    }, 0);
    const pop = () => {
      const next = new URLSearchParams(location.search).get("view");
      setView(
        navigation.some(([id]) => id === next) ? (next as View) : "overview",
      );
    };
    window.addEventListener("popstate", pop);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("popstate", pop);
    };
  }, [boot]);
  const dirty =
    !!config &&
    !!snapshot &&
    JSON.stringify(config) !== JSON.stringify(snapshot.draft);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    if (["users", "wallet", "reports"].includes(view)) {
      adminRequest<{
        available: boolean;
        rows: Record<string, unknown>[];
        message?: string;
      }>(`data/${view === "reports" ? reportKind : view}`)
        .then((data) => {
          if (active) {
            setRows(data.rows || []);
            setRemoteMessage(
              data.message ||
                (data.available
                  ? "Chưa có bản ghi."
                  : "Backend nghiệp vụ chưa được kết nối."),
            );
          }
        })
        .catch((e) => {
          if (active) setRemoteMessage(e.message);
        });
    } else if (view === "audit") {
      Promise.all([
        adminRequest<{ events: Record<string, unknown>[] }>("audit"),
        adminRequest<{ versions: Record<string, unknown>[] }>("history"),
      ])
        .then(([a, h]) => {
          if (active) {
            setRows(a.events);
            setVersions(h.versions);
            setRemoteMessage("Chưa có hoạt động quản trị.");
          }
        })
        .catch((e) => {
          if (active) setRemoteMessage(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [view, session, snapshot?.revision, dataRevision, reportKind]);
  const refreshData = () => {
    setRows([]);
    setVersions([]);
    setRemoteMessage("Đang tải dữ liệu…");
    setDataRevision((value) => value + 1);
  };
  const go = (id: View) => {
    setRows([]);
    setRemoteMessage("Đang tải dữ liệu…");
    setView(id);
    setDrawer(false);
    history.pushState({}, "", `/admin?view=${id}`);
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof AdminError && e.status === 401) setSession(null);
    } finally {
      setBusy(false);
    }
  };
  const update = (fn: (draft: AdminConfig) => void) =>
    setConfig((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      fn(next);
      return next;
    });
  const patch = (group: keyof AdminConfig, key: string, value: unknown) =>
    update((draft) => Object.assign(draft[group], { [key]: value }));
  const save = () =>
    act(async () => {
      if (!config || !snapshot) return;
      const errors = validateConfig(config);
      if (errors.length)
        throw Error(errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
      await adminRequest(
        "config",
        session?.csrf,
        { config, expectedRevision: snapshot.revision },
        "PUT",
      );
      accept(await adminRequest<ConfigSnapshot>("config"));
      setMessage("Đã lưu bản nháp. Cấu hình đang chạy chưa thay đổi.");
    });
  const secret = async (ref: string, value: string) => {
    if (!session?.user.capabilities.includes("secrets.write"))
      throw Error("Bạn không có quyền quản lý khóa kết nối.");
    await adminRequest("secrets", session?.csrf, { ref, value }, "PUT");
    setSnapshot((old) =>
      old ? { ...old, secrets: [...new Set([...old.secrets, ref])] } : old,
    );
  };
  const canWrite = !!session?.user.capabilities.includes("config.write");
  if (loading)
    return (
      <div className={s.login}>
        <div className={s.loginCard}>
          <div className={s.brand}>
            <AdminLogo />
          </div>
          <p role="status">Đang tải…</p>
        </div>
      </div>
    );
  if (!session || !config || !snapshot)
    return (
      <div className={s.login}>
        <Link className={s.loginBack} href="/">
          <span aria-hidden="true">←</span>Trở về AstroX
        </Link>
        <form
          className={s.loginCard}
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const auth = await adminRequest<AdminSession>(
                "login",
                undefined,
                { password },
              );
              setSession(auth);
              setPassword("");
              accept(await adminRequest<ConfigSnapshot>("config"));
            });
          }}
        >
          <div className={s.brand}>
            <AdminLogo />
          </div>
          <h1>Trang quản trị</h1>
          {error && (
            <div role="alert" className={s.error}>
              {error}
            </div>
          )}
          <label>
            Mật khẩu quản trị
            <span className={s.passwordField}>
              <input
                aria-label="Mật khẩu quản trị"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </span>
          </label>
          <button className={s.primary} disabled={busy}>
            {busy ? "Đang xác thực…" : "Đăng nhập"}
          </button>
          <small>
            Production sử dụng danh tính được bảo vệ bởi Cloudflare Access. Mật
            khẩu chỉ dùng cho môi trường phát triển cục bộ.
          </small>
          <button type="button" onClick={() => void boot()}>
            Kiểm tra lại phiên truy cập
          </button>
        </form>
      </div>
    );
  const title = navigation.find(([id]) => id === view)?.[1];
  const searchText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const filteredServices = config.billing.services
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p }) =>
        (!serviceModule || p.module === serviceModule) &&
        (!serviceStatus || p.status === serviceStatus) &&
        searchText(`${p.name} ${p.id}`).includes(
          searchText(serviceSearch.trim()),
        ),
    );

  const changed = Object.keys(config).filter(
    (key) =>
      JSON.stringify(config[key as keyof AdminConfig]) !==
      JSON.stringify(snapshot.published?.[key as keyof AdminConfig]),
  );
  const groupNames: Record<string, string> = {
    ai: "Cài đặt AI",
    billing: "Gói nạp & giá dịch vụ",
    integrations: "Tích hợp",
    rewards: "Thưởng & giới thiệu",
    content: "Nội dung",
    operations: "Vận hành",
    access: "Phân quyền",
  };
  const renderFields = (group: keyof AdminConfig, specs: Spec[]) => (
    <Fields
      value={config[group]}
      specs={specs}
      onChange={(key, value) => patch(group, key, value)}
    />
  );
  return (
    <div className={s.shell}>
      {drawer && (
        <button
          className={s.overlay}
          aria-label="Đóng menu"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        inert={publish}
        ref={sidebarRef}
        className={`${s.sidebar} ${drawer ? s.open : ""}`}
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer ? true : undefined}
        aria-label="Menu quản trị"
        onKeyDown={(e) => {
          if (!drawer) return;
          if (e.key === "Escape") setDrawer(false);
          if (e.key === "Tab") {
            const items = e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a",
            );
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <a className={s.brand} href="/admin">
          <AdminLogo />
        </a>
        <nav aria-label="Điều hướng quản trị">
          {navigation.map(([id, label, icon, group], i) => (
            <div key={id}>
              {group && group !== navigation[i - 1]?.[3] && (
                <p className={s.navLabel}>{group}</p>
              )}
              <button
                className={view === id ? s.active : ""}
                onClick={() => go(id)}
                aria-current={view === id ? "page" : undefined}
              >
                <span aria-hidden>{icon}</span>
                {label}
                {view === id && <i />}
              </button>
            </div>
          ))}
        </nav>
        <Link className={s.back} href="/">
          ↗ Xem website AstroX
        </Link>
        <div className={s.account}>
          <span>{session.user.email.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{session.user.email}</strong>
          </div>
          <button
            aria-label="Đăng xuất"
            onClick={() =>
              void act(async () => {
                await adminRequest("logout", session.csrf, {});
                setSession(null);
                setConfig(null);
              })
            }
          >
            ↪
          </button>
        </div>
      </aside>
      <main className={s.main} inert={drawer || publish}>
        <div className={s.topbar}>
          <button
            className={s.menuButton}
            aria-label="Mở menu"
            onClick={(e) => {
              opener.current = e.currentTarget;
              setDrawer(true);
            }}
          >
            ☰
          </button>
          <span>
            Quản trị <b>/ {title}</b>
          </span>
          <span className={s.version}>
            Bản nháp #{snapshot.revision}
            <i />{" "}
            {snapshot.publishedRevision === null
              ? "Chưa xuất bản"
              : `Đang chạy #${snapshot.publishedRevision}`}
          </span>
        </div>
        <div className={s.page}>
          <header className={s.pageHeader}>
            <div>
              <h1>
                {title}
                <span>.</span>
              </h1>
            </div>
            <span className={s.status}>
              {dirty ? "● Có thay đổi chưa lưu" : "✓ Bản nháp đã đồng bộ"}
            </span>
          </header>
          {error && (
            <div role="alert" className={s.error}>
              {error}
            </div>
          )}
          {message && (
            <div role="status" className={s.success}>
              {message}
            </div>
          )}
          {snapshot.revision === 0 && snapshot.publishedRevision === null && snapshot.integration.wallet && session.user.capabilities.includes("access.manage") && (
            <div className={s.info}>
              <p>Đã tìm thấy backend AstroX hiện có. Nhập gói nạp, Zalo, PayOS và dịch vụ vào bản nháp để kiểm tra trước khi áp dụng.</p>
              <button disabled={busy || dirty} onClick={() => void act(async () => {
                await adminRequest("import-legacy", session.csrf, { expectedRevision: snapshot.revision });
                accept(await adminRequest<ConfigSnapshot>("config"));
                setMessage("Đã nhập cấu hình cũ. Tài khoản, số dư và đơn hàng được giữ nguyên.");
              })}>Nhập cấu hình backend hiện tại</button>
            </div>
          )}
          {view === "aiMetrics" && <AiMetrics config={config} />}
          <fieldset
            disabled={
              busy || (!canWrite && view !== "overview" && view !== "access")
            }
            className={s.editor}
          >
            {view === "overview" && (
              <>
                <div className={s.overviewGrid}>
                  <section className={s.readiness}>
                    <h2>Trạng thái cấu hình</h2>
                    {[
                      [
                        "AI Provider",
                        config.ai.providers.filter((p) => p.enabled).length > 0,
                        "providers",
                      ],
                      [
                        "Thanh toán PayOS",
                        config.integrations.payos.enabled,
                        "payos",
                      ],
                      [
                        "Đăng nhập Zalo",
                        config.integrations.zalo.enabled,
                        "zalo",
                      ],
                      [
                        "Tỷ giá & gói nạp",
                        config.billing.vndPerPoint > 0 &&
                          config.billing.packages.some((p) => p.enabled),
                        "billing",
                      ],
                    ].map(([name, ready, to]) => (
                      <button key={String(name)} onClick={() => go(to as View)}>
                        <span>{name}</span>
                        <small className={ready ? s.ready : ""}>
                          {ready ? "Đã cấu hình" : "Cần thiết lập"} →
                        </small>
                      </button>
                    ))}
                  </section>
                </div>
                <div className={s.stats}>
                  {[
                    [config.ai.providers.length, "AI Provider", "AI Provider"],
                    [
                      config.billing.services.length,
                      "Dịch vụ",
                      "Danh mục trải nghiệm",
                    ],
                    [
                      config.billing.packages.length,
                      "Gói nạp",
                      "Lựa chọn cho người dùng",
                    ],
                    [
                      config.rewards.milestones.length,
                      "Mốc thưởng",
                      "Hành trình gắn kết",
                    ],
                  ].map(([n, label]) => (
                    <section key={String(label)}>
                      <strong>
                        {String(n).padStart(2, "0")}
                        <span>↗</span>
                      </strong>
                      <p>{label}</p>
                    </section>
                  ))}
                </div>
                <Card title="Truy cập nhanh">
                  <div className={s.shortcuts}>
                    {(["services", "rewards", "content"] as View[]).map((v) => (
                      <button key={v} onClick={() => go(v)}>
                        <span>{navigation.find(([id]) => id === v)?.[2]}</span>
                        <h3>{navigation.find(([id]) => id === v)?.[1]}</h3>
                        <b>Mở →</b>
                      </button>
                    ))}
                  </div>
                </Card>
                <div className={s.info}>
                  Số liệu trên phản ánh cấu hình thực tế. Dữ liệu giao dịch chỉ
                  xuất hiện khi backend ví được kết nối và xác thực.
                </div>
              </>
            )}
            {view === "providers" && (
              <>
                <Card
                  title="AI Provider"
                  description="Khóa API được mã hóa phía server. Không đưa khóa vào cấu hình công khai."
                  action={
                    <button
                      className={s.secondary}
                      onClick={() =>
                        update((d) => {
                          const id = uid("provider");
                          d.ai.providers.push({
                            id,
                            name: "Provider mới",
                            baseUrl: "https://api.openai.com/v1",
                            protocol: "responses",
                            model: "",
                            enabled: false,
                            timeoutMs: 30000,
                            retries: 1,
                            maxTokens: 4000,
                            temperature: 0.7,
                            secretRef: `provider:${id}`,
                          });
                        })
                      }
                    >
                      ＋ Thêm provider
                    </button>
                  }
                >
                  {config.ai.providers.length === 0 && (
                    <Empty>
                      Chưa có provider. Thêm kết nối đầu tiên để bắt đầu.
                    </Empty>
                  )}
                  {config.ai.providers.map((p, i) => (
                    <details className={s.record} key={p.id} open>
                      <summary>
                        <span className={s.recordIcon}>✧</span>
                        <strong>{p.name || "Provider chưa đặt tên"}</strong>
                        <small>
                          {p.enabled ? "Đang bật" : "Đang tắt"} ·{" "}
                          {1 + (p.models?.length || 0)} cấu hình model
                        </small>
                      </summary>
                      <p className={s.help}>
                        Kết nối chính · API key dùng chung cho các model trong
                        provider này.
                      </p>
                      <Fields
                        value={p}
                        specs={[
                          ["name", "Tên hiển thị", "text"],
                          ["baseUrl", "API endpoint HTTPS", "text"],
                          ["model", "Model ID", "text"],
                          [
                            "protocol",
                            "Giao thức",
                            ["responses", "chat", "anthropic"],
                          ],
                          ["enabled", "Bật provider", "boolean"],
                        ]}
                        onChange={(key, value) =>
                          update((d) => {
                            Object.assign(d.ai.providers[i], { [key]: value });
                            if (key === "enabled" && !value) {
                              d.ai.chain = d.ai.chain.filter(
                                (id) => !belongsToProvider(id, p.id),
                              );
                              d.billing.services.forEach(
                                (svc) =>
                                  (svc.chain = svc.chain.filter(
                                    (id) => !belongsToProvider(id, p.id),
                                  )),
                              );
                            }
                          })
                        }
                      />
                      <details className={s.advanced}>
                        <summary>Thông số nâng cao · model mặc định</summary>
                        <Fields
                          value={p}
                          specs={[
                            ["timeoutMs", "Timeout mỗi lần (ms)", "number"],
                            ["retries", "Số lần thử lại (0–3)", "number"],
                            ["maxTokens", "Giới hạn output token", "number"],
                            ["temperature", "Temperature", "number"],
                          ]}
                          onChange={(key, value) =>
                            update((d) => {
                              Object.assign(d.ai.providers[i], {
                                [key]: value,
                              });
                            })
                          }
                        />
                      </details>
                      <ModelPricing
                        value={p.pricing}
                        onChange={(pricing) =>
                          update((d) => {
                            if (pricing) d.ai.providers[i].pricing = pricing;
                            else delete d.ai.providers[i].pricing;
                          })
                        }
                      />
                      <SecretInput
                        label="API key"
                        reference={p.secretRef}
                        configured={snapshot.secrets.includes(p.secretRef)}
                        save={secret}
                        allowed={session.user.capabilities.includes(
                          "secrets.write",
                        )}
                      />
                      <div className={s.modelList}>
                        {(p.models || []).map((model, modelIndex) => (
                          <details className={s.record} key={model.id} open>
                            <summary>
                              <strong>
                                {model.name || model.model || "Model mới"}
                              </strong>
                              <small>
                                {optionLabels[model.protocol]} ·{" "}
                                {model.enabled ? "Đang bật" : "Đang tắt"}
                              </small>
                            </summary>
                            <Fields
                              value={model}
                              specs={[
                                ["name", "Tên cấu hình model", "text"],
                                ["model", "Model ID", "text"],
                                [
                                  "protocol",
                                  "Giao thức",
                                  ["responses", "chat", "anthropic"],
                                ],
                                ["baseUrl", "API endpoint HTTPS", "text"],
                                ["enabled", "Bật model", "boolean"],
                              ]}
                              onChange={(key, value) =>
                                update((d) => {
                                  Object.assign(
                                    d.ai.providers[i].models![modelIndex],
                                    { [key]: value },
                                  );
                                  if (key === "enabled" && !value) {
                                    const target = `${p.id}:${model.id}`;
                                    d.ai.chain = d.ai.chain.filter(
                                      (id) => id !== target,
                                    );
                                    d.billing.services.forEach((svc) => {
                                      svc.chain = svc.chain.filter(
                                        (id) => id !== target,
                                      );
                                    });
                                  }
                                })
                              }
                            />
                            <details className={s.advanced}>
                              <summary>Thông số nâng cao</summary>
                              <Fields
                                value={model}
                                specs={[
                                  [
                                    "timeoutMs",
                                    "Timeout mỗi lần (ms)",
                                    "number",
                                  ],
                                  ["retries", "Số lần thử lại (0–3)", "number"],
                                  [
                                    "maxTokens",
                                    "Giới hạn output token",
                                    "number",
                                  ],
                                  ["temperature", "Temperature", "number"],
                                ]}
                                onChange={(key, value) =>
                                  update((d) => {
                                    Object.assign(
                                      d.ai.providers[i].models![modelIndex],
                                      { [key]: value },
                                    );
                                  })
                                }
                              />
                            </details>
                            <ModelPricing
                              value={model.pricing}
                              onChange={(pricing) =>
                                update((d) => {
                                  if (pricing)
                                    d.ai.providers[i].models![
                                      modelIndex
                                    ].pricing = pricing;
                                  else
                                    delete d.ai.providers[i].models![modelIndex]
                                      .pricing;
                                })
                              }
                            />
                            <div className={s.rowActions}>
                              <button
                                disabled={
                                  dirty ||
                                  !session.user.capabilities.includes(
                                    "secrets.write",
                                  )
                                }
                                onClick={() =>
                                  void act(async () => {
                                    const result = await adminRequest<{
                                      message?: string;
                                    }>("test-provider", session.csrf, {
                                      providerId: `${p.id}:${model.id}`,
                                    });
                                    setMessage(
                                      result.message ||
                                        "Model đã phản hồi thành công.",
                                    );
                                  })
                                }
                              >
                                Kiểm tra model đã lưu
                              </button>
                              <button
                                className={s.danger}
                                onClick={() =>
                                  update((d) => {
                                    d.ai.providers[i].models!.splice(
                                      modelIndex,
                                      1,
                                    );
                                    const target = `${p.id}:${model.id}`;
                                    d.ai.chain = d.ai.chain.filter(
                                      (id) => id !== target,
                                    );
                                    d.billing.services.forEach((svc) => {
                                      svc.chain = svc.chain.filter(
                                        (id) => id !== target,
                                      );
                                    });
                                  })
                                }
                              >
                                Xóa model
                              </button>
                            </div>
                          </details>
                        ))}
                        <button
                          className={s.secondary}
                          onClick={() =>
                            update((d) => {
                              const parent = d.ai.providers[i];
                              parent.models ||= [];
                              parent.models.push({
                                id: uid("model"),
                                name: "Model mới",
                                model: "",
                                protocol: parent.protocol,
                                baseUrl: parent.baseUrl,
                                enabled: false,
                                timeoutMs: parent.timeoutMs,
                                retries: parent.retries,
                                maxTokens: parent.maxTokens,
                                temperature: parent.temperature,
                              });
                            })
                          }
                        >
                          ＋ Thêm model / giao thức
                        </button>
                        <p className={s.help}>
                          Cùng một Model ID có thể thêm nhiều cấu hình giao
                          thức. Chọn từng cấu hình trong fallback sau khi bật.
                          Endpoint là URL gốc, ví dụ https://api.example.com/v1.
                        </p>
                        {dirty && (
                          <p className={s.help}>
                            Lưu bản nháp trước khi kiểm tra kết nối.
                          </p>
                        )}
                      </div>
                      <div className={s.rowActions}>
                        <button
                          onClick={() =>
                            void act(async () => {
                              const result = await adminRequest<{
                                message?: string;
                              }>("test-provider", session.csrf, {
                                providerId: p.id,
                              });
                              setMessage(
                                result.message ||
                                  "Kiểm tra kết nối thành công.",
                              );
                            })
                          }
                          disabled={dirty}
                        >
                          Kiểm tra kết nối bản đã lưu
                        </button>
                        <button
                          className={s.danger}
                          onClick={() =>
                            update((d) => {
                              d.ai.providers.splice(i, 1);
                              d.ai.chain = d.ai.chain.filter(
                                (id) => !belongsToProvider(id, p.id),
                              );
                              d.billing.services.forEach(
                                (svc) =>
                                  (svc.chain = svc.chain.filter(
                                    (id) => !belongsToProvider(id, p.id),
                                  )),
                              );
                            })
                          }
                        >
                          Xóa provider
                        </button>
                      </div>
                    </details>
                  ))}
                </Card>
                <Card
                  title="Thứ tự fallback"
                  description="Cấu hình model đầu tiên được ưu tiên. Dùng mũi tên để sắp xếp model dự phòng trong cùng hoặc khác provider."
                >
                  <Chain
                    value={config.ai.chain}
                    config={config}
                    onChange={(chain) => patch("ai", "chain", chain)}
                  />
                  {renderFields("ai", [
                    ["enabled", "Bật xử lý AI", "boolean"],
                    ["totalTimeoutMs", "Tổng thời gian tối đa (ms)", "number"],
                    ["maxAttempts", "Tổng số lần thử tối đa", "number"],
                    ["cooldownSeconds", "Cooldown provider (giây)", "number"],
                    ["failureThreshold", "Ngưỡng lỗi liên tiếp", "number"],
                    ["systemPrompt", "System prompt chung", "textarea"],
                  ])}
                  <div className={s.checks}>
                    {[429, 500, 502, 503, 504].map((status) => (
                      <label key={status}>
                        <input
                          type="checkbox"
                          checked={config.ai.retryStatuses.includes(status)}
                          onChange={(e) =>
                            patch(
                              "ai",
                              "retryStatuses",
                              e.target.checked
                                ? [...config.ai.retryStatuses, status]
                                : config.ai.retryStatuses.filter(
                                    (v) => v !== status,
                                  ),
                            )
                          }
                        />
                        Fallback khi HTTP {status}
                      </label>
                    ))}
                  </div>
                </Card>
              </>
            )}
            {view === "billing" && (
              <>
                <Card
                  title="Tỷ giá AstroX Point"
                  description="Tỷ giá mới áp dụng cho đơn mới; đơn đang chờ giữ nguyên giá trị tại thời điểm tạo."
                >
                  {renderFields("billing", [
                    ["enabled", "Mở nạp Point", "boolean"],
                    ["vndPerPoint", "VND cho 1 AstroX Point", "number"],
                  ])}
                  <div className={s.ratePreview}>
                    100.000 ₫ <span>→</span>{" "}
                    <strong>
                      {config.billing.vndPerPoint > 0
                        ? fmt(Math.floor(100000 / config.billing.vndPerPoint))
                        : "—"}{" "}
                      Point
                    </strong>
                    <small>Làm tròn xuống · Chưa gồm bonus</small>
                  </div>
                </Card>
                <Card
                  title="Gói nạp"
                  description="Giá tiền, Point, bonus và gói nổi bật đều do bạn quyết định."
                  action={
                    <button
                      className={s.secondary}
                      onClick={() =>
                        update((d) => {
                          d.billing.packages.push({
                            id: uid("pack"),
                            name: "Gói mới",
                            amountVnd: 50000,
                            mode: "rate",
                            fixedPoints: 0,
                            bonus: 0,
                            enabled: false,
                            featured: false,
                          });
                        })
                      }
                    >
                      ＋ Thêm gói
                    </button>
                  }
                >
                  {!config.billing.packages.length && (
                    <Empty>
                      Chưa có gói nạp. Tạo gói đầu tiên cho người dùng.
                    </Empty>
                  )}
                  {config.billing.packages.map((p, i) => (
                    <details open className={s.record} key={p.id}>
                      <summary>
                        <strong>{p.name}</strong>
                        <small>
                          {fmt(p.amountVnd)} ₫ →{" "}
                          {fmt(
                            quotePackage(p, config.billing.vndPerPoint).total,
                          )}{" "}
                          Point
                        </small>
                      </summary>
                      <Fields
                        value={p}
                        specs={[
                          ["name", "Tên gói", "text"],
                          ["amountVnd", "Giá gói (VND)", "number"],
                          ["mode", "Cách tính Point", ["rate", "fixed"]],
                          [
                            "fixedPoints",
                            "Point cố định (chế độ cố định)",
                            "number",
                          ],
                          ["bonus", "Point thưởng thêm", "number"],
                          ["enabled", "Mở bán", "boolean"],
                          ["featured", "Gói nổi bật", "boolean"],
                        ]}
                        onChange={(key, value) =>
                          update((d) =>
                            Object.assign(d.billing.packages[i], {
                              [key]: value,
                            }),
                          )
                        }
                      />
                      <div className={s.rowActions}>
                        <button
                          disabled={i === 0}
                          onClick={() =>
                            update((d) => {
                              [
                                d.billing.packages[i - 1],
                                d.billing.packages[i],
                              ] = [
                                d.billing.packages[i],
                                d.billing.packages[i - 1],
                              ];
                            })
                          }
                        >
                          ↑ Đưa lên
                        </button>
                        <button
                          disabled={i === config.billing.packages.length - 1}
                          onClick={() =>
                            update((d) => {
                              [
                                d.billing.packages[i + 1],
                                d.billing.packages[i],
                              ] = [
                                d.billing.packages[i],
                                d.billing.packages[i + 1],
                              ];
                            })
                          }
                        >
                          ↓ Đưa xuống
                        </button>
                        <button
                          className={s.danger}
                          onClick={() =>
                            update((d) => {
                              d.billing.packages.splice(i, 1);
                            })
                          }
                        >
                          Xóa gói
                        </button>
                      </div>
                    </details>
                  ))}
                </Card>
                <Card
                  title="Mã khuyến mãi"
                  action={
                    <button
                      className={s.secondary}
                      onClick={() =>
                        update((d) => {
                          d.billing.promos.push({
                            id: uid("promo"),
                            code: "",
                            bonus: 0,
                            limit: 100,
                            perUser: 1,
                            enabled: false,
                            expiresAt: "",
                          });
                        })
                      }
                    >
                      ＋ Thêm mã
                    </button>
                  }
                >
                  {!config.billing.promos.length && (
                    <Empty>Chưa có chương trình khuyến mãi.</Empty>
                  )}
                  {config.billing.promos.map((p, i) => (
                    <details open className={s.record} key={p.id}>
                      <summary>{p.code || "Mã khuyến mãi mới"}</summary>
                      <Fields
                        value={p}
                        specs={[
                          ["code", "Mã (chữ hoa, số, gạch ngang)", "text"],
                          ["bonus", "Point thưởng", "number"],
                          ["limit", "Tổng lượt dùng tối đa", "number"],
                          ["perUser", "Lượt mỗi người", "number"],
                          [
                            "expiresAt",
                            "Hết hạn (ISO 8601, để trống nếu không hạn)",
                            "text",
                          ],
                          ["enabled", "Kích hoạt mã", "boolean"],
                        ]}
                        onChange={(key, value) =>
                          update((d) =>
                            Object.assign(d.billing.promos[i], {
                              [key]: value,
                            }),
                          )
                        }
                      />
                      <button
                        className={s.danger}
                        onClick={() =>
                          update((d) => {
                            d.billing.promos.splice(i, 1);
                          })
                        }
                      >
                        Xóa mã
                      </button>
                    </details>
                  ))}
                </Card>
              </>
            )}
            {view === "services" && (
              <Card
                title="Danh mục trải nghiệm"
                description="Giá theo Point, cách thu phí và prompt riêng cho từng dịch vụ."
                action={
                  <button
                    className={s.secondary}
                    onClick={() =>
                      update((d) => {
                        d.billing.services.push({
                          id: uid("service"),
                          module: "tuvi",
                          name: "Dịch vụ mới",
                          points: 0,
                          status: "draft",
                          policy: "profile",
                          prompt: "",
                          chain: [],
                        });
                      })
                    }
                  >
                    ＋ Thêm dịch vụ
                  </button>
                }
              >
                <div className={s.dataToolbar}>
                  <label>
                    Tìm dịch vụ
                    <input
                      type="search"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Tên hoặc mã dịch vụ…"
                    />
                  </label>
                  <label>
                    Bộ môn
                    <select
                      aria-label="Bộ môn"
                      value={serviceModule}
                      onChange={(e) => setServiceModule(e.target.value)}
                    >
                      <option value="">Tất cả bộ môn</option>
                      {MODULES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (
                          {
                            config.billing.services.filter(
                              (s) => s.module === m.id,
                            ).length
                          }
                          )
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Trạng thái dịch vụ
                    <select
                      aria-label="Trạng thái dịch vụ"
                      value={serviceStatus}
                      onChange={(e) => setServiceStatus(e.target.value)}
                    >
                      <option value="">Tất cả trạng thái</option>
                      {["draft", "free", "paid", "maintenance", "hidden"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {optionLabels[status]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <button
                    className={s.secondary}
                    onClick={() =>
                      update((d) => {
                        d.billing.services = addMissingServices(
                          d.billing.services,
                        );
                      })
                    }
                  >
                    Bổ sung danh mục từ web
                  </button>
                </div>
                <p className={s.help}>
                  {SERVICE_CATALOG.length} dịch vụ chi tiết trên web. Các mã cấp
                  bộ môn được giữ để tương thích cấu hình cũ. Mục bổ sung ở
                  trạng thái bản nháp, chưa thu phí.
                </p>
                <p className={s.help} role="status">
                  Hiển thị {filteredServices.length} /{" "}
                  {config.billing.services.length} dịch vụ
                </p>
                {!filteredServices.length && (
                  <Empty>
                    Không có dịch vụ phù hợp. Thử đổi bộ môn, trạng thái hoặc từ
                    khóa.
                  </Empty>
                )}
                {filteredServices.map(({ p, i }) => (
                  <details className={s.record} key={p.id}>
                    <summary>
                      <span className={s.recordIcon}>✧</span>
                      <strong>
                        {SERVICE_CATALOG.find((item) => item.id === p.id)
                          ?.group && (
                          <span>
                            {
                              SERVICE_CATALOG.find((item) => item.id === p.id)
                                ?.group
                            }{" "}
                            ·{" "}
                          </span>
                        )}
                        {p.name}
                      </strong>
                      <small>
                        {optionLabels[p.status]} · {fmt(p.points)} Point
                      </small>
                    </summary>
                    <p className={s.help}>
                      Mã dịch vụ: <code>{p.id}</code>
                    </p>
                    <Fields
                      value={p}
                      specs={[
                        ["name", "Tên dịch vụ", "text"],
                        ["module", "Module", MODULES.map((m) => m.id)],
                        ["points", "Giá (AstroX Point)", "number"],
                        [
                          "status",
                          "Trạng thái",
                          ["draft", "free", "paid", "maintenance", "hidden"],
                        ],
                        [
                          "policy",
                          "Cách tính phí",
                          ["profile", "session", "period"],
                        ],
                        ["prompt", "Prompt bổ sung cho dịch vụ", "textarea"],
                      ]}
                      onChange={(key, value) =>
                        update((d) =>
                          Object.assign(d.billing.services[i], {
                            [key]: value,
                          }),
                        )
                      }
                    />
                    <h3 className={s.subheading}>Fallback riêng</h3>
                    <p className={s.help}>
                      Để trống để kế thừa chuỗi fallback chung.
                    </p>
                    <Chain
                      config={config}
                      value={p.chain}
                      onChange={(chain) =>
                        update((d) => {
                          d.billing.services[i].chain = chain;
                        })
                      }
                    />
                    <button
                      className={s.danger}
                      onClick={() =>
                        update((d) => {
                          d.billing.services.splice(i, 1);
                        })
                      }
                    >
                      Xóa dịch vụ
                    </button>
                  </details>
                ))}
              </Card>
            )}
            {["payos", "zalo", "walletbackend"].includes(view) && (
              <>
                {view === "payos" && (
                  <Card
                    title="PayOS"
                    description="Cấu hình thanh toán. Webhook phải được xác minh trước khi cấp Point."
                  >
                    <Fields
                      value={config.integrations.payos}
                      specs={[
                        ["enabled", "Bật PayOS", "boolean"],
                        ["clientId", "Client ID", "text"],
                        ["returnUrl", "URL thanh toán thành công", "text"],
                        ["cancelUrl", "URL hủy thanh toán", "text"],
                        ["expiryMinutes", "Thời hạn đơn (phút)", "number"],
                      ]}
                      onChange={(key, value) =>
                        update((d) =>
                          Object.assign(d.integrations.payos, { [key]: value }),
                        )
                      }
                    />
                    <SecretInput
                      label="PayOS API key"
                      reference="payos:apiKey"
                      configured={snapshot.secrets.includes("payos:apiKey")}
                      save={secret}
                      allowed={session.user.capabilities.includes(
                        "secrets.write",
                      )}
                    />
                    <SecretInput
                      label="PayOS checksum key"
                      reference="payos:checksumKey"
                      configured={snapshot.secrets.includes(
                        "payos:checksumKey",
                      )}
                      save={secret}
                      allowed={session.user.capabilities.includes(
                        "secrets.write",
                      )}
                    />
                    {snapshot.inheritedSecrets?.includes("payos:apiKey") && <p className={s.help}>Đang tái sử dụng khóa PayOS đã lưu trên backend. Nhập khóa mới chỉ khi cần thay thế.</p>}
                    <IntegrationTest
                      kind="payos"
                      csrf={session.csrf}
                      disabled={dirty}
                    />
                    <p className={s.help}>
                      Webhook: <code>https://api.theastrox.space/api/webhooks/payos</code>
                    </p>
                  </Card>
                )}
                {view === "zalo" && (
                  <Card
                    title="Zalo"
                    description="Thiết lập ứng dụng đăng nhập và đường dẫn quay về AstroX."
                  >
                    <Fields
                      value={config.integrations.zalo}
                      specs={[
                        ["enabled", "Bật đăng nhập Zalo", "boolean"],
                        ["appId", "Zalo App ID", "text"],
                        ["callbackUrl", "OAuth callback URL", "text"],
                        ["returnUrl", "URL trở về sau đăng nhập", "text"],
                      ]}
                      onChange={(key, value) =>
                        update((d) =>
                          Object.assign(d.integrations.zalo, { [key]: value }),
                        )
                      }
                    />
                    <SecretInput
                      label="Zalo App Secret"
                      reference="zalo:appSecret"
                      configured={snapshot.secrets.includes("zalo:appSecret")}
                      save={secret}
                      allowed={session.user.capabilities.includes(
                        "secrets.write",
                      )}
                    />
                    {snapshot.inheritedSecrets?.includes("zalo:appSecret") && <p className={s.help}>Đang tái sử dụng App Secret Zalo đã lưu trên backend.</p>}
                    <IntegrationTest
                      kind="zalo"
                      csrf={session.csrf}
                      disabled={dirty}
                    />
                  </Card>
                )}
                {view === "walletbackend" && (
                  <Card
                    title="Backend ví"
                    description="Kết nối được thiết lập phía máy chủ; không đưa địa chỉ nội bộ hoặc token vào trình duyệt."
                  >
                    <Fields
                      value={config.integrations.wallet}
                      specs={[
                        ["enabled", "Cho phép dùng backend ví", "boolean"],
                        ["label", "Tên kết nối", "text"],
                      ]}
                      onChange={(key, value) =>
                        update((d) =>
                          Object.assign(d.integrations.wallet, {
                            [key]: value,
                          }),
                        )
                      }
                    />
                    <div className={s.info}>
                      {snapshot.integration.wallet
                        ? "Đã nối backend hiện tại: tài khoản, số dư, đơn hàng, gói nạp, Zalo và PayOS."
                        : "Chưa có kết nối backend ví trên máy chủ."}
                    </div>
                  </Card>
                )}
              </>
            )}
            {view === "rewards" && (
              <>
                <Card
                  title="Thưởng cho những khởi đầu"
                  description="Mỗi mức thưởng tính bằng AstroX Point."
                >
                  {renderFields("rewards", [
                    ["enabled", "Bật hệ thống thưởng", "boolean"],
                    ["registrationEnabled", "Bật thưởng đăng ký", "boolean"],
                    ["registrationUser", "Đăng ký · người mới", "number"],
                    [
                      "registrationInviter",
                      "Đăng ký · người giới thiệu",
                      "number",
                    ],
                    ["firstTopupEnabled", "Bật thưởng nạp lần đầu", "boolean"],
                    ["firstTopupMinVnd", "Nạp đầu tối thiểu (VND)", "number"],
                    ["firstTopupUser", "Nạp đầu · người nạp", "number"],
                    [
                      "firstTopupInviter",
                      "Nạp đầu · người giới thiệu",
                      "number",
                    ],
                  ])}
                </Card>
                <Card
                  title="Điểm danh & cột mốc"
                  action={
                    <button
                      className={s.secondary}
                      onClick={() =>
                        update((d) => {
                          d.rewards.milestones.push({
                            id: uid("day"),
                            day:
                              Math.max(
                                0,
                                ...d.rewards.milestones.map((m) => m.day),
                              ) + 1,
                            user: 0,
                            inviter: 0,
                          });
                        })
                      }
                    >
                      ＋ Thêm mốc
                    </button>
                  }
                >
                  {renderFields("rewards", [
                    ["attendanceEnabled", "Bật điểm danh", "boolean"],
                    ["daily", "Point mỗi ngày", "number"],
                  ])}
                  {config.rewards.milestones.map((m, i) => (
                    <div className={s.record} key={m.id}>
                      <Fields
                        value={m}
                        specs={[
                          ["day", "Mốc ngày", "number"],
                          ["user", "Thưởng người dùng", "number"],
                          ["inviter", "Thưởng người giới thiệu", "number"],
                        ]}
                        onChange={(key, value) =>
                          update((d) =>
                            Object.assign(d.rewards.milestones[i], {
                              [key]: value,
                            }),
                          )
                        }
                      />
                      <button
                        className={s.danger}
                        onClick={() =>
                          update((d) => {
                            d.rewards.milestones.splice(i, 1);
                          })
                        }
                      >
                        Xóa mốc
                      </button>
                    </div>
                  ))}
                </Card>
                <Card
                  title="Chính sách giới thiệu"
                  description="Mặc định không giới hạn số bạn giới thiệu."
                >
                  {renderFields("rewards", [
                    [
                      "referralMode",
                      "Giới hạn giới thiệu",
                      ["unlimited", "limited"],
                    ],
                    [
                      "referralLimit",
                      "Hạn mức (chỉ khi bật giới hạn)",
                      "number",
                    ],
                    [
                      "referralWindow",
                      "Chu kỳ giới hạn",
                      ["day", "month", "lifetime"],
                    ],
                  ])}
                </Card>
                <Card
                  title="Quảng cáo nhận Point"
                  description="Chỉ cấp thưởng từ sự kiện đã được backend xác thực."
                >
                  <Fields
                    value={config.rewards.ads}
                    specs={[
                      ["enabled", "Bật Ads nhận Point", "boolean"],
                      ["networkCode", "Mã mạng quảng cáo", "text"],
                      ["adUnit", "Ad unit", "text"],
                      ["points", "Point mỗi lượt", "number"],
                      ["dailyLimit", "Lượt tối đa mỗi ngày", "number"],
                      [
                        "cooldownSeconds",
                        "Khoảng cách giữa lượt (giây)",
                        "number",
                      ],
                      [
                        "sessionTtlSeconds",
                        "Hiệu lực phiên Ads (giây)",
                        "number",
                      ],
                    ]}
                    onChange={(key, value) =>
                      update((d) =>
                        Object.assign(d.rewards.ads, { [key]: value }),
                      )
                    }
                  />
                  <p className={s.help}>
                    Google Rewarded web không có xác minh server-to-server.
                    Callback quảng cáo là bằng chứng phía trình duyệt; backend
                    vẫn phải kiểm tra quota và chống cấp thưởng trùng.
                  </p>
                </Card>
              </>
            )}
            {view === "content" && (
              <>
                <Card title="Tiếng nói AstroX">
                  {renderFields("content", [
                    ["supportUrl", "Đường dẫn hỗ trợ", "text"],
                    ["announcement", "Thông báo chung", "textarea"],
                  ])}
                </Card>
                <Card
                  title="Thông báo theo trải nghiệm"
                  action={
                    <button
                      className={s.secondary}
                      onClick={() =>
                        update((d) => {
                          d.content.notices.push({
                            id: uid("notice"),
                            title: "Thông báo mới",
                            body: "",
                            module: "all",
                            enabled: false,
                            startsAt: "",
                            endsAt: "",
                          });
                        })
                      }
                    >
                      ＋ Thêm thông báo
                    </button>
                  }
                >
                  {!config.content.notices.length && (
                    <Empty>Chưa có thông báo theo module.</Empty>
                  )}
                  {config.content.notices.map((n, i) => (
                    <details open className={s.record} key={n.id}>
                      <summary>{n.title}</summary>
                      <Fields
                        value={n}
                        specs={[
                          ["title", "Tiêu đề", "text"],
                          [
                            "module",
                            "Phạm vi",
                            ["all", ...MODULES.map((m) => m.id)],
                          ],
                          ["body", "Nội dung", "textarea"],
                          [
                            "startsAt",
                            "Bắt đầu (ISO 8601, có thể để trống)",
                            "text",
                          ],
                          [
                            "endsAt",
                            "Kết thúc (ISO 8601, có thể để trống)",
                            "text",
                          ],
                          ["enabled", "Hiển thị", "boolean"],
                        ]}
                        onChange={(key, value) =>
                          update((d) =>
                            Object.assign(d.content.notices[i], {
                              [key]: value,
                            }),
                          )
                        }
                      />
                      <div className={s.noticePreview}>
                        <small>XEM TRƯỚC</small>
                        <h3>{n.title}</h3>
                        <p>
                          {n.body || "Nội dung thông báo sẽ xuất hiện tại đây."}
                        </p>
                      </div>
                      <button
                        className={s.danger}
                        onClick={() =>
                          update((d) => {
                            d.content.notices.splice(i, 1);
                          })
                        }
                      >
                        Xóa thông báo
                      </button>
                    </details>
                  ))}
                </Card>
              </>
            )}
            {view === "operations" && (
              <>
                <Card
                  title="Nhịp vận hành"
                  description="Điều chỉnh lịch, ngưỡng và giới hạn xử lý."
                >
                  {renderFields("operations", [
                    ["maintenance", "Bảo trì hệ thống", "boolean"],
                    [
                      "reconciliationMinutes",
                      "Chu kỳ đối soát (phút)",
                      "number",
                    ],
                    [
                      "claimTimeoutMinutes",
                      "Thời hạn yêu cầu thưởng (phút)",
                      "number",
                    ],
                    ["retryLimit", "Số lần retry nghiệp vụ", "number"],
                    ["batchSize", "Số bản ghi mỗi đợt", "number"],
                    ["alertPoints", "Ngưỡng cảnh báo Point", "number"],
                    [
                      "reviewAbovePoints",
                      "Ngưỡng cần duyệt thưởng (Point)",
                      "number",
                    ],
                    [
                      "auditRetentionDays",
                      "Giữ nhật ký (ngày, tối thiểu 90)",
                      "number",
                    ],
                    ["reportTimezone", "Múi giờ báo cáo", "text"],
                    ["reportDays", "Khoảng ngày báo cáo mặc định", "number"],
                  ])}
                </Card>
                <div className={s.info}>
                  {snapshot.integration.wallet
                    ? "Backend ví đã được cấu hình. "
                    : "Đang chờ backend ví: lịch đối soát và tác vụ nghiệp vụ chưa hoạt động. "}
                  Chống cộng trùng, xác minh giao dịch và nhật ký bắt buộc luôn
                  hoạt động. Các tham số vận hành chỉ có hiệu lực khi backend
                  tương ứng hỗ trợ.
                </div>
              </>
            )}
            {view === "access" && (
              <>
                <Members
                  csrf={session.csrf}
                  allowed={session.user.capabilities.includes("access.manage")}
                  roles={snapshot.draft.access.roles}
                />
                <fieldset
                  className={s.editor}
                  disabled={
                    !canWrite ||
                    !session.user.capabilities.includes("access.manage")
                  }
                >
                  <Card
                    title="Vai trò & quyền hạn"
                    description="Quyền thực thi được kiểm tra lại ở server. Vai trò chủ hệ thống luôn giữ đầy đủ quyền."
                    action={
                      <button
                        className={s.secondary}
                        onClick={() =>
                          update((d) => {
                            d.access.roles.push({
                              id: uid("role"),
                              name: "Vai trò mới",
                              capabilities: ["config.read"],
                            });
                          })
                        }
                      >
                        ＋ Thêm vai trò
                      </button>
                    }
                  >
                    {config.access.roles.map((r, i) => (
                      <div key={r.id} className={s.record}>
                        <Fields
                          value={r}
                          specs={[["name", "Tên vai trò", "text"]]}
                          onChange={(key, value) =>
                            update((d) =>
                              Object.assign(d.access.roles[i], {
                                [key]: value,
                              }),
                            )
                          }
                        />
                        <div className={s.checks}>
                          {CAPABILITIES.map((cap) => (
                            <label key={cap}>
                              <input
                                type="checkbox"
                                disabled={r.id === "owner"}
                                checked={r.capabilities.includes(cap)}
                                onChange={(e) =>
                                  update((d) => {
                                    d.access.roles[i].capabilities = e.target
                                      .checked
                                      ? [...r.capabilities, cap]
                                      : r.capabilities.filter((v) => v !== cap);
                                  })
                                }
                              />
                              {cap}
                            </label>
                          ))}
                        </div>
                        {r.id !== "owner" && (
                          <button
                            className={s.danger}
                            onClick={() =>
                              update((d) => {
                                d.access.roles.splice(i, 1);
                              })
                            }
                          >
                            Xóa vai trò
                          </button>
                        )}
                      </div>
                    ))}
                  </Card>
                </fieldset>
              </>
            )}
          </fieldset>
          {view === "reports" && (
            <div
              className={s.rowActions}
              role="group"
              aria-label="Loại báo cáo"
            >
              {(
                [
                  ["reports", "Tổng hợp"],
                  ["rewards", "Lịch sử thưởng"],
                  ["ai", "Hoạt động AI"],
                ] as const
              ).map(([kind, name]) => (
                <button
                  key={kind}
                  className={reportKind === kind ? s.primary : s.secondary}
                  aria-pressed={reportKind === kind}
                  onClick={() => {
                    setReportKind(kind);
                    refreshData();
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {["users", "wallet", "reports", "audit"].includes(view) && (
            <div className={s.rowActions}>
              <button className={s.secondary} onClick={refreshData}>
                Làm mới dữ liệu
              </button>
            </div>
          )}
          {["users", "wallet", "reports"].includes(view) && (
            <Card
              title={title || ""}
              description="Chỉ hiển thị dữ liệu trả về từ backend thực tế."
            >
              {rows.length ? (
                <DataTable rows={rows} />
              ) : (
                <Empty>{remoteMessage}</Empty>
              )}
            </Card>
          )}
          {view === "audit" && (
            <>
              <Card
                title="Lịch sử xuất bản"
                description="Khôi phục tạo phiên bản mới và áp dụng ngay cho hệ thống đang chạy."
              >
                {versions.length ? (
                  versions.map((v) => (
                    <div className={s.versionRow} key={String(v.id)}>
                      <div>
                        <strong>Phiên bản {String(v.id)}</strong>
                        <p>
                          {String(v.note || "Không có ghi chú")} ·{" "}
                          {String(v.created_at || "")}
                        </p>
                      </div>
                      <button
                        disabled={
                          busy ||
                          dirty ||
                          !session.user.capabilities.includes("config.publish")
                        }
                        onClick={(e) => {
                          opener.current = e.currentTarget;
                          setRollbackId(String(v.id));
                          setNote("");
                          setPublish(true);
                        }}
                      >
                        Khôi phục phiên bản
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty>Chưa có phiên bản xuất bản.</Empty>
                )}
              </Card>
              <Card title="Nhật ký quản trị">
                {rows.length ? (
                  <DataTable rows={rows} />
                ) : (
                  <Empty>{remoteMessage}</Empty>
                )}
              </Card>
            </>
          )}
        </div>
        {(view !== "aiMetrics" || dirty) && (
          <div className={s.savebar}>
            <div>
              <strong>
                {dirty ? "Bạn có thay đổi chưa lưu" : "Bản nháp sẵn sàng"}
              </strong>
              <small>
                {dirty
                  ? "Lưu để bảo toàn các chỉnh sửa của bạn."
                  : "Áp dụng để đưa cấu hình đã kiểm tra vào vận hành."}
              </small>
            </div>
            <div>
              <button
                disabled={busy || !dirty}
                onClick={() => {
                  setConfig(structuredClone(snapshot.draft));
                  setError("");
                  setMessage("Đã bỏ thay đổi chưa lưu.");
                }}
              >
                Hoàn tác
              </button>
              <button
                className={s.secondary}
                disabled={busy || !dirty || !canWrite}
                onClick={() => void save()}
              >
                {busy ? "Đang xử lý…" : "Lưu bản nháp"}
              </button>
              <button
                className={s.primary}
                disabled={
                  busy ||
                  dirty ||
                  !session.user.capabilities.includes("config.publish")
                }
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setRollbackId(null);
                  setNote("");
                  setPublish(true);
                }}
              >
                Áp dụng <span>↗</span>
              </button>
            </div>
          </div>
        )}
      </main>
      {publish && (
        <div
          className={s.modalBackdrop}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setPublish(false);
            if (e.key === "Tab") {
              const elements = e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled),textarea,summary",
              );
              const first = elements[0],
                last = elements[elements.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-title"
          >
            <p className={s.eyebrow}>KIỂM TRA TRƯỚC KHI ÁP DỤNG</p>
            <h2 id="publish-title">
              {rollbackId
                ? `Khôi phục phiên bản ${rollbackId}?`
                : "Đưa cấu hình vào vận hành?"}
            </h2>
            <p>
              {rollbackId
                ? "Phiên bản được chọn sẽ thay thế ngay cấu hình đang vận hành. Thao tác được ghi vào lịch sử và có thể khôi phục lại."
                : "Các nhóm sau khác với phiên bản đang chạy:"}
            </p>
            {error && (
              <div className={s.error} role="alert">
                {error}
              </div>
            )}
            {!rollbackId && !config.ai.enabled && (
              <p role="status">
                AI đang tắt trong bản nháp. Khi áp dụng trên môi trường đã nối
                Admin API, các lượt luận giải mới sẽ tạm dừng.
              </p>
            )}
            {!rollbackId && (
              <div className={s.diff}>
                {changed.length ? (
                  changed.map((k) => (
                    <details key={k}>
                      <summary>{groupNames[k]}</summary>
                      <pre>
                        {"ĐANG CHẠY\n" +
                          JSON.stringify(
                            snapshot.published?.[k as keyof AdminConfig] ??
                              null,
                            null,
                            2,
                          ) +
                          "\n\nSAU KHI ÁP DỤNG\n" +
                          JSON.stringify(
                            config[k as keyof AdminConfig],
                            null,
                            2,
                          )}
                      </pre>
                    </details>
                  ))
                ) : (
                  <p>Không có thay đổi so với bản đang chạy.</p>
                )}
              </div>
            )}
            <label>
              Ghi chú thay đổi
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả lý do áp dụng cấu hình…"
              />
            </label>
            <div className={s.rowActions}>
              <button disabled={busy} onClick={() => setPublish(false)}>
                Quay lại
              </button>
              <button
                className={s.primary}
                disabled={busy || !note.trim()}
                onClick={() =>
                  void act(async () => {
                    await adminRequest(
                      rollbackId ? "rollback" : "publish",
                      session.csrf,
                      {
                        ...(rollbackId ? { versionId: rollbackId } : {}),
                        expectedRevision: snapshot.revision,
                        note,
                      },
                    );
                    accept(await adminRequest<ConfigSnapshot>("config"));
                    setPublish(false);
                    setNote("");
                    setMessage("Đã áp dụng cấu hình mới.");
                  })
                }
              >
                {busy ? "Đang áp dụng…" : "Xác nhận áp dụng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function SecretInput({
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
function Chain({
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
function IntegrationTest({
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
function Members({
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

function ModelPricing({
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
