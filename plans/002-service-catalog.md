# Danh mục dịch vụ AstroX trên web

Đối chiếu mã nguồn ngày 22/09/2026. Có **70 dịch vụ luận giải AI**, bên cạnh 7 cấu hình cấp bộ môn cũ được giữ nguyên để tương thích. Các dịch vụ chi tiết mới chỉ được lập trong bản nháp; chưa kích hoạt, chưa đặt giá và chưa đổi service ID trong các consumer đang chạy. Gắn mã chi tiết vào từng luồng AI là bước tích hợp runtime tiếp theo, không được coi danh mục này là đã thu phí riêng từng mục.

## Các tính năng nền không tính thành lượt AI riêng

- Tử Vi: nhập hồ sơ, lập/hiển thị lá số, cung/sao và dữ liệu lưu vận.
- Cung Hoàng Đạo: tra 12 cung, bản đồ sao, hành tinh/nhà, góc chiếu.
- Bát Tự: tứ trụ, ngũ hành, thập thần và đại vận.
- Thần Số Học: tính bộ chỉ số, biểu đồ ngày sinh, chu kỳ và số cá nhân.
- Tarot: chọn bộ bài, chọn trải bài, rút/lật lá; 2 bộ bài không tạo dịch vụ AI trùng nhau.
- Kinh Dịch: gieo quẻ và hiển thị quẻ/hào; câu hỏi là đầu vào của một dịch vụ luận giải.
- Tương Hợp: chọn hai hồ sơ và tính các chỉ số đối chiếu.
- Hồ sơ, lịch sử đọc, đăng nhập, nạp ví và thưởng là tính năng tài khoản/vận hành, không đưa vào danh mục luận giải để tránh thu phí nhầm.

## Dịch vụ luận giải

| Bộ môn | Nhóm | Dịch vụ | Mã | Chính sách |
|---|---|---|---|---|
| tuvi | Tìm hiểu bản thân | Tính cách & khuynh hướng | `tuvi--tim-hieu-ban-than--tinh-cach` | profile |
| tuvi | Tìm hiểu bản thân | Thử thách cá tính, hành trình | `tuvi--tim-hieu-ban-than--thu-thach` | profile |
| tuvi | Tìm hiểu bản thân | Yếu tố tác động cuộc đời | `tuvi--tim-hieu-ban-than--yeu-to-tac-dong` | profile |
| tuvi | Tìm hiểu bản thân | Nợ nghiệp | `tuvi--tim-hieu-ban-than--no-nghiep` | profile |
| tuvi | Sự nghiệp & tiền tài | Tổng quan tài phú, sự nghiệp | `tuvi--su-nghiep-tai-loc--tong-quan` | profile |
| tuvi | Sự nghiệp & tiền tài | Con người trong công việc | `tuvi--su-nghiep-tai-loc--con-nguoi-cong-viec` | profile |
| tuvi | Sự nghiệp & tiền tài | Ngành nghề phù hợp | `tuvi--su-nghiep-tai-loc--nganh-nghe` | profile |
| tuvi | Sự nghiệp & tiền tài | Lời khuyên tài chính & sự nghiệp | `tuvi--su-nghiep-tai-loc--loi-khuyen-tc` | profile |
| tuvi | Vận trình sự nghiệp | Vận trình công danh | `tuvi--van-trinh-su-nghiep--van-trinh-cong-danh` | profile |
| tuvi | Hiểu bạn đời, mối quan hệ | Hiểu bạn đời | `tuvi--hieu-ban-doi--hieu-ban-doi-sub` | profile |
| tuvi | Hiểu bạn đời, mối quan hệ | Tác động người ngoài | `tuvi--hieu-ban-doi--tac-dong-nguoi-ngoai` | profile |
| tuvi | Hiểu bạn đời, mối quan hệ | Hai người — động lực mối quan hệ | `tuvi--hieu-ban-doi--hai-nguoi` | profile |
| tuvi | Tình duyên & hôn nhân | Bạn trong tình yêu | `tuvi--tinh-duyen-hon-nhan--ban-trong-tinh-yeu` | profile |
| tuvi | Tình duyên & hôn nhân | Ai bị thu hút bởi bạn? | `tuvi--tinh-duyen-hon-nhan--ai-thu-hut` | profile |
| tuvi | Tình duyên & hôn nhân | Những kiểu người thường gặp trong tình yêu | `tuvi--tinh-duyen-hon-nhan--kieu-nguoi-gap` | profile |
| tuvi | Tình duyên & hôn nhân | Cá tính, chính tinh phù hợp | `tuvi--tinh-duyen-hon-nhan--ca-tinh-phu-hop` | profile |
| tuvi | Tình duyên & hôn nhân | Tổng quan bạn đời | `tuvi--tinh-duyen-hon-nhan--tong-quan-ban-doi` | profile |
| tuvi | Tình duyên & hôn nhân | Nhận định hôn nhân | `tuvi--tinh-duyen-hon-nhan--nhan-dinh-hon-nhan` | profile |
| tuvi | Tình duyên & hôn nhân | Tính cách con cái | `tuvi--tinh-duyen-hon-nhan--tinh-cach-con-cai` | profile |
| tuvi | Vì sao tôi lại là tôi | Vì sao tôi lại là tôi | `tuvi--vi-sao-toi-la-toi--su-menh` | profile |
| tuvi | Học hành, thi cử 2026 | Học hành, thi cử 2026 | `tuvi--hoc-hanh-thi-cu--hoc-hanh-2026` | profile |
| tuvi | Có nên thay đổi công việc năm 2026? | Có nên thay đổi công việc năm 2026? | `tuvi--doi-cong-viec-2026--doi-viec-2026` | profile |
| tuvi | Tiểu vận 2026 | Tổng quan 2026 | `tuvi--tieu-van-2026--tong-quan-2026` | profile |
| tuvi | Tiểu vận 2026 | Sự nghiệp 2026 | `tuvi--tieu-van-2026--sunghiep-2026` | profile |
| tuvi | Tiểu vận 2026 | Tiền bạc 2026 | `tuvi--tieu-van-2026--tienbac-2026` | profile |
| tuvi | Tiểu vận 2026 | Tình cảm 2026 | `tuvi--tieu-van-2026--tinhcam-2026` | profile |
| tuvi | Tiểu vận 2026 | Vận hạn 2026 | `tuvi--tieu-van-2026--vanhan-2026` | profile |
| tuvi | Câu hỏi xuất ngoại | Đánh giá cơ hội xa xứ | `tuvi--cau-hoi-xuat-ngoai--danh-gia-co-hoi` | profile |
| tuvi | Câu hỏi xuất ngoại | Bạn có nên đi xa phát triển | `tuvi--cau-hoi-xuat-ngoai--co-nen-di-xa` | profile |
| tuvi | Câu hỏi xuất ngoại | Năm có lợi cho di chuyển | `tuvi--cau-hoi-xuat-ngoai--nam-co-loi` | profile |
| tuvi | Câu hỏi tiền tài | Tiềm năng giàu có | `tuvi--cau-hoi-tien-tai--tiem-nang-giau` | profile |
| tuvi | Câu hỏi tiền tài | Bạn có hợp làm chủ? | `tuvi--cau-hoi-tien-tai--hop-lam-chu` | profile |
| tuvi | Câu hỏi tiền tài | Bạn có được thừa hưởng | `tuvi--cau-hoi-tien-tai--co-thua-huong` | profile |
| tuvi | Câu hỏi tiền tài | Bạn có hợp làm về bất động sản? | `tuvi--cau-hoi-tien-tai--hop-bds` | profile |
| tuvi | Câu hỏi tiền tài | Xu hướng nhà cửa | `tuvi--cau-hoi-tien-tai--xu-huong-nha` | profile |
| tuvi | Câu hỏi sự nghiệp | Môi trường phù hợp | `tuvi--cau-hoi-su-nghiep--moi-truong-phu-hop` | profile |
| tuvi | Câu hỏi sự nghiệp | Bạn có hợp tổ chức truyền thống | `tuvi--cau-hoi-su-nghiep--hop-to-chuc` | profile |
| tuvi | Câu hỏi sự nghiệp | Yếu tố đòn bẩy sự nghiệp | `tuvi--cau-hoi-su-nghiep--don-bay` | profile |
| tuvi | Câu hỏi sự nghiệp | Bạn có nên học cao | `tuvi--cau-hoi-su-nghiep--nen-hoc-cao` | profile |
| tuvi | Xu hướng đại vận | Diễn biến 40 năm | `tuvi--xu-huong-dai-van--dien-bien-40nam` | profile |
| tuvi | Xu hướng đại vận | Thiên thời địa lợi | `tuvi--xu-huong-dai-van--thien-thoi-dia-loi` | profile |
| tuvi | Xu hướng đại vận | Biểu đồ 10 năm tới | `tuvi--xu-huong-dai-van--bieu-do-10nam` | profile |
| tuvi | Vận trình | Vận trình · Hôm nay | `tuvi--period--today` | period |
| zodiac | Dự báo | Dự báo · Hôm nay | `zodiac--period--today` | period |
| tuvi | Vận trình | Vận trình · Tuần này | `tuvi--period--week` | period |
| zodiac | Dự báo | Dự báo · Tuần này | `zodiac--period--week` | period |
| tuvi | Vận trình | Vận trình · Tháng này | `tuvi--period--month` | period |
| zodiac | Dự báo | Dự báo · Tháng này | `zodiac--period--month` | period |
| zodiac | Luận giải bản đồ sao | Bộ ba cốt lõi | `zodiac--tong-quan-la-so--bo-ba-loi` | profile |
| zodiac | Luận giải bản đồ sao | Tình yêu & quan hệ | `zodiac--tinh-yeu-cung--phong-cach-yeu` | profile |
| zodiac | Luận giải bản đồ sao | Sự nghiệp & tài chính | `zodiac--su-nghiep-cung--huong-su-nghiep` | profile |
| batu | Luận giải | Tính cách | `batu--tinh-cach` | profile |
| batu | Luận giải | Sự nghiệp & tiền tài | `batu--su-nghiep-tien-tai` | profile |
| batu | Luận giải | Tình duyên | `batu--tinh-duyen` | profile |
| batu | Luận giải | Sức khoẻ | `batu--suc-khoe` | profile |
| numerology | Luận giải | Số Chủ Đạo | `numerology--life-path` | profile |
| numerology | Luận giải | Sứ Mệnh | `numerology--destiny` | profile |
| numerology | Luận giải | Nội tâm | `numerology--inner-self` | profile |
| numerology | Luận giải | Biểu đồ ngày sinh | `numerology--birth-grid` | profile |
| numerology | Luận giải | Chu kỳ | `numerology--cycles` | profile |
| numerology | Luận giải | Năm cá nhân | `numerology--personal-year` | period |
| tarot | Trải bài | Rút 1 lá | `tarot--one` | session |
| tarot | Trải bài | Trải 3 lá · Quá khứ – Hiện tại – Tương lai | `tarot--three--ppf` | session |
| tarot | Trải bài | Trải 3 lá · Tình huống – Hành động – Kết quả | `tarot--three--sao` | session |
| tarot | Trải bài | Trải 3 lá · Bản thân – Trở ngại – Lời khuyên | `tarot--three--soa` | session |
| tarot | Trải bài | Thánh Giá Đơn Giản | `tarot--cross5` | session |
| tarot | Trải bài | Tình Yêu & Mối Quan Hệ | `tarot--relationship5` | session |
| tarot | Trải bài | Celtic Cross | `tarot--celtic10` | session |
| kinhdich | Gieo quẻ | Luận giải quẻ | `kinhdich--interpretation` | session |
| compat | Tương hợp | Luận giải tương hợp đôi | `compat--pair` | profile |

Nguồn: `TUVI_TOPICS` và `PeriodPanel`, `ZODIAC_DEEP_TOPICS` và `Horoscope`, `BATU_TOPICS`, `NUMEROLOGY_TOPICS`, `TAROT_SPREADS`, `KdAiPanel`, `CompatClient`. Tử Vi gồm 42 góc nhìn + 3 kỳ; Tarot gồm 4 trải bài độc lập + 3 khung của trải 3 lá.
