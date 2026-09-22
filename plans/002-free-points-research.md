# AstroX — nghiên cứu Point miễn phí và quản trị

Ngày 2026-09-22. Chỉ nghiên cứu/đề xuất; chưa sửa source, chưa bật quảng cáo, chưa đổi ví production. Các con số referral bên dưới là đề xuất thử nghiệm, không phải mức thưởng đã được duyệt.

## Cập nhật đã được người dùng duyệt

Phần referral thử nghiệm bên dưới đã được thay thế: đăng ký hợp lệ +5 mỗi bên; nạp đầu thành công +10 cho người mời; điểm danh +2/ngày, mốc 3/7/10 cộng thêm +3/+5/+10 cho người dùng và +2/+3/+5 cho người mời. Mỗi mốc chỉ một lần mỗi tài khoản. Không giới hạn số bạn được mời và không áp hạn mức thử nghiệm 10 bạn/tháng. Xem docs/plans/2026-09-22-free-points-implementation.md.

## 1. Kết luận và hiện trạng

Giữ Ads 5 Point/lượt, tối đa 5 lượt/ngày theo yêu cầu. Đề xuất cooldown 90 giây tính từ lần cấp thưởng gần nhất; ngày tính theo Asia/Ho_Chi_Minh. Referral nên thưởng hai phía sau kích hoạt, không thưởng chỉ vì click/link/đăng ký.

Frontend ví hiện ở web/src/components/topup/TopupPanel.tsx, lấy số dư/gói/đơn từ backend riêng qua web/src/lib/api.ts. Luồng ví đang dùng tài khoản AstroX/Zalo; Supabase-only không được tự tạo một ví song song. schema.sql trong repo chỉ có users, user_data, user_module_access, chưa chứa ledger. Cần source backend ví thật để thiết kế transaction cụ thể. Tham chiếu kế hoạch admin tại plans/001-admin-dashboard-proposal.md và quy tắc mở khóa tại docs/plans/2026-09-21-point-unlocks.md.

Mức 30 Point/quẻ trong brief này dùng làm ví dụ kinh tế; không tự áp giá cho mọi dịch vụ vì catalog trước đó chưa chốt.

## 2. Đối chiếu Google Rewarded

Nguồn chính thức:
- https://support.google.com/admanager/answer/9116812?hl=en
- https://developers.google.com/publisher-tag/samples/display-rewarded-ad
- https://support.google.com/admanager/answer/7496282?hl=en

Google xác nhận Rewarded web không hỗ trợ server-side verification. Rate limit, token một lần và cooldown giảm thiệt hại nhưng không chứng minh xem thật: người dùng vẫn có thể mô phỏng request client trong giới hạn. Không cam kết chống hack tuyệt đối.

Dùng rewardedSlotGranted để xác định quyền nhận thưởng, không chỉ video ended hoặc đóng slot. Inventory có thể gồm video và display; một số demand cấp thưởng trước video kết thúc. Không mặc định mọi lượt đều cần xem hết video. Dùng copy “Hoàn thành quảng cáo để nhận 5 Point”. Nếu chỉ muốn video phải xác minh khả năng cấu hình inventory với Google.

Chọn tích hợp Google Ad Manager + Google Publisher Tag cho luồng custom Point. Có AdSense được duyệt chưa đủ bằng chứng tài khoản có đúng inventory/demand cần thiết. Trước triển khai cần xác minh network, site, ad unit Rewarded và khả năng fill, ads.txt theo hướng dẫn tài khoản; kiểm tra yêu cầu consent theo thị trường phục vụ. Không coi opt-in nhận thưởng là consent quảng cáo cá nhân hóa.

Point chỉ dùng nội bộ, không chuyển nhượng/đổi tiền phù hợp loại reward được cho phép, nhưng không thay thế duyệt toàn bộ site và việc tuân thủ chính sách. Không ràng buộc click quảng cáo; không dùng copy “ủng hộ AstroX”; cho từ chối/đóng bằng UI Google, không che nút đóng. Cấp thưởng đã hứa khi hoàn thành điều kiện.

## 3. Luồng Ads và giới hạn server

1. Trong Ví/thiếu Point, hiển thị phần Nhận Point miễn phí; đăng nhập trước. Hiển thị quota còn lại, cooldown và trạng thái availability riêng biệt.
2. Backend kiểm tra eligibility, tạo phiên có ID ngẫu nhiên một lần, gắn user, campaign version, 5 Point, ngày quota và hạn dùng. Chỉ một phiên hoạt động/tài khoản. Giữ chỗ quota/ngân sách trước khi quảng cáo bắt đầu.
3. Client load GPT sau mount và sau xử lý consent cần thiết. Chỉ một rewarded slot. Ready mới cho đồng ý xem; null slot/no-fill/AdBlock/timeout trả trạng thái phù hợp và giải phóng giữ chỗ. Không gọi no-fill là “hết lượt”.
4. Người dùng chủ động đồng ý; hiển thị quảng cáo bằng API Google. Callback granted gửi session ID tới server; amount/user không lấy từ client. Closed không đồng nghĩa thất bại nếu granted đã xảy ra.
5. Server xác thực, kiểm tra phiên và cấp một lần bằng transaction gồm claim + ledger + quota. Retry/two tabs/replay trả cùng kết quả, không cấp thêm. Phiên bị hủy hoặc hết hạn không được tái dùng; có grace window công khai đủ cho retry sau gián đoạn mạng và đối soát các claim treo.
6. Dọn listener/slot khi đóng hoặc đổi route. Thông báo success chỉ sau backend xác nhận, có trạng thái “đang xác nhận” và lịch sử khi mạng lỗi.

Quota đếm lượt thưởng thành công, không đếm no-fill. Phiên giữ quota theo ngày cấp phiên; đặt expiry ngắn và không cấp phiên mới khi phiên cũ còn hoạt động để xử lý giao ngày rõ ràng. Rate limit cả tạo phiên và claim; CSRF/origin nếu cookie. Dùng tín hiệu rủi ro để chặn trước khi cho xem, không tùy ý từ chối phần thưởng đã hứa sau khi xem.

IP/thiết bị là tín hiệu hỗ trợ, không khóa cứng mỗi IP một user (gia đình/mạng công ty dùng chung). Không thu thập fingerprint sâu mặc định. Tổng ngân sách chiến dịch giới hạn thiệt hại; khi hết ngân sách dừng phiên mới, vẫn hoàn tất phiên đã giữ chỗ. Kiểm soát này không thay thế SSV.

## 4. Giới thiệu bạn bè — đề xuất thử nghiệm

Tham khảo mô hình thưởng hai phía có điều kiện kích hoạt và trạng thái chờ của Dropbox: https://help.dropbox.com/storage-space/earn-space-referring-friends . Đây là nguồn tham khảo mô hình, không áp dụng nguyên điều kiện cài app cho AstroX.

So sánh: thưởng ngay đăng ký dễ hiểu nhưng dễ tạo tài khoản rác; thưởng sau lần nạp đầu dễ đối soát hơn nhưng lệch mục tiêu kiếm miễn phí; đề xuất thưởng sau kích hoạt và quay lại ngày thứ hai, không yêu cầu mua hay xem quảng cáo.

- Người mời +15 Point; người mới +10 Point, cấp đồng thời khi đạt điều kiện.
- Người mới đăng ký bằng link/mã, định danh AstroX xác thực phía server, hoàn tất hồ sơ, sử dụng một tính năng miễn phí được backend ghi nhận, quay lại và có hoạt động vào ngày lịch tiếp theo (giờ VN). Hạn hoàn thành 7 ngày từ đăng ký. Nếu chưa có event miễn phí tin cậy phía server, phải bổ sung; không tin event localStorage/pageview do client báo.
- Mỗi tài khoản chỉ được làm người nhận lời mời một lần. Không tự mời chính mình hoặc mời tài khoản tồn tại; không cho thay referrer sau khi gắn. Chỉ một tầng, không thưởng theo mạng lưới.
- Link /?ref=CODE không chứa email/điện thoại. Cửa sổ link 7 ngày; link hợp lệ đầu tiên được giữ, mã nhập chủ động ở màn đăng ký có ưu tiên trước khi gắn; hiển thị người giới thiệu ở bước xác nhận. Gắn referral một lần trên server lúc tạo tài khoản; đổi thiết bị trước đăng ký có thể nhập mã thủ công. Không cho gắn hồi tố cho tài khoản cũ.
- Giới hạn thử nghiệm: 10 lượt giới thiệu đủ điều kiện/người mời/tháng (150 Point). Người mới vẫn được quyền lợi đã hứa nếu link được chấp nhận trước khi quota thay đổi; cần giữ chỗ quota/ngân sách, hoặc báo hết suất ngay trước nhận lời mời. Không giữ referral trong trạng thái chờ vô hạn.
- Trạng thái: chờ kích hoạt → đủ điều kiện → đã thưởng; nhánh cần kiểm tra / bị từ chối / hết hạn. UI ghi rõ lý do và điều kiện còn thiếu. Rủi ro bất thường có thời hạn xử lý vận hành 48 giờ; không tiết lộ toàn bộ thuật toán chống lạm dụng.
- Ngăn trùng identity, self-referral, vòng lặp; tốc độ đăng ký và cụm tài khoản cùng thiết bị/IP dùng để đưa vào review, không tự coi là gian lận. Xóa/tạo lại tài khoản không reset tư cách nhận thưởng; lưu khóa chống lạm dụng tối thiểu theo chính sách dữ liệu.
- Người mời chỉ xem tên rút gọn, trạng thái, thưởng; không thấy ngày sinh, số dư hay nội dung luận giải bạn bè. Chia sẻ qua copy link/share sheet; không tự gửi tin hay đọc danh bạ.

Các thông số là giả thuyết cần thử nghiệm. Email/Zalo đã xác thực không chứng minh một người chỉ có một tài khoản. Referral kích hoạt miễn phí vẫn có rủi ro Sybil; quota và ngân sách hạn chế chi phí, không loại bỏ tuyệt đối.

## 5. Admin quản lý những gì

Thêm mục “Point miễn phí” với bốn tab:

| Tab | Dữ liệu và thao tác |
|---|---|
| Tổng quan | Point Ads/referral đã cấp, chi phí sử dụng thực tế, quota, referral đủ điều kiện, lỗi cấp/retry, tỷ lệ quay lại D1/D7 và tỷ lệ nạp |
| Quảng cáo | Bật/tắt, campaign draft/publish, 5 Point/5 lượt/ngày, cooldown, timezone, ad-unit path được allowlist, ngân sách, nhóm rollout, trạng thái request/ready/granted/credited/no-fill |
| Giới thiệu | Mức thưởng hai phía, điều kiện kích hoạt, thời hạn, attribution, quota, bảng referrer/referee, xem bằng chứng tối thiểu, duyệt/từ chối có lý do |
| Lịch sử thưởng | Lọc theo user/source/status/date, ledger ID, session/referral ID, lý do thất bại, retry idempotent, điều chỉnh bù có quyền và audit |

Admin AstroX không thay thế giao diện Google để tạo tài khoản hay duyệt inventory. Chỉ lưu cấu hình hỗ trợ, không cho dán JavaScript tùy ý. Doanh thu thực thu nhập từ báo cáo Google/API được tích hợp sau; không suy ra tiền thật từ callback client. Phân biệt estimated và finalized, ghi kỳ và thời điểm đồng bộ.

Owner quản lý tích hợp/ngân sách; vận hành quản lý campaign và duyệt case; support chỉ xem mặc định. Mọi mutation kiểm tra quyền server, ghi before/after/reason/actor/time; thay cấu hình có version và hiệu lực cho phiên mới. Kill switch ngừng nhận phiên mới, không xóa nghĩa vụ trả phiên đang hợp lệ. Điều chỉnh dùng bút toán bù, không sửa/xóa lịch sử hoặc sửa số dư trực tiếp; trường hợp đã tiêu thưởng chuyển review, không tự trừ vào Point đã mua.

## 6. Kiến trúc và kinh tế

Cộng thưởng vào cùng backend/ledger có thẩm quyền của ví hiện tại. Đề xuất logical entities reward_campaign_versions, ad_reward_sessions, referrals, reward_claims, wallet_ledger, admin_audit. Unique session claim; unique referee; unique referral + beneficiary + reward stage. Ledger ghi nguồn purchased/ad/referral/adjustment để báo cáo; frontend có thể hiển thị một tổng số dư. Đề xuất dùng Point miễn phí trước, không hết hạn trong pilot; thay đổi phải công bố trước và không hồi tố.

Không tạo bảng ví phụ trên D1 của frontend rồi đồng bộ tổng số dư hai chiều. Nếu dữ liệu campaign và ví nằm khác hệ thống, dùng outbox/retry + unique claim ledger, không giả định transaction xuyên hai database.

Giả sử 30 Point/lượt đọc: 6 lượt ads cấp đủ 1 lượt; 1 referral cấp tổng 25 Point hai phía, tương đương tối đa 25/30 lượt đọc theo giá đó. Đây là chi phí tối đa tính theo quyền sử dụng, không phải tiền mặt hoặc dự báo chi phí model. Ads cần so doanh thu settled với chi phí sinh luận giải thực tế + hạ tầng + gian lận; không lấy giá bán Point làm chi phí. Đo ảnh hưởng tới nạp trả tiền qua cohort, chưa thể kết luận không ảnh hưởng gói nạp.

## 7. Triển khai dự kiến và kiểm thử

1. Có source ví/backend, xác định canonical user và khả năng ledger nguyên tử; xác minh tài khoản Google đủ điều kiện. Chốt mức referral và điều kiện miễn phí đo được.
2. Hoàn thiện ledger/idempotency, eligibility và admin config/audit; mặc định tắt campaign.
3. Sandbox/test inventory, kiểm thử no-fill, closed trước/sau granted, callback trùng/giả, nhiều tab, retry mạng, giao ngày, thay config, ngân sách cạn và crash giữa ghi claim/ledger. Callback giả có phiên hợp lệ vẫn là rủi ro còn lại của GPT web, phải ghi nhận đúng trong threat model.
4. Referral test self-referral, existing user, duplicate identity, vòng lặp, hạn 7 ngày, ngày thứ hai, nhiều referrer, reset account, quota đồng thời, admin review và quyền đọc dữ liệu.
5. Pilot nhóm nhỏ với ngân sách đã duyệt, theo dõi D1/D7 và doanh thu/chi phí trước mở rộng. Không tạo traffic giả vào ads thật để kiểm thử.

Chưa có bằng chứng production về fill/eCPM, source backend ví hay hỗ trợ Google của tài khoản. Các phần này là phụ thuộc cần xác minh khi triển khai, không phải giả định đã sẵn sàng.
