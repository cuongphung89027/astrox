# Phát hành bảng giá dịch vụ — 25/09/2026

## Nội dung

Áp bảng giá đã chốt với chủ hệ thống trong chat Codex ngày 24/09/2026 (đề xuất 3 lượt: bảng chi tiết → hạ giá bài lẻ + thêm mục miễn phí → tách giá theo lượt/kỳ từ 3 Point).

- **79 dịch vụ trả phí, 18 miễn phí, 0 draft** — 15 dịch vụ Cung Hoàng Đạo trước đó đang `draft` được công bố cùng lúc.
- Bài mở theo hồ sơ: **9 Point** (chuyên sâu Tử Vi 12: "Vì sao tôi lại là tôi", "Có nên thay đổi công việc năm 2026?", 3 bài "Xu hướng đại vận").
- Theo lượt/kỳ: Tarot 3/5/7/9 (1 lá / 3 lá / 5 lá / Celtic 10), Kinh Dịch 5, Chỉ Tay 7, dự báo tuần 3, tháng 5, Năm cá nhân 5/năm.
- Gói mở nhóm + trọn module: Tử Vi **69** (nhóm 19–39), Cung Hoàng Đạo **49** (nhóm 15–19), Bát Tự **29**, Thần Số Học **19**. Khấu trừ nâng cấp 2/3 giữ nguyên.
- Miễn phí: Tử Vi "Tính cách & khuynh hướng", "Tổng quan tài phú, sự nghiệp", dự báo hôm nay; CH "Mặt Trời", "Bộ ba cốt lõi", dự báo hôm nay; Bát Tự "Tính cách"; Thần Số "Số Chủ Đạo", "Biểu đồ ngày sinh"; Lịch âm; Đặt lịch chuyên gia; lập lá số/tứ trụ/gieo quẻ/rút lá/tải ảnh bàn tay.
- Đổi tên hiển thị "Hành tinh xa xỉ" → **"Hành tinh xã hội"** (mã `hanh-tinh-xa-xi` giữ nguyên; prompt/giá/dữ liệu không đổi).

## Cách triển khai

- Config Admin publish trực tiếp qua D1 prod theo đúng transaction của `store.publish()`: `admin_versions` id **5** → `admin_state` revision **7→8**, kèm dòng audit `config.publish` (actor `script:zcode-set-prices`). Trước khi ghi đã chạy `validateConfig()` của repo trên config mới (0 lỗi).
- Commit này chỉ chứa đổi tên hiển thị (services/admin/catalog.ts, services/admin/original-prompts.ts, web/src/lib/zodiac.ts) + ghi chú này; tên trong D1 được patch tại `admin_versions.id=5` và draft.
- Deploy Worker từ commit này bằng `deploy:worker`; Pages tự build từ upstream.

## Kiểm chứng

- `npm run test:unit` **294/294 pass**; `npm run typecheck` sạch.
- `https://theastrox.space/api/site-config` sau publish: 97 dịch vụ công khai (79 paid/18 free), `unlocks.enabled=true`, 20 bundle đúng giá; điểm soát: Tarot 3–9, Tử Vi 9/12, tuần 3, tháng 5, palm 7, compat 15/19/19, gói trọn 69/49/29/19.
- Rollback: `POST /api/admin/rollback` về version 4 (revision trước), hoặc publish lại config cũ.
