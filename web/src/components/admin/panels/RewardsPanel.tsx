"use client";

import { Fields, Card, uid } from "../ui";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function RewardsPanel({ config, update, renderFields }: AdminPanelProps) {
  return (
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
                  description="Google Rewarded Web: backend kiểm tra phiên, hạn mức và chống cộng trùng; sự kiện cấp thưởng do trình duyệt báo."
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
  );
}
