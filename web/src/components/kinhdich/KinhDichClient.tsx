"use client";
import { useEffect, useState } from "react";
import { ReadingQuestion } from "@/components/kit/ReadingQuestion";
import { trackFeature } from "@/lib/feature-telemetry";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { KdAiPanel } from "./KdAiPanel";
import { KdHistory } from "./KdHistory";
import { KdResultPanel } from "./KdResultPanel";
import { DivinationTube } from "./DivinationTube";
import { KD_METHODS, KD_RULES, castHexagram, castCoins, castDigits, castTime, coinValue, throwCoins, normalizeDigits, createKdHistory, replayKdHistory, readKdHistory, pushKdHistory, removeKdHistory } from "@/lib/kinhdich";
import type { CastResult, KdHistoryEntry, KdMethod } from "@/lib/kinhdich";
import styles from "./KinhDich.module.css";

export function KinhDichClient() {
  const [question,setQuestion]=useState("");
  const [method,setMethod]=useState<KdMethod>("coins");
  const [cast,setCast]=useState<CastResult|null>(null);
  const [history,setHistory]=useState<KdHistoryEntry[]>([]);
  const [readingId,setReadingId]=useState("");
  const [error,setError]=useState("");
  const [numbers,setNumbers]=useState(["","",""]);
  const [digits,setDigits]=useState("");
  const [values,setValues]=useState<number[]>([]);
  const [faces,setFaces]=useState<number[][]>([]);
  const [manual,setManual]=useState(false);
  const [manualValues,setManualValues]=useState(["","","","","",""]);
  useEffect(()=>{const t=setTimeout(()=>setHistory(readKdHistory()),0);return()=>clearTimeout(t);},[]);
  const preview=(()=>{if(!["serial","phone","digits"].includes(method)||!digits)return "";try{return normalizeDigits(method as "serial"|"phone"|"digits",digits);}catch{return "";}})();
  function finish(result:CastResult){const entry=createKdHistory(result,question.trim());setCast(result);setReadingId(entry.id!);setHistory(pushKdHistory(entry));setError("");trackFeature("result_view","kinhdich","calculation");window.scrollTo({top:0,behavior:"instant"});}
  function submit(){try{if(method==="coins")finish(castCoins(manual?manualValues.map(Number):values,manual?undefined:faces));else if(method==="numbers"){const n=numbers.map(Number);if(!n.every(x=>Number.isSafeInteger(x)&&x>=1&&x<=999))throw new Error("Nhập ba số nguyên từ 1 đến 999.");finish(castHexagram(n[0],n[1],n[2]));}else if(method==="time")finish(castTime(new Date().toISOString()));else finish(castDigits(method,digits));}catch(e){setError(e instanceof Error?e.message:"Không lập được quẻ.");}}
  function reset(){setCast(null);setValues([]);setFaces([]);setManualValues(["","","","","",""]);setError("");}
  return <section className={styles.page}>
    <h1 className="sr-only">Kinh Dịch</h1>
    {!cast?<div className={styles.setup}>
      <div className={styles.intro}><span className={styles.eyebrow}>KINH DỊCH</span><h2>Một câu hỏi.<br/>Nhiều cách tìm lời đáp.</h2>
        {method === "coins" ? <div className={styles.coinScene}>
          <div className={styles.threeCoins} aria-label={faces.length && !manual ? "Ba mặt xu của lần gieo gần nhất" : "Ba đồng xu"}>
            {[0,1,2].map(i => {
              const face = !manual ? faces.at(-1)?.[i] : undefined;
              return <div key={i} className={styles.goldCoin} data-face={face === undefined ? "ready" : face ? "heads" : "tails"}>
                <span className={styles.coinHole} aria-hidden="true"/>
                <span className={styles.coinFaceLabel}>{face === undefined ? "Đồng xu" : face ? "Ngửa" : "Sấp"}</span>
                <span className={styles.coinFaceValue}>{face === undefined ? i+1 : face ? 3 : 2}</span>
              </div>;
            })}
          </div>
          <p>{faces.length && !manual ? `Lần gieo ${faces.length} · tổng ${values.at(-1)}` : "Ngửa = 3 · Sấp = 2"}</p>
        </div> : <DivinationTube/>}</div>
      <div className={styles.inputPanel}>
        <label htmlFor="kd-method">Cách lập quẻ</label>
        <select id="kd-method" className={styles.methodSelect} value={method} onChange={e=>{setMethod(e.target.value as KdMethod);setError("");setDigits("");}}>{Object.entries(KD_METHODS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
        <p className={styles.rules}>{KD_RULES[method]}</p>
        <label htmlFor="kd-question">Điều bạn đang băn khoăn <span>Tùy chọn</span></label>
        <textarea id="kd-question" rows={2} maxLength={200} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Viết điều bạn muốn hỏi…"/>
        {method==="coins"&&<div className={styles.coinSetup}>
          <label className={styles.checkLabel}><input type="checkbox" checked={manual} onChange={e=>setManual(e.target.checked)}/> Nhập kết quả gieo xu thật</label>
          {manual?<div className={styles.coinGrid}>{manualValues.map((v,i)=><label key={i}>Hào {i+1} {i===0?"(dưới)":i===5?"(trên)":""}<select aria-label={`Giá trị hào ${i+1}`} value={v} onChange={e=>setManualValues(a=>a.map((x,j)=>j===i?e.target.value:x))}><option value="">Chọn</option>{[6,7,8,9].map(x=><option key={x} value={x}>{x} · {x===6?"Âm động":x===7?"Dương tĩnh":x===8?"Âm tĩnh":"Dương động"}</option>)}</select></label>)}</div>:<>
            <ol className={styles.coinThrows} aria-live="polite">{values.map((v,i)=><li key={i}><span>Hào {i+1}</span><span>{faces[i].map(f=>f?"Ngửa":"Sấp").join(" · ")}</span><b>{v}{v===6||v===9?" · động":""}</b></li>)}</ol>
            <p role="status">Đã gieo {values.length}/6 hào · từ dưới lên</p>
            {values.length<6&&<button className={styles.primary} onClick={()=>{const f=throwCoins();setFaces(a=>[...a,f]);setValues(a=>[...a,coinValue(f)]);}}>Gieo lần {values.length+1} <span>↗</span></button>}
            {values.length>0&&<button className={styles.manualToggle} onClick={()=>{setValues([]);setFaces([]);}}>Hủy và gieo lại</button>}
          </>}
        </div>}
        {method==="numbers"&&<div className={styles.numberInputs}>{numbers.map((v,i)=><label key={i}>Số {i+1}<input aria-label={`Số ${i+1}`} type="number" min={1} max={999} value={v} onChange={e=>setNumbers(a=>a.map((x,j)=>j===i?e.target.value:x))}/></label>)}</div>}
        {["serial","phone","digits"].includes(method)&&<div className={styles.digitInput}><label htmlFor="kd-digits">{KD_METHODS[method]}</label><input id="kd-digits" value={digits} maxLength={48} autoComplete="off" inputMode={method==="serial"?"text":"tel"} onChange={e=>setDigits(e.target.value)} placeholder={method==="serial"?"AB00123456":method==="phone"?"0912 345 678":"001234"}/>{preview&&<p>Chuỗi dùng để lập quẻ: <strong>{preview}</strong></p>}</div>}
        {method==="time"&&<p className={styles.rules}>Thời điểm được chốt khi bạn bấm lập quẻ và lưu cùng kết quả.</p>}
        {error&&<p role="alert" className={styles.formError}>{error}</p>}
        <button className={styles.primary} onClick={submit} disabled={method==="coins"&&(manual?manualValues.some(v=>!v):values.length!==6)}>Lập quẻ <span>↗</span></button>
      </div>
    </div>:<div className={styles.result}><header className={styles.resultHeader}><button onClick={reset} aria-label="Lập quẻ khác">←</button><div><h2>Quẻ của bạn</h2></div><FeatureIcon name="kinhdich" size={28}/></header><ReadingQuestion>{question}</ReadingQuestion><KdResultPanel result={cast}/><div className={styles.ai}><KdAiPanel key={readingId} result={cast} question={question} onReset={reset}/></div></div>}
    <KdHistory entries={history} onSelect={entry=>{try{setCast(replayKdHistory(entry));setQuestion(entry.question);setReadingId(entry.id||String(entry.savedAt));setError("");window.scrollTo({top:0,behavior:"instant"});}catch{setError("Bản lưu này không hợp lệ.");}}} onRemove={savedAt=>setHistory(removeKdHistory(savedAt))}/>
  </section>;
}
