"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {registerReadingConsent,type ReadingQuote} from '@/lib/reading-consent';
export function PaidReadingConsent(){
 const dialog=useRef<HTMLDialogElement>(null),finish=useRef<((ok:boolean)=>void)|null>(null);
 const [quote,setQuote]=useState<ReadingQuote|null>(null);
 const decide=(ok:boolean)=>{finish.current?.(ok);finish.current=null;setQuote(null);};
 useEffect(()=>{const unregister=registerReadingConsent((q,signal)=>new Promise(resolve=>{
  if(finish.current||signal?.aborted){resolve(false);return;}
  const cancel=()=>{finish.current?.(false);finish.current=null;setQuote(null);};
  finish.current=ok=>{signal?.removeEventListener('abort',cancel);resolve(ok);};signal?.addEventListener('abort',cancel,{once:true});setQuote(q);
 }));return()=>{unregister();finish.current?.(false);};},[]);
 useEffect(()=>{if(quote)dialog.current?.showModal();else dialog.current?.close();},[quote]);
 return <dialog ref={dialog} onCancel={e=>{e.preventDefault();decide(false);}} aria-labelledby="paid-reading-title" className="m-auto w-[calc(100%-32px)] max-w-md rounded-3xl border border-[#ccd5bf] bg-[#fffaf0] p-7 text-[#244d40] backdrop:bg-black/35">
  <h2 id="paid-reading-title" className="font-display text-2xl">Xác nhận lượt luận giải</h2>
  <p className="mt-3 text-sm">{quote?.name}</p><p className="my-5 text-3xl font-semibold">{quote?.points.toLocaleString('vi-VN')} Point</p>
  <p className="text-sm leading-7">Point được trừ khi bắt đầu. Nếu hệ thống không hoàn thành lượt này, Point sẽ được hoàn lại.</p>
  <Link href="/dieukhoan#dieu-khoan-su-dung" target="_blank" className="mt-3 block text-sm underline">Điều khoản và chính sách hoàn Point</Link>
  <div className="mt-6 flex gap-3"><button onClick={()=>decide(false)} className="min-h-12 flex-1 rounded-xl border border-[#ccd5bf]">Để sau</button><button onClick={()=>decide(true)} className="min-h-12 flex-1 rounded-xl bg-[#244d40] px-3 text-white">Đồng ý · {quote?.points} Point</button></div>
 </dialog>;
}
