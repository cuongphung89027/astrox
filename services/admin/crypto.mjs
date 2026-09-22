const enc=new TextEncoder();
export const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
export const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function encryptionKey(env){const b=unb64(env.ADMIN_ENCRYPTION_KEY||'');if(b.length!==32)throw new Error('Encryption key unavailable');return crypto.subtle.importKey('raw',b,'AES-GCM',false,['encrypt','decrypt']);}
export async function encrypt(env,ref,value){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(ref)},await encryptionKey(env),enc.encode(value));return b64(iv)+'.'+b64(data);}
export async function decrypt(env,ref,value){const[iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:enc.encode(ref)},await encryptionKey(env),unb64(data)));}
export async function sign(env,value){const key=await crypto.subtle.importKey('raw',unb64(env.ADMIN_ENCRYPTION_KEY||''),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
export async function equal(a,b){const hash=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v)));const[x,y]=await Promise.all([hash(a),hash(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
export async function token(env,payload){const data=b64(enc.encode(JSON.stringify(payload)));return data+'.'+await sign(env,data);}
export async function untoken(env,value){try{const[data,sig]=value.split('.');if(!await equal(sig,await sign(env,data)))return null;const p=JSON.parse(new TextDecoder().decode(unb64(data)));return p.exp>Date.now()?p:null}catch{return null}}
