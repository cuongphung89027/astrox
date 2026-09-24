"use client";

import { useState } from "react";
import { Fields, Card, Empty, Chain, optionLabels, fmt, uid } from "../ui";
import { MODULES } from "../../../../../services/admin/config";
import { SERVICE_CATALOG, addMissingServices } from "../../../../../services/admin/catalog";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

const searchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();

export function ServicesPanel({ config, update }: AdminPanelProps) {
  const [serviceModule, setServiceModule] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const filteredServices = config.billing.services
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p }) =>
        (!serviceModule || p.module === serviceModule) &&
        (!serviceStatus || p.status === serviceStatus) &&
        searchText(`${p.name} ${p.id}`).includes(searchText(serviceSearch.trim())),
    );
  return (
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
  );
}
