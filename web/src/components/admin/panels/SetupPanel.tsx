"use client";

import { Card } from "../ui";
import { navigation, type View } from "../navigation";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function SetupPanel({ config, go }: AdminPanelProps) {
  return (
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
  );
}
