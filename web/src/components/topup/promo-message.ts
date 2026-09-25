export function promoErrorMessage(error?: string, minimum?: number): string {
  switch (error) {
    case "promo_expired": return "Mã đã hết hạn.";
    case "promo_not_started": return "Mã chưa đến thời gian sử dụng.";
    case "promo_exhausted": return "Mã đã hết tổng lượt sử dụng.";
    case "promo_user_exhausted": return "Bạn đã dùng hết lượt của mã này.";
    case "promo_min_amount": return `Mã yêu cầu nạp tối thiểu ${(minimum ?? 0).toLocaleString("vi-VN")} ₫.`;
    case "promo_disabled": return "Mã hiện không hoạt động.";
    case "promo_wrong_kind": return "Mã này không dùng cho giao dịch nạp Point.";
    case "network": return "Chưa kết nối được. Bạn thử lại nhé.";
    default: return "Mã không hợp lệ. Kiểm tra lại hoặc xóa mã để tiếp tục.";
  }
}
