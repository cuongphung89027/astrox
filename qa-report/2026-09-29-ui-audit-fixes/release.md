# Release note — 7 lỗi UI audit Sơn 29/09 lên production

- **Ngày:** 29/09/2026 (chiều)
- **Owner phát hành:** ZCode (glm) theo lệnh "Đẩy prod đi" của Sơn
- **SHA:** `b217cbc` (main, cả origin lẫn upstream) — fast-forward từ `e93a57b`, không merge-conflict, không D1 migration

## Triển khai

| Bề mặt | ID | Ghi chú |
|---|---|---|
| Worker `astrox-api` | version `c2103278-09ee-4860-9459-31d09cc61843` | deploy bằng `scripts/deploy-worker.mjs` từ b217cbc (script tự chặn nếu cây bẩn/chưa push). Scope unlock bám cấu trúc PromptNode nên template mới không đổi scope key |
| Pages `theastrox` | deployment `04945566-ff55-493e-bfab-f4d2e08afefb` | build tự động từ upstream main b217cbc, production environment, custom domain `theastrox.space` |
| D1 | — | Không migration, không đổi schema |

## Kiểm tra sau triển khai (đọc body, không chỉ status)

- Pages: `/`, `/trangchu`, `/licham`, `/thansohoc`, `/chitay`, `/tuvi`, `/banggia`, `/en`, `/en/lunar-calendar` — 200. `/en/licham` 404 là **đúng** (cây EN dùng slug Anh; không phải regression).
- Domain chính và URL deployment trực tiếp (`04945566.theastrox-a3l.pages.dev`) trả chunk hash trùng nhau — domain đã trỏ đúng bản mới.
- Marker bản mới trong bundle prod: path icon tay `M480-480v-400` (wght400) có mặt, path cũ `M17.6 11.5` biến mất; globe MUI `M11.99 2C6.47` có mặt; mảng tháng `January…December` (LunarCalendar mới) và quy tắc sao xấu `Kình Dương` (prompt template mới) đều có trong chunk.
- API: `/api/site-config` 200 với body config hợp lệ; POST `/api/ai` với payload vô hiệu bị từ chối lịch sự → Worker sống và validate bình thường.
- Trước release: 582 unit test, prompt-runtime-qa 79 prompt, typecheck, lint, build, ui-30viewports chromium 518/518 + webkit 259/259, ux-regression 14/14 (chi tiết ở `handoff.md` cùng thư mục).

## Còn nghiệm thu bằng mắt/máy thật (Sơn)

1. Icon tay (nav/tile) — bản wght400 đầu ngón tròn; nếu vẫn thấy cụt ở một vị trí cụ thể, báo kèm màn hình + kích thước.
2. Một luận giải Tử Vi thật trên prod: phải thấy sao xấu được phân tích chi tiết (tên sao + cung + ảnh hưởng + hoá giải) và danh sách hiển thị marker • thay vì *.

## Rollback

- Pages: dash.cloudflare.com → Pages `theastrox` → rollback về deployment `ab6a7c14-aa26-4511-9abc-ebe0bba08831` (e93a57b, 7 giờ trước).
- Worker: từ worktree `e93a57b` chạy lại `npm run deploy:worker`, hoặc `npx wrangler rollback --config services/backend/wrangler.jsonc`.
- Không cần rollback dữ liệu (không đổi D1).
