"use client";
import {useEffect} from 'react';
export function RuntimeReporting(){
 useEffect(()=>{
  const reported=new Set<string>();
  const report=(kind:string)=>{
   const path=location.pathname,key=path+kind;if(reported.has(key)||reported.size>=12||path.startsWith('/admin'))return;
   reported.add(key);
   void fetch('/api/client-errors',{method:'POST',credentials:'omit',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({path,kind})}).catch(()=>{});
  };
  const error=(event:Event)=>report(event.target!==window?'resource':'runtime');
  const rejected=()=>report('promise');
  window.addEventListener('error',error,true);window.addEventListener('unhandledrejection',rejected);
  return()=>{window.removeEventListener('error',error,true);window.removeEventListener('unhandledrejection',rejected);};
 },[]);
 return null;
}
