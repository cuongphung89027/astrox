# Chỉ tay: nâng cấp toàn luồng

Ngày: 2026-10-03. Owner/integration/release: Codex root.
Base: 6c43b3b871a3e48fdb124169cdc1bc084bcc24a7, origin/main và upstream/main.
Branch: codex/palm-full-flow. Worktree: /Users/Thsonjpg/.codex/worktrees/palm-full-flow/astrox.
Người dùng đã duyệt đề xuất toàn luồng bằng “chọn hướng toàn luồng”. Đây là bản ghi phạm vi đã duyệt.

## Trải nghiệm đã duyệt
1. Camera lớn trên mobile, hướng dẫn lỗi cụ thể, tự chụp khi tay ổn định; luôn có đường chuyển camera điện thoại/tải ảnh khi detector lỗi.
2. Kiểm tra độ nét, tối/chói, kích thước và bàn tay ra ngoài khung ngay trên thiết bị. Camera và upload dùng cùng bộ đánh giá. Có bước xem lại ảnh, sửa tay trái/phải/tay thuận trước khi gửi.
3. Luận giải gắn với các quan sát thấy trên ảnh, ghi rõ điều chưa chắc, trả hướng dẫn chụp lại cụ thể khi ảnh không đủ rõ. Không vẽ nếp tay chưa xác minh và không giả tạo phần trăm tin cậy.
4. Kết quả gồm tổng quan, ảnh phóng to, thẻ từng đường với quan sát và diễn giải cùng hiển thị. Các trạng thái chuẩn bị ảnh/phân tích/hủy/thử lại có hành động rõ ràng.
5. Hỏi tiếp dựa trên bài đọc đã có, không gửi lại ảnh. Lưu bài đọc trên thiết bị do người dùng chủ động bấm; mở lại/xóa; không lưu ảnh. Thêm ảnh tay còn lại để so sánh hai bài đã đọc, không tự gọi thêm AI.

## Kiến trúc và dữ liệu
- palm-quality: thuật toán pixel thuần để đánh giá độ sáng/chói/độ nét, kết hợp metadata nhận diện tay; camera dùng snapshot nhỏ định kỳ, upload dùng cùng thuật toán sau decode.
- hand-tracker/PalmCamera: giữ GPU/CPU fallback, tuổi frame, hủy tải/đổi camera/unmount; thêm kiểm tra mép khung và không dùng landmark làm nếp chỉ tay. Chuyển camera native có kiểm tra ảnh sau chụp.
- PalmReader điều phối các bước; tách màn kết quả/hỏi tiếp/lịch sử thành component riêng nếu cần để tránh tăng trách nhiệm.
- palm.ts xác thực kết quả JSON, tương thích bài cũ. Bổ sung trường uncertainty/visibility; có giá trị mặc định cho bài v1 thiếu các trường này; từ chối empty reading, payload quá lớn, bản retake có luận giải.
- prompt engine append hướng dẫn Chỉ tay theo locale để published Admin prompt cũ cũng giữ yêu cầu quan sát/định dạng. Giữ nguyên lịch sử/published revision trong DB. Prompt hỏi tiếp được đăng ký cho đúng module palm, EN và VI, sử dụng cùng gateway/authorization/giá được server quyết định.
- palm-history dùng khóa theo tài khoản và locale, giới hạn 20 bài; sanitize dữ liệu whitelist, không có image/base64/points. Dữ liệu không đồng bộ cloud; storage lỗi phải báo rõ, không tuyên bố đã lưu.
- So sánh lấy hai bài từ tay trái/phải của cùng phiên hoặc lịch sử; mỗi quan sát/diễn giải vẫn thuộc tay tương ứng; không suy luận sinh học/vận mệnh từ sự khác biệt.

## Lỗi và riêng tư
Ảnh chỉ được gửi AI sau consent. Hỏi tiếp cần tác vụ rõ ràng, badge giá và confirmation hiện có. Hủy/đổi ảnh/đổi locale/tài khoản không được nhận kết quả cũ hay lưu bài cho tài khoản khác. Model không chạy được có fallback native/upload, không báo đã nhận diện. Không ghi ảnh vào log, history hay hồ sơ. File HEIC: thử decode native trước, báo đường dùng camera/chuyển định dạng nếu trình duyệt không decode được; không thêm backend chuyển ảnh.

## Touched paths dự kiến
web/src/components/discovery/PalmReader.tsx, PalmCamera.tsx, Palm.module.css, các Palm component mới; web/src/lib/{palm,hand-tracker,palm-photo,palm-quality,palm-history,palm-prompts}.ts; web/tests/palm*.test.mjs; services/admin/{prompt-engine,prompt-templates,english-prompts,palm-guidance}.ts và tests liên quan; docs/specs/plans/qa-report. Shared prompt engine do root integration owner trực tiếp tích hợp; không thay giá/navigation/schema DB.

## Acceptance và phát hành
TDD cho pixel/khung tay/schema/history/locale/prompt; component test cho consent, hủy/ảnh thay thế, retake, hỏi tiếp, lưu/mở/xóa và so sánh. Typecheck, npm test, format/lint/knip, production build; browser desktop/mobile VI/EN, reduced motion và camera-denied fallback. Test provider thực chỉ dùng ảnh tổng hợp/fixture không riêng tư hoặc ảnh đã được người dùng đồng ý; phân biệt fixture với thiết bị vật lý. Giữ việc chứng nhận camera iPhone/Android/OPPO và ảnh tay thật là điều kiện cần chứng cứ trực tiếp, không gọi headless test là chứng nhận vật lý.
Release từ clean SHA, cả hai remote, Worker rồi Pages, custom domain và API/asset/resource checks. Ghi deployment IDs, CI và SHA rollback (base commit ở trên). Không migrations.
