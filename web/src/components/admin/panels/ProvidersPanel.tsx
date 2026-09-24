"use client";

import { Fields, Card, Empty, SecretInput, Chain, ModelPricing, optionLabels, uid } from "../ui";
import { adminRequest } from "@/lib/admin-client";
import { belongsToProvider } from "../../../../../services/admin/provider-models";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function ProvidersPanel({ config, snapshot, session, update, patch, renderFields, secret, dirty, act, setMessage }: AdminPanelProps) {
  return (
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
  );
}
