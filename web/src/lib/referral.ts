/** First valid referral persists for seven days; OAuth gets only the stored code. */
export function storedReferral():string {
 try {
  const {ref,exp}=JSON.parse(localStorage.getItem('astrox_ref')||'null')||{};
  return typeof ref==='string'&&/^[A-Z0-9]{4,10}$/.test(ref)&&Number.isFinite(exp)&&exp>Date.now()?ref:'';
 } catch{return '';}
}
export function captureReferral(){
 try {
  const url=new URL(window.location.href),ref=url.searchParams.get('ref');
  if(!ref||!/^[A-Z0-9]{4,10}$/.test(ref))return;
  if(!storedReferral())localStorage.setItem('astrox_ref',JSON.stringify({ref,exp:Date.now()+7*86400000}));
  url.searchParams.delete('ref');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 }catch{/* Storage restrictions must not block login. */}
}
