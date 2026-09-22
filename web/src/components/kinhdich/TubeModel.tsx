"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./KinhDich.module.css";

export function TubeModel({shaking,revealed,numbers,fallback}:{shaking:boolean;revealed:number;numbers:number[];fallback:React.ReactNode}) {
 const host=useRef<HTMLDivElement>(null);
 const live=useRef({shaking,revealed,numbers});
 const [ready,setReady]=useState(false);
 useEffect(()=>{live.current={shaking,revealed,numbers};},[shaking,revealed,numbers]);
 useEffect(()=>{
  let disposed=false; let cleanup=()=>{};
  void import("three").then(async T=>{
   if(disposed||!host.current)return;
   const el=host.current;
   let renderer:InstanceType<typeof T.WebGLRenderer>;
   try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});} catch {return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,2));
   renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
   const scene=new T.Scene();
   const {RoomEnvironment}=await import("three/examples/jsm/environments/RoomEnvironment.js");
   if(disposed){renderer.dispose();return;}
   const environmentRoom=new RoomEnvironment();
   const pmrem=new T.PMREMGenerator(renderer);
   const environment=pmrem.fromScene(environmentRoom,.06);
   scene.environment=environment.texture;scene.environmentIntensity=.65;
   environmentRoom.dispose();pmrem.dispose();
   const camera=new T.PerspectiveCamera(35,1,.1,50);
   const ritual=Boolean(el.closest("dialog"));
   camera.position.set(0,ritual?2.25:1.8,ritual?5.8:3.9);camera.lookAt(0,ritual?.8:.3,0);
   scene.add(new T.HemisphereLight(0xfff7df,0x525a52,1.6));
   const key=new T.DirectionalLight(0xfff2d4,2.4);key.position.set(-3,5,4);scene.add(key);
   const rimLight=new T.DirectionalLight(0xc9e6db,2);rimLight.position.set(3,3,-2);scene.add(rimLight);
   const model=new T.Group();scene.add(model);
   const jade=new T.MeshPhysicalMaterial({color:0x244b40,roughness:.38,metalness:.08,clearcoat:.4,clearcoatRoughness:.32,side:T.DoubleSide});
   const gold=new T.MeshStandardMaterial({color:0xbfa77b,metalness:.72,roughness:.4});
   const points=[[0,-.85],[.39,-.85],[.46,-.83],[.49,-.79],[.505,-.7],[.545,.62],[.552,.69],[.544,.735],[.525,.752],[.49,.752],[.475,.73],[.472,.69],[.439,-.62],[.40,-.69],[0,-.69]].map(([x,y])=>new T.Vector2(x,y));
   model.add(new T.Mesh(new T.LatheGeometry(points,64),jade));
   for(const y of [.72,-.66,-.73]){const ring=new T.Mesh(new T.TorusGeometry(y>0?.51:.48,.022,10,64),gold);ring.rotation.x=Math.PI/2;ring.position.y=y;model.add(ring);}
   // Engraved collars and narrow lacquer ribs follow the cylinder's surface.
   const darkJade=new T.MeshStandardMaterial({color:0x234338,roughness:.5,metalness:.12});
   for(const [y,radius] of [[.57,.543],[-.61,.505]]){
    const collar=new T.Mesh(new T.CylinderGeometry(radius+.006,radius+.006,.085,96,1,true),darkJade);
    collar.position.y=y;model.add(collar);
    for(const offset of [-.046,.046]){
     const edge=new T.Mesh(new T.TorusGeometry(radius+.008,.007,6,96),gold);
     edge.rotation.x=Math.PI/2;edge.position.y=y+offset;model.add(edge);
    }
    for(let i=0;i<48;i++){
     const a=i*Math.PI/24;
     const mark=new T.Mesh(new T.BoxGeometry(.012,.025,.008),gold);
     mark.position.set(Math.sin(a)*(radius+.01),y,Math.cos(a)*(radius+.01));mark.rotation.y=a;mark.rotation.z=Math.PI/4;model.add(mark);
    }
   }
   for(let i=0;i<32;i++){
    const a=i*Math.PI/16;
    // Keep the front clear around the medallion.
    if(Math.cos(a)>.85)continue;
    const rib=new T.Mesh(new T.CylinderGeometry(.003,.003,1.02,5),darkJade);
    rib.position.set(Math.sin(a)*.523,-.01,Math.cos(a)*.523);rib.rotation.z=-Math.sin(a)*.025;rib.rotation.x=Math.cos(a)*.025;model.add(rib);
   }
   // A separate inset medallion keeps the engraving above the curved body.
   const medallion=new T.Mesh(new T.CylinderGeometry(.205,.205,.025,64),gold);
   medallion.rotation.x=Math.PI/2;medallion.position.set(0,-.02,.543);model.add(medallion);
   const inset=new T.Mesh(new T.CircleGeometry(.18,64),jade);inset.position.set(0,-.02,.558);model.add(inset);
   for(let i=0;i<6;i++){for(const x of i%2 ? [-.052,.052] : [0]){const line=new T.Mesh(new T.BoxGeometry(i%2?.076:.18,.014,.009),gold);line.position.set(x,.085-i*.042,.568);model.add(line);}}
   const bambooTextures: InstanceType<typeof T.CanvasTexture>[]=[];
   const bambooMaterial=(index:number,label?:number)=>{
    const canvas=document.createElement("canvas");canvas.width=128;canvas.height=1024;
    const paint=canvas.getContext("2d")!;
    const wash=paint.createLinearGradient(0,0,128,0);
    wash.addColorStop(0,"#97703d");wash.addColorStop(.15,"#c39b61");wash.addColorStop(.55,"#d8b57b");wash.addColorStop(1,"#ac814a");
    paint.fillStyle=wash;paint.fillRect(0,0,128,1024);
    for(let n=0;n<34;n++){
     const x=(n*37+index*11)%128;
     paint.strokeStyle=n%3===0?"#76582c30":"#ffe1a52b";paint.lineWidth=n%3===0?1.3:.7;
     paint.beginPath();paint.moveTo(x,0);paint.bezierCurveTo(x+5,340,x-3,720,x+2,1024);paint.stroke();
    }
    // A restrained ink stamp below the rounded end, rather than a glued-on block.
    paint.strokeStyle="#3d5945";paint.lineWidth=3;paint.strokeRect(37,95,54,108);
    paint.fillStyle="#3d5945";paint.textAlign="center";paint.font="32px serif";
    paint.fillText(String(label??index+1),64,163);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;bambooTextures.push(texture);
    return new T.MeshStandardMaterial({map:texture,roughness:.88,metalness:0,envMapIntensity:.25});
   };
   const stickMaterials=[0,1,2,3,4].map(i=>bambooMaterial(i));
   const makeStick=(length:number,width:number,material:InstanceType<typeof T.MeshStandardMaterial>)=>{
    const shape=new T.Shape();const r=width/2;
    shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,length-r);
    shape.absarc(0,length-r,r,0,Math.PI,false);shape.lineTo(-r,0);
    const geometry=new T.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.003,bevelThickness:.003,curveSegments:10});
    const position=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let n=0;n<position.count;n++)uv.setXY(n,(position.getX(n)+r)/width,position.getY(n)/length);
    const stick=new T.Group();stick.add(new T.Mesh(geometry,material));return stick;
   };
   const sticks:InstanceType<typeof T.Group>[]=[];
   for(let i=0;i<21;i++){
    const row=Math.floor(i/7),column=i%7-3;
    const length=1.68+row*.065+Math.sin(i*2.4)*.045;
    const stick=makeStick(length,.091,stickMaterials[i%5]);
    stick.position.set(column*.079,-.55,(row-1)*.17);
    stick.rotation.set((row-1)*.065,column*.065+Math.sin(i)*.09,-column*.028);
    model.add(stick);sticks.push(stick);
   }
   const flyers=[0,1,2].map(i=>{
    const g=makeStick(1.35,.16,bambooMaterial(i,live.current.numbers[i]));
    g.children[0].position.y=-.675;g.visible=false;model.add(g);return {g,start:0};
   });
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
   const ctx=shadowCanvas.getContext('2d')!;const grad=ctx.createRadialGradient(64,64,4,64,64,64);grad.addColorStop(0,'rgba(25,48,33,.25)');grad.addColorStop(.4,'rgba(25,48,33,.12)');grad.addColorStop(.75,'rgba(25,48,33,.025)');grad.addColorStop(1,'rgba(25,48,33,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
   const shadowTexture=new T.CanvasTexture(shadowCanvas);
   const shadow=new T.Mesh(new T.PlaneGeometry(2.25,1.35),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.88;scene.add(shadow);
   let pointer=0,visible=true,last=0,shakeStrength=0; const start=performance.now();
   const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='reduced';
   const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
   const observer=new ResizeObserver(resize);observer.observe(el);
   const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(el);
   const move=(e:PointerEvent)=>{if(reduced())return;const rect=el.getBoundingClientRect();pointer=((e.clientX-rect.left)/rect.width-.5)*.8;};const leave=()=>{pointer=0;};
   el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
   el.appendChild(renderer.domElement);resize();setReady(true);
   renderer.setAnimationLoop((now)=>{
    if(!visible||document.hidden||now-last<15)return;last=now;const t=(now-start)/1000,off=reduced(),state=live.current;
    model.rotation.y+=(pointer+.22-model.rotation.y)*.12;
    const cycle=t%1.25;
    const pulse=cycle<.85 ? Math.sin(Math.PI*Math.min(1,cycle/.85)) : .1;
    shakeStrength+=((state.shaking&&!off?pulse:0)-shakeStrength)*.16;
    model.rotation.z=Math.sin(t*18)*.105*shakeStrength;
    model.position.y=Math.sin(t*36)*.025*shakeStrength;
    sticks.forEach((stick,i)=>{stick.position.y=-.55+(state.shaking&&!off ? Math.sin(t*18+i*.6)*.025*shakeStrength : 0);});
    flyers.forEach((f,i)=>{
     if(state.revealed!==i+1){f.g.visible=false;if(state.revealed===0)f.start=0;return;}
     if(!f.start)f.start=now;
     const u=off?1:Math.min(1,(now-f.start)/1000);
     f.g.visible=u<1;
     // The stick's half-length is .675; the rim is at y=.752.
     // First lift vertically at the centre of the mouth until its bottom clears the rim.
     const lift=Math.min(1,u/.48);
     const rise=lift*lift*(3-2*lift);
     const flight=Math.max(0,(u-.48)/.52);
     const ease=flight*flight*(3-2*flight);
     f.g.position.set((i-1)*.7*ease,.48+1.02*rise+.35*Math.sin(Math.PI*flight)-.4*ease,.55*ease);
     f.g.rotation.set(-.08*ease,Math.sin(flight*Math.PI)*.35,(i-1)*.12*ease);
     f.g.scale.setScalar(1-.85*Math.pow(Math.max(0,(u-.75)/.25),2));
    });
    renderer.render(scene,camera);
   });
   cleanup=()=>{renderer.setAnimationLoop(null);observer.disconnect();intersection.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});bambooTextures.forEach(texture=>texture.dispose());shadowTexture.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{});
  return ()=>{disposed=true;cleanup();};
 },[]);
 return <div className={styles.modelHost} ref={host} data-model-ready={ready}>{!ready&&<div className={styles.modelFallback}>{fallback}</div>}</div>;
}
