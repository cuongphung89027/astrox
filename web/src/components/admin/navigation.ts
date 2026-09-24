import type { InsightView } from "./AdminInsights";

export type View = InsightView | "setup"
  | "prompts"
  | "apis"
  | "overview"
  | "providers"
  | "aiMetrics"
  | "billing"
  | "services"
  | "payos"
  | "zalo"
  | "walletbackend"
  | "rewards"
  | "content"
  | "operations"
  | "access"
  | "users"
  | "wallet"
  | "reports"
  | "clientErrors"
  | "diagnostics"
  | "audit";
export const insightViews: View[] = ['overview','usage','growth','finance','attention','support'];
export const configViews: View[] = ['setup','services','prompts','apis','providers','content','billing','payos','zalo','rewards','walletbackend','operations','access'];
export const navigation: [View, string, string, string][] = [
 ['overview','Tổng quan','◈','TỔNG QUAN'],['attention','Việc cần xử lý','⚑','TỔNG QUAN'],
 ['usage','Sử dụng tính năng','↗','NGƯỜI DÙNG & SỬ DỤNG'],['support','Hỗ trợ người dùng','◎','NGƯỜI DÙNG & SỬ DỤNG'],['users','Danh sách tài khoản','☷','NGƯỜI DÙNG & SỬ DỤNG'],
 ['finance','Tài chính & Point','◇','POINT & TĂNG TRƯỞNG'],['growth','Điểm danh & tăng trưởng','☀','POINT & TĂNG TRƯỞNG'],['wallet','Ví & giao dịch','▱','POINT & TĂNG TRƯỞNG'],['billing','Gói nạp & ưu đãi','◇','POINT & TĂNG TRƯỞNG'],['rewards','Cài đặt phần thưởng','☀','POINT & TĂNG TRƯỞNG'],['payos','Thanh toán PayOS','⇄','POINT & TĂNG TRƯỞNG'],
 ['services','Dịch vụ & giá','☷','DỊCH VỤ & AI'],['prompts','Kho prompt','▤','DỊCH VỤ & AI'],['providers','Cài đặt AI','✧','DỊCH VỤ & AI'],['aiMetrics','Thống kê AI','↗','DỊCH VỤ & AI'],
 ['setup','Trạng thái cấu hình','◈','VẬN HÀNH & CÀI ĐẶT'],['apis','Cài đặt API','⇄','VẬN HÀNH & CÀI ĐẶT'],['content','Nội dung & thông báo','▤','VẬN HÀNH & CÀI ĐẶT'],['zalo','Đăng nhập Zalo','⇥','VẬN HÀNH & CÀI ĐẶT'],['diagnostics','Chẩn đoán đăng nhập','⚑','VẬN HÀNH & CÀI ĐẶT'],['clientErrors','Lỗi giao diện','⚑','VẬN HÀNH & CÀI ĐẶT'],['reports','Báo cáo','↗','VẬN HÀNH & CÀI ĐẶT'],['walletbackend','Kết nối backend ví','⇄','VẬN HÀNH & CÀI ĐẶT'],['operations','Vận hành','⚙','VẬN HÀNH & CÀI ĐẶT'],['access','Phân quyền','⌘','VẬN HÀNH & CÀI ĐẶT'],['audit','Nhật ký & phiên bản','◷','VẬN HÀNH & CÀI ĐẶT'],
];
