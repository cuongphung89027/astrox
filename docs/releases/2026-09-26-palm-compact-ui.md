# Release 26/09/2026 — Chỉ tay: continuation hardening + compact UI

- Merge: `a13b84f` — Merge branch `codex/palm-redesign` vào main (branch commits `567109b`, `475b9e3`; base nhánh `e0c982e`).
- Đã push `main` lên cả hai remotes (origin `ngthson553-create/astrox`, upstream `cuongphung89027/astrox`).
- Worker `astrox-api`: deploy bằng `scripts/deploy-worker.mjs` từ `a13b84f`, Version ID `b73f0937-b25e-428e-b1af-5204e9e2c9d2`, `--keep-vars` giữ `ZALO_BROWSER_FALLBACK_ENABLED=true`. Không thay đổi nghiệp vụ Worker (chỉ parity git); không migration D1.
- Pages `theastrox`: tự build từ upstream `main` @ `a13b84f`.

## Nội dung

- Compact UI theo yêu cầu chủ sản phẩm ("cắt bớt, không chỉ rút gọn"): bỏ hẳn các khối slogan/intro/badge thử nghiệm/stepper/phụ đề/nhãn thứ tự/thông báo lặp; hình bàn tay vẽ nét SVG đơn sắc; hướng dẫn chụp gập làm 3 dòng; kết quả gọn một thẻ + ghi chú chiêm nghiệm duy nhất.
- Continuation hardening: guard lens-pick, track release/rollback camera, deadline 5s cho focus/torch, normalizer ảnh (format/8MB/EXIF/1200px), abort/generation guards, zoom dialog a11y, reading sống sót khi geometry lỗi.
- CSP: thêm `'wasm-unsafe-eval'` cho WASM on-device (MediaPipe) trên mọi entry document; JS eval vẫn chặn.
- Hợp đồng giữ nguyên: prompt `palm.read.v1`, giá `usePaidPrice("palm")`, `callAiText` serviceId `palm` + cùng JPEG chuẩn hoá, consent bắt buộc.

## Kiểm trước khi deploy (commit merge `a13b84f`)

- `npm test` 382/382; prompt QA 79 render; build export 22/22 trang.
- Ở nhánh: palm-flow Chromium 46 pass/0 fail; WebKit 35 pass/0 fail/2 skip (giới hạn camera synthetic của engine); responsive 48/48; UI30 518/518; typecheck + lint sạch (2 cảnh báo `<img>` data-URL đã biết).

## Kiểm sau khi deploy (production, 26/09 ~14:20 GMT+7)

- `https://theastrox.space/chitay` 200, UI mới đã live (marker "Hướng dẫn chụp" có, marker cũ "BẮT ĐẦU TỪ MỘT BỨC ẢNH" không còn).
- Header CSP chứa `'wasm-unsafe-eval'`.
- `/api/site-config` 200, dịch vụ `palm` trình bày đúng (paid).
- `/api/ai` sống (400 validate khi chưa đăng nhập); `/`, `/tarot` 200 không hồi quy.
- Asset MediaPipe self-host 200: `/mediapipe/wasm/vision_wasm_internal.wasm`, `/models/hand_landmarker.task` (octet-stream).

## Hạn chế & rollback

- Chưa nghiệm thu camera thật trên iPhone (MediaPipe đã qua synthetic hai engine).
- Rollback Pages: revert merge trên main, push lại upstream (Pages tự build lại). Rollback Worker: `npx wrangler rollback --config services/backend/wrangler.jsonc` hoặc deploy lại commit trước (`665299e`). Không cần rollback D1.
