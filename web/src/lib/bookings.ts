export type Expert = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  active?: number;
};
export type ExpertSlot = {
  id: string;
  expert_id: string;
  starts_at: string;
  ends_at: string;
  price: number;
  active?: number;
};
export type Booking = {
  id: string;
  slot_id: string;
  expert_name: string;
  specialty: string;
  starts_at: string;
  ends_at: string;
  price: number;
  question: string;
  contact: string;
  status: string;
  meeting_url: string;
};
export type BookingData = {
  experts: Expert[];
  slots: ExpertSlot[];
  bookings: Booking[];
};
export const BOOKING_STATUS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  completed: "Đã hoàn thành",
  no_show: "Vắng mặt",
};
export const appointmentTime = (date: string) =>
  new Date(date).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
export const appointmentPrice = (n: number) =>
  n ? `${n.toLocaleString("vi-VN")} ₫` : "Miễn phí";
