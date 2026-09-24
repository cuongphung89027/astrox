"use client";

import { Card } from "../ui";
import type { AdminPanelProps } from "../useAdminApi";
import s from "../AdminDashboard.module.css";

export function OperationsPanel({ snapshot, renderFields }: AdminPanelProps) {
  return (
              <>
                <Card
                  title="Nhịp vận hành"
                  description="Điều chỉnh lịch, ngưỡng và giới hạn xử lý."
                >
                  {renderFields("operations", [
                    ["maintenance", "Bảo trì hệ thống", "boolean"],
                    [
                      "reconciliationMinutes",
                      "Chu kỳ đối soát (phút)",
                      "number",
                    ],
                    [
                      "claimTimeoutMinutes",
                      "Thời hạn yêu cầu thưởng (phút)",
                      "number",
                    ],
                    ["retryLimit", "Số lần retry nghiệp vụ", "number"],
                    ["batchSize", "Số bản ghi mỗi đợt", "number"],
                    ["alertPoints", "Ngưỡng cảnh báo Point", "number"],
                    [
                      "reviewAbovePoints",
                      "Ngưỡng cần duyệt thưởng (Point)",
                      "number",
                    ],
                    [
                      "auditRetentionDays",
                      "Giữ nhật ký (ngày, tối thiểu 90)",
                      "number",
                    ],
                    ["reportTimezone", "Múi giờ báo cáo", "text"],
                    ["reportDays", "Khoảng ngày báo cáo mặc định", "number"],
                  ])}
                </Card>
                <div className={s.info}>
                  {snapshot.integration.wallet
                    ? "Backend ví đã được cấu hình. "
                    : "Đang chờ backend ví: lịch đối soát và tác vụ nghiệp vụ chưa hoạt động. "}
                  Chống cộng trùng, xác minh giao dịch và nhật ký bắt buộc luôn
                  hoạt động. Các tham số vận hành chỉ có hiệu lực khi backend
                  tương ứng hỗ trợ.
                </div>
              </>
  );
}
