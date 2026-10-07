# Release 07/10/2026 — Nâng cấp UX bài đọc, từ điển thuật ngữ, chỉ dẫn lịch âm và nhóm thanh điều hướng

- Branch `codex/reading-ux-upgrade` từ base `a04df36`.
- Phạm vi thay đổi: hoàn toàn phía frontend `web/` (không có migration D1, không đổi backend services).

## 1. Nội dung nâng cấp

1. **Nhóm thanh điều hướng Top Nav (Desktop)**:
   - Gom 11 mục dàn trải thành 4 nhóm rõ ràng, vừa vặn trên 1 dòng từ 1024px đến 1440px+:
     - `Trang chủ` / `Home` (direct link).
     - `Tìm hiểu bản thân` / `Know Yourself` (dropdown): Tử Vi, Bát Tự, Thần Số Học, Cung Hoàng Đạo, kèm icon và phụ đề ngắn (≤5 từ).
     - `Hỏi đáp` / `Ask` (dropdown): Tarot, Kinh Dịch, Chỉ tay.
     - `Lịch âm` / `Lunar Calendar` (direct link).
     - `Đặt lịch chuyên gia` (direct link, chỉ hiện trên thị trường Việt Nam).
   - Dropdown style liquid-glass bo góc 18px, hỗ trợ hover bridge, bàn phím (Escape, Tab, Enter).
   - Nút trigger nhóm tự động kích hoạt trạng thái `data-active` đồng bộ khi người dùng đang ở bất kỳ trang con nào trong nhóm.

2. **Từ điển thuật ngữ & linh kiện `<Term />`**:
   - `web/src/lib/glossary.ts`: Từ điển giải thích cô đọng (≤1 câu, <18 từ) cho các khái niệm: 12 Thần nhật (Thanh Long, Minh Đường, Kim Quỹ...), Hoàng đạo/Hắc đạo, Tam nương, Nguyệt kỵ, Cung Mệnh, Kim Tứ Cục, Chính tinh.
   - `web/src/components/kit/Term.tsx`: Dấu gạch chân chấm thanh lịch; hover/tap bật popover kính mờ giải thích tại chỗ, tự động căn vị trí trên/dưới tránh tràn viewport (hỗ trợ mobile 320px).

3. **Chỉ dẫn lịch dân gian cho Lịch Âm**:
   - `web/src/lib/day-guide.ts`: Bản đồ ánh xạ thần nhật sang các việc nên làm (Hợp) và nên tránh (Tránh).
   - `web/src/components/discovery/LunarCalendar.tsx`: Thẻ Ngày tốt hiển thị chip hoạt động phù hợp (`Hợp: Cưới hỏi · Khởi sự lớn`...) kèm tên Thần hoàng đạo bọc trong `<Term />`.

4. **Trang chủ: Vận trình tức thì & Thẻ định danh lá số**:
   - `web/src/components/home/Dashboard.tsx` & `DailyOverview.tsx`: Thẻ Vận trình luôn hiển thị dữ liệu lịch pháp tính toán tức thì (Can Chi, Hoàng đạo/Hắc đạo badge, việc Hợp/Tránh, giờ hoàng đạo gần nhất và 3 nhịp năng lượng trong ngày) ngay cả khi chưa có bài đọc AI.
   - Thẻ định danh Lá số cá nhân gắn `<Term />` vào Cục (Kim Tứ Cục), Mệnh tại, Chính tinh.

5. **Trải nghiệm đọc bài luận giải (`StructuredReading`)**:
   - Giữ nguyên `textAlign: "justify"` chuẩn mực typographic; tuyệt đối không dùng streaming gõ chữ.
   - Thanh công cụ bài đọc (Reading Toolbar): Đọc bài (TTS qua Web Speech API `vi-VN` / `en-US`), Sao chép văn bản sạch, Chia sẻ (Web Share API).
   - Thu gọn căn cứ học thuật: Phần "Cơ sở & đối chiếu" tự động đặt trong `<details>` thu gọn mặc định, giữ mạch đọc thông suốt. Lời khuyên & hành động được đóng khung nổi bật.

## 2. Kiểm chứng

- `npx tsc --noEmit && tsc -p ../services/backend/tsconfig.json`: 0 lỗi type.
- `npm test`: 754/754 unit/lib/prompt tests pass.
- `npm run lint`: 0 lỗi lint (20 warnings baseline không đổi).
- `git diff --check`: sạch sẽ.
- `next build`: Static export thành công 35/35 routes trong 3.0s.
- Song ngữ: Đảm bảo đối xứng 100% giữa Tiếng Việt và English US.
