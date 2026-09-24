# Nghiên cứu nâng cấp luận giải, Kinh Dịch và cặp đôi

Ngày: 24/09/2026. Mốc HEAD: `568b0e2`, khảo sát cả working tree đang có thay đổi chưa commit. Trạng thái: đề xuất, chưa triển khai; đây không phải chứng nhận production hay kế hoạch thực thi đã duyệt.

## Phạm vi và yêu cầu đã xác nhận

- Xử lý chữ Trung lọt vào kết quả luận giải trên toàn bộ dịch vụ dùng pipeline AI chung.
- Kinh Dịch có cả gieo ba đồng xu sáu lần, Mai Hoa, sê-ri tiền, số điện thoại và khả năng mở rộng cách nhập số.
- Thêm trải nghiệm cặp đôi có dữ liệu tính toán thực cho cả Tử Vi và Bát Tự.
- Bảo toàn corpus prompt gốc và khả năng khôi phục trong Admin; thay đổi nằm trong phiên bản mới. Hỗ trợ cặp cùng giới và khác giới bình đẳng.

## Phát hiện đã đối chiếu mã nguồn

S = vài giờ; M = khoảng một ngày; L = nhiều ngày, chỉ là mức độ công việc sơ bộ gồm kiểm thử.

| Ưu tiên | Phát hiện và tác động | Bằng chứng | Tin cậy | Công sức / rủi ro |
|---|---|---|---|---|
| P0 | Chưa có kiểm tra ngôn ngữ trước khi kết quả AI được ghi nhận thành công. Chỉ sửa lời nhắc không bảo đảm hết chữ Hán. | `services/admin/runtime.mjs:39`, `services/admin/integration-api.mjs:85`, `web/src/lib/api.ts:125`; nhánh proxy cũ `functions/api/ai.js:127` | Cao về thiếu kiểm tra; chưa đo tỷ lệ lỗi production | M / trung bình: phải giữ JSON, giao dịch Point, retry |
| P0 | Bát Tự đưa cả trường chữ Hán gốc vào prompt; các bản dịch thiếu còn rơi về nguyên văn. Đây là đường có thể làm AI lặp chữ Trung. | `web/src/lib/batu.ts:268`, `web/src/lib/batu.ts:279`, `web/src/lib/batu.ts:318`, `web/src/lib/batu.ts:337` | Cao về đầu vào; không khẳng định đây là nguyên nhân duy nhất của các kết quả người dùng đã thấy | M / thấp nếu chỉ chuẩn hóa bản dữ liệu cho AI |
| P0 | Mai Hoa gán quái có hào động là Thể. Khác quy ước thể hiện trong ví dụ Quan Mai của bản cổ; đảo vai này có thể đổi kết luận sinh/khắc. | `web/src/lib/kinhdich.ts:136` và nguồn [1] | Cao về mã và mâu thuẫn với nguồn đối chiếu | M / cao: đổi diễn giải và ảnh hưởng lịch sử |
| P1 | Tương Hợp Tử Vi chưa lập hai lá số; người thứ hai không có giờ sinh nhưng prompt yêu cầu so sánh theo Tử Vi Đẩu Số. | `web/src/components/compat/CompatClient.tsx:98`, `services/admin/prompt-templates.ts:377` | Cao | L / trung bình |
| P1 | Kinh Dịch chỉ có ba số 1–999, một hào động; chưa biểu diễn được gieo xu có 0–6 hào động. | `web/src/lib/kinhdich.ts:105`, `web/src/lib/kinhdich.ts:124`, `web/src/components/kinhdich/KinhDichClient.tsx:122` | Cao | L / trung bình |
| P1 | Tên quẻ đang ghép tượng như Trời/Nước; chưa có danh mục 64 quẻ chuẩn trong bộ tính. | `web/src/lib/kinhdich.ts:159` | Cao | M / trung bình: cần kiểm tra ánh xạ thứ tự hào |
| P1 | Lịch sử Kinh Dịch chỉ lưu ba số, không phiên bản thuật toán; mở lại tính lại theo code hiện tại. Sửa công thức có thể làm lịch sử đổi ý nghĩa. | `web/src/lib/kinhdich.ts:200`, `web/src/components/kinhdich/KinhDichClient.tsx:136` | Cao | M / trung bình |
| P1 | Hai câu hỏi dùng cùng ba số bị gộp lịch sử, dù là hai lần xem khác nhau. | `web/src/lib/kinhdich.ts:227` | Cao | S / thấp |
| P1 | Giờ Tử Vi không nhận diện tự về Tý; giới tính lạ được hai bộ tính mặc định khác nhau. | `web/src/lib/tuvi.ts:85`, `web/src/lib/tuvi.ts:130`, `web/src/lib/batu.ts:233` | Cao về hành vi; mức tiếp cận từ UI hiện tại chưa đo | M / trung bình |

Bổ sung cần lưu ý: Bát Tự lấy điểm giữa khung giờ, cố định UTC+7, dùng Hà Nội cho nơi sinh ngoài bảng năm thành phố (`web/src/lib/batu.ts:197–258`). Cần ghi đúng độ chính xác dữ liệu trước khi mở rộng cặp đôi; thay đổi lịch pháp là hạng mục riêng có bộ mẫu chuyên môn, không sửa tiện tay.

## Kiểm chứng đã thực hiện

Chạy trực tiếp các hàm TypeScript qua TypeScript transpile trong bộ nhớ bằng Node, không gọi AI hay API trả phí, không sửa source:

- Hồ sơ giả lập 15/01/2000, Nam, giờ Tý, Hà Nội: Bát Tự có 16 trường chuỗi chứa chữ Hán, nằm ở can/chi gốc và đại vận; toàn bộ chart hiện được JSON.stringify vào prompt.
- Cùng hồ sơ: chart Tử Vi dùng `vi-VN` không có chữ Hán trong mẫu đó. Không suy rộng thành mọi lá số hoặc mọi phản hồi AI đều sạch.
- `castHexagram(1,6,6)` trả thượng Càn, hạ Khảm, hào 1 động, Thể Khảm, Dụng Càn, “Dụng sinh Thể”. Theo quy ước lấy quái tĩnh làm Thể thì cần Thể Càn, Dụng Khảm và quan hệ sinh đổi chiều.
- Đã đọc đường nhận phản hồi ở provider, API, lớp client; chưa thử trên production và chưa tái hiện chính kết quả chữ Trung mà người dùng gặp.

## Hướng nâng cấp khuyến nghị

### 1. Chất lượng tiếng Việt dùng chung

1. Tạo bản dữ liệu Việt hóa dành riêng cho AI từ bộ tính, vẫn giữ dữ liệu gốc cho tính toán. Các ký tự Hán cố ý dùng làm dấu trang trí trên mệnh bàn không đồng nghĩa lỗi luận giải; đề xuất phần luận giải không có chữ Hán, mệnh bàn có tùy chọn Việt hóa.
2. Thêm quy tắc đầu ra tiếng Việt ở cấu hình server đang published. Client system prompt bị loại tại `integration-api.mjs:18`, vì vậy sửa riêng `SYSTEM_PROMPT_BASE` phía client sẽ không đủ. Giữ tên Tarot tiếng Anh theo quy tắc hiện hành.
3. Kiểm tra Unicode Han ở nội dung người dùng đọc trước khi complete/lưu/cache. Với JSON, kiểm tra giá trị chuỗi và schema, không phá cấu trúc hoặc dịch key. Xử lý cả nhánh cấu hình Admin lẫn proxy cũ nếu vẫn còn phục vụ.
4. Khi phát hiện lỗi, sửa ngôn ngữ tối đa một lượt trong cùng operation, không trừ Point lần hai. Kiểm lại dữ kiện cung/sao/quẻ/lá bài, schema và Han sau sửa; nếu vẫn lỗi thì trả lỗi có thể thử lại và đi theo cơ chế hoàn Point/đối soát hiện có. Không dùng regex xóa trắng chữ Hán vì làm mất nội dung.
5. Cache gắn phiên bản prompt và chính sách ngôn ngữ. Với bài đã lưu, giữ bản gốc, ghi bản hiệu chỉnh riêng; không xóa hàng loạt hoặc ngầm coi bài cũ là đã đạt chuẩn mới.
6. Admin xem tỷ lệ kết quả phát hiện chữ Hán, sửa thành công, bị chặn, chi phí và thời gian của lượt sửa. Đây là số liệu cần bổ sung, chưa có kết quả đo trong khảo sát.

### 2. Kinh Dịch nhiều cách lập quẻ

Luồng chung: chọn cách → nhập câu hỏi và dữ liệu → xem quá trình lập quẻ phù hợp → kết quả → luận giải → lưu. Không bắt cách nhập số chạy nghi thức gieo xu.

| Cách xem | Trải nghiệm và nguyên tắc |
|---|---|
| Ba đồng xu | Gieo từng lần, đủ sáu lần từ hào dưới lên; lưu ba mặt xu và tổng 6/7/8/9 mỗi lần; 6 và 9 là hào động. Có nhập kết quả gieo xu thật. Không sinh lại kết quả khi animation bị bỏ qua. |
| Mai Hoa theo thời gian | Cố định thời điểm và múi giờ khi lập quẻ, hiện dữ liệu âm lịch/chi giờ đã dùng; công thức có phiên bản và bộ ví dụ tham chiếu. Chốt quy ước tháng nhuận và biên ngày trước khi triển khai. |
| Mai Hoa báo số | Nhập số chủ động, công bố cách lấy thượng/hạ/hào động. Giữ phương pháp ba số cũ dưới nhãn và phiên bản riêng. |
| Sê-ri tiền | Nhập sê-ri dạng chuỗi, giữ số 0 đầu; bản đầu dùng phần chữ số, báo rõ cách xử lý tiền tố chữ. Xem trước chuỗi chuẩn hóa trước khi xác nhận. |
| Số điện thoại | Nhập chuỗi, quy định rõ chuẩn hóa mã quốc gia/đầu 0. Che số trong lịch sử; chỉ đưa dữ kiện quẻ cần thiết sang AI. Không tự biến phần này thành chấm điểm SIM. |
| Dãy số tùy chọn | Nền tảng mở rộng sang biển số, số nhà; mọi quy tắc tách nhóm, xử lý chữ, lấy dư phải được công bố và kiểm thử. |

Các cách sê-ri/điện thoại được ghi là biến thể quy đổi số của sản phẩm; nguồn [1] không chứng minh một công thức chuẩn duy nhất dành cho các loại số hiện đại. Chưa chốt công thức số cụ thể trong tài liệu nghiên cứu này, không giao executor tự đoán.

Bộ tính xuất quẻ chủ, danh sách hào động, quẻ biến, tên/số 64 quẻ từ bảng cố định. Thể/Dụng áp dụng theo phương pháp đã chọn, không ép sáu hào đồng xu vào mô hình Mai Hoa một hào. Quẻ hỗ và trường phụ chỉ hiện khi thuộc phương pháp đó. AI giải thích từ dữ kiện đã tính, không tự đặt tên quẻ hoặc thay hào.

Lịch sử mới lưu method, algorithmVersion, dữ liệu đã chuẩn hóa, thời điểm/múi giờ nếu tham gia tính, sáu hào và kết quả chụp tại thời điểm lập. Bản cũ được đánh dấu legacy, giữ cách diễn giải cũ; không tự tái tính bằng công thức mới. Cache bao gồm phương pháp, phiên bản, câu hỏi và dấu vân tay dữ liệu, tránh trùng giữa các cách xem.

### 3. Cặp đôi Tử Vi và Bát Tự

- Dùng một bộ nhập Người A / Người B chung trong Tương Hợp. Có đường vào “Xem cặp đôi” từ Tử Vi và Bát Tự; chuyển phương pháp vẫn giữ dữ liệu đã nhập.
- Thông tin hai người độc lập: ngày sinh, loại lịch, giờ sinh/độ chính xác, nơi sinh khi phương pháp cần. Không biết giờ thì nêu rõ giới hạn và không tự gán giờ Tý.
- Tử Vi: lập hai lá số qua `buildZiweiChart`, đối chiếu các cung/sao đã có dữ liệu; chọn phạm vi như Mệnh–Thân, Phu Thê, Phúc Đức và các tương tác theo bộ quy tắc được thẩm định. AI phải chỉ rõ căn cứ của từng nhận định.
- Bát Tự: lập hai tứ trụ qua `buildBatuChart`, so sánh Nhật Chủ, can chi, quan hệ hợp/xung/hình/hại và phân bố ngũ hành. Không trộn tám trụ vào detector một người: quan hệ phải ghi chủ thể A/B và trụ liên quan, tách quan hệ nội bộ khỏi quan hệ giữa hai người.
- Kết quả: điểm đồng điệu, điều cần dung hòa, giao tiếp, gợi ý cụ thể và cơ sở luận. Không yêu cầu AI tự sinh phần trăm hợp nhau. Prompt cũ hiện có percent nhưng renderer Tử Vi không dùng; lưu bản gốc và tạo schema mới.
- Cùng giới và khác giới dùng cùng quy trình; không tự gán vai vợ/chồng. Phân biệt danh xưng với tham số mà bộ tính truyền thống cần; không âm thầm ánh xạ giá trị giới tính chưa hỗ trợ.
- Tạo service/prompt riêng cho hai phương pháp trong Admin, tích hợp giá/quyền truy cập/cache/telemetry. Không dùng một service mơ hồ cho tất cả kết quả khác nhau.

## Ba phương án và thứ tự đề xuất

1. **Nâng cấp theo đợt — khuyến nghị:** sửa kiểm soát tiếng Việt và tính toán nền; sau đó mở cách lập quẻ; cuối cùng hoàn thiện cặp đôi và lịch sử. Dễ kiểm chứng từng phần, tổng thời gian vẫn gồm đủ ba phạm vi.
2. **Chỉ vá nhanh:** thêm nhắc tiếng Việt và một số ô nhập mới. Ít công hơn nhưng không xử lý mô hình nhiều hào, thiếu hai lá số hay lịch sử đổi công thức; không đủ cho yêu cầu này.
3. **Viết lại toàn bộ các module:** phạm vi/rủi ro lớn, dễ mất prompt và hành vi đã dùng; khảo sát hiện tại chưa có bằng chứng cần làm vậy.

Tiêu chí nghiệm thu cho đợt triển khai sau:

- Mọi dịch vụ luận giải được lập danh mục và kiểm qua validator chung; kiểm cả bài văn và JSON, lỗi dịch thuật, sai dữ kiện sau sửa, retry và hoàn Point. Test giả lập chỉ chứng minh cơ chế; cần tập đầu ra AI thật để đánh giá chất lượng tiếng Việt.
- Bộ đồng xu kiểm toàn bộ 4^6 = 4096 tổ hợp giá trị hào, gồm không hào động và cả sáu hào động; kiểm 64 quẻ và quẻ biến theo bảng độc lập. Kiểm tám tổ hợp mặt của ba xu cho phân bố 1:3:3:1 bằng test xác định.
- Mai Hoa đối chiếu ví dụ nguồn [1], số dư 0, biên ngày/giờ/tháng nhuận theo quy ước đã chọn. Sê-ri/điện thoại kiểm số 0 đầu, chữ, độ dài, mã quốc gia, dữ liệu sai và tính lặp lại.
- Cặp đôi kiểm đủ/thiếu giờ sinh, đổi A/B, sửa người B làm vô hiệu cache, cùng giới/khác giới, không lẫn kết quả giữa người dùng. Kiểm AI thật có bám vào hai lá số, không tự sinh cung/sao.
- Chạy hồi quy prompt/Admin và typecheck/lint/build theo dự án; kiểm browser mobile/desktop cho gieo sáu lần, hủy, tiếp tục, xem lại lịch sử và giảm chuyển động. Chưa chạy các gate này vì chưa có triển khai.
- Điểm bắt đầu lệnh kiểm tra: `cd web && npm run test:admin`, `cd web && npx tsc --noEmit`, `cd web && npm run lint`, `node scripts/prompt-runtime-qa.cjs`; build sau triển khai: `cd web && npm run build`. Các lệnh hiện có không thay thế test mới cho thuật toán.

## Nguồn đối chiếu và giới hạn

[1] [Bản chép Mai Hoa Dịch Số, quyển một](https://book.taiyi.me/卜/梅花易数/梅花易数(卷一)): mục lấy dư tám/sáu, lập quẻ năm-tháng-ngày-giờ, ví dụ Quan Mai: thượng Đoài, hạ Ly, hào một động, Đoài làm Thể. Dùng đối chiếu quy tắc truyền thống, không phải bằng chứng khả năng dự đoán thực nghiệm.

[2] [Tài liệu gieo ba đồng xu, Willamette University](https://people.willamette.edu/~rloftus/Asia%20201/AS%20201%203CoinCasting.pdf): sáu lần gieo, giá trị 6/7/8/9 và hào động. Khi triển khai chọn và hiển thị một quy ước mặt xu cố định.

Không coi chữ Hán trong dữ liệu gốc/mệnh bàn là bằng chứng AI đã xuất lỗi. Không kết luận Tử Vi mọi đầu vào đã Việt hóa chỉ từ một mẫu. Chưa audit toàn bộ bảo mật, hiệu năng, thanh toán, responsive của website, chưa đo chất lượng mọi module, chưa thay đổi production. Nghiên cứu tập trung ba yêu cầu và các hạ tầng dùng chung trực tiếp liên quan.
