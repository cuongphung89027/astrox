"use client";

import { Fields, Card, Empty, uid } from "../ui";
import { MODULES } from "../../../../../services/admin/config";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function ContentPanel({ config, update, renderFields }: AdminPanelProps) {
  return (
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
  );
}
