import Link from "next/link";
import { TermsNavigation } from "./TermsNavigation";
import styles from "./TermsContent.module.css";

const CONTACT_EMAIL = "tsonniverse@gmail.com";
const Contact = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function TermsContent() {
  return <div className={styles.page} data-legal-document>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>ASTROX / THÔNG TIN PHÁP LÝ</p>
      <h1>Điều khoản<br /><span>&amp; thỏa thuận.</span></h1>
      <p className={styles.intro}>Những điều cần biết để bạn an tâm khám phá AstroX — từ cách sử dụng dịch vụ đến quyền riêng tư của mình.</p>
      <div className={styles.meta}><span>Phiên bản 2.0</span><span>Cập nhật &amp; hiệu lực: 24.09.2026</span><span>03 văn bản</span></div>
    </header>
    <div className={styles.layout}>
      <TermsNavigation />
      <div className={styles.documents}>
        <div className={styles.overview}>
          <p className={styles.eyebrow}>TRƯỚC KHI BẮT ĐẦU</p>
          <p>AstroX giúp bạn khám phá bản thân qua nội dung tham khảo. Hãy đọc phạm vi dịch vụ, kiểm tra giá trước khi xác nhận và chỉ chia sẻ dữ liệu cần thiết.</p>
          <a href="#lien-he-phap-ly">Cần giải đáp? Liên hệ AstroX <span aria-hidden="true">↗</span></a>
        </div>
        <section id="dieu-khoan-su-dung" className={styles.section} aria-labelledby="terms-title">
          <header className={styles.sectionHead}><span className={styles.sectionNumber}>01 / SỬ DỤNG DỊCH VỤ</span><h2 id="terms-title">Điều khoản sử dụng</h2><p>Phạm vi dịch vụ, thanh toán và trách nhiệm của mỗi bên.</p></header>
          <div className={styles.body}>
            <h3>1.1. Ai vận hành AstroX?</h3>
            <p>AstroX tại theastrox.space do cá nhân <strong>Ngô Thái Sơn</strong> vận hành và đại diện, là bên cung cấp dịch vụ trong văn bản này (“AstroX”, “chúng tôi”). Địa chỉ liên hệ: <strong>KĐT Vinhomes Ocean Park, Gia Lâm, TP. Hà Nội</strong>. Email hỗ trợ, giao dịch và dữ liệu cá nhân: <Contact />.</p>
            <h3>1.2. Dịch vụ và việc giao kết</h3>
            <p>AstroX cung cấp công cụ và nội dung tham khảo về Tử Vi, Bát Tự, Kinh Dịch, Thần Số Học, Cung Hoàng Đạo, Tarot, vận trình và tương hợp, có thể sử dụng trí tuệ nhân tạo (AI). Phạm vi từng tính năng, điều kiện miễn phí hoặc số Point cần dùng được công bố trước khi bạn xác nhận sử dụng.</p>
            <p>Bạn có thể đọc, lưu và yêu cầu giải thích điều khoản trước khi chấp nhận. Thỏa thuận sử dụng được xác lập khi bạn chủ động xác nhận đồng ý; giao dịch trả phí chỉ phát sinh khi bạn xác nhận giao dịch tương ứng. Chỉ truy cập trang không đồng nghĩa với đồng ý mọi hoạt động xử lý dữ liệu. Mục 02 làm rõ giới hạn nội dung; mục 03 giải thích cách xử lý dữ liệu và quyền của bạn.</p>
            <h3>1.3. Độ tuổi, hồ sơ và tài khoản</h3>
            <p>Dịch vụ dành cho người từ đủ 15 tuổi. Người dưới 16 tuổi cần sự đồng ý của người đại diện theo pháp luật theo mục 3.10; giao dịch của người chưa thành niên phải đáp ứng điều kiện về năng lực giao dịch theo pháp luật. Không nhập dữ liệu của người khác khi chưa có quyền hoặc sự đồng ý cần thiết.</p>
            <p>Bạn cần cung cấp thông tin phù hợp, bảo vệ thiết bị và phiên đăng nhập, không mua bán, cho thuê hoặc chia sẻ tài khoản. Hãy báo ngay khi nghi ngờ truy cập trái phép. Trách nhiệm đối với sự cố được xác định theo nguyên nhân và quy định pháp luật, không mặc nhiên quy mọi truy cập trái phép thành lỗi của bạn. Phương thức đăng nhập khả dụng được hiển thị tại thời điểm sử dụng.</p>
            <h3>1.4. AstroX Point và giá dịch vụ</h3>
            <p>Point là đơn vị ghi nhận quyền sử dụng tính năng trong AstroX. Point không sinh lãi, không dùng để thanh toán ngoài AstroX, không có chức năng chuyển giữa người dùng hoặc rút tiền. Việc hoàn khoản đã thanh toán trong các trường hợp ở mục 1.5 không phải chức năng quy đổi Point thành tiền.</p>
            <p>Giá gói nạp được thể hiện bằng Việt Nam Đồng; tổng tiền và số Point nhận được phải hiển thị trước khi xác nhận. Giá từng lượt được công bố tại <Link href="/banggia">bảng giá</Link> và màn hình xác nhận; tính năng miễn phí không bị trừ Point. Hình thức thanh toán, thời hạn đơn và trạng thái xử lý được hiển thị trong luồng giao dịch. Giao dịch được đối soát trước khi ghi nhận Point; không chuyển tiền theo thông tin ngoài luồng thanh toán chính thức.</p>
            <p>Thay đổi giá áp dụng cho giao dịch mới sau khi công bố, không sửa giá lượt đã xác nhận. Point từ ưu đãi tuân theo điều kiện chương trình được thông báo trước khi tham gia; không tự động có giá trị hoàn tiền như khoản thực trả.</p>
            <h3>1.5. Lỗi dịch vụ, hoàn Point và hoàn tiền</h3>
            <p>Nếu đã trừ Point nhưng không cung cấp được kết quả do lỗi hệ thống, AstroX hoàn số Point của lượt lỗi; nếu chưa được hoàn tự động, hãy gửi yêu cầu để đối soát. Giao dịch trùng, thu sai, đã thanh toán nhưng không được cung cấp quyền sử dụng cũng được kiểm tra và khắc phục.</p>
            <p>AstroX không có chính sách hoàn tiền chỉ vì đổi ý hoặc vì luận giải không phù hợp kỳ vọng cá nhân khi dịch vụ đã được cung cấp đúng mô tả. Quy định này không loại trừ quyền yêu cầu khắc phục, hủy giao dịch, hoàn tiền hoặc bồi thường theo pháp luật khi dịch vụ lỗi, không đúng cam kết hoặc có căn cứ hợp pháp khác.</p>
            <p>Khi phải hoàn tiền, số tiền được xác định từ khoản thực trả và phần dịch vụ chưa được cung cấp hoặc giao dịch cần hoàn, có đối chiếu ưu đãi và các khoản đã hoàn để tránh hoàn trùng. Ưu tiên phương thức thanh toán ban đầu; phương thức khác cần bạn đồng ý. Không buộc nhận Point thay tiền nếu bạn có quyền được hoàn tiền. Thời hạn xử lý cụ thể được thông báo khi đối soát, không vượt thời hạn pháp luật áp dụng.</p>
            <p><strong>AstroX phản hồi ban đầu trong vòng 2 ngày làm việc</strong> kể từ khi nhận yêu cầu hỗ trợ. Gửi mã giao dịch, thời điểm và mô tả lỗi tới <Contact />; không gửi mật khẩu, mã OTP hoặc thông tin thẻ đầy đủ. Nếu cần bổ sung chứng cứ hoặc thời gian đối soát, chúng tôi thông báo lý do và bước tiếp theo. Thời gian phản hồi ban đầu không đồng nghĩa với thời gian tiền về tài khoản.</p>
            <h3>1.6. Điểm danh, giới thiệu và quảng cáo nhận thưởng</h3>
            <p>Mức thưởng, điều kiện hợp lệ, giới hạn lượt và thời gian chương trình được hiển thị khi tính năng khả dụng. Một thao tác bấm, lời mời hoặc lượt xem chưa đủ điều kiện xác nhận không tự động tạo quyền nhận thưởng. Quảng cáo nhận thưởng là lựa chọn tự nguyện; không có quảng cáo phù hợp hoặc tính năng chưa mở thì không bảo đảm có lượt thưởng.</p>
            <p>Không tạo tài khoản giả, tự giới thiệu, dùng bot, giả lập sự kiện hoàn thành quảng cáo, lặp yêu cầu để nhận trùng hoặc khai thác lỗi. AstroX có thể tạm giữ phần thưởng đang có dấu hiệu bất thường để xác minh; thông báo lý do trong phạm vi không làm lộ biện pháp bảo mật và cho phép bạn yêu cầu xem xét lại. Chỉ điều chỉnh hoặc thu hồi khoản ghi nhận sai, trùng hoặc có căn cứ vi phạm; không mặc nhiên tịch thu toàn bộ Point hợp lệ. Thay đổi chương trình áp dụng cho lượt tham gia tương lai và không xóa quyền lợi đã phát sinh hợp lệ.</p>
            <h3>1.7. Quy tắc sử dụng và xử lý vi phạm</h3>
            <ul><li>Không xâm nhập, làm gián đoạn, vượt giới hạn truy cập hoặc tìm cách lấy dữ liệu, khóa truy cập của người khác.</li><li>Không mạo danh, lừa đảo thanh toán, nhập nội dung trái pháp luật hoặc xâm phạm đời tư, quyền sở hữu trí tuệ.</li><li>Không thu thập hàng loạt, bán lại nội dung hay dùng tự động hóa gây quá tải hoặc né cơ chế tính phí khi chưa được cho phép. Quy định này không hạn chế các quyền được pháp luật cho phép.</li></ul>
            <p>Biện pháp có thể gồm cảnh báo, giới hạn tính năng, tạm khóa để bảo vệ tài khoản hoặc chấm dứt khi có căn cứ vi phạm. Biện pháp phải tương xứng; trường hợp khẩn cấp có thể được áp dụng trước khi thông báo. Bạn có quyền phản hồi, cung cấp chứng cứ và khiếu nại; kết luận nội bộ không thay thế thẩm quyền giải quyết tranh chấp theo pháp luật.</p>
            <h3>1.8. Nội dung và sở hữu trí tuệ</h3>
            <p>Mã nguồn, thiết kế, nhãn hiệu và tài liệu do AstroX hoặc bên cấp phép sở hữu được bảo vệ trong phạm vi pháp luật công nhận. Bạn được sử dụng kết quả được cung cấp hợp lệ cho mục đích cá nhân; không bán lại, phân phối hàng loạt hoặc khai thác thương mại tài sản được bảo hộ khi chưa được phép. Nội dung AI có thể tương tự kết quả của người khác; AstroX không cam kết tính độc quyền hoặc khả năng được bảo hộ của mọi đầu ra AI.</p>
            <p>Bạn giữ các quyền hợp pháp đối với nội dung mình cung cấp. AstroX chỉ được sử dụng nội dung đó trong phạm vi cần thiết để thực hiện chức năng bạn yêu cầu, lưu hoặc đồng bộ theo lựa chọn của bạn và các căn cứ xử lý hợp pháp tại mục 03. Điều này không chuyển quyền sở hữu dữ liệu của bạn cho AstroX, không mặc nhiên cho phép dùng nội dung riêng tư để quảng cáo.</p>
            <h3>1.9. Khả năng cung cấp và trách nhiệm</h3>
            <p>Dịch vụ có thể gián đoạn để bảo trì hoặc do sự cố hạ tầng, đăng nhập, thanh toán, AI. AstroX thông báo trước về bảo trì có kế hoạch khi có thể và khắc phục sự cố thuộc trách nhiệm của mình. Sử dụng nhà cung cấp thứ ba không tự động miễn nghĩa vụ của AstroX đối với bạn.</p>
            <p>AstroX không bảo đảm dự đoán tương lai, kết quả đầu tư, sức khỏe hay quan hệ cá nhân. Trách nhiệm bồi thường, nếu có, được xác định theo căn cứ pháp luật, thiệt hại và quan hệ nhân quả. Không loại trừ các trách nhiệm bắt buộc đối với người tiêu dùng. Việc viện dẫn bất khả kháng phải đáp ứng điều kiện pháp luật và nghĩa vụ thông báo, hạn chế thiệt hại; không phải mọi sự cố của bên thứ ba đều là bất khả kháng.</p>
            <p>Nếu hành vi vi phạm của bạn gây thiệt hại cho AstroX hoặc người khác, trách nhiệm bồi thường được xác định theo pháp luật và chứng cứ phù hợp. AstroX không tự đặt khoản phạt, chi phí điều tra hoặc thiệt hại uy tín không có căn cứ để trừ vào tài khoản.</p>
            <h3>1.10. Thay đổi, chấm dứt và tranh chấp</h3>
            <p>Phiên bản mới ghi rõ ngày hiệu lực và được thông báo khi ảnh hưởng đáng kể đến quyền lợi. Không hồi tố để làm giảm quyền đã phát sinh hoặc tự ý thay đổi giao dịch đã giao kết. Khi thay đổi điều kiện dịch vụ liên tục, bạn được lựa chọn ngừng sử dụng; quyền lợi đã thanh toán được giải quyết theo thỏa thuận hợp pháp và pháp luật. Sự đồng ý mới được lấy khi pháp luật yêu cầu.</p>
            <p>Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản. Khi AstroX dừng cung cấp dịch vụ, chúng tôi thông báo và đối soát phần quyền sử dụng đã thanh toán nhưng chưa được cung cấp để xử lý hoặc hoàn tiền theo nghĩa vụ áp dụng. Khóa tài khoản không tự động làm mất mọi quyền khiếu nại hoặc hoàn tiền. Chuyển giao nghĩa vụ cho bên vận hành khác cần sự đồng ý của bạn trừ trường hợp pháp luật cho phép khác.</p>
            <p>Pháp luật Việt Nam điều chỉnh thỏa thuận. Các bên ưu tiên trao đổi thiện chí qua kênh hỗ trợ, nhưng bạn không phải chờ hết một thời hạn thương lượng để thực hiện quyền khiếu nại, khởi kiện hoặc yêu cầu bảo vệ khẩn cấp. Tranh chấp được giải quyết tại cơ quan có thẩm quyền theo pháp luật. Điều khoản không hợp lệ được xử lý theo pháp luật; các phần còn lại tiếp tục áp dụng trong phạm vi có thể tách biệt.</p>
          </div>
        </section>
        <section id="mien-tru-trach-nhiem" className={styles.section} aria-labelledby="disclaimer-title">
          <header className={styles.sectionHead}><span className={styles.sectionNumber}>02 / HIỂU ĐÚNG NỘI DUNG</span><h2 id="disclaimer-title">Tuyên bố miễn trừ trách nhiệm</h2><p>Một góc nhìn để tham khảo, không phải lời khẳng định về tương lai.</p></header>
          <div className={styles.body}>
            <h3>2.1. Khám phá bản thân và giải trí</h3>
            <p>Lá số, luận giải và các chỉ số trên AstroX dựa trên hệ thống diễn giải văn hóa, chiêm tinh, lịch pháp và nội dung có AI hỗ trợ. Chúng không phải kết luận khoa học về con người, không phải chẩn đoán và không bảo đảm một sự kiện sẽ xảy ra. Điểm số, mức độ tương hợp hoặc lời dự báo không đại diện cho giá trị hay phẩm chất của một người.</p>
            <h3>2.2. Không thay thế chuyên gia</h3>
            <p>Nội dung không thay thế tư vấn y tế, tâm lý, pháp lý, tài chính hoặc đầu tư. Không dùng luận giải làm căn cứ duy nhất để điều trị, ngừng thuốc, vay tiền, đầu tư hoặc đưa ra quyết định quan trọng. Hãy tìm người có chuyên môn phù hợp; khi có nguy hiểm tức thời với sức khỏe hoặc tính mạng, liên hệ dịch vụ khẩn cấp tại địa phương.</p>
            <h3>2.3. Sai số, dữ liệu đầu vào và AI</h3>
            <p>Thông tin sinh, múi giờ, cách quy đổi lịch, dữ liệu thiếu hoặc nhập sai có thể làm thay đổi kết quả. AI có thể tạo thông tin sai, thiếu ngữ cảnh, mâu thuẫn hoặc diễn đạt không phù hợp. AstroX không cam kết độ chính xác tuyệt đối, tính duy nhất hay sự phù hợp cho mọi hoàn cảnh. Bạn có thể báo nội dung bất thường qua <Contact /> để được xem xét.</p>
            <h3>2.4. Quyền lựa chọn và sự tôn trọng</h3>
            <p>Bạn tự cân nhắc quyết định của mình dựa trên thực tế và tư vấn phù hợp. Nội dung tương hợp không quyết định việc bắt đầu hoặc kết thúc một mối quan hệ. AstroX tôn trọng sự đa dạng giới và cộng đồng LGBTQ+; tương hợp không giới hạn ở cặp nam – nữ và không được dùng để suy đoán xu hướng tính dục hay phân biệt đối xử.</p>
            <h3>2.5. Giới hạn của tuyên bố này</h3>
            <p>AstroX không nhận nghĩa vụ bảo đảm kết quả cuộc sống chỉ vì bạn tham khảo nội dung. Tuy nhiên, tuyên bố này không xóa nghĩa vụ cung cấp dịch vụ đúng mô tả, bảo vệ dữ liệu, khắc phục giao dịch lỗi hoặc trách nhiệm bắt buộc khác. Liên kết, nội dung và quảng cáo của bên thứ ba không phải sự bảo chứng của AstroX; trách nhiệm cụ thể vẫn được xác định theo pháp luật và vai trò thực tế của mỗi bên.</p>
          </div>
        </section>
        <section id="thoa-thuan-bao-mat" className={styles.section} aria-labelledby="privacy-title">
          <header className={styles.sectionHead}><span className={styles.sectionNumber}>03 / DỮ LIỆU &amp; QUYỀN RIÊNG TƯ</span><h2 id="privacy-title">Thỏa thuận xử lý và bảo mật thông tin cá nhân</h2><p>Dữ liệu nào được sử dụng, vì sao và cách bạn thực hiện quyền của mình.</p></header>
          <div className={styles.body}>
            <h3>3.1. Bên phụ trách và phạm vi</h3>
            <p>Ngô Thái Sơn, cá nhân vận hành AstroX tại địa chỉ nêu ở mục 1.1, là đầu mối chịu trách nhiệm đối với việc kiểm soát, xử lý dữ liệu trong phạm vi dịch vụ AstroX. Mọi yêu cầu về dữ liệu gửi tới <Contact />. Văn bản được xây dựng theo <a href="https://vanban.chinhphu.vn/?pageid=27160&docid=214590">Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</a>, <a href="https://vanban.chinhphu.vn/?pageid=27160&docid=216387">Nghị định 356/2025/NĐ-CP</a> và quy định liên quan.</p>
            <h3>3.2. Loại dữ liệu và mục đích</h3>
            <dl className={styles.dataList}>
              <div><dt>Tài khoản</dt><dd>Mã định danh, tên hiển thị, ảnh đại diện và thông tin do phương thức đăng nhập cung cấp: dùng để xác thực, quản lý tài khoản, hỗ trợ và đồng bộ.</dd></div>
              <div><dt>Hồ sơ &amp; nội dung</dt><dd>Tên gọi, giới tính, ngày, giờ, nơi sinh; câu hỏi, dữ liệu người bạn muốn đối chiếu, kết quả và nhật ký bạn lưu: dùng để thực hiện tính năng bạn yêu cầu, lưu và đồng bộ lịch sử.</dd></div>
              <div><dt>Giao dịch &amp; phần thưởng</dt><dd>Mã đơn, số tiền, trạng thái thanh toán, số dư và lịch sử Point, lượt điểm danh, giới thiệu, sự kiện thưởng: dùng để cung cấp quyền sử dụng, đối soát, xử lý lỗi và chống gian lận.</dd></div>
              <div><dt>Thiết bị &amp; vận hành</dt><dd>Thông tin trình duyệt, kết nối, nhật ký lỗi, hoạt động truy cập và cài đặt: dùng để duy trì phiên, bảo mật, xử lý sự cố và vận hành tính năng.</dd></div>
            </dl>
            <p>Thông tin bạn nhập có thể chứa dữ liệu nhạy cảm như sức khỏe, đời sống riêng tư, xu hướng tính dục hoặc thông tin tài chính. Không đưa mật khẩu, OTP, giấy tờ định danh, thông tin thẻ hay chi tiết riêng tư không cần thiết vào câu hỏi. Chỉ cung cấp dữ liệu người khác khi có quyền hợp pháp; chọn giới tính trong tính năng tương hợp không phải khai báo xu hướng tính dục.</p>
            <h3>3.3. Sự đồng ý và cách xử lý</h3>
            <p>Tùy tính năng, dữ liệu có thể được tiếp nhận, tính toán, gửi tới nhà cung cấp xử lý, lưu, đồng bộ, truy xuất hoặc xóa. AstroX xử lý theo sự đồng ý phù hợp của bạn hoặc căn cứ khác được pháp luật cho phép trong trường hợp cụ thể; không mặc nhiên dùng “lợi ích chính đáng” làm căn cứ cho mọi mục đích.</p>
            <p>Sự đồng ý phải tự nguyện, rõ mục đích và có thể kiểm chứng. Im lặng, truy cập website hoặc chấp nhận điều khoản sử dụng không phải sự đồng ý mặc định cho quảng cáo, tiếp thị hay mục đích không liên quan. Nếu bổ sung mục đích cần sự đồng ý, AstroX phải thông báo và lấy sự đồng ý tương ứng trước khi xử lý. Không cung cấp dữ liệu cần thiết có thể khiến tính năng liên quan không thực hiện được; không vì thế làm mất các quyền khác của bạn.</p>
            <h3>3.4. Nhà cung cấp và việc chia sẻ</h3>
            <p>Các nhóm bên tham gia có thể gồm Zalo hoặc nhà cung cấp xác thực đang được sử dụng; Cloudflare cho hạ tầng, phân phối và lưu trữ; nhà cung cấp AI xử lý dữ liệu đầu vào cần thiết để trả kết quả; đối tác thanh toán đối soát giao dịch. Cơ quan có thẩm quyền được cung cấp dữ liệu khi có yêu cầu hợp pháp.</p>
            <p>AstroX không bán hoặc cho thuê dữ liệu cá nhân. Việc cung cấp dữ liệu cho nhà xử lý phải phù hợp mục đích và giới hạn cần thiết; điều khoản riêng của nhà cung cấp không thay thế nghĩa vụ của AstroX. Hạ tầng và nhà cung cấp AI có thể xử lý dữ liệu ngoài Việt Nam; việc chuyển dữ liệu phải đáp ứng điều kiện pháp luật áp dụng. Bạn có thể yêu cầu thông tin về bên nhận và phạm vi xử lý liên quan đến dữ liệu của mình qua đầu mối ở mục 3.1.</p>
            <h3>3.5. Cookie, lưu trên thiết bị và quảng cáo</h3>
            <p>Cookie phiên và bộ nhớ trình duyệt được dùng cho đăng nhập, hồ sơ, cài đặt, lịch sử cục bộ và ghi nhớ lựa chọn điều khoản. Xóa dữ liệu trình duyệt có thể làm mất phần dữ liệu chỉ lưu trên thiết bị; thao tác này không đồng thời xóa dữ liệu đã được lưu trên máy chủ.</p>
            <p>Nếu quảng cáo nhận thưởng được mở, thông tin về nhà cung cấp và xử lý dữ liệu liên quan phải được hiển thị trước khi bạn chọn xem. Từ chối quảng cáo không ngăn bạn dùng tính năng khác theo điều kiện thông thường. Việc đồng ý điều khoản ở bước đăng nhập không phải đồng ý cho theo dõi quảng cáo hoặc tiếp thị. Các lựa chọn cần sự đồng ý riêng phải được tách biệt.</p>
            <h3>3.6. Thời gian lưu và bảo mật</h3>
            <p>Dữ liệu tài khoản, hồ sơ và lịch sử được lưu trong thời gian cần cung cấp chức năng bạn sử dụng; bạn có thể yêu cầu xóa theo mục 3.8. Hồ sơ giao dịch, chứng cứ giải quyết tranh chấp và dữ liệu phải lưu theo luật chỉ được giữ trong phạm vi, thời hạn cần thiết cho nghĩa vụ đó. Khi không còn căn cứ lưu giữ, dữ liệu phải được xóa hoặc khử nhận dạng phù hợp; nếu chưa thể xóa một phần, AstroX giải thích căn cứ và phạm vi tiếp tục lưu.</p>
            <p>AstroX sử dụng kết nối HTTPS và biện pháp kiểm soát truy cập để bảo vệ dữ liệu. Không có hệ thống nào bảo đảm an toàn tuyệt đối; rủi ro có thể gồm truy cập trái phép, lộ dữ liệu, mất dữ liệu hoặc gián đoạn. Khi xảy ra sự cố, AstroX có trách nhiệm xử lý, hạn chế ảnh hưởng và thực hiện thông báo theo quy định, không coi việc bạn chấp nhận văn bản này là từ bỏ quyền được bảo vệ.</p>
            <h3>3.7. Quyền của bạn</h3>
            <p>Theo điều kiện pháp luật áp dụng, bạn có quyền được biết về xử lý dữ liệu; đồng ý hoặc rút lại sự đồng ý; xem, sửa hoặc yêu cầu cung cấp dữ liệu; yêu cầu xóa, hạn chế hoặc phản đối xử lý; khiếu nại, tố cáo, khởi kiện, yêu cầu bồi thường và tự bảo vệ. AstroX không thu hẹp các quyền này chỉ vì bạn đã từng đồng ý sử dụng dịch vụ.</p>
            <h3>3.8. Gửi yêu cầu và thời hạn</h3>
            <p>Gửi email tới <Contact /> với nội dung yêu cầu và thông tin giúp xác định tài khoản. AstroX có thể yêu cầu xác minh phù hợp để tránh cung cấp hoặc xóa dữ liệu cho người không có quyền; không yêu cầu mật khẩu hay OTP. Chúng tôi phản hồi ban đầu trong <strong>2 ngày làm việc</strong> kể từ khi nhận yêu cầu hợp lệ và hướng dẫn bổ sung nếu chưa đủ thông tin.</p>
            <dl className={styles.dataList}>
              <div><dt>Xem, sửa hoặc cung cấp dữ liệu</dt><dd>Thực hiện trong 10 ngày; trường hợp cần yêu cầu bên xử lý hoặc bên thứ ba chỉnh sửa: 15 ngày.</dd></div>
              <div><dt>Rút đồng ý, hạn chế hoặc phản đối</dt><dd>Thực hiện trong 15 ngày; trường hợp cần yêu cầu bên xử lý hoặc bên thứ ba ngừng xử lý: 20 ngày.</dd></div>
              <div><dt>Xóa dữ liệu</dt><dd>Thực hiện trong 20 ngày; trường hợp cần yêu cầu bên xử lý hoặc bên thứ ba xóa: 30 ngày.</dd></div>
            </dl>
            <p>Các thời hạn thực hiện trên tính từ khi nhận yêu cầu hợp lệ và là ngày theo lịch, không phải tất cả đều là ngày làm việc. Nếu cần gia hạn trong trường hợp được pháp luật cho phép, AstroX thông báo lý do và chỉ gia hạn một lần trong giới hạn tương ứng: tối đa 10 ngày cho xem/sửa/cung cấp, 15 ngày cho rút đồng ý/hạn chế/phản đối và 20 ngày cho xóa. Trường hợp phải từ chối hoặc tiếp tục lưu theo luật, chúng tôi nêu rõ căn cứ.</p>
            <h3>3.9. Hệ quả khi rút đồng ý</h3>
            <p>Rút lại sự đồng ý không làm thay đổi tính hợp pháp của hoạt động đã thực hiện trước đó trên căn cứ hợp lệ. AstroX ngừng phần xử lý dựa trên sự đồng ý đã rút theo thời hạn pháp luật; phần xử lý được luật cho phép không cần đồng ý chỉ tiếp tục đúng phạm vi căn cứ đó. Một số chức năng cá nhân hóa hoặc đồng bộ có thể không còn thực hiện được, và chúng tôi giải thích ảnh hưởng liên quan.</p>
            <h3>3.10. Trẻ em và người cần đại diện</h3>
            <p>Người từ 15 đến dưới 16 tuổi cần người đại diện theo pháp luật đồng ý việc xử lý dữ liệu theo quy định. Khi xử lý để công bố, tiết lộ thông tin về đời sống riêng tư hoặc bí mật cá nhân của trẻ từ đủ 7 tuổi, cần cả sự đồng ý của trẻ và người đại diện theo pháp luật. AstroX không coi một ô đồng ý chung là bằng chứng đã xác minh tư cách người đại diện.</p>
            <p>Người đại diện có thể liên hệ yêu cầu xem xét, ngừng xử lý hoặc xóa dữ liệu được cung cấp không hợp lệ. Dữ liệu của người mất, hạn chế năng lực hành vi hoặc có khó khăn trong nhận thức, làm chủ hành vi được xử lý theo quy định về đại diện và bảo vệ dữ liệu tương ứng. Không sử dụng thông tin trẻ em để quảng cáo hoặc công khai đời tư chỉ dựa vào sự đồng ý chung khi đăng nhập.</p>
            <h3>3.11. Cập nhật văn bản</h3>
            <p>AstroX ghi rõ phiên bản, ngày hiệu lực và thông báo thay đổi quan trọng. Mục đích xử lý mới không tự động được chấp thuận theo phiên bản cũ; phải thực hiện thông báo và lấy sự đồng ý mới khi pháp luật yêu cầu. Bạn có thể in hoặc lưu bản đang đọc để đối chiếu.</p>
          </div>
        </section>
        <footer id="lien-he-phap-ly" className={styles.footer}>
          <p className={styles.eyebrow}>CHÚNG TÔI SẴN SÀNG LẮNG NGHE</p>
          <h2>Cần làm rõ một điều?</h2><p>Gửi câu hỏi, yêu cầu hỗ trợ hoặc yêu cầu về dữ liệu cá nhân tới:</p><Contact />
          <p className={styles.contactMeta}>Ngô Thái Sơn · Đại diện AstroX<br />KĐT Vinhomes Ocean Park, Gia Lâm, TP. Hà Nội<br />Phản hồi ban đầu trong 2 ngày làm việc.</p>
          <Link className={styles.backHome} href="/">← Về trang chủ AstroX</Link>
        </footer>
      </div>
    </div>
  </div>;
}
