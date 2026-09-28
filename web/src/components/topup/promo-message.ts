export function promoErrorMessage(error?: string, minimum?: number, locale: 'vi' | 'en' = 'vi'): string {
  if (locale === 'en') {
    const messages: Record<string, string> = {
      promo_expired: 'This code has expired.',
      promo_not_started: 'This code is not active yet.',
      promo_exhausted: 'This code has reached its redemption limit.',
      promo_user_exhausted: 'You have used all your redemptions for this code.',
      promo_disabled: 'This code is currently disabled.',
      promo_wrong_kind: 'This code does not apply to this purchase.',
      network: 'Unable to connect. Please try again.',
    };
    if (error === 'promo_min_amount')
      return `This code requires a purchase of at least ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((minimum ?? 0) / 100)}.`;
    return messages[error ?? ''] ?? 'Invalid code. Check it or remove it to continue.';
  }
  switch (error) {
    case 'promo_expired':
      return 'Mã đã hết hạn.';
    case 'promo_not_started':
      return 'Mã chưa đến thời gian sử dụng.';
    case 'promo_exhausted':
      return 'Mã đã hết tổng lượt sử dụng.';
    case 'promo_user_exhausted':
      return 'Bạn đã dùng hết lượt của mã này.';
    case 'promo_min_amount':
      return `Mã yêu cầu nạp tối thiểu ${(minimum ?? 0).toLocaleString('vi-VN')} ₫.`;
    case 'promo_disabled':
      return 'Mã hiện không hoạt động.';
    case 'promo_wrong_kind':
      return 'Mã này không dùng cho giao dịch nạp Point.';
    case 'network':
      return 'Chưa kết nối được. Bạn thử lại nhé.';
    default:
      return 'Mã không hợp lệ. Kiểm tra lại hoặc xóa mã để tiếp tục.';
  }
}
