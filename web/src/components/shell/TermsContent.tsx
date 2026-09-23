/**
 * Trang "Các điều khoản & Thoả thuận" — 3 văn bản độc lập, ràng buộc đồng thời:
 *   01 Điều khoản sử dụng dịch vụ (khung hợp đồng sử dụng AstroX)
 *   02 Tuyên bố miễn trừ trách nhiệm (bản chất tham khảo của nội dung)
 *   03 Thoả thuận xử lý & bảo mật thông tin cá nhân theo ND 13/2023/NĐ-CP
 *
 * Anchor id các khối được tham chiếu từ popup đăng nhập (lib/terms.ts) — đổi id
 * phải đổi cả hai chỗ. Ngày hiệu lực & phiên bản: 23/09/2026 · 1.1.
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
        sub="Ba văn bản ràng buộc việc bạn sử dụng AstroX: Điều khoản sử dụng dịch vụ, Tuyên bố miễn trừ trách nhiệm và Thoả thuận xử lý, bảo mật thông tin cá nhân theo Nghị định 13/2023/NĐ-CP. Mỗi văn bản có hiệu lực độc lập và được áp dụng đồng thời."
      />
      <p className={styles.meta}>Phiên bản 1.1 · Có hiệu lực từ ngày 23/09/2026</p>

      <nav className={styles.toc} aria-label="Mục lục điều khoản">
        <ol>
          <li><Link href="#dieu-khoan-su-dung"><b>01</b><span>Điều khoản sử dụng dịch vụ</span><small>Định nghĩa · Point &amp; thanh toán · quy tắc sử dụng · sở hữu trí tuệ · giới hạn trách nhiệm · chấm dứt</small></Link></li>
          <li><Link href="#mien-tru-trach-nhiem"><b>02</b><span>Tuyên bố miễn trừ trách nhiệm</span><small>Bản chất tham khảo của nội dung chiêm tinh · nội dung AI · không thay thế tư vấn chuyên môn</small></Link></li>
          <li><Link href="#thoa-thuan-bao-mat"><b>03</b><span>Thoả thuận xử lý và bảo mật thông tin cá nhân</span><small>Theo Nghị định 13/2023/NĐ-CP của Chính phủ</small></Link></li>
        </ol>
      </nav>

      <section id="dieu-khoan-su-dung" className={styles.section} aria-labelledby="terms-title">
        <header className={styles.sectionHead}><b aria-hidden="true">01</b><h2 id="terms-title">Điều khoản sử dụng dịch vụ</h2></header>
        <div className={styles.body}>
          <h3>1.1. Định nghĩa</h3>
          <dl className={styles.dataList}>
            <div><dt>AstroX / chúng tôi</dt><dd>Đơn vị vận hành website AstroX tại theastrox.space, là bên cung cấp dịch vụ.</dd></div>
            <div><dt>Dịch vụ</dt><dd>Toàn bộ website, tính năng lập và luận giải lá số Tử Vi, Bát Tự, Kinh Dịch, Thần Số Học, Cung Hoàng Đạo, Tarot, tính năng vận trình, ví AstroX Point và các nội dung số đi kèm.</dd></div>
            <div><dt>Người dùng / bạn</dt><dd>Cá nhân truy cập, đăng ký hoặc sử dụng bất kỳ phần nào của Dịch vụ.</dd></div>
            <div><dt>AstroX Point (Point)</dt><dd>Đơn vị ảo dùng để mở khoá các tính năng trả phí trong Dịch vụ, mua bằng tiền Việt Nam Đồng theo gói công bố.</dd></div>
            <div><dt>Nội dung</dt><dd>Văn bản, hình ảnh, sơ đồ, luận giải, dữ liệu và mọi tài liệu hiển thị hoặc tạo ra trong Dịch vụ.</dd></div>
          </dl>
          <h3>1.2. Chấp nhận và cập nhật điều khoản</h3>
          <p>Khi truy cập, tạo tài khoản, mua Point hoặc sử dụng bất kỳ tính năng nào của Dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi toàn bộ bộ điều khoản này, bao gồm cả Tuyên bố miễn trừ trách nhiệm (mục 02) và Thoả thuận xử lý và bảo mật thông tin cá nhân (mục 03). Nếu không đồng ý, bạn phải ngừng sử dụng Dịch vụ.</p>
          <p>Chúng tôi có thể cập nhật bộ điều khoản này theo thời gian; bản hiện hành luôn là bản công bố tại trang này. Với thay đổi ảnh hưởng quyền lợi vật chất của người dùng đã thanh toán (giá, cách tính Point, phạm vi dịch vụ), chúng tôi thông báo trong ứng dụng trước khi áp dụng. Việc bạn tiếp tục sử dụng Dịch vụ sau khi bản cập nhật có hiệu lực được coi là chấp nhận bản cập nhật.</p>
          <h3>1.3. Mô tả Dịch vụ</h3>
          <p>Dịch vụ cung cấp công cụ lập lá số và nội dung luận giải trên nền dữ liệu thiên văn, lịch pháp và di sản văn hoá cổ truyền Việt Nam – phương Đông, kết hợp mô hình trí tuệ nhân tạo (AI) để tạo phần luận giải. Dịch vụ mang tính tham khảo, khám phá bản thân và giải trí; mọi giới hạn về bản chất nội dung được quy định tại Tuyên bố miễn trừ trách nhiệm (mục 02).</p>
          <h3>1.4. Điều kiện sử dụng và độ tuổi</h3>
          <p>Bạn khẳng định rằng mình đã đủ 15 tuổi; nếu dưới 16 tuổi, việc sử dụng Dịch vụ phải có sự đồng ý của cha mẹ hoặc người giám hộ, và việc xử lý dữ liệu cá nhân của người dưới 16 tuổi tuân theo mục 3.10. Bạn chịu trách nhiệm tuân thủ pháp luật nơi bạn sử dụng Dịch vụ và không sử dụng Dịch vụ ở những nơi bị pháp luật cấm.</p>
          <h3>1.5. Tài khoản và bảo mật đăng nhập</h3>
          <p>Tài khoản AstroX hiện được tạo và đăng nhập qua Zalo; các phương thức khác (Google…) sẽ được bổ sung khi sẵn sàng. Bạn chịu trách nhiệm (a) bảo mật thiết bị, phiên đăng nhập và quyền truy cập tài khoản của mình; (b) mọi hoạt động phát sinh qua tài khoản của bạn, kể cả do người khác sử dụng trái phép; (c) thông báo ngay cho chúng tôi qua email ở cuối trang khi phát hiện truy cập trái phép. Bạn không được chia sẻ, cho thuê, mua bán hoặc chuyển nhượng tài khoản cho người khác.</p>
          <h3>1.6. AstroX Point, giá và thanh toán</h3>
          <p><strong>Bản chất Point.</strong> Point là tài sản số nội bộ của Dịch vụ: không phải tiền, không phải tiền điện tử hay phương tiện thanh toán theo nghĩa của pháp luật, không sinh lãi, không có giá trị pháp lý bên ngoài Dịch vụ. Point không chuyển nhượng giữa các tài khoản và không quy đổi ra tiền mặt.</p>
          <p><strong>Mua Point.</strong> Point được mua theo các gói công bố trong ứng dụng, đơn vị Việt Nam Đồng, thanh toán qua cổng thanh toán của đối tác. Giá hiển thị tại thời điểm xác nhận mua là tổng số tiền bạn phải thanh toán cho gói tương ứng.</p>
          <p><strong>Giao dịch nội dung số.</strong> Luận giải trả phí là nội dung số được cung cấp ngay theo yêu cầu của bạn và không thể thu hồi sau khi hoàn thành. Theo quy định của pháp luật về bảo vệ quyền lợi người tiêu dùng đối với giao dịch từ xa, quyền hủy giao dịch không áp dụng cho các giao dịch này sau khi Point đã được trừ và kết quả đã được cung cấp.</p>
          <p><strong>Lỗi kỹ thuật và hoàn Point.</strong> Nếu một lượt sử dụng bị trừ Point nhưng bạn không nhận được kết quả do lỗi kỹ thuật của chúng tôi, số Point tương ứng được hoàn lại; nếu không thể hoàn tự động, bạn liên hệ email dưới đây kèm tài khoản, thời điểm giao dịch để được xử lý. Yêu cầu báo lỗi nên được gửi trong thời gian sớm nhất để tiện đối chiếu.</p>
          <p><strong>Hoàn tiền.</strong> Tiền đã nạp để mua Point không được hoàn lại, trừ trường hợp (a) lỗi kỹ thuật thuộc trách nhiệm của chúng tôi mà không thể khắc phục; hoặc (b) các trường hợp pháp luật bắt buộc. Việc hoàn trả (nếu có) được thực hiện qua phương thức thanh toán gốc trong thời gian hợp lý.</p>
          <p><strong>Chống lạm dụng.</strong> Với dấu hiệu gian lận, thanh toán bằng nguồn vốn bất hợp pháp, khiếu nại đảo ngược giao dịch (chargeback) trái quy định hoặc sai sót của hệ thống trong việc ghi có Point, chúng tôi có quyền tạm giữ số Point/đơn giao dịch liên quan trong thời gian cần thiết để xác minh, và phối hợp cơ quan có thẩm quyền khi được yêu cầu theo pháp luật.</p>
          <p><strong>Ưu đãi Point.</strong> Point tặng kèm (khuyến mãi nạp, điểm danh, giới thiệu bạn bè, xem quảng cáo…) do chúng tôi cấp kèm điều kiện, giới hạn được công bố ngay tại tính năng tương ứng; có thể được điều chỉnh hoặc ngừng cấp, không quy đổi thành tiền và không thuộc đối tượng hoàn tiền.</p>
          <h3>1.7. Quy tắc sử dụng chấp thuận</h3>
          <p>Khi sử dụng Dịch vụ, bạn không được:</p>
          <ul>
            <li>Gửi yêu cầu tự động hoặc thu thập dữ liệu bằng công cụ (bot, script, crawler) ngoài giao diện và phạm vi cho phép của Dịch vụ;</li>
            <li>Cố gắng vượt qua, vô hiệu hoá hoặc lách các cơ chế kiểm soát chi phí, giới hạn sử dụng và các cơ chế bảo vệ kỹ thuật của Dịch vụ;</li>
            <li>Tạo nhiều tài khoản hoặc lạm dụng chương trình ưu đãi (giới thiệu, điểm danh, quảng cáo) để trục lợi;</li>
            <li>Tấn công, quá tải, quét lỗ hổng hoặc can thiệp vào hạ tầng, mã nguồn, dữ liệu của Dịch vụ, bao gồm dịch ngược mã nguồn hoặc tạo sản phẩm phái sinh từ Dịch vụ;</li>
            <li>Xâm phạm quyền sở hữu trí tuệ của AstroX hoặc bên thứ ba; sao chép, thu thập lại hoặc phát tán Nội dung vì mục đích thương mại mà không có sự chấp thuận bằng văn bản;</li>
            <li>Mạo danh AstroX, nhân viên hoặc người dùng khác; nhập nội dung bất hợp pháp, xâm phạm quyền của người khác qua các tính năng nhập liệu (câu hỏi, hồ sơ);</li>
            <li>Sử dụng Dịch vụ cho mục đích trái pháp luật Việt Nam.</li>
          </ul>
          <p>Khi phát hiện vi phạm, chúng tôi có quyền áp dụng biện pháp phù hợp gồm: cảnh báo, hạn chế tính năng, tạm ngừng hoặc khoá tài khoản, từ chối/thu hồi ưu đãi Point trục lợi, và lưu lại chứng cứ hợp lệ để xử lý theo pháp luật.</p>
          <h3>1.8. Quyền sở hữu trí tuệ và giấy phép</h3>
          <p>Nền tảng, mã nguồn, logo, bộ nhận diện, hoạ tiết, cấu trúc dữ liệu và các Nội dung do AstroX tạo lập là tài sản sở hữu trí tuệ của AstroX hoặc bên cấp phép; được bảo hộ theo pháp luật sở hữu trí tuệ Việt Nam. Không nội dung nào trong đó được hiểu là chuyển nhượng quyền sở hữu cho bạn.</p>
          <p>Hồ sơ, câu hỏi và dữ liệu bạn tự nhập vào Dịch vụ thuộc quyền của bạn. Bạn cấp cho AstroX giấy phép giới hạn, không độc quyền, miễn phí trong phạm vi cần thiết để vận hành Dịch vụ theo mục 03 (xử lý tạo luận giải, lưu lịch sử, đồng bộ tài khoản).</p>
          <p>Luận giải AstroX tạo ra cho bạn được cấp cho bạn quyền sử dụng cá nhân, không chuyển nhượng; bạn không được bán lại hoặc xuất bản thương mại các luận giải này.</p>
          <h3>1.9. Sự cố, bảo trì và thay đổi Dịch vụ</h3>
          <p>Dịch vụ được cung cấp theo trạng thái hiện hữu và mức khả năng cho phép. Chúng tôi có thể gián đoạn, hạn chế hoặc tạm ngừng Dịch vụ để bảo trì, nâng cấp, khắc phục sự cố hoặc do nguyên nhân thuộc bên thứ ba (nhà cung cấp đăng nhập, cổng thanh toán, nhà cung cấp AI, hạ tầng mạng) ngoài kiểm soát hợp lý của chúng tôi; sẽ cố gắng thông báo trước khi gián đoạn có kế hoạch. Chúng tôi có quyền bổ sung, điều chỉnh hoặc ngừng cung cấp một tính năng; với thay đổi lớn ảnh hưởng quyền lợi đã thanh toán, thông báo được gửi trong ứng dụng.</p>
          <h3>1.10. Giới hạn trách nhiệm</h3>
          <p>Trong phạm vi pháp luật cho phép, tổng trách nhiệm bồi thường của AstroX đối với mọi khiếu nại phát sinh từ hoặc liên quan đến Dịch vụ không vượt quá tổng số tiền bạn đã thanh toán cho Dịch vụ trong vòng 03 (ba) tháng tính đến thời điểm phát sinh khiếu nại. AstroX không chịu trách nhiệm về các thiệt hại gián tiếp, mất dữ liệu ngoài Dịch vụ, mất lợi nhuận, mất cơ hội kinh doanh hoặc thiệt hại phát sinh từ hành vi của bên thứ ba.</p>
          <p>AstroX không chịu trách nhiệm với sự chậm trễ hoặc không thể thực hiện nghĩa vụ do trường hợp bất khả kháng (thiên tai, dịch bệnh, chiến tranh, đứt gãy hạ tầng viễn thông quy mô lớn, quyết định của cơ quan có thẩm quyền) hoặc do lỗi của bên thứ ba cung cấp dịch vụ trung gian.</p>
          <h3>1.11. Bồi hoàn của người dùng</h3>
          <p>Trong trường hợp hành vi vi phạm điều khoản của bạn gây thiệt hại cho AstroX (bao gồm chi phí điều tra, xử lý, thiệt hại uy tín), bạn có nghĩa vụ bồi hoàn theo quy định pháp luật, trong phạm vi pháp luật cho phép thỏa thuận.</p>
          <h3>1.12. Chấm dứt</h3>
          <p><strong>Theo yêu cầu của bạn:</strong> bạn có thể ngừng sử dụng Dịch vụ bất cứ lúc nào và yêu cầu xoá tài khoản cùng dữ liệu cá nhân theo mục 3.8.</p>
          <p><strong>Theo quyết định của chúng tôi:</strong> chúng tôi có thể tạm ngừng hoặc chấm dứt tài khoản khi bạn vi phạm bộ điều khoản này (thông báo trước trừ trường hợp ảnh hưởng an ninh, gian lận thanh toán), hoặc chấm dứt cung cấp Dịch vụ vì lý do kinh doanh, kỹ thuật hoặc pháp lý — trong trường hợp này chúng tôi thông báo trong thời gian hợp lý và xử lý Point chưa sử dụng theo phương thức phù hợp.</p>
          <p><strong>Hệ quả:</strong> khi chấm dứt, giấy phép sử dụng Nội dung cấp cho bạn chấm dứt; chúng tôi vẫn có quyền lưu dữ liệu theo yêu cầu pháp luật; các điều khoản có bản chất tồn tại sau chấm dứt (nghĩa vụ đã phát sinh, giới hạn trách nhiệm, luật áp dụng) tiếp tục hiệu lực.</p>
          <h3>1.13. Thông báo</h3>
          <p>Thông báo từ chúng tôi đến bạn được thực hiện qua email, thông báo trong ứng dụng hoặc hiển thị ngay trên Dịch vụ và được coi là hợp lệ kể từ thời điểm gửi/hiển thị.</p>
          <h3>1.14. Luật áp dụng và giải quyết tranh chấp</h3>
          <p>Bộ điều khoản này và quan hệ giữa bạn và AstroX chịu sự điều chỉnh của pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết bằng thương lượng trong 30 ngày; nếu không thành, tranh chấp được đưa ra Tòa án nhân dân có thẩm quyền theo quy định của pháp luật tố tụng dân sự Việt Nam.</p>
          <h3>1.15. Điều khoản chung</h3>
          <p>Nếu một điều khoản bất kỳ bị cơ quan có thẩm quyền tuyên vô hiệu, phần còn lại của bộ điều khoản vẫn có hiệu lực. Đây là toàn bộ thỏa thuận giữa bạn và AstroX về việc sử dụng Dịch vụ, thay thế mọi thỏa thuận trước đó. Việc chúng tôi không thực hiện một quyền nào đó trong một trường hợp cụ thể không được coi là từ bỏ quyền đó. Chúng tôi có thể chuyển nhượng quyền và nghĩa vụ theo bộ điều khoản này cho bên tiếp nhận vận hành Dịch vụ.</p>
        </div>
      </section>

      <section id="mien-tru-trach-nhiem" className={styles.section} aria-labelledby="disclaimer-title">
        <header className={styles.sectionHead}><b aria-hidden="true">02</b><h2 id="disclaimer-title">Tuyên bố miễn trừ trách nhiệm</h2></header>
        <div className={styles.body}>
          <p className={styles.lead}>Tuyên bố này là một phần không thể tách rời của Điều khoản sử dụng dịch vụ và làm rõ bản chất pháp lý của toàn bộ nội dung AstroX cung cấp.</p>
          <h3>2.1. Bản chất tham khảo và giải trí</h3>
          <p>Các nội dung trên AstroX — lá số, luận giải Tử Vi, Bát Tự, Kinh Dịch, Thần Số Học, Cung Hoàng Đạo, Tarot và vận trình — được xây dựng trên dữ liệu thiên văn, lịch pháp và di sản văn hoá cổ truyền, nhằm mục đích tham khảo, khám phá bản thân và giải trí. Đây không phải dịch vụ dự báo chắc chắn về tương lai, không phải công cụ chẩn đoán, và không tạo ra bất kỳ cam kết nào về kết quả của bất kỳ quyết định nào của bạn.</p>
          <h3>2.2. Không thay thế tư vấn chuyên môn</h3>
          <p>Nội dung của Dịch vụ không thay thế tư vấn y khoa, tâm lý, tâm thần, pháp lý, tài chính, đầu tư hay bất kỳ tư vấn chuyên môn nào. Với các vấn đề thuộc lĩnh vực này, bạn cần trực tiếp tham khảo bác sĩ, luật sư, chuyên gia tài chính hoặc chuyên gia tâm lý có chứng chỉ hành nghề phù hợp. Trong trường hợp khẩn cấp về sức khỏe hoặc an toàn tính mạng, hãy gọi ngay dịch vụ cấp cứu tại địa phương (tại Việt Nam: số 115) thay vì sử dụng Dịch vụ.</p>
          <h3>2.3. Sức khỏe tâm thần và các tình huống khủng hoảng</h3>
          <p>AstroX không phải công cụ trị liệu tâm lý và không được thiết kế cho người đang trong tình trạng khủng hoảng tâm thần nghiêm trọng. Nếu bạn đang trải qua suy nghĩ tự gây tổn hại, trầm cảm nặng hoặc khủng hoảng, hãy tìm sự hỗ trợ khẩn cấp từ cơ sở y tế hoặc dịch vụ hỗ trợ tâm thần tại địa phương, và chia sẻ với người thân tin cậy.</p>
          <h3>2.4. Nội dung được hỗ trợ bởi trí tuệ nhân tạo</h3>
          <p>Một phần luận giải được tạo ra với sự hỗ trợ của mô hình trí tuệ nhân tạo dựa trên thông tin hồ sơ bạn cung cấp. Nội dung do AI tạo ra có thể chứa sai sót, mâu thuẫn hoặc thông tin không chính xác, và không được kiểm chứng như một công bố khoa học. Hãy đối chiếu với hiểu biết và hoàn cảnh thực tế của bạn trước khi tin theo bất kỳ nhận định nào.</p>
          <h3>2.5. Quyết định của bạn thuộc về bạn</h3>
          <p>Bạn tự chịu trách nhiệm về mọi quyết định và hành động của mình, bao gồm các quyết định về tài chính, đầu tư, kinh doanh, nghề nghiệp, hôn nhân, gia đình và sức khỏe, dù có hay không có tham khảo nội dung của Dịch vụ. Việc tiếp tục hoặc ngừng một hành động “theo luận giải” là lựa chọn của bạn và không tạo nghĩa vụ nào cho AstroX.</p>
          <h3>2.6. Độ chính xác của dữ liệu đầu vào</h3>
          <p>Kết quả lập lá số và luận giải phụ thuộc độ chính xác của thông tin bạn cung cấp (họ tên, ngày sinh, giờ sinh, nơi sinh). Chúng tôi tính toán trên thư viện thiên văn và lịch pháp có kiểm chứng, nhưng không thể bảo đảm dữ liệu bạn nhập là chính xác, và kết quả có thể sai lệch khi dữ liệu đầu vào sai.</p>
          <h3>2.7. Tính khả dụng của Dịch vụ</h3>
          <p>Dịch vụ được cung cấp “nguyên trạng” và ở mức khả năng kỹ thuật cho phép. Chúng tôi không bảo đảm Dịch vụ hoạt động liên tục, không lỗi hoặc không gián đoạn; các gián đoạn từ bên thứ ba (đăng nhập Zalo, cổng thanh toán, nhà cung cấp AI, hạ tầng mạng) nằm ngoài khả năng kiểm soát hợp lý của chúng tôi.</p>
          <h3>2.8. Phương thức và nội dung của bên thứ ba</h3>
          <p>Dịch vụ sử dụng phương thức đăng nhập, thanh toán và xử lý của bên thứ ba; tính khả dụng, bảo mật và hành vi của các bên này chịu điều chỉnh bởi điều khoản riêng của họ. Các liên kết hoặc tham chiếu tới nội dung bên ngoài (nếu có) không có nghĩa là chúng tôi bảo chứng cho nội dung đó.</p>
          <h3>2.9. Giới hạn trách nhiệm</h3>
          <p>Trong phạm vi pháp luật cho phép, AstroX từ chối mọi trách nhiệm với thiệt hại trực tiếp hoặc gián tiếp phát sinh từ việc sử dụng, tin tưởng hoặc hành động dựa trên nội dung của Dịch vụ. Trách nhiệm của chúng tôi (nếu phát sinh) được giới hạn theo mục 1.10 của Điều khoản sử dụng dịch vụ.</p>
          <h3>2.10. Cập nhật Tuyên bố</h3>
          <p>Chúng tôi có thể cập nhật Tuyên bố này để phản ánh thay đổi của Dịch vụ hoặc yêu cầu pháp luật; bản hiện hành luôn là bản công bố tại trang này.</p>
        </div>
      </section>

      <section id="thoa-thuan-bao-mat" className={styles.section} aria-labelledby="privacy-title">
        <header className={styles.sectionHead}><b aria-hidden="true">03</b><h2 id="privacy-title">Thoả thuận xử lý và bảo mật thông tin cá nhân</h2></header>
        <div className={styles.body}>
          <p className={styles.lead}>Thoả thuận này được lập theo <strong>Nghị định số 13/2023/NĐ-CP ngày 03/4/2023 của Chính phủ về bảo vệ dữ liệu cá nhân</strong> (“ND13”) và các quy định pháp luật hiện hành về bảo vệ dữ liệu cá nhân. Việc bạn tích đồng ý tại hộp thoại đăng nhập thể hiện sự đồng ý đó theo Điều 7 ND13.</p>
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
          <p>AstroX dùng cookie phiên đăng nhập và lưu cục bộ trên thiết bị của bạn (hồ sơ, cài đặt hiển thị, lịch sử trải bài, trạng thái đồng ý điều khoản) để dịch vụ hoạt động mà không cần đăng nhập lại. Bạn có thể xoá các dữ liệu này qua trình duyệt; một số tính năng cá nhân hoá sẽ cần thiết lập lại.</p>
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
        <p>Liên hệ: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · Phiên bản 1.1 — 23/09/2026</p>
        <Link className={styles.backHome} href="/">← Về trang chủ AstroX</Link>
      </footer>
    </div>
  );
}
