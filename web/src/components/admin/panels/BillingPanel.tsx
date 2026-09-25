"use client";

import { Fields, Card, Empty, fmt, uid } from "../ui";
import { quotePackage } from "../../../../../services/admin/config";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";
import { promoExpiryLocal, promoExpiryIso } from "../promo-time";
import type { Spec } from "../ui";

export function BillingPanel({ config, update, renderFields }: AdminPanelProps) {
  return (
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
                            kind: "topup_bonus",
                            minAmountVnd: 0,
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
                        value={{ ...p, kind: p.kind ?? "topup_bonus", minAmountVnd: p.minAmountVnd ?? 0 }}
                        specs={[
                          ["code", "Mã (chữ hoa, số, gạch ngang)", "text"],
                          ["kind", "Loại mã", ["topup_bonus", "direct_points"]],
                          ["bonus", "Point thưởng", "number"],
                          ...(p.kind === "direct_points" ? [] : [["minAmountVnd", "Nạp tối thiểu (VND)", "number"] as Spec]),
                          ["limit", "Tổng lượt dùng tối đa", "number"],
                          ["perUser", "Lượt mỗi người", "number"],
                          ["enabled", "Kích hoạt mã", "boolean"],
                        ]}
                        onChange={(key, value) =>
                          update((d) => {
                            Object.assign(d.billing.promos[i], { [key]: value });
                            if (key === "kind" && value === "direct_points") d.billing.promos[i].minAmountVnd = 0;
                          })
                        }
                      />
                      <label className={s.promoExpiry}>
                        <span>Hết hạn (giờ Việt Nam, để trống nếu không hạn)</span>
                        <input type="datetime-local" value={promoExpiryLocal(p.expiresAt)} onChange={event => update(d => { d.billing.promos[i].expiresAt = promoExpiryIso(event.target.value); })} />
                      </label>
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
  );
}
