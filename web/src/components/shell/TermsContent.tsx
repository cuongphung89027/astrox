/**
 * Trang "Các điều khoản & Thoả thuận" — 3 khối: Điều khoản sử dụng · Tuyên bố
 * miễn trừ trách nhiệm · Thoả thuận xử lý & bảo mật thông tin cá nhân (ND13).
 *
 * Anchor id các khối được tham chiếu từ popup đăng nhập (lib/terms.ts) — đổi id
 * phải đổi cả hai chỗ. Ngày hiệu lực & phiên bản: 23/09/2026 · 1.0.
 */
import Link from "next/link";
import { SectionTitle } from "@/components/kit/SectionTitle";
import styles from "./TermsContent.module.css";

const CONTACT_EMAIL = "hoangcuong89027@gmail.com";

export function TermsContent() {
  return (
    <div className={styles.page}>
      <SectionTitle
        as="h1"
        eyebrow="AstroX · Pháp lý"
        title="Các điều khoản & Thoả thuận"
        sub="Toàn bộ điều khoản chi phối việc bạn sử dụng AstroX: điều khoản sử dụng dịch vụ, tuyên bố miễn trừ trách nhiệm và thoả thuận xử lý, bảo mật thông tin cá nhân theo Nghị định 13/2023/NĐ-CP."
      />
      <p className={styles.meta}>Phiên bản 1.0 · Có hiệu lực từ ngày 23/09/2026</p>

      <nav className={styles.toc} aria-label="Mục lục điều khoản">
        <ol>
          <li><Link href="#dieu-khoan-su-dung"><b>01</b><span>Điều khoản sử dụng</span><small>Phạm vi dịch vụ, tài khoản, AstroX Point &amp; thanh toán</small></Link></li>
          <li><Link href="#mien-tru-trach-nhiem"><b>02</b><span>Tuyên bố miễn trừ trách nhiệm</span><small>Bản chất tham khảo của nội dung chiêm tinh</small></Link></li>
          <li><Link href="#thoa-thuan-bao-mat"><b>03</b><span>Thoả thuận xử lý và bảo mật thông tin cá nhân</span><small>Theo Nghị định 13/2023/NĐ-CP của Chính phủ</small></Link></li>
        </ol>
      </nav>

      <section id="dieu-khoan-su-dung" className={styles.section} aria-labelledby="terms-title">
        <header className={styles.sectionHead}><b aria-hidden="true">01</b><h2 id="terms-title">Điều khoản sử dụng</h2></header>
        <div className={styles.body}>
          <h3>1.1. Giới thiệu và chấp nhận điều khoản</h3>
          <p>AstroX (&quot;chúng tôi&quot;) cung cấp dịch vụ lập và luận giải lá số Tử Vi, Bát Tự, Kinh Dịch, Thần Số Học, Cung Hoàng Đạo, Tarot và các tính năng liên quan (&quot;dịch vụ&quot;) qua website theastrox.space. Khi truy cập, đăng ký tài khoản, nạp AstroX Point hay sử dụng bất kỳ tính năng nào của dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi bộ điều khoản này cùng Tuyên bố miễn trừ trách nhiệm và Thoả thuận xử lý và bảo mật thông tin cá nhân. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.</p>
          <h3>1.2. Tài khoản và đăng nhập</h3>
          <p>Tài khoản AstroX hiện được tạo và đăng nhập qua Zalo; các phương thức khác (Google…) sẽ được bổ sung khi sẵn sàng. Bạn chịu trách nhiệm bảo mật quyền truy cập Zalo/Google của mình và mọi hoạt động xảy ra qua tài khoản của bạn. Nếu phát hiện truy cập trái phép, hãy thông báo cho chúng tôi qua email nêu ở cuối trang.</p>
          <h3>1.3. AstroX Point và thanh toán</h3>
          <p>AstroX Point (&quot;Point&quot;) là đơn vị ảo dùng để mở khoá các dịch vụ luận giải trả phí, mua bằng tiền Việt Nam Đồng theo các gói công bố trong ứng dụng. Việc mua Point được xử lý qua cổng thanh toán của đối tác. Point không phải tiền gửi, không có giá trị pháp lý ngoài dịch vụ, không chuyển nhượng, không quy đổi ra tiền mặt trừ các trường hợp hoàn trả được quy định tại mục này.</p>
          <p>Point đã mua được dùng dần và không hết hạn trừ khi luật áp dụng quy định khác. Nếu một lượt luận giải bị trừ Point nhưng không nhận được kết quả do lỗi kỹ thuật của chúng tôi, Point tương ứng sẽ được hoàn lại; nếu không thể hoàn tự động, bạn liên hệ email dưới đây kèm tài khoản và thời điểm giao dịch để được xử lý. Yêu cầu hoàn tiền cho giao dịch nạp Point chỉ được xem xét trong trường hợp lỗi kỹ thuật không thể khắc phục hoặc theo quy định bắt buộc của pháp luật.</p>
          <h3>1.4. Nghĩa vụ của người sử dụng</h3>
          <p>Bạn cam kết không: (a) thu thập dữ liệu hoặc truy cập tự động vào dịch vụ ngoài giao diện được cung cấp; (b) can thiệp, đảo ngược hoặc cố gắng vượt quá cơ chế kiểm soát chi phí, giới hạn sử dụng của dịch vụ; (c) dùng dịch vụ cho mục đích trái pháp luật Việt Nam; (d) mạo danh người khác khi lập hồ sơ. Chúng tôi có quyền tạm ngừng hoặc chấm dứt tài khoản vi phạm.</p>
          <h3>1.5. Thay đổi điều khoản và dịch vụ</h3>
          <p>Chúng tôi có thể sửa đổi bộ điều khoản này và các tính năng, bảng giá của dịch vụ. Bản sửa đổi có hiệu lực kể từ khi đăng trên trang này; với thay đổi ảnh hưởng quyền lợi đã thanh toán, chúng tôi thông báo trong ứng dụng trước khi áp dụng. Phiên bản hiện hành luôn là bản công bố tại trang này.</p>
          <h3>1.6. Chấm dứt</h3>
          <p>Bạn có thể ngừng sử dụng dịch vụ bất cứ lúc nào. Chúng tôi có thể chấm dứt hoặc tạm ngừng cung cấp dịch vụ khi bạn vi phạm điều khoản, hoặc do lý do kỹ thuật, pháp lý — trong trường hợp chấm dứt do lỗi của chúng tôi, phần Point chưa sử dụng được hoàn trả theo hình thức phù hợp.</p>
          <h3>1.7. Luật áp dụng</h3>
          <p>Bộ điều khoản này chịu sự điều chỉnh của pháp luật Việt Nam. Tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng; nếu không thành, tranh chấp được đưa ra cơ quan có thẩm quyền theo quy định pháp luật Việt Nam.</p>
        </div>
      </section>

      <section id="mien-tru-trach-nhiem" className={styles.section} aria-labelledby="disclaimer-title">
        <header className={styles.sectionHead}><b aria-hidden="true">02</b><h2 id="disclaimer-title">Tuyên bố miễn trừ trách nhiệm</h2></header>
        <div className={styles.body}>
          <h3>2.1. Bản chất của nội dung</h3>
          <p>Các nội dung trên AstroX — bao gồm lá số, luận giải Tử Vi, Bát Tự, Kinh Dịch, Thần Số Học, Cung Hoàng Đạo và Tarot — được xây dựng trên dữ liệu thiên văn, lịch pháp và di sản văn hoá cổ truyền, nhằm mục đích tham khảo, khám phá bản thân và giải trí. Đây không phải dịch vụ tư vấn chuyên môn và không phải dự báo chắc chắn về tương lai.</p>
          <h3>2.2. Không thay thế tư vấn chuyên môn</h3>
          <p>Nội dung của dịch vụ không thay thế tư vấn y tế, tâm lý, pháp lý, tài chính hay bất kỳ tư vấn chuyên môn nào. Với các vấn đề sức khỏe, tâm lý, pháp lý hoặc tài chính, bạn hãy tìm đến chuyên gia có chuyên môn phù hợp.</p>
          <h3>2.3. Nội dung hỗ trợ bởi trí tuệ nhân tạo</h3>
          <p>Một phần luận giải được tạo ra với sự hỗ trợ của mô hình trí tuệ nhân tạo dựa trên thông tin hồ sơ bạn cung cấp. Nội dung này có thể sai sót hoặc chưa phù hợp với hoàn cảnh cụ thể của bạn; hãy xem đó là góc nhìn tham khảo.</p>
          <h3>2.4. Trách nhiệm của người sử dụng</h3>
          <p>Bạn tự chịu trách nhiệm về các quyết định và hành động dựa trên nội dung của dịch vụ. Chúng tôi không chịu trách nhiệm cho thiệt hại trực tiếp hoặc gián tiếp phát sinh từ việc sử dụng hoặc tin tưởng vào nội dung dịch vụ, trong phạm vi pháp luật cho phép.</p>
          <h3>2.5. Độ chính xác của dữ liệu</h3>
          <p>Kết quả lập lá số phụ thuộc độ chính xác của thông tin bạn cung cấp (ngày sinh, giờ sinh, nơi sinh). Chúng tôi tính toán trên thư viện thiên văn và lịch pháp có kiểm chứng, song không bảo đảm tuyệt đối việc dữ liệu đầu vào của bạn là chính xác.</p>
        </div>
      </section>

      <section id="thoa-thuan-bao-mat" className={styles.section} aria-labelledby="privacy-title">
        <header className={styles.sectionHead}><b aria-hidden="true">03</b><h2 id="privacy-title">Thoả thuận xử lý và bảo mật thông tin cá nhân</h2></header>
        <div className={styles.body}>
          <p className={styles.lead}>Thoả thuận này được lập theo <strong>Nghị định số 13/2023/NĐ-CP ngày 03/4/2023 của Chính phủ về bảo vệ dữ liệu cá nhân</strong> (&quot;ND13&quot;) và là một phần không thể tách rời của bộ điều khoản. Việc bạn tích đồng ý tại hộp thoại đăng nhập thể hiện sự đồng ý đó theo Điều 7 ND13.</p>
          <h3>3.1. Bên kiểm soát và xử lý dữ liệu cá nhân</h3>
          <p>Bên kiểm soát, xử lý dữ liệu cá nhân trên AstroX là đơn vị vận hành AstroX. Liên hệ về dữ liệu cá nhân: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          <h3>3.2. Dữ liệu cá nhân chúng tôi thu thập</h3>
          <dl className={styles.dataList}>
            <div><dt>Hồ sơ chiêm tinh</dt><dd>Tên gọi, họ tên đầy đủ (tuỳ chọn), giới tính, ngày sinh, giờ sinh, nơi sinh — do bạn tự nhập để lập lá số.</dd></div>
            <div><dt>Tài khoản</dt><dd>Danh tính từ nhà cung cấp đăng nhập: mã định danh Zalo, tên hiển thị, ảnh đại diện.</dd></div>
            <div><dt>Giao dịch</dt><dd>Đơn nạp AstroX Point, số tiền, trạng thái giao dịch, số dư và lịch sử Point.</dd></div>
            <div><dt>Nội dung bạn tạo</dt><dd>Câu hỏi đặt cho Tarot/Kinh Dịch, luận giải đã lưu, nhật ký trải bài, cài đặt hiển thị.</dd></div>
            <div><dt>Dữ liệu kỹ thuật</dt><dd>Nhật ký truy cập, thông tin trình duyệt và thiết bị phục vụ vận hành, bảo mật dịch vụ.</dd></div>
          </dl>
          <h3>3.3. Mục đích và cơ sở xử lý</h3>
          <p>Dữ liệu được xử lý để: cung cấp và cá nhân hoá dịch vụ (cơ sở: thực hiện thoả thuận sử dụng dịch vụ); tạo luận giải theo hồ sơ (cơ sở: sự đồng ý của bạn); xử lý thanh toán và chống gian lận (cơ sở: thực hiện hợp đồng, nghĩa vụ pháp lý); bảo mật và cải tiến dịch vụ (cơ sở: lợi ích chính đáng của đơn vị vận hành). Chúng tôi không xử lý dữ liệu cá nhân vì mục đích nào khác ngoài các mục đích nêu trên.</p>
          <h3>3.4. Chia sẻ dữ liệu và bên thứ ba</h3>
          <p>Chúng tôi chỉ chia sẻ dữ liệu ở mức tối thiểu cần thiết với: <strong>Zalo</strong> (đăng nhập OAuth — xác thực danh tính), <strong>cổng thanh toán</strong> (xử lý giao dịch nạp Point), <strong>nhà cung cấp mô hình trí tuệ nhân tạo</strong> (xử lý nội dung cần luận giải để trả kết quả), và <strong>đơn vị hạ tầng Cloudflare</strong> (lưu trữ, phân phối nội dung). Chúng tôi không bán, không cho thuê dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào.</p>
          <h3>3.5. Thời gian lưu trữ</h3>
          <p>Dữ liệu được lưu trong thời gian tài khoản còn hoạt động và nhu cầu phục vụ dịch vụ, trừ khi phải lưu lâu hơn theo yêu cầu pháp luật (ví dụ: hồ sơ giao dịch). Khi tài khoản bị xoá theo yêu cầu của bạn, dữ liệu cá nhân liên quan được xoá hoặc ẩn danh trong thời hạn hợp lý.</p>
          <h3>3.6. Cookie và lưu trữ trên thiết bị</h3>
          <p>AstroX dùng cookie phiên đăng nhập và lưu cục bộ trên thiết bị của bạn (hồ sơ, cài đặt hiển thị, lịch sử trải bài) để dịch vụ hoạt động mà không cần đăng nhập lại. Bạn có thể xoá các dữ liệu này qua trình duyệt; một số tính năng cá nhân hoá sẽ cần thiết lập lại.</p>
          <h3>3.7. Quyền của bạn theo ND13</h3>
          <ul>
            <li>Quyền biết về việc xử lý dữ liệu cá nhân của mình;</li>
            <li>Quyền tiếp cận, truy xuất bản sao dữ liệu cá nhân;</li>
            <li>Quyền cho phép, rút lại sự đồng ý xử lý dữ liệu;</li>
            <li>Quyền mở/đóng quyền tiếp cận dữ liệu theo từng chủ thể;</li>
            <li>Quyền chỉnh sửa, cập nhật, điều chỉnh dữ liệu;</li>
            <li>Quyền yêu cầu xoá dữ liệu cá nhân (trừ dữ liệu phải lưu theo pháp luật);</li>
            <li>Quyền hạn chế, phản đối việc xử lý dữ liệu;</li>
            <li>Quyền khiếu nại, báo cáo vi phạm; quyền yêu cầu bồi thường thiệt hại theo pháp luật;</li>
            <li>Quyền tự bảo vệ theo Điều 9 ND13.</li>
          </ul>
          <h3>3.8. Cách thực hiện quyền</h3>
          <p>Bạn gửi yêu cầu thực hiện các quyền trên qua email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, kèm thông tin tài khoản và nội dung yêu cầu. Chúng tôi xác nhận và phản hồi trong thời hạn hợp lý, tối đa không quá 30 ngày kể từ khi nhận được yêu cầu đầy đủ. Rút lại sự đồng ý có thể khiến một số tính năng không tiếp tục hoạt động (ví dụ: luận giải cá nhân hoá).</p>
          <h3>3.9. Bảo mật dữ liệu</h3>
          <p>Dữ liệu được lưu trữ và truyền tải qua kết nối mã hoá; quyền truy cập quản trị được giới hạn và ghi nhận nhật ký. Trong trường hợp xảy ra sự cố làm rò rỉ dữ liệu cá nhân, chúng tôi thông báo cho bạn và cơ quan có thẩm quyền theo quy định ND13.</p>
          <h3>3.10. Người dưới 16 tuổi</h3>
          <p>Theo ND13: người từ đủ 16 tuổi tự mình đồng ý việc xử lý dữ liệu cá nhân; người từ đủ 7 đến dưới 16 tuổi cần đồng ý của cha mẹ hoặc người giám hộ; dưới 7 tuổi do cha mẹ hoặc người giám hộ thực hiện. Nếu bạn là cha mẹ/người giám hộ và cho rằng con mình đã cung cấp dữ liệu mà không được phép, hãy liên hệ email trên để xoá dữ liệu.</p>
          <h3>3.11. Thay đổi thoả thuận</h3>
          <p>Khi thoả thuận này thay đổi, chúng tôi cập nhật tại trang này và phiên bản mới sẽ được yêu cầu xác nhận lại khi cần thiết theo ND13.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Điều khoản &amp; thoả thuận này áp dụng cho toàn bộ dịch vụ AstroX. Để lưu giữ, bạn có thể in hoặc lưu trang này dưới dạng PDF.</p>
        <p>Liên hệ: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · Phiên bản 1.0 — 23/09/2026</p>
        <Link className={styles.backHome} href="/">← Về trang chủ AstroX</Link>
      </footer>
    </div>
  );
}
