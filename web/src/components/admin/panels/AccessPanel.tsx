"use client";

import { Fields, Card, Members, uid } from "../ui";
import { CAPABILITIES } from "../../../../../services/admin/config";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function AccessPanel({ config, snapshot, session, update, canWrite }: AdminPanelProps) {
  return (
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
  );
}
