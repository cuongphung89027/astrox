# Handoff — khắc phục 7 lỗi UI theo audit Sơn 29/09/2026

- **Owner:** ZCode (glm) — task `codex/ui-audit-fixes`
- **Base:** `e93a57b` (origin/main, tip production 29/09 — nhánh chứa english-us + market-auth-ux)
- **Worktree:** `/Users/Thsonjpg/.codex/worktrees/ui-audit-fixes/astrox`
- **Commit:** xem `git log -1` trên nhánh; 13 file (11 sửa + 2 mới)

## Phạm vi & cách sửa từng lỗi

| # | Lỗi | Sửa | File |
|---|-----|-----|------|
| 1 | Icon tay | Glyph `front_hand` **weight 300** (Material Symbols, Apache-2.0) — đúng dáng ảnh đính kèm (4 ngón + ngón cái phải), bút ~1.5/24 khớp họ nét 1.55 của FeatureIcon. Path gốc không gian 960, `transform="scale(.025) translate(0 960)"` | `web/src/components/kit/FeatureIcon.tsx` |
| 2 | Lịch âm "September 2026" | Nguyên nhân: `<input type="month">` native hiển thị theo locale trình duyệt/OS, ngoài kiểm soát app (Sơn dùng iPhone → tiếng Anh). Thay bằng 2 `<select>` Tháng (Tháng 1–12 / January–December theo locale app) + Năm (1976–2100), giữ ‹ › + Hôm nay; CSS grid 5 cột, mobile 4 cột | `LunarCalendar.tsx`, `LunarCalendar.module.css` |
| 3 | Tử vi chỉ nói sao tốt | Thêm quy tắc vào `tuvi.tuviPromptBody.0` (dùng chung cho mọi topic): buộc nêu cả sao phúc lẫn tinh tú bất lợi (Hóa Kỵ, Kình/Đà/Hỏa/Linh, Không/Kiếp, Tang/Bạch/Hình, Tuần/Triệt) với tên sao + cung + ảnh hưởng + cách hoá giải; cấm khép phần khó bằng 1 câu chung chung. EN template tương ứng | `services/admin/prompt-templates.ts`, `english-prompts.ts` |
| 4 | Bullet `*` → `•` | AiText nhận `-`, `•` **và `*`** làm đầu dòng; tách gom dòng liên tiếp thành cụm prose `<p>` / bullet `<ul>` (marker •) — xử lý cả đoạn AI trộn `**Tiêu đề**` + bullet. Logic tách ra lib riêng + 4 unit test | `web/src/lib/reading-blocks.ts` (mới), `AiText.tsx`, `web/tests/reading-blocks.test.mjs` (mới) |
| 5 | Literal `<br/>` ở "Nhịp riêng của bạn" | Chuỗi trong `{}` render literal — sửa thành JSX fragment; fix cả 2 chỗ (hero "Mỗi con số…" + thẻ "Nhịp riêng…"), VI + EN | `NumerologyClient.tsx` |
| 6 | Ô "Giờ chính xác (tuỳ chọn)" | Xoá field + khối chọn DST + guard `timeValid` + 5 i18n key (vi/en) không còn dùng. `birthTime` đã lưu trong profile người dùng CŨ được giữ nguyên khi sửa hồ sơ (chỉ đổi khung giờ thì tự xoá theo logic sẵn có) | `ProfileModal.tsx`, `i18n/vi.ts`, `i18n/en.ts` |
| 7 | Icon quả cầu | Path gốc `Language` (MUI icons-material, Apache-2.0) với `fill="currentColor"` — đúng glyph Sơn chỉ định | `web/src/components/shell/LanguageSwitcher.tsx` |

## Kiểm chứng

- `npm test`: **582/582** + prompt-runtime-qa 79 prompt render đủ (kể cả template Tử vi mới)
- `npm run typecheck` sạch; `npm run lint` 0 lỗi (20 warning có sẵn ở base); `npm run build` OK
- `format:check`: 3 file fail là **lỗi có sẵn từ base** (integration-api.test.mjs, backend.test.mjs, google-auth.test.mjs — không thuộc diff này)
- UI thật trên dev server (worktree, port 3313): Lịch âm đổi Tháng 10 → nhảy đúng 1/10 (âm 21/8), không còn chữ Anh; modal hồ sơ captive không còn ô giờ chính xác; thẻ "Nhịp riêng của bạn." ngắt dòng thật; palm + globe glyph hiển thị đúng trong DOM lẫn ảnh chụp
- `ui-30viewports.mjs`: chromium **518/518**, webkit **259/259**
- `ux-regression-qa.mjs`: **14/14** (gồm assertion "Profile has no exact-time field")

## Giới hạn / lưu ý cho release owner

1. **Prompt sao xấu & bullet •** chỉ nghiệm thu đầy đủ trên prod sau khi có lượt gọi AI thật — prompt-render QA chỉ chứng minh template hợp lệ. Đề nghị Sơn thử 1 luận giải Tử Vi trên preview sau deploy.
2. Icon license: 2 glyph từ Material Symbols / MUI icons-material — **Apache-2.0**, được phép dùng.
3. Không đụng D1, không migration, không đổi shared contract ngoài prompt template (backend không re-render prompt phía client; template repo là nguồn hiệu lực sau deploy Pages).
4. Dev server 3313 của worktree này đã tắt; **port 3311 là của agent khác** (worktree history-amount-sign) — không đụng.
5. Bôi màn "quick tiles trống" lúc chụp là do dev compile chậm; DOM check đủ icon + nhãn, ui-30viewports xác nhận không vỡ.
