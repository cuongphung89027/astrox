import {json} from './http.mjs';

// Browser navigations need a way out. API callers retain the original JSON contract.
export function loginFailure(env,request,data,status){
 if(!request.headers.get('accept')?.includes('text/html'))return json(env,request,data,status);
 const expired=['invalid_oauth_state','invalid_or_expired_state'].includes(data.error);
 const title=expired?'Phiên đăng nhập đã hết hạn':'Chưa thể đăng nhập Zalo';
 const message=expired?'Bắt đầu lại để tiếp tục.':'Kết nối xác minh với Zalo đang gặp lỗi. Bạn có thể thử lại sau.';
 const nonce=crypto.randomUUID();
 return new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · AstroX</title><style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#f6f7ed;color:#214d42;font:16px/1.65 system-ui,sans-serif}main{width:100%;max-width:440px;padding:36px;border:1px solid #d9dece;border-radius:24px;background:#fffdf7}small{letter-spacing:.18em}h1{font:500 32px/1.25 Georgia,serif;margin:24px 0 16px}p{color:#59635a;margin:0 0 28px}nav{display:flex;gap:12px;flex-wrap:wrap}a{padding:12px 18px;min-height:48px;border-radius:12px;color:inherit;text-decoration:none;border:1px solid #c9d3c3}a:first-child{background:#214d42;color:#fff}a:focus-visible{outline:3px solid #ad9b68;outline-offset:4px}@media(max-width:400px){main{padding:26px}h1{font-size:28px}}</style></head><body><main><small>ASTROX</small><h1>${title}</h1><p>${message}</p><nav aria-label="Tiếp tục"><a href="/auth/zalo/login">Thử lại</a><a href="https://theastrox.space/">Về AstroX</a></nav></main></body></html>`,{status,headers:{
  'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff','x-frame-options':'DENY',
  'content-security-policy':`default-src 'none'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  'set-cookie':'astrox_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/auth/zalo; Max-Age=0',
 }});
}
