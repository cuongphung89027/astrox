import { StructuredReading } from "./StructuredReading";
import styles from "./ReadingState.module.css";

export function SavedReading({text, periodic = false}: {text:string; periodic?:boolean}) {
  return <div><div className={styles.saved}><span aria-hidden="true">✓</span><span>Đã lưu kết quả</span><small>{periodic ? "Theo kỳ đã chọn" : "Xem lại bất cứ lúc nào"}</small></div><StructuredReading text={text} /></div>;
}

export function ReadingInvitation({label, onRun}: {label:string; onRun:()=>void}) {
  return <div className={styles.invitation}><div><span>CHƯA CÓ KẾT QUẢ</span><p>Khám phá khi bạn sẵn sàng</p></div><button onClick={onRun}>{label}<span aria-hidden="true">↗</span></button></div>;
}
