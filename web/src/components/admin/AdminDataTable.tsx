"use client";

import { Fragment, useMemo, useState } from "react";
import {
  cellText,
  pageRows,
  rowsCsv,
  selectRows,
  type DataRow,
} from "../../../../services/admin/table";
import s from "./AdminDashboard.module.css";
const columnLabels: Record<string, string> = {
  id: "Mã",
  route: "Cấu hình model",
  failed: "Lần lỗi",
  input: "Token input",
  output: "Token output",
  error_rate: "Tỷ lệ lỗi",
  count: "Số lượt",
  code: "Mã lỗi",
  service_id: "Dịch vụ",
  config_revision: "Phiên bản cấu hình",
  attempts: "Các lần gọi provider",
  user_id: "Người dùng",
  display_name: "Tên hiển thị",
  email: "Email",
  status: "Trạng thái",
  balance: "Số dư Point",
  amount: "Số lượng",
  amount_vnd: "Giá trị VND",
  points: "Point",
  created_at: "Thời điểm tạo",
  updated_at: "Cập nhật",
  actor: "Người thực hiện",
  action: "Thao tác",
  target: "Đối tượng",
  detail: "Chi tiết",
  note: "Ghi chú",
  provider: "Provider",
  model: "Model",
  duration_ms: "Thời gian (ms)",
  success: "Kết quả",
  kind: "Loại",
  type: "Loại",
  request_id: "Mã yêu cầu",
};

export function AdminDataTable({ rows }: { rows: DataRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "",
    direction: "asc",
  });
  const [expanded, setExpanded] = useState<DataRow | null>(null);
  const keys = useMemo(
    () => [...new Set(rows.flatMap(Object.keys))].slice(0, 8),
    [rows],
  );
  const statuses = useMemo(
    () => [...new Set(rows.map((row) => cellText(row.status)).filter(Boolean))],
    [rows],
  );
  const filtered = useMemo(
    () =>
      selectRows(rows, {
        query,
        status,
        sortKey: sort.key,
        direction: sort.direction,
      }),
    [rows, query, status, sort],
  );
  const data = pageRows(filtered, page, size);
  const label = (key: string) => columnLabels[key] || key.replaceAll("_", " ");
  const reset = () => {
    setPage(1);
    setExpanded(null);
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([rowsCsv(filtered, columnLabels)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `astrox-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className={s.dataExplorer} aria-label="Tra cứu dữ liệu">
      <div className={s.dataToolbar}>
        <label>
          Tìm trong dữ liệu đã tải
          <input
            type="search"
            value={query}
            placeholder="Tên, email, mã hoặc nội dung…"
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
            }}
          />
        </label>
        {statuses.length > 0 && (
          <label>
            Trạng thái
            <select
              aria-label="Trạng thái"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                reset();
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className={s.secondary}
          disabled={!filtered.length}
          onClick={exportCsv}
        >
          Xuất CSV ({filtered.length})
        </button>
      </div>
      <p className={s.help}>
        Tìm kiếm và xuất CSV áp dụng cho {rows.length} bản ghi đã tải, không
        phải toàn bộ cơ sở dữ liệu.
      </p>
      <div
        className={s.tableWrap}
        tabIndex={0}
        role="region"
        aria-label="Bảng kết quả, có thể cuộn ngang"
      >
        <table>
          <thead>
            <tr>
              {keys.map((key) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort.key === key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    className={s.sortButton}
                    onClick={() => {
                      setSort({
                        key,
                        direction:
                          sort.key === key && sort.direction === "asc"
                            ? "desc"
                            : "asc",
                      });
                      reset();
                    }}
                  >
                    {label(key)}{" "}
                    <span aria-hidden="true">
                      {sort.key === key
                        ? sort.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <Fragment key={`${cellText(row.id)}-${i}`}>
                <tr>
                  {keys.map((key) => (
                    <td key={key} title={cellText(row[key])}>
                      {cellText(row[key]) || "—"}
                    </td>
                  ))}
                  <td>
                    <button
                      className={s.detailButton}
                      aria-expanded={expanded === row}
                      aria-label={`Xem bản ghi ${cellText(row.id) || data.start + i}`}
                      onClick={() => setExpanded(expanded === row ? null : row)}
                    >
                      {expanded === row ? "Thu gọn" : "Xem"}
                    </button>
                  </td>
                </tr>
                {expanded === row && (
                  <tr>
                    <td colSpan={keys.length + 1}>
                      <dl className={s.rowDetails}>
                        {Object.entries(row).map(([key, value]) => (
                          <div key={key}>
                            <dt>{label(key)}</dt>
                            <dd>{cellText(value) || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!data.rows.length && (
              <tr>
                <td colSpan={keys.length + 1}>
                  Không có bản ghi phù hợp. Thử từ khóa hoặc trạng thái khác.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={s.dataPagination}>
        <span role="status" aria-live="polite">
          {data.start}–{data.end} / {data.total} bản ghi · Trang {data.page}/
          {data.pages}
        </span>
        <label>
          Số dòng{" "}
          <select
            aria-label="Số dòng"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              reset();
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            className={s.secondary}
            disabled={data.page <= 1}
            onClick={() => {
              setPage(data.page - 1);
              setExpanded(null);
            }}
          >
            Trang trước
          </button>
          <button
            className={s.secondary}
            disabled={data.page >= data.pages}
            onClick={() => {
              setPage(data.page + 1);
              setExpanded(null);
            }}
          >
            Trang sau
          </button>
        </div>
      </div>
    </section>
  );
}
