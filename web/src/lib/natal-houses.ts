/** Placidus: trisect the diurnal/nocturnal semi-arcs along the ecliptic. */
export function placidusCusps(ramc: number, latitude: number, obliquity: number): number[] {
  const rad = Math.PI / 180;
  const norm = (v:number) => (v % 360 + 360) % 360;
  const mc = norm(Math.atan2(Math.sin(ramc*rad),Math.cos(ramc*rad)*Math.cos(obliquity*rad))/rad);
  const asc = norm(Math.atan2(-Math.cos(ramc*rad),Math.sin(ramc*rad)*Math.cos(obliquity*rad)+Math.tan(latitude*rad)*Math.sin(obliquity*rad))/rad + 180);
  const cusp = (fraction:number, lower:boolean) => {
    let longitude = norm(mc + (lower ? 180-90*fraction : 90*fraction));
    for(let i=0;i<100;i++) {
      const dec = Math.asin(Math.sin(obliquity*rad)*Math.sin(longitude*rad));
      const horizon = -Math.tan(latitude*rad)*Math.tan(dec);
      if(Math.abs(horizon)>=1) throw new Error("Không tính được Placidus tại vĩ độ này.");
      const semiArc = Math.acos(horizon)/rad;
      const ra = ramc + (lower ? 180 - fraction*(180-semiArc) : fraction*semiArc);
      const next = norm(Math.atan2(Math.sin(ra*rad),Math.cos(ra*rad)*Math.cos(obliquity*rad))/rad);
      if(Math.abs(norm(next-longitude+180)-180)<1e-10) return next;
      longitude=next;
    }
    throw new Error("Phép tính Placidus không hội tụ.");
  };
  const h11=cusp(1/3,false), h12=cusp(2/3,false), h2=cusp(2/3,true), h3=cusp(1/3,true);
  return [asc,h2,h3,norm(mc+180),norm(h11+180),norm(h12+180),norm(asc+180),norm(h2+180),norm(h3+180),mc,h11,h12];
}
