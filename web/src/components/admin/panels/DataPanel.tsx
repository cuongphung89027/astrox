"use client";

import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import { AdminDataTable as DataTable } from "../AdminDataTable";
import { Card, Empty } from "../ui";
import type { View } from "../navigation";
import type { AdminApi } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export const DATA_VIEWS: View[] = ["users", "wallet", "reports", "diagnostics", "clientErrors", "audit"];

type Props = Pick<AdminApi, "act" | "busy" | "dirty" | "setMessage"> & {
  view: View;
  title: string;
  session: NonNullable<AdminApi["session"]>;
  revision: number;
  onRollback: (versionId: string, opener: HTMLElement) => void;
};

export function DataPanel({ view, title, session, revision, busy, dirty, act, setMessage, onRollback }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [remoteMessage, setRemoteMessage] = useState("Đang tải dữ liệu…"),
    [versions, setVersions] = useState<Record<string, unknown>[]>([]),
    [dataRevision, setDataRevision] = useState(0),
    [adjust, setAdjust] = useState({ userId: "", delta: "", note: "" }),
    [blockId, setBlockId] = useState(""),
    [reportKind, setReportKind] = useState<"reports" | "rewards" | "ai">("reports");
  useEffect(() => {
    let active = true;
    if (["users", "wallet", "reports", "diagnostics", "clientErrors"].includes(view)) {
      adminRequest<{
        available: boolean;
        rows: Record<string, unknown>[];
        message?: string;
      }>(`data/${view === "reports" ? reportKind : view === "diagnostics" ? "login-diagnostics" : view === "clientErrors" ? "client-errors" : view}`)
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
  }, [view, revision, dataRevision, reportKind]);
  const refreshData = () => {
    setRows([]);
    setVersions([]);
    setRemoteMessage("Đang tải dữ liệu…");
    setDataRevision((value) => value + 1);
  };
  return (
    <>
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
          {["users", "wallet", "reports", "diagnostics", "clientErrors", "audit"].includes(view) && (
            <div className={s.rowActions}>
              <button className={s.secondary} onClick={refreshData}>
                Làm mới dữ liệu
              </button>
            </div>
          )}
          {view === "wallet" && session.user.capabilities.includes("wallet.adjust") && (
            <Card
              title="Điều chỉnh Point"
              description="Cộng/trừ Point thủ công — ghi sổ cái 'Điều chỉnh từ AstroX', người dùng thấy trong lịch sử ví."
            >
              <div className={s.rowActions} style={{ flexWrap: "wrap", gap: 8 }}>
                <input
                  className={s.inlineInput}
                  placeholder="user_id (sao chép từ bảng dưới)"
                  value={adjust.userId}
                  onChange={(e) => setAdjust((a) => ({ ...a, userId: e.target.value.trim() }))}
                />
                <input
                  className={s.inlineInput}
                  placeholder="±Point (vd 50 hoặc -20)"
                  inputMode="numeric"
                  value={adjust.delta}
                  onChange={(e) => setAdjust((a) => ({ ...a, delta: e.target.value.trim().replace(/[^0-9-]/g, "") }))}
                />
                <input
                  className={s.inlineInput}
                  placeholder="Lý do (tuỳ chọn)"
                  value={adjust.note}
                  onChange={(e) => setAdjust((a) => ({ ...a, note: e.target.value }))}
                />
                <button
                  className={s.primary}
                  disabled={busy || !adjust.userId || !/^-?[1-9][0-9]{0,5}$/.test(adjust.delta)}
                  onClick={() =>
                    act(async () => {
                      await adminRequest("data/wallet/adjust", session.csrf, { userId: adjust.userId, delta: Number(adjust.delta), note: adjust.note }, "POST");
                      setAdjust({ userId: "", delta: "", note: "" });
                      setMessage("Đã điều chỉnh Point.");
                      refreshData();
                    })
                  }
                >
                  Áp dụng
                </button>
              </div>
            </Card>
          )}
          {view === "users" && session.user.capabilities.includes("access.manage") && (
            <Card
              title="Khoá / mở tài khoản"
              description="Khoá: user không đăng nhập được nữa và mọi phiên hiện tại mất hiệu lực tức thì."
            >
              <div className={s.rowActions} style={{ flexWrap: "wrap", gap: 8 }}>
                <input
                  className={s.inlineInput}
                  placeholder="user_id (sao chép từ bảng dưới)"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value.trim())}
                />
                <button
                  className={s.secondary}
                  disabled={busy || !blockId}
                  onClick={() => {
                    if (!confirm(`Khoá tài khoản ${blockId}?`)) return;
                    void act(async () => {
                      await adminRequest("data/users/status", session.csrf, { userId: blockId, status: "suspended" }, "POST");
                      setMessage(`Đã khoá ${blockId}.`);
                      setBlockId("");
                      refreshData();
                    });
                  }}
                >
                  Khoá tài khoản
                </button>
                <button
                  className={s.secondary}
                  disabled={busy || !blockId}
                  onClick={() =>
                    act(async () => {
                      await adminRequest("data/users/status", session.csrf, { userId: blockId, status: "active" }, "POST");
                      setMessage(`Đã mở khoá ${blockId}.`);
                      setBlockId("");
                      refreshData();
                    })
                  }
                >
                  Mở khoá
                </button>
              </div>
            </Card>
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
          {view === "clientErrors" && <Card title="Lỗi giao diện trong 30 ngày" description="Số lỗi theo trang và loại; không lưu câu hỏi, luận giải hoặc thông tin cá nhân. Đây là bộ đếm trình duyệt, không phải số người dùng bị ảnh hưởng.">{rows.length ? <DataTable rows={rows}/> : <p>{remoteMessage}</p>}</Card>}
          {view === "diagnostics" && (
            <Card
              title="Lỗi đăng nhập Zalo gần đây"
              description="Backend ghi mỗi lần đăng nhập thất bại — phục vụ truy vết khi người dùng báo lỗi."
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
                        onClick={(e) => onRollback(String(v.id), e.currentTarget)}
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
    </>
  );
}
