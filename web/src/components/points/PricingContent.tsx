"use client";
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { serviceTree, bundleDefinitions, type ServiceNode } from '../../../../services/admin/service-tree';
import type { UnlockSettings } from '../../../../services/admin/service-pricing';
type Price={id:string;module:string;name:string;status:string;points:number;policy:string};
type Package={id:string;name:string;amountVnd:number;points:number;total?:number};
type Billing={services:Price[];packages:Package[];enabled:boolean;unlocks?:UnlockSettings};
export function PricingContent(){
 const [data,setData]=useState<Billing|null>(null),[error,setError]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch('/api/site-config',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!d.config?.billing)throw Error();setData(d.config.billing);}).catch(()=>{if(!c.signal.aborted)setError(true);});return()=>c.abort();},[]);
 if(error)return <p role="alert" className="mt-8">Chưa tải được bảng giá. Vui lòng thử lại sau; chưa có giao dịch nào được tạo.</p>;
 if(!data)return <p role="status" className="mt-8">Đang tải giá hiện hành…</p>;
 const price=(p:Price)=>p.status==='free'?'Miễn phí':p.status==='paid'&&data.enabled?`${p.points.toLocaleString('vi-VN')} Point`:'Tạm ngưng';
 const scope=(p:Price)=>!data.unlocks?.enabled||p.policy==='session'?'Mỗi lượt':p.policy==='period'?'Mỗi kỳ':'Theo hồ sơ';
 const active=(id:string)=>data.services.some(s=>s.id===id&&['paid','free'].includes(s.status));
 const row=(node:ServiceNode,depth:number):ReactNode=>{
  const bundle=data.unlocks?.enabled&&data.enabled?data.unlocks.bundles.find(b=>b.id===node.id&&b.enabled):null;
  const def=bundleDefinitions().find(b=>b.id===node.id),showBundle=bundle&&def&&active(def.module)&&def.members.every(active);
  return <div key={node.id} className={depth===1?'mt-6 rounded-2xl border border-[#d3d9c5] p-5':'mt-4 border-t border-[#e5e6db] pt-4'}>
   {depth===1?<h2 className="font-display text-2xl">{node.name}</h2>:node.children.length>0||node.serviceIds.length>1?<h3 className="font-semibold">{node.name}</h3>:null}
   {showBundle&&<div className="mt-3 rounded-xl bg-[#edf0e2] p-4 text-sm"><strong>{def.name} · {bundle.points.toLocaleString('vi-VN')} Point</strong><p className="mt-1">{def.members.length} phần theo hồ sơ. Dự báo theo kỳ mua riêng.</p></div>}
   {depth!==1&&node.serviceIds.map(id=>{const p=data.services.find(s=>s.id===id)!;return <div key={id} className="flex items-start justify-between gap-4 py-2 text-sm"><span>{p.name}<small className="mt-1 block opacity-70">{scope(p)}</small></span><strong className="shrink-0">{active(p.module)?price(p):'Tạm ngưng'}</strong></div>;})}
   {node.children.map(n=>row(n,depth+1))}</div>;
 };
 return <>{data.unlocks?.enabled&&<p className="mt-6 text-sm leading-7">Mua từng phần hoặc mở cả gói. Khi nâng cấp, khấu trừ {data.unlocks.credit.numerator}/{data.unlocks.credit.denominator} số Point thực trả đủ điều kiện trong cùng gói và hồ sơ. Giá cuối cùng được hiển thị trước khi xác nhận.</p>}
  {serviceTree(data.services).filter(n=>n.children.length).map(n=>row(n,1))}
  <h2 className="mt-10 font-display text-2xl">Gói nạp Point</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{data.packages.map(p=><div key={p.id} className="rounded-2xl border border-[#d3d9c5] p-5"><strong>{p.total??p.points} Point</strong><p className="mt-2">{p.amountVnd.toLocaleString('vi-VN')}đ</p></div>)}</div><p className="mt-6 text-sm">Đăng nhập bằng Zalo để nạp Point. <Link className="underline" href="/hoso?section=points">Mở ví Point ↗</Link></p><Link className="mt-4 block text-sm underline" href="/dieukhoan">Điều khoản, hoàn Point và liên hệ hỗ trợ</Link>
 </>;
}
