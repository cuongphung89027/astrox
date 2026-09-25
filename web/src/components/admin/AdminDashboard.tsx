"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { AdminConfig } from "../../../../services/admin/config";
import { adminRequest } from "@/lib/admin-client";
import s from "./AdminDashboard.module.css";
import { PreferencesEffect } from "@/components/profile/PreferencesEffect";
import { ExpertManager } from "./ExpertManager";
import { AiMetrics } from "./AiMetrics";
import { AdminInsights, type InsightView } from "./AdminInsights";
import { AdminLogo, Fields, type Spec } from "./ui";
import { configViews, insightViews, navigation, searchNavigation, type View } from "./navigation";
import { useAdminApi, type AdminPanelProps } from "./useAdminApi";
import { SetupPanel } from "./panels/SetupPanel";
import { PromptsPanel } from "./panels/PromptsPanel";
import { ApisPanel } from "./panels/ApisPanel";
import { ProvidersPanel } from "./panels/ProvidersPanel";
import { BillingPanel } from "./panels/BillingPanel";
import { ServicesPanel } from "./panels/ServicesPanel";
import { IntegrationsPanel } from "./panels/IntegrationsPanel";
import { RewardsPanel } from "./panels/RewardsPanel";
import { ContentPanel } from "./panels/ContentPanel";
import { OperationsPanel } from "./panels/OperationsPanel";
import { AccessPanel } from "./panels/AccessPanel";
import { DataPanel, DATA_VIEWS } from "./panels/DataPanel";

const CONFIG_PANELS: Partial<Record<View, ComponentType<AdminPanelProps>>> = {
  setup: SetupPanel,
  prompts: PromptsPanel,
  apis: ApisPanel,
  providers: ProvidersPanel,
  billing: BillingPanel,
  services: ServicesPanel,
  payos: IntegrationsPanel,
  zalo: IntegrationsPanel,
  walletbackend: IntegrationsPanel,
  rewards: RewardsPanel,
  content: ContentPanel,
  operations: OperationsPanel,
  access: AccessPanel,
};

export function AdminDashboard() {
  const api = useAdminApi();
  const { session, snapshot, config, loading, busy, error, message, dirty, canWrite, act, boot, reload, setMessage } = api;
  const [expandedGroups,setExpandedGroups]=useState<string[]>(['TỔNG QUAN','NGƯỜI DÙNG & SỬ DỤNG','POINT & TĂNG TRƯỞNG']);
  const [navQuery, setNavQuery] = useState("");
  const [view, setView] = useState<View>("overview"),
    [drawer, setDrawer] = useState(false),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [publish, setPublish] = useState(false),
    [rollbackId, setRollbackId] = useState<string | null>(null),
    [note, setNote] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (drawer) {
      sidebarRef.current?.querySelector<HTMLElement>("button,a")?.focus();
    }
  }, [drawer]);
  useEffect(() => {
    if (!publish && !drawer) opener.current?.focus();
  }, [publish, drawer]);
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
  const go = (id: View) => {
    setView(id);
    setDrawer(false);
    const url = new URL(location.href); url.searchParams.set("view", id); history.pushState({}, "", url);
  };
  const openPublish = (versionId: string | null, from: HTMLElement) => {
    opener.current = from;
    setRollbackId(versionId);
    setNote("");
    setPublish(true);
  };
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
            void api.login(password).then(() => setPassword(""));
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
  const changed = Object.keys(config).filter(
    (key) =>
      JSON.stringify(config[key as keyof AdminConfig]) !==
      JSON.stringify(snapshot.published?.[key as keyof AdminConfig]),
  );
  const groupNames: Record<string, string> = {
    prompts: "Kho prompt",
    engines: "API và bộ tính",
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
      onChange={(key, value) => api.patch(group, key, value)}
    />
  );
  const Panel = CONFIG_PANELS[view];
  const panelProps: AdminPanelProps = {
    config, snapshot, session, view, renderFields, go, dirty, canWrite, act, setMessage,
    update: api.update, patch: api.patch, secret: api.secret,
  };
  return (
    <div className={s.shell}>
      <PreferencesEffect />
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
        <label className={s.navSearch}>
          <span className={s.srOnly}>Tìm trong Admin</span>
          <input type="search" value={navQuery} onChange={event => setNavQuery(event.target.value)} placeholder="Tìm trong Admin…" aria-label="Tìm trong Admin" />
        </label>
        <nav aria-label="Điều hướng quản trị">
          {searchNavigation(navQuery).length === 0 && <p className={s.navEmpty}>Không tìm thấy mục phù hợp.</p>}
          {[...new Set(searchNavigation(navQuery).map(item=>item[3]))].map(group=>{
            const activeGroup=navigation.some(([id,,,g])=>id===view&&g===group);
            const expanded=!!navQuery.trim()||expandedGroups.includes(group)||activeGroup;
            return <section className={s.navGroup} key={group}>
              <button className={s.groupToggle} aria-expanded={expanded} onClick={()=>setExpandedGroups(groups=>expanded?groups.filter(g=>g!==group):[...groups,group])} disabled={activeGroup}>
                {group}<i aria-hidden="true">{expanded?'−':'+'}</i>
              </button>
              {expanded&&<div className={s.navItems}>{searchNavigation(navQuery).filter(item=>item[3]===group).map(([id,label,icon])=><button key={id} className={view===id?s.active:''} onClick={()=>{go(id);setNavQuery("");}} aria-current={view===id?'page':undefined}><span aria-hidden>{icon}</span>{label}{view===id&&<i/>}</button>)}</div>}
            </section>;
          })}
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
              void api.logout()
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
            {(configViews.includes(view) || dirty) && <span className={s.status}>
              {dirty ? "● Có thay đổi chưa lưu" : "✓ Bản nháp đã đồng bộ"}
            </span>}
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
          {configViews.includes(view) && snapshot.revision === 0 && snapshot.publishedRevision === null && snapshot.integration.wallet && session.user.capabilities.includes("access.manage") && (
            <div className={s.info}>
              <p>Đã tìm thấy backend AstroX hiện có. Nhập gói nạp, Zalo, PayOS và dịch vụ vào bản nháp để kiểm tra trước khi áp dụng.</p>
              <button disabled={busy || dirty} onClick={() => void act(async () => {
                await adminRequest("import-legacy", session.csrf, { expectedRevision: snapshot.revision });
                await reload();
                setMessage("Đã nhập cấu hình cũ. Tài khoản, số dư và đơn hàng được giữ nguyên.");
              })}>Nhập cấu hình backend hiện tại</button>
            </div>
          )}
          {view === "bookings" && session.user.capabilities.includes("access.manage") && <ExpertManager csrf={session.csrf} />}
          {view === "aiMetrics" && <AiMetrics config={config} />}
          {insightViews.includes(view) && <AdminInsights view={view as InsightView} session={session} config={config} onNavigate={go} />}
          <fieldset
            disabled={
              busy || (!canWrite && view !== "setup" && view !== "access")
            }
            className={s.editor}
          >
            {Panel && <Panel {...panelProps} />}
          </fieldset>
          {DATA_VIEWS.includes(view) && (
            <DataPanel
              key={view}
              view={view}
              title={title || ""}
              session={session}
              revision={snapshot.revision}
              busy={busy}
              dirty={dirty}
              act={act}
              setMessage={setMessage}
              onRollback={openPublish}
            />
          )}
        </div>
        {(configViews.includes(view) || dirty) && (
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
                onClick={api.discard}
              >
                Hoàn tác
              </button>
              <button
                className={s.secondary}
                disabled={busy || !dirty || !canWrite}
                onClick={() => void api.save()}
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
                onClick={(e) => openPublish(null, e.currentTarget)}
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
                    await reload();
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
