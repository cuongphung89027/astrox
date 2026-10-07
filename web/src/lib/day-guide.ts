/**
 * Folk almanac guidelines for the 12 day deities (Nhật Thần).
 * Provides concise suitable ("Hợp") and avoided ("Tránh") actions
 * for fast scanning in both Vietnamese and English.
 */

export interface DayGuide {
  deityVi: string;
  deityEn: string;
  isGood: boolean; // Hoàng đạo (true) / Hắc đạo (false)
  suitsVi: string[];
  suitsEn: string[];
  avoidVi: string[];
  avoidEn: string[];
}

export const DAY_GUIDES: Record<number, DayGuide> = {
  // 0: Thanh Long (Hoàng đạo)
  0: {
    deityVi: 'Thanh Long',
    deityEn: 'Azure Dragon',
    isGood: true,
    suitsVi: ['Khai trương', 'Cưới hỏi', 'Khởi sự lớn'],
    suitsEn: ['Grand openings', 'Weddings', 'New ventures'],
    avoidVi: ['Kiện tụng'],
    avoidEn: ['Lawsuits'],
  },
  // 1: Minh Đường (Hoàng đạo)
  1: {
    deityVi: 'Minh Đường',
    deityEn: 'Bright Hall',
    isGood: true,
    suitsVi: ['Gặp quý nhân', 'Cầu tài', 'Hợp tác'],
    suitsEn: ['Networking', 'Financial gains', 'Partnerships'],
    avoidVi: ['Tranh chấp'],
    avoidEn: ['Arguments'],
  },
  // 2: Thiên Hình (Hắc đạo)
  2: {
    deityVi: 'Thiên Hình',
    deityEn: 'Heavenly Punisher',
    isGood: false,
    suitsVi: ['Tu sửa nhỏ', 'Việc thường nhật'],
    suitsEn: ['Routine work', 'Minor repairs'],
    avoidVi: ['Kiện tụng', 'Ký kết mạo hiểm'],
    avoidEn: ['Legal disputes', 'Risky contracts'],
  },
  // 3: Chu Tước (Hắc đạo)
  3: {
    deityVi: 'Chu Tước',
    deityEn: 'Vermilion Bird',
    isGood: false,
    suitsVi: ['Học tập', 'Nghiên cứu độc lập'],
    suitsEn: ['Study', 'Quiet research'],
    avoidVi: ['Tranh luận', 'Ký giấy tờ quan trọng'],
    avoidEn: ['Debates', 'High-stakes paperwork'],
  },
  // 4: Kim Quỹ (Hoàng đạo)
  4: {
    deityVi: 'Kim Quỹ',
    deityEn: 'Golden Treasury',
    isGood: true,
    suitsVi: ['Cầu tài', 'Giao dịch', 'Tích lũy tài sản'],
    suitsEn: ['Commerce', 'Investments', 'Wealth building'],
    avoidVi: ['Cho vay mạo hiểm'],
    avoidEn: ['Unsecured loans'],
  },
  // 5: Thiên Đức (Hoàng đạo)
  5: {
    deityVi: 'Thiên Đức',
    deityEn: 'Heavenly Virtue',
    isGood: true,
    suitsVi: ['Hòa giải', 'Làm từ thiện', 'Ký kết'],
    suitsEn: ['Reconciliation', 'Charity', 'Agreements'],
    avoidVi: ['Nóng nảy'],
    avoidEn: ['Hasty decisions'],
  },
  // 6: Bạch Hổ (Hắc đạo)
  6: {
    deityVi: 'Bạch Hổ',
    deityEn: 'White Tiger',
    isGood: false,
    suitsVi: ['Tập trung nội bộ', 'Dọn dẹp'],
    suitsEn: ['Internal focus', 'Decluttering'],
    avoidVi: ['Xuất hành xa', 'Việc trọng đại'],
    avoidEn: ['Long travel', 'Major commitments'],
  },
  // 7: Ngọc Đường (Hoàng đạo)
  7: {
    deityVi: 'Ngọc Đường',
    deityEn: 'Jade Hall',
    isGood: true,
    suitsVi: ['Khai trương', 'Thi cử', 'Văn thư học vấn'],
    suitsEn: ['Inaugurations', 'Exams', 'Creative work'],
    avoidVi: ['Lười biếng'],
    avoidEn: ['Procrastination'],
  },
  // 8: Thiên Lao (Hắc đạo)
  8: {
    deityVi: 'Thiên Lao',
    deityEn: 'Heavenly Prison',
    isGood: false,
    suitsVi: ['Tổng kết việc cũ', 'Nghỉ ngơi'],
    suitsEn: ['Wrapping up tasks', 'Rest'],
    avoidVi: ['Khởi công dự án mới'],
    avoidEn: ['Launching new projects'],
  },
  // 9: Huyền Vũ (Hắc đạo)
  9: {
    deityVi: 'Huyền Vũ',
    deityEn: 'Dark Warrior',
    isGood: false,
    suitsVi: ['Bảo mật', 'Lập kế hoạch kín'],
    suitsEn: ['Security checks', 'Private planning'],
    avoidVi: ['Giao dịch tài chính lớn'],
    avoidEn: ['Large financial transfers'],
  },
  // 10: Tư Mệnh (Hoàng đạo)
  10: {
    deityVi: 'Tư Mệnh',
    deityEn: 'Commander',
    isGood: true,
    suitsVi: ['Cúng lễ', 'Sức khỏe', 'Việc gia đạo'],
    suitsEn: ['Family wellness', 'Home blessings', 'Daily harmony'],
    avoidVi: ['Thức khuya quá sức'],
    avoidEn: ['Overworking'],
  },
  // 11: Câu Trần (Hắc đạo)
  11: {
    deityVi: 'Câu Trần',
    deityEn: 'Hooked Array',
    isGood: false,
    suitsVi: ['Bảo trì', 'Sắp xếp hồ sơ'],
    suitsEn: ['Maintenance', 'Filing records'],
    avoidVi: ['Động thổ', 'Dời chỗ ở'],
    avoidEn: ['Breaking ground', 'Moving home'],
  },
};

/** Get day guide by deity name (VI or EN) */
export function getDayGuideByName(deityName: string): DayGuide | null {
  if (!deityName) return null;
  const lower = deityName.trim().toLowerCase();
  for (const guide of Object.values(DAY_GUIDES)) {
    if (guide.deityVi.toLowerCase() === lower || guide.deityEn.toLowerCase() === lower) {
      return guide;
    }
  }
  return null;
}

/** Formatted text for good days chips */
export function formatDaySummary(
  guide: DayGuide | null,
  locale: 'vi' | 'en' = 'vi',
): { suitable: string; avoid: string } {
  if (!guide) {
    return { suitable: '', avoid: '' };
  }
  const en = locale === 'en';
  return {
    suitable: (en ? guide.suitsEn : guide.suitsVi).join(' · '),
    avoid: (en ? guide.avoidEn : guide.avoidVi).join(' · '),
  };
}
