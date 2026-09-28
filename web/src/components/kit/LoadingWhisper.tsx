'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import { useEffect, useState } from 'react';
import styles from './LoadingWhisper.module.css';

export type LoadingKind =
  | 'tuvi'
  | 'period'
  | 'tarot'
  | 'zodiac'
  | 'battu'
  | 'numerology'
  | 'compat'
  | 'kinhdich'
  | 'shuffle'
  | 'cast'
  | 'packages'
  | 'payment'
  | 'general';
const MESSAGES: Record<LoadingKind, readonly string[]> = {
  tuvi: [
    'Đang chiêm nghiệm lá số…',
    'Đang đối chiếu các cung…',
    'Đang lần theo nhịp vận trình…',
    'AstroX đang kết nối những dấu mốc…',
    'Đang chắt lọc lời nhắn dành cho bạn…',
  ],
  period: [
    'Đang đối chiếu nhịp vận trình…',
    'Đang chiêm nghiệm những chuyển động mới…',
    'AstroX đang kết nối các mốc thời gian…',
    'Đang chắt lọc gợi ý cho chặng tới…',
  ],
  tarot: [
    'Đang chiêm nghiệm từng lá bài…',
    'Đang phân tích biểu tượng trên lá…',
    'Đang kết nối câu chuyện của trải bài…',
    'AstroX đang soi chiếu câu hỏi của bạn…',
    'Đang chắt lọc thông điệp từ những lá bài…',
  ],
  zodiac: [
    'Đang đối chiếu vị trí các hành tinh…',
    'Đang lần theo những góc chiếu…',
    'Đang chiêm nghiệm bản đồ sao…',
    'AstroX đang kết nối những dấu ấn bầu trời…',
    'Đang chắt lọc nhịp điệu dành cho bạn…',
  ],
  battu: [
    'Đang đối chiếu thiên can, địa chi…',
    'Đang chiêm nghiệm tứ trụ…',
    'Đang xem sự cân bằng ngũ hành…',
    'AstroX đang lần theo dòng đại vận…',
    'Đang kết nối những nét riêng trong mệnh bàn…',
  ],
  numerology: [
    'Đang khám phá nhịp điệu những con số…',
    'Đang đối chiếu ngày sinh và họ tên…',
    'Đang chiêm nghiệm con số chủ đạo…',
    'AstroX đang kết nối những dấu ấn cá nhân…',
    'Đang chắt lọc thông điệp cho hành trình của bạn…',
  ],
  compat: [
    'Đang đối chiếu hai cung hoàng đạo…',
    'Đang tìm những điểm đồng điệu…',
    'Đang chiêm nghiệm những khác biệt…',
    'AstroX đang kết nối hai câu chuyện…',
    'Đang chắt lọc gợi ý để thấu hiểu nhau…',
  ],
  kinhdich: [
    'Đang chiêm nghiệm ý quẻ…',
    'Đang đối chiếu từng hào…',
    'Đang lần theo sự chuyển biến của quẻ…',
    'AstroX đang soi chiếu điều bạn hỏi…',
    'Đang chắt lọc lời gợi mở từ quẻ…',
  ],
  shuffle: ['Đang xào những lá bài…', 'Đang mở một khoảng lặng…', 'AstroX đang chuẩn bị bàn trải…'],
  cast: ['Đang lắng lại cùng câu hỏi…', 'Đang xóc nhẹ những que tre…', 'Đang đón lời gợi mở từ quẻ…'],
  packages: ['Đang lấy danh sách gói nạp…', 'AstroX đang chuẩn bị các lựa chọn…', 'Đang sắp xếp thông tin gói nạp…'],
  payment: ['Đang lấy thông tin thanh toán…', 'AstroX đang chuẩn bị nội dung…', 'Đang chờ thông tin được cập nhật…'],
  general: ['AstroX đang chuẩn bị nội dung…', 'Đang kết nối hành trình của bạn…', 'Đang sắp xếp những điều sắp mở…'],
};

const MESSAGES_EN: Record<LoadingKind, readonly string[]> = {
  tuvi: [
    'Reflecting on your chart…',
    'Comparing the palaces…',
    'Following your fortune cycles…',
    'Connecting the turning points…',
    'Preparing insights for you…',
  ],
  period: [
    'Comparing your current cycles…',
    'Exploring new movements…',
    'Connecting the timelines…',
    'Preparing guidance for what comes next…',
  ],
  tarot: [
    'Reflecting on each card…',
    'Exploring the symbols…',
    'Connecting the story of your spread…',
    'Considering your question…',
    'Bringing the cards’ messages together…',
  ],
  zodiac: [
    'Comparing planetary positions…',
    'Tracing the aspects…',
    'Reflecting on your natal chart…',
    'Connecting the patterns in the sky…',
    'Preparing your insights…',
  ],
  battu: [
    'Comparing stems and branches…',
    'Reflecting on the four pillars…',
    'Examining the five-element balance…',
    'Following the luck cycles…',
    'Connecting the patterns in your chart…',
  ],
  numerology: [
    'Exploring your numbers…',
    'Comparing your name and birth date…',
    'Reflecting on your life path…',
    'Connecting your personal patterns…',
    'Preparing insights for your journey…',
  ],
  compat: [
    'Comparing the two charts…',
    'Exploring shared strengths…',
    'Considering your differences…',
    'Finding ways to understand each other…',
  ],
  kinhdich: [
    'Reflecting on your hexagram…',
    'Examining the changing lines…',
    'Connecting the symbols and your question…',
  ],
  shuffle: ['Shuffling the cards…', 'Preparing your spread…', 'Drawing your cards…'],
  cast: ['Casting your hexagram…', 'Following the changing lines…', 'Preparing your result…'],
  packages: ['Loading available packages…', 'Preparing your choices…', 'Checking package details…'],
  payment: ['Loading payment details…', 'Preparing your checkout…', 'Waiting for an update…'],
  general: ['Preparing your content…', 'Connecting your journey…', 'Getting things ready…'],
};

/** Visual phrases cycle without repeatedly interrupting screen-reader users. */
export function LoadingWhisper({ kind = 'general', className = '' }: { kind?: LoadingKind; className?: string }) {
  const en = useLocale().locale === 'en';
  const messages = en ? MESSAGES_EN : MESSAGES;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep(value => value + 1), 2800);
    return () => clearInterval(timer);
  }, [kind]);
  return (
    <span className={`${styles.whisper} ${className}`} data-loading-whisper={kind}>
      <span className="sr-only">
        {en ? 'AstroX is preparing your content.' : 'AstroX đang chuẩn bị nội dung cho bạn.'}
      </span>
      <span key={`${kind}-${step}`} className={styles.phrase} aria-hidden="true">
        <i />
        {messages[kind][step % messages[kind].length]}
      </span>
    </span>
  );
}
