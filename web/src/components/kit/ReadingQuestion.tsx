import styles from "./ReadingQuestion.module.css";
export function ReadingQuestion({children,label="CÂU HỎI CỦA BẠN"}:{children:string;label?:string}) {
 if(!children.trim())return null;
 return <header className={styles.question}>
  <svg className={styles.ornament} viewBox="0 0 220 220" fill="none" aria-hidden="true" focusable="false">
   <circle cx="110" cy="110" r="99"/><circle cx="110" cy="110" r="86"/><circle cx="110" cy="110" r="66"/>
   <circle cx="110" cy="110" r="92" strokeDasharray="1 7" strokeWidth="2"/>
   {Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30} 110 110)`}><path d="m110 31 5 10-5 10-5-10Z"/><path d="M110 54v8"/></g>)}
   <path d="M110 71c4 24 15 35 39 39-24 4-35 15-39 39-4-24-15-35-39-39 24-4 35-15 39-39Z"/>
  </svg>
  <div className={styles.label}><span className={styles.quote} aria-hidden="true">“</span><span>{label}</span><i aria-hidden="true"/></div>
  <h3>{children}</h3>
  <div className={styles.flourish} aria-hidden="true"><i/><span>✦</span><i/></div>
 </header>;
}
