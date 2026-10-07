/**
 * Glossary of astrology, divination and lunar calendar terms.
 * Explanations are short, accessible and plain-language (<= 25 words).
 * Supported in both Vietnamese (VI) and English (EN).
 */

export interface GlossaryEntry {
  id: string;
  vi: {
    term: string;
    brief: string;
  };
  en: {
    term: string;
    brief: string;
  };
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // 12 Nhật thần (Day Deities)
  'thanh-long': {
    id: 'thanh-long',
    vi: { term: 'Thanh Long', brief: 'Thần hoàng đạo cát lợi bậc nhất, thuận lợi cho mưu sự lớn, cưới hỏi và khởi đầu mới.' },
    en: { term: 'Azure Dragon', brief: 'Foremost auspicious deity, highly favorable for major ventures, weddings, and new beginnings.' },
  },
  'minh-duong': {
    id: 'minh-duong',
    vi: { term: 'Minh Đường', brief: 'Thần hoàng đạo chủ về quang minh, quý nhân trợ giúp, thích hợp giao thiệp và cầu tài.' },
    en: { term: 'Bright Hall', brief: 'Auspicious deity bringing clarity, helpful benefactors, and good fortune in networking.' },
  },
  'thien-hinh': {
    id: 'thien-hinh',
    vi: { term: 'Thiên Hình', brief: 'Thần hắc đạo tượng trưng sự kỷ luật nghiêm khắc, nên cẩn trọng giấy tờ, tránh kiện tụng.' },
    en: { term: 'Heavenly Punisher', brief: 'Inauspicious deity of strict discipline; handle legal papers carefully and avoid disputes.' },
  },
  'chu-tuoc': {
    id: 'chu-tuoc',
    vi: { term: 'Chu Tước', brief: 'Thần hắc đạo dễ sinh khẩu thiệt, tranh cãi; nên giữ hòa khí, tránh thị phi phát ngôn.' },
    en: { term: 'Vermilion Bird', brief: 'Inauspicious deity linked to gossip and friction; favor calm diplomacy over debate.' },
  },
  'kim-quy': {
    id: 'kim-quy',
    vi: { term: 'Kim Quỹ', brief: 'Thần hoàng đạo giữ kho vàng bạc, rất tốt cho tích lũy tài sản, ký kết và kinh doanh.' },
    en: { term: 'Golden Treasury', brief: 'Auspicious deity guarding wealth, favorable for savings, commerce, and signing contracts.' },
  },
  'thien-duc': {
    id: 'thien-duc',
    vi: { term: 'Thiên Đức', brief: 'Thần hoàng đạo hóa giải tai ương, đem lại an lành, bao dung và nâng đỡ công việc.' },
    en: { term: 'Heavenly Virtue', brief: 'Auspicious deity mitigating misfortune, fostering harmony, protection, and goodwill.' },
  },
  'bach-ho': {
    id: 'bach-ho',
    vi: { term: 'Bạch Hổ', brief: 'Thần hắc đạo mang sát khí mạnh, khuyên nên giữ an toàn khi di chuyển và hoãn việc đại sự.' },
    en: { term: 'White Tiger', brief: 'Inauspicious deity of sharp force; prioritize safety in travel and postpone risky actions.' },
  },
  'ngoc-duong': {
    id: 'ngoc-duong',
    vi: { term: 'Ngọc Đường', brief: 'Thần hoàng đạo chủ về văn chương, học vấn, thi cử và khai trương cửa hàng.' },
    en: { term: 'Jade Hall', brief: 'Auspicious deity of scholarship, study, exams, arts, and business inaugurations.' },
  },
  'thien-lao': {
    id: 'thien-lao',
    vi: { term: 'Thiên Lao', brief: 'Thần hắc đạo tượng trưng sự trói buộc, giam giữ; không nên khởi sự kế hoạch dài hạn.' },
    en: { term: 'Heavenly Prison', brief: 'Inauspicious deity of confinement; best to tie up loose ends rather than launch major plans.' },
  },
  'huyen-vu': {
    id: 'huyen-vu',
    vi: { term: 'Huyền Vũ', brief: 'Thần hắc đạo chủ về khuất tất, dễ hao tài hoặc bị lừa dối; cần đề phòng tiểu nhân.' },
    en: { term: 'Dark Warrior', brief: 'Inauspicious deity warning of hidden risks and financial deceit; double-check details.' },
  },
  'tu-menh': {
    id: 'tu-menh',
    vi: { term: 'Tư Mệnh', brief: 'Thần hoàng đạo phù trợ sức khỏe, gia đạo bình an, thích hợp cúng lễ và việc thường nhật.' },
    en: { term: 'Commander', brief: 'Auspicious deity supporting vitality, home peace, ritual blessings, and daily steady routines.' },
  },
  'cau-tran': {
    id: 'cau-tran',
    vi: { term: 'Câu Trần', brief: 'Thần hắc đạo chủ về trì trệ, vướng mắc đất đai; nên tránh động thổ, chuyển nhà.' },
    en: { term: 'Hooked Array', brief: 'Inauspicious deity of lingering delays; avoid breaking ground or moving residences.' },
  },

  // Ngày tốt / xấu & Kiêng kỵ
  'hoang-dao': {
    id: 'hoang-dao',
    vi: { term: 'Hoàng đạo', brief: 'Ngày hoặc giờ có sao tốt cai quản, khí trường thuận hòa, rất tốt để tiến hành công việc.' },
    en: { term: 'Auspicious Day', brief: 'Days or hours governed by beneficent stars with smooth cosmic alignment for important actions.' },
  },
  'hac-dao': {
    id: 'hac-dao',
    vi: { term: 'Hắc đạo', brief: 'Ngày hoặc giờ khí trường xung sát, khuyên nên cẩn trọng, làm việc thường nhật, tránh mạo hiểm.' },
    en: { term: 'Inauspicious Day', brief: 'Days or hours with tense alignment; best for quiet routine work rather than high-stakes leaps.' },
  },
  'tam-nuong': {
    id: 'tam-nuong',
    vi: { term: 'Tam nương', brief: 'Các ngày 3, 7, 13, 18, 22, 27 âm lịch; dân gian kiêng khởi sự lớn hay đi xa.' },
    en: { term: 'Tam Nuong taboo', brief: 'Traditional taboo on 3rd, 7th, 13th, 18th, 22nd, 27th lunar days; best for low-risk endeavors.' },
  },
  'nguyet-ky': {
    id: 'nguyet-ky',
    vi: { term: 'Nguyệt kỵ', brief: 'Ngày 5, 14, 23 âm lịch (mùng 5, 14, 23 nửa đời nửa đoạn); dân gian khuyên tránh việc trọng đại.' },
    en: { term: 'Moon taboo', brief: 'Traditional taboo on 5th, 14th, 23rd lunar days; folk wisdom advises caution on major starts.' },
  },
  'gio-hoang-dao': {
    id: 'gio-hoang-dao',
    vi: { term: 'Giờ hoàng đạo', brief: 'Khoảng thời gian 2 tiếng trong ngày có năng lượng thuận lợi để xuất hành, gặp gỡ hay ký kết.' },
    en: { term: 'Auspicious Hours', brief: 'Two-hour windows with favorable energy for departures, key meetings, and negotiations.' },
  },
  'tiet-khi': {
    id: 'tiet-khi',
    vi: { term: 'Tiết khí', brief: '24 điểm chia thời tiết trong năm theo quỹ đạo Mặt Trời, phản ánh quy luật thiên nhiên và mùa vụ.' },
    en: { term: 'Solar Term', brief: '24 seasonal markers tracking the Sun’s ecliptic path, guiding traditional agrarian and energetic rhythms.' },
  },

  // Tử Vi Concepts
  'cuc': {
    id: 'cuc',
    vi: { term: 'Cục (Ngũ Hành Cục)', brief: 'Môi trường sống và nền tảng ngũ hành của bản mệnh, làm căn cứ an sao và tính đại vận.' },
    en: { term: 'Five Elements Bureau', brief: 'The environmental element foundation of your chart, dictating major 10-year planetary cycles.' },
  },
  'kim-tu-cuc': {
    id: 'kim-tu-cuc',
    vi: { term: 'Kim Tứ Cục', brief: 'Cục hành Kim, đại vận bắt đầu từ 4 tuổi; tư duy kiên định, lý trí, trọng nguyên tắc.' },
    en: { term: 'Metal 4th Bureau', brief: 'Metal-based chart bureau starting 10-year cycles at age 4; principled, structured, and resolute.' },
  },
  'thuy-nhi-cuc': {
    id: 'thuy-nhi-cuc',
    vi: { term: 'Thủy Nhị Cục', brief: 'Cục hành Thủy, đại vận bắt đầu từ 2 tuổi; linh hoạt, mềm mỏng, thích ứng và thấu cảm cao.' },
    en: { term: 'Water 2nd Bureau', brief: 'Water bureau cycle starting at age 2; highly adaptable, emotionally perceptive, and fluid.' },
  },
  'moc-tam-cuc': {
    id: 'moc-tam-cuc',
    vi: { term: 'Mộc Tam Cục', brief: 'Cục hành Mộc, đại vận bắt đầu từ 3 tuổi; hướng phát triển, sáng tạo, giàu tinh thần nhân ái.' },
    en: { term: 'Wood 3rd Bureau', brief: 'Wood bureau cycle starting at age 3; growth-oriented, imaginative, and compassionate.' },
  },
  'hoa-luc-cuc': {
    id: 'hoa-luc-cuc',
    vi: { term: 'Hỏa Lục Cục', brief: 'Cục hành Hỏa, đại vận bắt đầu từ 6 tuổi; nhiệt huyết, năng nổ, hành động nhanh và trực diện.' },
    en: { term: 'Fire 6th Bureau', brief: 'Fire bureau cycle starting at age 6; spirited, enthusiastic, dynamic, and direct in action.' },
  },
  'tho-ngu-cuc': {
    id: 'tho-ngu-cuc',
    vi: { term: 'Thổ Ngũ Cục', brief: 'Cục hành Thổ, đại vận bắt đầu từ 5 tuổi; trầm tĩnh, đáng tin cậy, chu đáo và kiên nhẫn.' },
    en: { term: 'Earth 5th Bureau', brief: 'Earth bureau cycle starting at age 5; grounded, reliable, patient, and deeply supportive.' },
  },
  'cung-menh': {
    id: 'cung-menh',
    vi: { term: 'Cung Mệnh', brief: 'Cung quan trọng nhất trong Tử Vi, đại diện tính cách cốt lõi, tư chất, hình dáng và bản sắc riêng.' },
    en: { term: 'Life Palace', brief: 'The core palace of the Zi Wei chart, reflecting inherent character, constitution, and temperament.' },
  },
  'chinh-tinh': {
    id: 'chinh-tinh',
    vi: { term: 'Chính tinh', brief: '14 ngôi sao chủ chốt chi phối cung, định hình phong cách hành động và xu hướng cuộc đời.' },
    en: { term: 'Major Star', brief: 'One of the 14 foundational stars that govern a palace and define overarching personal patterns.' },
  },
  'thien-dong': {
    id: 'thien-dong',
    vi: { term: 'Thiên Đồng', brief: 'Chính tinh hành Thủy, sao phúc thiện chủ về tâm hồn vui tươi, thích trải nghiệm và hiền hậu.' },
    en: { term: 'Tian Tong (Lucky Star)', brief: 'A benevolent Water star representing curiosity, youthful optimism, joy, and kindness.' },
  },
  'tu-vi': {
    id: 'tu-vi',
    vi: { term: 'Tử Vi', brief: 'Đế tinh hành Thổ, chủ phong thái lãnh đạo, lòng tự trọng, tư chất quản lý và khí chất trang nhã.' },
    en: { term: 'Zi Wei (Emperor Star)', brief: 'The Emperor Earth star embodying leadership presence, dignity, stewardship, and honor.' },
  },
  'thien-co': {
    id: 'thien-co',
    vi: { term: 'Thiên Cơ', brief: 'Trí tinh hành Mộc, đại diện trí tuệ nhạy bén, mưu lược, giỏi thích nghi và tính toán nhanh.' },
    en: { term: 'Tian Ji (Strategist Star)', brief: 'A Wood star of sharp intellect, agile planning, analytical thought, and resourcefulness.' },
  },
  'thai-duong': {
    id: 'thai-duong',
    vi: { term: 'Thái Dương', brief: 'Mặt Trời hành Hỏa, chủ về sự cởi mở, lòng hào sảng, quang minh chính đại và cống hiến.' },
    en: { term: 'Tai Yang (Sun Star)', brief: 'The Sun Fire star representing generosity, outspoken radiance, fairness, and public drive.' },
  },
  'vu-khuc': {
    id: 'vu-khuc',
    vi: { term: 'Vũ Khúc', brief: 'Tài tinh hành Kim, đại diện tính quyết đoán, thực tế, kiên cường và năng lực quản lý tài chính.' },
    en: { term: 'Wu Qu (Finance Star)', brief: 'A Metal finance star of decisive execution, resilience, practicality, and wealth management.' },
  },
  'liem-trinh': {
    id: 'liem-trinh',
    vi: { term: 'Liêm Trinh', brief: 'Chính tinh hành Hỏa, cá tính sắc sảo, nguyên tắc cao, độc lập và có sức hút mãnh liệt.' },
    en: { term: 'Lian Zhen (Integrity Star)', brief: 'A Fire star of high standards, magnetic charisma, independence, and sharp discipline.' },
  },
  'thien-phu': {
    id: 'thien-phu',
    vi: { term: 'Thiên Phủ', brief: 'Kho báu hành Thổ, chủ tính cẩn trọng, bao dung, quản lý ổn định và đời sống sung túc.' },
    en: { term: 'Tian Fu (Treasury Star)', brief: 'An Earth treasury star representing stability, prudent stewardship, and steady abundance.' },
  },
  'thai-am': {
    id: 'thai-am',
    vi: { term: 'Thái Âm', brief: 'Mặt Trăng hành Thủy, chủ trực giác tinh tế, tình cảm dịu dàng, thẩm mỹ và sự chu đáo.' },
    en: { term: 'Tai Yin (Moon Star)', brief: 'The Moon Water star of deep intuition, delicate empathy, aesthetic taste, and gentle grace.' },
  },
  'tham-lang': {
    id: 'tham-lang',
    vi: { term: 'Tham Lang', brief: 'Chính tinh hành Mộc-Thủy, đam mê học hỏi, giao thiệp rộng, đa tài và giàu trải nghiệm.' },
    en: { term: 'Tan Lang (Desire Star)', brief: 'A versatile star of exploration, multifaceted talents, vibrant social charm, and appetite for life.' },
  },
  'cu-mon': {
    id: 'cu-mon',
    vi: { term: 'Cự Môn', brief: 'Ám tinh hành Thủy, sở hữu tài hùng biện, tư duy phản biện sâu, giỏi nghiên cứu chi tiết.' },
    en: { term: 'Ju Men (Orator Star)', brief: 'A Water star of incisive speech, forensic inquiry, critical insight, and persuasive power.' },
  },
  'thien-tuong': {
    id: 'thien-tuong',
    vi: { term: 'Thiên Tướng', brief: 'Ấn tinh hành Thủy, tính tình chính trực, tận tụy, thích giúp đỡ và giữ chữ tín.' },
    en: { term: 'Tian Xiang (Minister Star)', brief: 'A trusted Water star representing loyalty, integrity, supportive service, and fairness.' },
  },
  'thien-luong': {
    id: 'thien-luong',
    vi: { term: 'Thiên Lương', brief: 'Ấm tinh hành Mộc, người che chở, giàu kinh nghiệm, đạo đức và có duyên làm thầy/cố vấn.' },
    en: { term: 'Tian Liang (Sage Star)', brief: 'A Wood mentor star of wisdom, elder counsel, benevolence, and protective guidance.' },
  },
  'that-sat': {
    id: 'that-sat',
    vi: { term: 'Thất Sát', brief: 'Tướng tinh hành Kim-Hỏa, dũng cảm, dám đương đầu rủi ro, tiên phong và độc lập tác chiến.' },
    en: { term: 'Qi Sha (Vanguard Star)', brief: 'A formidable Metal-Fire star of courage, trailblazing grit, and independent leadership.' },
  },
  'pha-quan': {
    id: 'pha-quan',
    vi: { term: 'Phá Quân', brief: 'Hao tinh hành Thủy, ưa đổi mới, sáng tạo bứt phá, không ngại phá vỡ khuôn mẫu cũ.' },
    en: { term: 'Po Jun (Pioneer Star)', brief: 'A dynamic Water catalyst star favoring bold renewal, breakthrough shifts, and reinvention.' },
  },
  'vo-chinh-dieu': {
    id: 'vo-chinh-dieu',
    vi: { term: 'Vô chính diệu', brief: 'Cung không có 14 chính tinh toạ thủ; tính linh hoạt cao, mượn ảnh hưởng từ cung đối diện.' },
    en: { term: 'No Major Star', brief: 'A palace without primary stars; highly adaptable, drawing influence from the opposite palace.' },
  },

  // Kinh Dịch / Bát Tự
  'the-dung': {
    id: 'the-dung',
    vi: { term: 'Thể - Dụng', brief: 'Thể là bản thân người hỏi (chủ thể), Dụng là sự việc đang hướng tới (khách thể).' },
    en: { term: 'Subject - Object', brief: 'The Subject represents yourself; the Object represents the situation or matter inquired about.' },
  },
  'que-bien': {
    id: 'que-bien',
    vi: { term: 'Quẻ biến', brief: 'Quẻ mới tạo thành sau khi các hào động đổi trạng thái (âm sang dương hoặc ngược lại), chỉ xu hướng tương lai.' },
    en: { term: 'Transformed Hexagram', brief: 'The resulting hexagram after moving lines invert, revealing the future trend of the situation.' },
  },
  'que-ho': {
    id: 'que-ho',
    vi: { term: 'Quẻ hỗ', brief: 'Quẻ ẩn ghép từ các hào trung tâm của quẻ chính, phản ánh diễn biến ngầm bên trong.' },
    en: { term: 'Nuclear Hexagram', brief: 'An internal hexagram formed by inner lines, pointing to hidden dynamics beneath the surface.' },
  },
  'hao-dong': {
    id: 'hao-dong',
    vi: { term: 'Hào động', brief: 'Vị trí hào đang biến chuyển trong quẻ, là tâm điểm chứa lời khuyên trọng yếu cho thời điểm này.' },
    en: { term: 'Moving Line', brief: 'The shifting line in the hexagram holding the pivotal action advice for your current moment.' },
  },
  'ngu-hanh': {
    id: 'ngu-hanh',
    vi: { term: 'Ngũ hành', brief: '5 dạng năng lượng tương tác trong vũ trụ: Kim, Mộc, Thủy, Hỏa, Thổ trong quan hệ tương sinh tương khắc.' },
    en: { term: 'Five Elements', brief: 'The five archetypal energies (Wood, Fire, Earth, Metal, Water) interacting in dynamic harmony.' },
  },
};

/** Normalize string to simplify fuzzy glossary lookup */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Find glossary explanation by Vietnamese label, English label, or canonical key.
 */
export function lookupGlossary(rawText: string, locale: 'vi' | 'en' = 'vi'): { term: string; brief: string; id: string } | null {
  if (!rawText) return null;
  const key = normalize(rawText);

  // Exact key match
  if (GLOSSARY[key]) {
    const entry = GLOSSARY[key];
    return {
      id: entry.id,
      term: locale === 'en' ? entry.en.term : entry.vi.term,
      brief: locale === 'en' ? entry.en.brief : entry.vi.brief,
    };
  }

  // Value scan
  for (const entry of Object.values(GLOSSARY)) {
    const viNorm = normalize(entry.vi.term);
    const enNorm = normalize(entry.en.term);
    if (key === viNorm || key === enNorm || key.includes(viNorm) || viNorm.includes(key)) {
      return {
        id: entry.id,
        term: locale === 'en' ? entry.en.term : entry.vi.term,
        brief: locale === 'en' ? entry.en.brief : entry.vi.brief,
      };
    }
  }

  return null;
}
