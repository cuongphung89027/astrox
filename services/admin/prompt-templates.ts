export default [
  {
    "id": "tuvi.profileContextText.0",
    "module": "tuvi",
    "template": "Thông tin người xem: {{v0}}, {{v1}}, sinh dương lịch {{v2}}, giờ {{v3}}, tại {{v4}}.",
    "variables": [
      "p.name",
      "p.gender",
      "formatDob(p.dob)",
      "p.hourChi",
      "p.place"
    ],
    "source": "web/src/lib/tuvi.ts:304"
  },
  {
    "id": "tuvi.ziweiContextText.0",
    "module": "tuvi",
    "template": "DỮ LIỆU LÁ SỐ TỬ VI ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): {{v0}}",
    "variables": [
      "JSON.stringify(chart)"
    ],
    "source": "web/src/lib/tuvi.ts:309"
  },
  {
    "id": "tuvi.tuviPromptBody.0",
    "module": "tuvi",
    "template": "{{v0}}\n{{v1}}\n\nQUY TẮC PHÂN TÍCH LÁ SỐ: bắt đầu ngay từ dữ liệu trên — luận giải trực tiếp các sao, cung và đại vận đã cho. Cấm nói các câu như \"không đọc được\", \"thiếu dữ liệu\", \"hãy bổ sung ngày giờ sinh\". Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó và phân tích phần còn lại.\n\n{{v2}}",
    "variables": [
      "profileContextText(profile)",
      "chartLine",
      "taskText"
    ],
    "source": "web/src/lib/tuvi.ts:316"
  },
  {
    "id": "tuvi.tuviPeriodPromptText.0",
    "module": "tuvi",
    "template": "Hôm nay là {{v0}} ({{v1}}). Dựa trên lá số trên, viết 3 gạch đầu dòng ngắn về sắc thái {{v2}}: 1 câu công việc, 1 câu tình cảm/quan hệ, 1 câu lời khuyên. Diễn giải theo các sao, cung và tiểu vận đã cho.",
    "variables": [
      "label",
      "ptext",
      "ptext"
    ],
    "source": "web/src/lib/tuvi.ts:330"
  },
  {
    "id": "tuvi.tuviPeriodPromptText.1",
    "module": "tuvi",
    "template": "DỮ LIỆU LƯU CHUYỂN HÔM NAY là {{v0}} (tính bằng thuật toán Tử Vi thật — Lưu Nhật, Tứ Hóa):\n{{v1}}\n\nNhiệm vụ: dựa trên Lưu Nhật và Tứ Hóa hôm nay ở trên, viết đúng 3 gạch đầu dòng cho HÔM NAY: 1 câu công việc, 1 câu tình cảm, 1 câu lời khuyên. Mỗi ý phải nhắc cụ thể tới cung hoặc sao lưu chuyển đã cho (tên cung Lưu Nhật Mệnh nhập, hoặc sao Hóa Lộc/Hóa Kỵ...). Cấm viết chung chung dùng được cho mọi ngày.",
    "variables": [
      "label",
      "sky"
    ],
    "source": "web/src/lib/tuvi.ts:332"
  },
  {
    "id": "tuvi.tuviPeriodPromptText.2",
    "module": "tuvi",
    "template": "DỮ LIỆU LƯU CHUYỂN TUẦN NÀY là {{v0}} (mẫu Lưu Nhật các ngày trong tuần, tính bằng thuật toán Tử Vi thật):\n{{v1}}\n\nNhiệm vụ: dựa trên diễn biến Lưu Nhật cả tuần ở trên, viết đúng 3 gạch đầu dòng cho CẢ TUẦN: 1 câu công việc (ngày nào thuận/kỵ dựa trên cung Lưu Nhật Mệnh nhập), 1 câu tình cảm, 1 câu lời khuyên theo nhịp tuần. Phải nêu khác biệt giữa các ngày mẫu, cấm viết nội dung dùng được cho một ngày đơn lẻ.",
    "variables": [
      "label",
      "sky"
    ],
    "source": "web/src/lib/tuvi.ts:333"
  },
  {
    "id": "tuvi.tuviPeriodPromptText.3",
    "module": "tuvi",
    "template": "DỮ LIỆU LƯU CHUYỂN THÁNG NÀY là {{v0}} (Lưu Nguyệt + mẫu Lưu Nhật trong tháng, tính bằng thuật toán Tử Vi thật):\n{{v1}}\n\nNhiệm vụ: dựa trên Lưu Nguyệt và Tứ Hóa tháng ở trên, viết đúng 3 gạch đầu dòng cho CẢ THÁNG: 1 câu công việc (giai đoạn nào bứt phá/giữ nhịp), 1 câu tình cảm, 1 câu lời khuyên chiến lược tháng. Tầm nhìn tháng, cấm viết nội dung của riêng một ngày.",
    "variables": [
      "label",
      "sky"
    ],
    "source": "web/src/lib/tuvi.ts:334"
  },
  {
    "id": "zodiac.profileContextText.0",
    "module": "zodiac",
    "template": "Thông tin người xem: {{v0}}, {{v1}}, sinh dương lịch {{v2}}, giờ {{v3}}, tại {{v4}}.",
    "variables": [
      "p.name",
      "p.gender",
      "formatDob(p.dob)",
      "p.hourChi",
      "p.place"
    ],
    "source": "web/src/lib/zodiac.ts:441"
  },
  {
    "id": "zodiac.natalContextText.0",
    "module": "zodiac",
    "template": "DỮ LIỆU BẢN ĐỒ SAO ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): {{v0}}",
    "variables": [
      "JSON.stringify(natalChart)"
    ],
    "source": "web/src/lib/zodiac.ts:446"
  },
  {
    "id": "zodiac.zodiacPromptBody.0",
    "module": "zodiac",
    "template": "{{v0}}\n{{v1}}\n\nQUY TẮC PHÂN TÍCH BẢN ĐỒ SAO: bắt đầu ngay từ dữ liệu trên — luận giải trực tiếp các hành tinh, nhà, góc chiếu, MC và Cung Mọc đã cho. Cấm nói các câu như \"không đọc được\", \"thiếu dữ liệu\", \"hãy bổ sung ngày giờ sinh\". Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó và phân tích phần còn lại.\n\n{{v2}}",
    "variables": [
      "profileContextText(profile)",
      "natalLine",
      "taskText"
    ],
    "source": "web/src/lib/zodiac.ts:452"
  },
  {
    "id": "zodiac.zodiacPeriodPrompt.0",
    "module": "zodiac",
    "template": "Dự báo cho cung {{v0}} ({{v1}}), nguyên tố {{v2}}, hành tinh chủ quản {{v3}}.",
    "variables": [
      "sign.name",
      "sign.en",
      "sign.element",
      "sign.ruler"
    ],
    "source": "web/src/lib/zodiac.ts:466"
  },
  {
    "id": "zodiac.zodiacPeriodPrompt.1",
    "module": "zodiac",
    "template": "{{v0}}\n\n{{v1}}",
    "variables": [
      "base",
      "guide[period] || guide.today"
    ],
    "source": "web/src/lib/zodiac.ts:482"
  },
  {
    "id": "zodiac.compatPrompt.0",
    "module": "zodiac",
    "template": "So sánh mức độ hợp nhau giữa hai người theo cung hoàng đạo (chiêm tinh phương Tây, hệ tropical):\nNgười 1 (bạn): {{v0}}, cung Mặt Trời {{v1}} ({{v2}}), nguyên tố {{v3}}, tính chất {{v4}}, hành tinh chủ quản {{v5}}, đặc tính: {{v6}}.\nNgười 2: cung Mặt Trời {{v7}} ({{v8}}), nguyên tố {{v9}}, tính chất {{v10}}, hành tinh chủ quản {{v11}}, đặc tính: {{v12}}.\nDỮ LIỆU ĐÃ TÍNH (nguồn duy nhất, kết luận không được mâu thuẫn): khoảng góc {{v13}}° ({{v14}}), quan hệ nguyên tố: {{v15}} — {{v16}}, điểm tương hợp tĩnh {{v17}}/100.\nTrả lời DUY NHẤT bằng JSON hợp lệ, không thêm chữ nào khác:\n{\"percent\": {{v18}}, \"strengths\": [\"...\", \"...\", \"...\"], \"watchouts\": [\"...\", \"...\"], \"advice\": \"...\"}",
    "variables": [
      "profile ? profile.name : \"Người xem\"",
      "a.name",
      "a.en",
      "a.element",
      "a.quality",
      "a.ruler",
      "a.traits",
      "b.name",
      "b.en",
      "b.element",
      "b.quality",
      "b.ruler",
      "b.traits",
      "analysis.angle",
      "analysis.aspectLabel",
      "analysis.relation",
      "analysis.elementNote",
      "analysis.percent",
      "analysis.percent"
    ],
    "source": "web/src/lib/zodiac.ts:604"
  },
  {
    "id": "batu.buildBatuPromptBody.0",
    "module": "batu",
    "template": "Thông tin người xem: {{v0}}, {{v1}}, sinh dương lịch {{v2}}, giờ {{v3}}, tại {{v4}}.\n",
    "variables": [
      "profile.name",
      "profile.gender",
      "profile.dob.split(\"-\").reverse().join(\"-\")",
      "profile.hourChi",
      "profile.place"
    ],
    "source": "web/src/lib/batu.ts:334"
  },
  {
    "id": "batu.buildBatuPromptBody.1",
    "module": "batu",
    "template": "DỮ LIỆU LÁ SỐ BÁT TỰ ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): {{v0}}",
    "variables": [
      "JSON.stringify(chart)"
    ],
    "source": "web/src/lib/batu.ts:336"
  },
  {
    "id": "batu.buildBatuPromptBody.2",
    "module": "batu",
    "template": "{{v0}}{{v1}}\n\nQUY TẮC PHÂN TÍCH BÁT TỰ: bắt đầu ngay từ dữ liệu Tứ Trụ, Thập Thần và tỷ lệ Ngũ Hành đã cho — không được nói \"thiếu dữ liệu\" hay yêu cầu bổ sung ngày giờ sinh. Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó và phân tích phần còn lại.\n\n{{v2}}",
    "variables": [
      "profileLine",
      "chartLine",
      "taskText"
    ],
    "source": "web/src/lib/batu.ts:337"
  },
  {
    "id": "numerology.profileContextText.0",
    "module": "numerology",
    "template": "Thông tin người xem: {{v0}}, {{v1}}, sinh dương lịch {{v2}}, giờ {{v3}}, tại {{v4}}.",
    "variables": [
      "profile.name || \"\"",
      "profile.gender || \"\"",
      "formatDobVi(profile.dob)",
      "profile.hourChi || \"\"",
      "profile.place || \"\""
    ],
    "source": "web/src/lib/numerology.ts:354"
  },
  {
    "id": "numerology.numerologyContextText.0",
    "module": "numerology",
    "template": "DỮ LIỆU THẦN SỐ HỌC ĐÃ TÍNH (đầy đủ, AI phải dùng trực tiếp — không được nói thiếu dữ liệu): {{v0}}",
    "variables": [
      "JSON.stringify(chart)"
    ],
    "source": "web/src/lib/numerology.ts:358"
  },
  {
    "id": "numerology.numerologyPromptBody.0",
    "module": "numerology",
    "template": "{{v0}}\n{{v1}}\n\nQUY TẮC PHÂN TÍCH THẦN SỐ HỌC: bắt đầu ngay từ dữ liệu các chỉ số đã tính (Số Chủ Đạo, Sứ Mệnh, Linh Hồn, Nhân Cách, biểu đồ ngày sinh, chu kỳ Đỉnh Cao/Thử Thách, năm cá nhân) — không được nói \"thiếu dữ liệu\" hay yêu cầu bổ sung thông tin. Với phần \"grid\" (biểu đồ ngày sinh): tự luận giải ý nghĩa số khuyết/số lặp và các hàng/cột/đường chéo nếu đủ 3 số liên tiếp cùng xuất hiện trong lưới 3x3 (hàng trên 3-6-9, hàng giữa 2-5-8, hàng dưới 1-4-7, cùng các cột và đường chéo tương ứng) — không cần dùng tên gọi cố định cho từng đường vì tên gọi khác nhau giữa các trường phái, chỉ mô tả ý nghĩa dựa trên các con số cụ thể có mặt. Nếu một chi tiết thật sự không có trong JSON thì bỏ qua chi tiết đó.\n\n{{v2}}",
    "variables": [
      "profileContextText(profile)",
      "line",
      "taskText"
    ],
    "source": "web/src/lib/numerology.ts:367"
  },
  {
    "id": "kinhdich.buildKdPrompt.0",
    "module": "kinhdich",
    "template": "Thông tin người xem: {{v0}}, {{v1}}, sinh dương lịch {{v2}}, giờ {{v3}}, tại {{v4}}.\n",
    "variables": [
      "profile.name",
      "profile.gender",
      "profile.dob.split(\"-\").reverse().join(\"-\")",
      "profile.hourChi",
      "profile.place"
    ],
    "source": "web/src/lib/kinhdich.ts:174"
  },
  {
    "id": "kinhdich.buildKdPrompt.1",
    "module": "kinhdich",
    "template": "{{v0}}Luận giải quẻ Kinh Dịch theo phương pháp Mai Hoa Dịch Số (Số Pháp), dùng 3 số ngẫu nhiên {{v1}}, {{v2}}, {{v3}}.\nCâu hỏi của người gieo quẻ: \"{{v4}}\"\n\nDữ liệu quẻ đã tính chính xác theo toán pháp:\n- Thượng quái (ngoại quái): {{v5}} {{v6}} — tượng {{v7}}, ngũ hành {{v8}}, phương {{v9}}.\n- Hạ quái (nội quái): {{v10}} {{v11}} — tượng {{v12}}, ngũ hành {{v13}}, phương {{v14}}.\n- Hào động: hào thứ {{v15}} (đếm từ dưới lên: Sơ Hào=1, Hào Nhị=2, Hào Tam=3, Hào Tứ=4, Hào Ngũ=5, Hào Thượng=6).\n- Thể quái (quái CHỨA hào động, đại diện người hỏi): {{v16}} {{v17}} ({{v18}}).\n- Dụng quái (quái KHÔNG chứa hào động, đại diện sự việc): {{v19}} {{v20}} ({{v21}}).\n- Quan hệ Thể-Dụng theo ngũ hành: {{v22}} — {{v23}}\n- Quẻ biến (sau khi đảo hào động): Thượng {{v24}} {{v25}}, Hạ {{v26}} {{v27}}.\n- Quẻ hỗ (hào 2-3-4 làm nội, hào 3-4-5 làm ngoại): Thượng {{v28}} {{v29}}, Hạ {{v30}} {{v31}}.\n\nNhiệm vụ của bạn (theo đúng phép luận Thể-Dụng của Mai Hoa Dịch Số):\n1. Xác định và nêu rõ **tên quẻ chính** theo tên gọi cổ điển trong Kinh Dịch (ghép từ tượng {{v32}} trên + {{v33}} dưới, ví dụ dạng \"Thiên Địa Bĩ\", \"Địa Thiên Thái\"...). Nếu không chắc chắn 100% tên riêng cổ điển chính xác, hãy nói rõ tên ghép theo tượng (ví dụ \"quẻ {{v34}} {{v35}}\") thay vì đoán bừa tên riêng.\n2. Giải nghĩa ý nghĩa tổng quát của quẻ chính, gắn với câu hỏi.\n3. Diễn giải hào động (hào thứ {{v36}}) — đây là trọng tâm lời khuyên. Hào động nằm ở quái {{v37}}, vì vậy {{v38}} quái là **Thể** (bản thân người hỏi), quái còn lại là **Dụng** (sự việc được hỏi).\n4. Diễn giải ý nghĩa quan hệ Thể-Dụng đã tính ở trên ({{v39}}) trong bối cảnh câu hỏi — đây là lõi của phép luận Mai Hoa.\n5. Gợi ý ngắn từ quẻ biến ({{v40}} trên {{v41}} dưới) và quẻ hỗ ({{v42}} trên {{v43}} dưới) — quẻ hỗ là động lực ngầm bên trong, quẻ biến là xu hướng nếu tình hình tiếp diễn.\n6. Kết luận bằng 1 lời khuyên hành động cụ thể, ngắn gọn.\n\nTrình bày ngắn gọn khoảng 180–280 từ, đúng ba phần: **Điều đáng chú ý** (2–3 câu trả lời trực tiếp điều người dùng hỏi), **Gợi ý cho bạn** (tối đa 3 hành động hoặc điều cần cân nhắc cụ thể), **Cơ sở luận quẻ** (giải thích ngắn hào động, Thể-Dụng, quẻ biến và quẻ hỗ). Không lời chào, không nhắc lại câu hỏi, không kể lại dữ liệu sinh hay danh sách dữ liệu quẻ. Dùng ngôn ngữ đời thường ở hai phần đầu, chỉ đưa thuật ngữ vào phần cơ sở. Không khẳng định tương lai chắc chắn; đây là gợi ý chiêm nghiệm, không phải phán quyết định mệnh.",
    "variables": [
      "profileLine",
      "result.s1",
      "result.s2",
      "result.s3",
      "question",
      "result.upper.name",
      "result.upper.symbol",
      "result.upper.nature",
      "result.upper.elem",
      "result.upper.dir",
      "result.lower.name",
      "result.lower.symbol",
      "result.lower.nature",
      "result.lower.elem",
      "result.lower.dir",
      "result.movingPos",
      "result.the.name",
      "result.the.symbol",
      "result.the.elem",
      "result.dung.name",
      "result.dung.symbol",
      "result.dung.elem",
      "result.relation.label",
      "result.relation.desc",
      "result.bienUpper.name",
      "result.bienUpper.symbol",
      "result.bienLower.name",
      "result.bienLower.symbol",
      "result.hoUpper.name",
      "result.hoUpper.symbol",
      "result.hoLower.name",
      "result.hoLower.symbol",
      "result.upper.nature",
      "result.lower.nature",
      "result.upper.nature",
      "result.lower.nature",
      "result.movingPos",
      "result.the.name",
      "result.theIsLower ? \"Hạ\" : \"Thượng\"",
      "result.relation.label",
      "result.bienUpper.name",
      "result.bienLower.name",
      "result.hoUpper.name",
      "result.hoLower.name"
    ],
    "source": "web/src/lib/kinhdich.ts:176"
  },
  {
    "id": "tarot.buildTarotPrompt.0",
    "module": "tarot",
    "template": "{{v0}}. Vị trí \"{{v1}}\": {{v2}}",
    "variables": [
      "i + 1",
      "positionLabels[i]",
      "c.id"
    ],
    "source": "web/src/lib/tarot.ts:256"
  },
  {
    "id": "tarot.buildTarotPrompt.1",
    "module": "tarot",
    "template": "{{v0}}. Vị trí \"{{v1}}\": {{v2}} — {{v3}}. Từ khoá: {{v4}}. Ý nghĩa: {{v5}}",
    "variables": [
      "i + 1",
      "positionLabels[i]",
      "card.nameEn",
      "dir",
      "meaning.kw.join(\", \")",
      "meaning.text"
    ],
    "source": "web/src/lib/tarot.ts:259"
  },
  {
    "id": "tarot.buildTarotPrompt.2",
    "module": "tarot",
    "template": "{{v0}}\n",
    "variables": [
      "input.profileContext"
    ],
    "source": "web/src/lib/tarot.ts:263"
  },
  {
    "id": "tarot.buildTarotPrompt.3",
    "module": "tarot",
    "template": "{{v0}}Luận giải trải bài Tarot \"{{v1}}\" ({{v2}} lá), bộ bài {{v3}}.\nCâu hỏi của người trải bài: \"{{v4}}\"\n\nCác lá đã rút (dữ liệu đã xác định sẵn theo đúng thứ tự vị trí — KHÔNG được tự đổi tên lá, đổi chiều xuôi/ngược, hay bịa thêm lá khác ngoài danh sách này):\n{{v5}}\n\nNhiệm vụ của bạn:\nGiữ nguyên tên tiếng Anh gốc của các lá bài trong toàn bộ luận giải, không dịch tên lá sang tiếng Việt.\n1. Luận giải từng vị trí theo đúng thứ tự trên — gắn ý nghĩa lá bài (xuôi/ngược, đã cho) với ý nghĩa của vị trí đó và câu hỏi.\n2. Chỉ ra mối liên hệ/tương tác đáng chú ý giữa các lá trong trải bài (ví dụ lặp chất bài, nhiều lá ngược, các lá bổ trợ hay mâu thuẫn nhau).\n3. Kết luận bằng một đoạn tổng hợp và một lời khuyên hành động cụ thể.\n\nChia đoạn có tiêu đề in đậm cho từng vị trí (đặt tên vị trí + tên lá), và một đoạn **Tổng hợp & lời khuyên** ở cuối. Giữ tinh thần \"không có lá bài tốt/xấu tuyệt đối — đây là gợi ý xu hướng, không phải định mệnh cố định\". ~{{v6}} từ.",
    "variables": [
      "profileLine",
      "spread.name",
      "spread.count",
      "deck.name",
      "question",
      "cardLines",
      "lengthHint"
    ],
    "source": "web/src/lib/tarot.ts:264"
  },
  {
    "id": "zodiac.periodGuide.today",
    "module": "zodiac",
    "template": "DỮ LIỆU QUÁ CẢNH HÔM NAY (vị trí thật của các hành tinh hôm nay, tính bằng astronomy-engine):\n{{v0}}\n\nNhiệm vụ: dựa trên quá cảnh hôm nay — đặc biệt là vị trí Mặt Trăng theo giờ, các góc chiếu của Thuỷ/Kim/Hoả/Mặt Trời với bản đồ sao natal, và pha Mặt Trăng — viết đúng 3 gạch đầu dòng cho HÔM NAY: 1 câu công việc, 1 câu tình cảm, 1 câu lời khuyên cụ thể gắn với chuyển động trong ngày. Mỗi ý phải nhắc tới ít nhất một yếu tố quá cảnh cụ thể (ví dụ Mặt Trăng ở cung nào, góc chiếu nào đang chặt). Cấm viết chung chung dùng được cho mọi ngày.",
    "variables": [
      "sky"
    ],
    "source": "web/src/lib/zodiac.ts · zodiacPeriodPrompt"
  },
  {
    "id": "zodiac.periodGuide.week",
    "module": "zodiac",
    "template": "DỮ LIỆU QUÁ CẢNH TUẦN NÀY (vị trí thật tại hôm nay, +2, +4, +6 ngày):\n{{v0}}\n\nNhiệm vụ: dựa trên diễn biến quá cảnh cả tuần — Mặt Trăng đi qua các cung nào, góc chiếu nào hình thành/rời đi giữa tuần — viết đúng 3 gạch đầu dòng cho CẢ TUẦN: 1 câu công việc (ngày nào thuận/kỵ), 1 câu tình cảm, 1 câu lời khuyên phân bổ năng lượng theo nhịp tuần. Phải nêu chuyển động theo thời gian, cấm viết nội dung dùng được cho một ngày đơn lẻ.",
    "variables": [
      "sky"
    ],
    "source": "web/src/lib/zodiac.ts · zodiacPeriodPrompt"
  },
  {
    "id": "zodiac.periodGuide.month",
    "module": "zodiac",
    "template": "DỮ LIỆU QUÁ CẢNH THÁNG NÀY (vị trí thật tại hôm nay, +7, +14, +21, +28 ngày) — tập trung hành tinh chậm:\n{{v0}}\n\nNhiệm vụ: dựa trên quá cảnh tháng — Mặt Trời đổi cung khi nào, Kim/Hoả/Mộc/Thổ di chuyển ra sao, pha Mặt Trăng tròn/non rơi vào lúc nào — viết đúng 3 gạch đầu dòng cho CẢ THÁNG: 1 câu công việc (giai đoạn nào bứt phá/giữ nhịp), 1 câu tình cảm, 1 câu lời khuyên chiến lược tháng. Tầm nhìn tháng, cấm viết nội dung ngày/tuần.",
    "variables": [
      "sky"
    ],
    "source": "web/src/lib/zodiac.ts · zodiacPeriodPrompt"
  },
  {
    "id": "tuvi.periodPresentation",
    "module": "tuvi",
    "template": "{{v0}}\nTrình bày thành đúng 3 mục với tiêu đề riêng trên một dòng: ## Nhịp chung, ## Điều thuận lợi, ## Điều cần lưu tâm. Giữ đủ nội dung được yêu cầu trong các mục này.",
    "variables": [
      "periodPrompt"
    ],
    "source": "web/src/components/tuvi/PeriodPanel.tsx"
  },
  {
    "id": "compat.original",
    "module": "compat",
    "template": "So sánh mức độ hợp nhau giữa hai người theo Tử Vi Đẩu Số:\nNgười 1 (bạn): {{v0}}, {{v1}}, sinh {{v2}}, giờ {{v3}}, tại {{v4}}.\nNgười 2: {{v5}}, {{v6}}, sinh {{v7}}.\nTrả lời DUY NHẤT bằng JSON hợp lệ, không thêm chữ nào khác:\n{\"percent\": <số nguyên 0-100>, \"strengths\": [\"...\", \"...\", \"...\"], \"watchouts\": [\"...\", \"...\"], \"advice\": \"...\"}",
    "variables": [
      "name",
      "gender",
      "dob",
      "hourChi",
      "place",
      "partnerName",
      "partnerGender",
      "partnerDob"
    ],
    "source": "index.html:4170"
  }
];
