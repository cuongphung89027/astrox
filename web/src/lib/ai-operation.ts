"use client";
const KEY="astrox_pending_ai_v1";
let memory:Record<string,string>={};
function pending(){try{const value=JSON.parse(sessionStorage.getItem(KEY)||"{}");if(value&&typeof value==="object"&&!Array.isArray(value))memory=value;}catch{}return memory;}
function persist(){try{sessionStorage.setItem(KEY,JSON.stringify(memory));}catch{/* In-memory retry protection remains available. */}}
export async function pendingAiOperation(userId:string,body:Record<string,unknown>){
 const payload={...body};delete payload.operationId;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([userId,payload])));
 const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 const entries=pending();
 if(typeof entries[key]!=="string"){
  // Refuse to forget unresolved operations: evicting one could charge its retry again.
  if(Object.keys(entries).length>=100)throw new Error("Có nhiều lượt chưa xác nhận kết quả. Vui lòng thử lại lượt cũ hoặc liên hệ hỗ trợ.");
  entries[key]=crypto.randomUUID();persist();
 }
 return {key,id:entries[key]};
}
export function finishAiOperation(key:string){pending();delete memory[key];persist();}
