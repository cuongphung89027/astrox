"use client";

type Slot={addService:(service:Publisher)=>Slot};
type AdEvent={slot:Slot;isEmpty?:boolean;makeRewardedVisible?:()=>boolean};
type Listener=(event:AdEvent)=>void|Promise<void>;
type Publisher={addEventListener:(name:string,listener:Listener)=>void;removeEventListener:(name:string,listener:Listener)=>void};
type Gpt={apiReady?:boolean;cmd:{push:(fn:()=>void)=>unknown};enums:{OutOfPageFormat:{REWARDED:unknown}};defineOutOfPageSlot:(unit:string,format:unknown)=>Slot|null;pubads:()=>Publisher;setConfig?:(config:{safeFrame:{forceSafeFrame:boolean}})=>void;enableServices:()=>void;display:(slot:Slot)=>void;destroySlots:(slots:Slot[])=>void};
let loading:Promise<Gpt>|null=null;
function loadGpt():Promise<Gpt>{
 const host=window as Window&{googletag?:Gpt};
 if(host.googletag?.apiReady)return Promise.resolve(host.googletag);
 if(loading)return loading;
 host.googletag=host.googletag||({cmd:[]} as unknown as Gpt);
 loading=new Promise<Gpt>((resolve,reject)=>{
  const script=document.createElement('script');script.async=true;script.src='https://securepubads.g.doubleclick.net/tag/js/gpt.js';script.crossOrigin='anonymous';const nonce=document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;if(nonce)script.nonce=nonce;
  const timer=setTimeout(()=>{script.remove();loading=null;reject(new Error('Không tải được quảng cáo. Vui lòng kiểm tra kết nối hoặc trình chặn quảng cáo.'));},15000);
  script.onload=()=>{clearTimeout(timer);resolve(host.googletag!);};
  script.onerror=()=>{clearTimeout(timer);script.remove();loading=null;reject(new Error('Không tải được mạng quảng cáo.'));};
  document.head.appendChild(script);
 });
 return loading;
}
export async function showRewardedAd(options:{adUnit:string;signal?:AbortSignal;onReady:()=>Promise<void>;onGrant:()=>Promise<number>}):Promise<{rewarded:boolean;points:number}>{
 const sdk=await loadGpt();if(options.signal?.aborted)throw new Error('Đã hủy quảng cáo.');
 return new Promise((resolve,reject)=>{
  let slot:Slot|null=null,pub:Publisher|null=null,done=false,visible=false,readyStarted=false;
  let grant:Promise<number>|null=null;
  const subscriptions:[string,Listener][]=[];
  let timer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);for(const [name,listener] of subscriptions)pub?.removeEventListener(name,listener);if(slot)sdk.destroySlots([slot]);};
  const finish=(error?:Error,points=0,rewarded=false)=>{if(done)return;done=true;cleanup();if(error)reject(error);else resolve({rewarded,points});};
  const abort=()=>finish(new Error('Đã hủy quảng cáo.'));
  options.signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>finish(new Error('Hiện chưa có quảng cáo phù hợp. Hãy thử lại sau.')),25000);
  sdk.cmd.push(()=>{
   if(done)return;
   try{
    slot=sdk.defineOutOfPageSlot(options.adUnit,sdk.enums.OutOfPageFormat.REWARDED);
    if(!slot){finish(new Error('Trình duyệt này chưa hỗ trợ quảng cáo nhận thưởng.'));return;}
    pub=sdk.pubads();slot.addService(pub);
    const listen=(name:string,listener:Listener)=>{subscriptions.push([name,listener]);pub!.addEventListener(name,listener);};
    listen('rewardedSlotReady',async e=>{if(e.slot!==slot||done||readyStarted)return;readyStarted=true;try{await options.onReady();if(done)return;visible=true;clearTimeout(timer);timer=setTimeout(()=>finish(new Error('Phiên quảng cáo đã hết hạn.')),600000);if(!e.makeRewardedVisible?.())finish(new Error('Không mở được quảng cáo.'));}catch(e){finish(e instanceof Error?e:new Error('Chưa xác nhận được phiên quảng cáo.'));}});
    listen('rewardedSlotGranted',e=>{if(e.slot!==slot||done||!visible||grant)return;grant=options.onGrant();void grant.catch(()=>{});});
    listen('rewardedSlotClosed',async e=>{if(e.slot!==slot||done)return;try{if(grant)finish(undefined,await grant,true);else finish();}catch(e){finish(e instanceof Error?e:new Error('Chưa xác nhận được thưởng.'));}});
    listen('slotRenderEnded',e=>{if(e.slot===slot&&e.isEmpty)finish(new Error('Hiện chưa có quảng cáo phù hợp. Hãy thử lại sau.'));});
    sdk.setConfig?.({safeFrame:{forceSafeFrame:true}});sdk.enableServices();sdk.display(slot);
   }catch(e){finish(e instanceof Error?e:new Error('Không mở được quảng cáo.'));}
  });
 });
}
