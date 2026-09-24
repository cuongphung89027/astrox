"use client";

import { Fields, Card, SecretInput, IntegrationTest } from "../ui";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function IntegrationsPanel({ config, snapshot, session, update, secret, dirty, view }: AdminPanelProps) {
  return (
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
                      ]}
                      onChange={(key, value) =>
                        update((d) =>
                          Object.assign(d.integrations.payos, { [key]: value }),
                        )
                      }
                    />
                    <p>Đơn chưa thanh toán tự hết hạn sau 10 phút.</p>
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
  );
}
