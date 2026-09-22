import { useId, type CSSProperties } from "react";
import styles from "./DivinationTube.module.css";

/** Layered lacquer illustration: sticks pass behind the front lip, never through the body. */
export function DivinationTube({shaking=false,revealed=0,numbers=[0,0,0]}:{shaking?:boolean;revealed?:number;numbers?:[number,number,number]}) {
 const id=useId().replace(/:/g,"");
 return <div className={styles.scene} data-shaking={shaking} aria-hidden="true">
  <svg className={styles.art} viewBox="0 0 360 460" fill="none">
   <defs>
    <linearGradient id={`${id}jade`} x1="100" y1="250" x2="268" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#0c302b"/><stop offset=".22" stopColor="#24584a"/><stop offset=".45" stopColor="#3d7260"/><stop offset=".7" stopColor="#214e40"/><stop offset="1" stopColor="#0d332d"/></linearGradient>
    <linearGradient id={`${id}gold`} x1="105" y1="0" x2="256" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#9b7948"/><stop offset=".4" stopColor="#f0dba1"/><stop offset=".65" stopColor="#c6a666"/><stop offset="1" stopColor="#8b693b"/></linearGradient>
    <linearGradient id={`${id}bamboo`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#ad864b"/><stop offset=".3" stopColor="#f5dfab"/><stop offset=".65" stopColor="#e6c687"/><stop offset="1" stopColor="#b08a4d"/></linearGradient>
    <radialGradient id={`${id}glow`}><stop stopColor="#e2d2a3" stopOpacity=".36"/><stop offset="1" stopColor="#e2d2a3" stopOpacity="0"/></radialGradient>
    <radialGradient id={`${id}shadow`}><stop stopColor="#1a392e" stopOpacity=".24"/><stop offset="1" stopColor="#1a392e" stopOpacity="0"/></radialGradient>
   </defs>
   <circle cx="180" cy="245" r="152" fill={`url(#${id}glow)`}/>
   <g className={styles.orbit} stroke="#a38c59" strokeWidth=".6"><circle cx="180" cy="245" r="136" opacity=".18"/><circle cx="180" cy="245" r="147" opacity=".12" strokeDasharray="1 9"/><path d="m180 92 3 6-3 6-3-6Zm0 294 3 6-3 6-3-6Z" fill="#b59b61" opacity=".5"/></g>
   <ellipse className={styles.shadow} cx="180" cy="405" rx="105" ry="20" fill={`url(#${id}shadow)`}/>
   <g className={styles.vessel}>
    <ellipse cx="180" cy="220" rx="77" ry="23" fill={`url(#${id}gold)`}/>
    <ellipse cx="180" cy="219" rx="69" ry="17" fill="#102d26"/>
    {Array.from({length:13},(_,i)=><g key={i} transform={`rotate(${(i-6)*2.3} ${136+i*7} 285)`}>
     <g className={styles.stick} style={{"--i":i} as CSSProperties}><rect x={131+i*7} y={124+(i*13)%24} width="10" height="185" rx="5" fill={`url(#${id}bamboo)`} stroke="#a5834a" strokeWidth=".6"/><path d={`M${135+i*7} ${150+(i*13)%24}v65`} stroke="#98703d" opacity=".3"/><path d={`M${133+i*7} ${134+(i*13)%24}h6`} stroke="#9b523c" strokeWidth="2" opacity=".7"/></g>
    </g>)}
    {revealed>0&&<g key={revealed} className={styles.flying} style={{"--direction":revealed===2?1:-1} as CSSProperties}>
     <rect x="171" y="128" width="18" height="169" rx="8" fill={`url(#${id}bamboo)`} stroke="#b59150"/>
     <rect x="175" y="144" width="10" height="33" rx="3" stroke="#a65e43" strokeWidth=".8"/>
     <text x="180" y="161" textAnchor="middle" dominantBaseline="middle" fill="#87543a" fontFamily="serif" fontSize="7">{numbers[revealed-1]}</text>
     <path d="M180 189v72" stroke="#a27d40" strokeWidth=".65" opacity=".45"/>
    </g>}
    <path d="M103 221C122 246 239 246 257 221L244 374C240 407 121 407 116 374Z" fill={`url(#${id}jade)`} stroke="#173c30"/>
    <path d="M112 238 123 371C124 383 139 388 153 390" stroke="#7eaa84" strokeWidth="2" opacity=".21"/>
    <path d="M108 250C141 270 220 270 252 250M109 256C141 276 220 276 251 256M116 366C144 388 217 388 245 366M117 373C146 396 215 396 244 373" stroke={`url(#${id}gold)`} strokeWidth="2"/>
    {Array.from({length:17},(_,i)=><path key={i} d={`m${115+i*8} ${259+Math.sin(i/16*Math.PI)*13} 2 3-2 3-2-3Z`} fill={`url(#${id}gold)`} opacity=".65"/>)}
    <circle cx="180" cy="320" r="29" stroke={`url(#${id}gold)`} strokeWidth="1.5"/><circle cx="180" cy="320" r="24" stroke={`url(#${id}gold)`} strokeWidth=".6" opacity=".6"/>
    <g stroke={`url(#${id}gold)`} strokeWidth="2.4" strokeLinecap="round">{[0,1,2,3,4,5].map(i=><path key={i} d={i%2?`M166 ${305+i*6}h10m8 0h10`:`M166 ${305+i*6}h28`}/>)}</g>
    <path d="M103 220C113 249 247 249 257 220" stroke={`url(#${id}gold)`} strokeWidth="5"/>
    <path d="M107 222C135 243 226 243 253 222" stroke="#fff1c6" strokeWidth="1" opacity=".65"/>
   </g>
  </svg>
 </div>;
}
