# AstroX release — 2026-09-26: bộ Tarot Shiba lên sàn

Thay đổi UI web thuần (không D1 migration, không đổi Worker/API contract). Deploy từ commit `224dedd`.

## Nội dung

Bộ bài thứ hai "Tarot Chó Shiba" chuyển từ teaser "Sắp ra mắt" thành `available`, đầy đủ 78 lá + bài úp + video intro — song song bộ Raccoon:

- **Asset** — `web/public/assets/tarot/shiba/` (mirror `assets/tarot/shiba/` cho legacy `index.html`): 78 lá webp 700×1226 q75 (~145–195KB/lá, tổng 12.7MB, ngang bộ raccoon) + `back.webp` + `intro.mp4` nén từ 1080p/43.5Mbps (54MB) về 480×854 h264+aac 848KB, two-pass đúng profile video raccoon (560kbps). Phong cách tranh khắc gỗ Nhật Bản (ukiyo-e).
- **Registry** — `web/src/lib/tarot.ts` + legacy `index.html`: entry `shiba` → `available`, `base /assets/tarot/shiba/`, mô tả mới. Luật chơi/prompt AI dùng chung cards.json, chỉ khác art.
- **DeckPicker** — video intro giờ theo từng deck (`DeckIntro`): chỉ slide đang chọn mount `<video src>`, slide còn lại là placeholder poster (preload none, không tải gì); trạng thái âm thanh giữ nguyên khi đổi bộ. Rail chỉ đổi bộ khi có ý định thật (pointerdown/wheel/nút/mũi tên) — scroll-snap tự re-snap khi load từng làm "đổi deck ảo", lộ diện khi lần đầu có 2 deck available.
- **next.config.ts** — thêm rewrite dev `/api/feature-events` → admin local 8789 (route bị 404 trước đó, làm QA console-error fail).

## Kiểm chứng

- `tarot-feature-qa.mjs` 60/60 (chromium + webkit) trên dev server kèm admin local. Script cập nhật theo UI mới: dismiss popup "Khám phá trước" (23/09), seed lịch sử có `fingerprint` (app lọc theo fingerprint), locator `video[src]`.
- `ui-30viewports.mjs` 518/518 (30 viewport × route × 2 engine, trạng thái đăng nhập, dò tràn ngang + va chạm topbar).
- 344 unit test PASS; `typecheck` sạch; ESLint 0 error (warnings trùng main).
- Static export build OK; soi mắt: slide shiba (video + caption + nút loa), shuffle/rút bài dùng art shiba đúng.

## Đã biết (không thuộc nhánh này)

- `tarot-compat-qa.mjs` vỡ ở mục module Tương hợp (`/tuonghop` — combobox "Giới tính" không tìm thấy): fail y hệt trên main trước nhánh này → script lỗi thời với UI compat mới; phần Tarot của script PASS.

## Rollback

- Pages: redeploy commit `e0c982e` (trước nhánh) hoặc chọn deployment trước đó trên dashboard `theastrox`.
- Worker: không đổi; D1: không đổi.

## Follow-up cùng ngày — `38e2706` fix mất đồng bộ khi đổi bộ

Báo cáo từ video màn hình 09:05 (bấm ←→ giữa 2 bộ): dot/bCaption kẹt ở deck cũ trong khi rail đã sang deck mới — nặng nhất là lượt rút bài/AI prompt vẫn dùng deck cũ. Nguyên nhân: cú scroll event đầu của smooth animation xuất phát cách snap point 1–2px, điều kiện xả cờ intent cũ (so vị trí `<2px`) ăn ngay event này. Fix: cờ tắt theo thời gian im (180ms sau event scroll cuối), không phụ thuộc vị trí. Trên màn 120Hz delta đầu ~1px nên dính chắc; headless 60Hz thường ≥2px nên không tái hiện được.

Kiểm chứng: prod browser check 3 vòng ←→ + vuốt drag đều synced, 0 console error; tarot-feature-qa 60/60, ui-30viewports 518/518 (đều ×2 engine). Rollback: redeploy `27b8479`.

## Follow-up 2 — `e8b13a3` shiba lên slide đầu + nhãn "Mới"

Shiba thành deck mở mặc định (slide 1, rút bài mặc định), raccoon chuyển thành "bộ kinh điển" ở slide 2. Nhãn "Mới" (`isNew` trong registry): pill vàng ấm gradient khớp accent vàng của app, quầng sáng thở 2.8s (tắt theo prefers-reduced-motion), góc phải trên deckArt; article label có "(mới ra mắt)" cho screen reader. Legacy index.html đồng bộ (badge Mới/Mặc định). Kiểm chứng: badge 1280/390 không đè; prod shiba slide đầu + dot synced + video chạy + chuyển ←→/drag synced + 0 console error; tarot-feature-qa 60/60, ui-30viewports 518/518 ×2 engine; 344 unit test. Rollback: redeploy `f918c48`.

## Follow-up 3 — `665299e` motion cho nhãn "Mới"

Ba lớp: pop-in spring lúc xuất hiện (scale .4 xoay → vọt 1.14 → khớp, .55s), vệt sheen trắng quét ngang pill mỗi 3.4s (kiểu satin, clip trong pill), quầng glow thở 2.8s. Cả ba tắt theo prefers-reduced-motion / html[data-motion=reduced] (badge tĩnh). Kiểm chứng: computed animation trên prod đủ 3 lớp, 0 console error; frame soi giữa-cuối vệt sheen; tarot-feature-qa 60/60, ui-30viewports 518/518 ×2 engine. Rollback: redeploy `c45e251`.
