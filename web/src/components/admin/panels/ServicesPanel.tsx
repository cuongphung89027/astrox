"use client";
import { useState, type ReactNode } from 'react';
import { Fields, Card, Empty, Chain, optionLabels, fmt, uid, type Spec } from '../ui';
import { MODULES, type ServicePrice } from '../../../../../services/admin/config';
import { SERVICE_CATALOG, addMissingServices } from '../../../../../services/admin/catalog';
import { serviceTree, bundleDefinitions, type ServiceNode } from '../../../../../services/admin/service-tree';
import { defaultUnlockSettings, upgradeQuote } from '../../../../../services/admin/service-pricing';
import type { AdminPanelProps } from '../useAdminApi';
import s from '../AdminDashboard.module.css';
import t from './ServicesPanel.module.css';
const searchText=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
const statuses=['draft','free','paid','maintenance','hidden'];
const definitions=bundleDefinitions();
export function ServicesPanel({config,update}:AdminPanelProps){
 const [module,setModule]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('');
 const [previewPrice,setPreviewPrice]=useState(300),[previewPaid,setPreviewPaid]=useState(90);
 const settings=config.billing.unlocks??defaultUnlockSettings(),rows=config.billing.services,tree=serviceTree(rows);
 const change=(id:string,key:string,value:unknown)=>update(d=>{const row=d.billing.services.find(s=>s.id===id);if(row)Object.assign(row,{[key]:value});});
 const editRow=(row:ServicePrice,isRoot=false)=>{
  const known=SERVICE_CATALOG.some(s=>s.id===row.id);
  const specs:Spec[]=[['name','Tên dịch vụ','text'],['status',isRoot?'Trạng thái bộ môn':'Trạng thái',statuses]];
  if(!isRoot)specs.push(['points','Giá riêng (Point)','number']);
  if(!known&&!isRoot)specs.push(['module','Bộ môn',MODULES.map(m=>m.id)],['policy','Cách tính phí',['profile','session','period']]);
  return <div className={t.editor} key={row.id}><Fields value={row} specs={specs} onChange={(k,v)=>change(row.id,k,v)}/>
   {!isRoot&&<p className={s.help}>{!settings.enabled?'Thu theo lượt AI (chế độ hiện tại).':!known?'Dịch vụ tùy chỉnh tiếp tục thu theo lượt; chưa thuộc gói mở khóa.':row.policy==='session'?'Thu theo lượt. Mỗi lần trải bài/gieo quẻ là một lượt riêng.':row.policy==='period'?'Mở cho kỳ ngày, tuần, tháng hoặc năm hiện tại.':'Mở một lần cho hồ sơ đang xem.'}</p>}
   <details className={t.advanced}><summary>Prompt và cấu hình nâng cao</summary><p className={s.help}>Mã dịch vụ: <code>{row.id}</code></p>
    {isRoot&&<Fields value={row} specs={[["points","Giá gọi mã bộ môn cũ (Point)","number"]]} onChange={(k,v)=>change(row.id,k,v)}/>}
    <Fields value={row} specs={[["prompt","Prompt bổ sung cho dịch vụ","textarea"]]} onChange={(k,v)=>change(row.id,k,v)}/>
    <h3 className={s.subheading}>Fallback riêng</h3><p className={s.help}>Để trống để kế thừa chuỗi fallback chung.</p><Chain config={config} value={row.chain} onChange={v=>change(row.id,'chain',v)}/>
    {!known&&!isRoot&&<button className={s.danger} onClick={()=>update(d=>{d.billing.services=d.billing.services.filter(s=>s.id!==row.id);})}>Xóa dịch vụ tùy chỉnh</button>}
   </details></div>;
 };
 const bundleEditor=(id:string)=>{
  const def=definitions.find(d=>d.id===id);if(!def)return null;
  const price=settings.bundles.find(b=>b.id===id)??{id,enabled:false,points:0};
  const blocked=def.members.filter(id=>{const row=rows.find(s=>s.id===id);return !row||!['free','paid'].includes(row.status);});
  return <div className={t.bundle} aria-label={`Giá gói ${def.name}`}><strong>{def.name}</strong><p>{def.members.length} phần theo hồ sơ · dự báo theo kỳ mua riêng</p>
   <Fields value={price} specs={[["enabled","Bán gói này","boolean"],["points","Giá mở cả gói (Point)","number"]]} onChange={(k,v)=>update(d=>{let entry=d.billing.unlocks.bundles.find(b=>b.id===id);if(!entry){entry={...price};d.billing.unlocks.bundles.push(entry);}Object.assign(entry,{[k]:v});})}/>
   {price.enabled&&(!settings.enabled||blocked.length>0)&&<p className={t.notice}>{!settings.enabled?'Bật cơ chế mở khóa để áp dụng gói này.':`${blocked.length} phần trong gói chưa hoạt động. Gói chỉ được chào bán khi mọi phần sẵn sàng.`}</p>}
  </div>;
 };
 const matches=(node:ServiceNode,path:string):boolean=>{
  const hit=searchText(`${path} ${node.name} ${node.id}`).includes(searchText(query.trim()));
  return node.serviceIds.some(id=>{const row=rows.find(s=>s.id===id)!;return (!status||row.status===status)&&(hit||searchText(row.name+' '+row.id).includes(searchText(query.trim())));})||node.children.some(n=>matches(n,path+' '+node.name));
 };
 const renderNode=(node:ServiceNode,depth:number,path:string):ReactNode=>{
  if(!matches(node,path))return null;
  const root=depth===1,children=node.children.length>0,variants=node.serviceIds.length>1,row=rows.find(s=>s.id===node.serviceIds[0]);
  return <details className={`${t.node} ${root?t.module:''}`} key={`${node.id}-${!!query}-${status}`} open={(root&&node.id==='tuvi')||!!query||!!status} data-depth={depth}>
   <summary><span className={t.marker}>{root?'◈':children?'◇':'·'}</span><strong>{node.name}</strong><span className={t.summaryMeta}>{root?`${rows.filter(s=>s.module===node.id&&s.id!==node.id).length} dịch vụ`:children?`${node.children.length} phần`:variants?`${node.serviceIds.length} kiểu trải bài`:row?`${optionLabels[row.status]} · ${fmt(row.points)} Point`:''}</span></summary>
   <div className={t.contents}>{root&&row&&editRow(row,true)}{bundleEditor(node.id)}
    {!root&&node.serviceIds.map(id=>{const p=rows.find(s=>s.id===id)!;if(status&&p.status!==status)return null;if(variants&&query&&!searchText(path+' '+node.name+' '+p.name+' '+p.id).includes(searchText(query.trim())))return null;return <div key={id} className={variants?t.variant:undefined}>{variants&&<h4>{p.name}</h4>}{editRow(p)}</div>;})}
    {node.children.map(n=>renderNode(n,depth+1,path+' '+node.name))}</div></details>;
 };
 const ratio=settings.credit,validRatio=Number.isSafeInteger(ratio.numerator)&&Number.isSafeInteger(ratio.denominator)&&ratio.numerator>=0&&ratio.denominator>0&&ratio.numerator<=ratio.denominator;
 const preview=validRatio&&Number.isSafeInteger(previewPrice)&&previewPrice>=0&&Number.isSafeInteger(previewPaid)&&previewPaid>=0?upgradeQuote(previewPrice,['a','b'],[{id:'sample',points:previewPaid,members:['a'],status:'succeeded',consumedBy:null,expiresAt:null}],ratio):null;
 return <Card title="Danh mục trải nghiệm" description="Phân nhóm theo chức năng. Đặt giá từng phần, cả nhóm hoặc toàn bộ luận giải của một bộ môn." action={<button className={s.secondary} onClick={()=>update(d=>{d.billing.services.push({id:uid('service'),module:'tuvi',name:'Dịch vụ mới',points:0,status:'draft',policy:'profile',prompt:'',chain:[]});})}>＋ Thêm dịch vụ</button>}>
  <section className={t.rules} aria-label="Cơ chế mở khóa"><h3>Mở từng phần. Nâng cấp khi cần.</h3><p>Khấu trừ từ số Point thực trả cho phần đã mua trong cùng gói và cùng hồ sơ.</p>
   <Fields value={settings} specs={[["enabled","Bật mở khóa theo hồ sơ và kỳ","boolean"]]} onChange={(_,v)=>update(d=>{d.billing.unlocks.enabled=Boolean(v);})}/>
   <div className={t.ratio}><Fields value={ratio} specs={[["numerator","Tử số khấu trừ","number"],["denominator","Mẫu số khấu trừ","number"]]} onChange={(k,v)=>update(d=>{Object.assign(d.billing.unlocks.credit,{[k]:v});})}/><p className={s.help}>Mặc định 2/3. Làm tròn xuống phần khấu trừ; giá phải trả tối thiểu 0 Point. Khoản đã dùng nâng cấp không được khấu trừ lại.</p></div>
   <details className={t.advanced}><summary>Thử tính giá nâng cấp</summary><div className={t.preview}><label>Giá gói lớn<input type="number" min="0" step="1" value={previewPrice} onChange={e=>setPreviewPrice(Number(e.target.value))}/></label><label>Point đã trả đủ điều kiện<input type="number" min="0" step="1" value={previewPaid} onChange={e=>setPreviewPaid(Number(e.target.value))}/></label><output>{preview?`${fmt(previewPrice)} − ${fmt(preview.credit)} = ${fmt(preview.points)} Point`:'Nhập giá và tỷ lệ hợp lệ.'}</output></div></details>
   <p className={s.help}>Áp dụng sau khi lưu và xuất bản. Giao dịch cũ chưa lưu phạm vi hồ sơ không tự chuyển thành quyền mở khóa. Tarot và Kinh Dịch tiếp tục thu theo lượt.</p></section>
  <div className={s.dataToolbar}><label>Tìm dịch vụ<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên bộ môn, nhóm hoặc dịch vụ…"/></label><label>Bộ môn<select value={module} onChange={e=>setModule(e.target.value)}><option value="">Tất cả bộ môn</option>{MODULES.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Trạng thái dịch vụ<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(v=><option key={v} value={v}>{optionLabels[v]}</option>)}</select></label><button className={s.secondary} onClick={()=>update(d=>{d.billing.services=addMissingServices(d.billing.services);})}>Bổ sung danh mục từ web</button></div>
  <p className={s.help} role="status">{SERVICE_CATALOG.length} dịch vụ chi tiết · 7 bộ môn · tối đa 3 lớp</p>
  {tree.filter(n=>!module||n.id===module).map(n=>renderNode(n,1,''))}
  {!tree.some(n=>(!module||n.id===module)&&matches(n,''))&&<Empty>Không có dịch vụ phù hợp. Thử đổi bộ môn, trạng thái hoặc từ khóa.</Empty>}
 </Card>;
}
