const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const centerOf=points=>({x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
export const placeOnPath=(points,position)=>{const c=centerOf(points);return points.map(p=>({x:p.x+position.x-c.x,y:p.y+position.y-c.y}));};
export function bezier(a,b,t){
  const u=1-t;
  return {x:u*u*u*a.x+3*u*u*t*a.out.x+3*u*t*t*b.in.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*a.out.y+3*u*t*t*b.in.y+t*t*t*b.y};
}
// Adaptive arc-length lookup; positions are evaluated on the cubic, not its polyline.
export function measurePath(nodes){
  const samples=[];let length=0;
  for(let segment=0;segment<nodes.length-1;segment++){
    const a=nodes[segment],b=nodes[segment+1];let previous={x:a.x,y:a.y};
    samples.push({segment,t:0,length});
    function subdivide(t0,p0,t1,p1,depth){
      const tm=(t0+t1)/2,pm=bezier(a,b,tm),q1=bezier(a,b,(t0+tm)/2),q3=bezier(a,b,(tm+t1)/2);
      const polygon=distance(p0,q1)+distance(q1,pm)+distance(pm,q3)+distance(q3,p1);
      if(depth<10&&(polygon-distance(p0,p1)>.01||polygon>4)){subdivide(t0,p0,tm,pm,depth+1);subdivide(tm,pm,t1,p1,depth+1);}
      else{length+=distance(previous,p1);samples.push({segment,t:t1,length});previous=p1;}
    }
    subdivide(0,previous,1,{x:b.x,y:b.y},0);
  }
  return {nodes,samples,length};
}
export function pointOnPath(path,distance){
  if(!path.samples.length)return null;
  const d=Math.max(0,Math.min(path.length,distance));let lo=0,hi=path.samples.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(path.samples[mid].length<d)lo=mid+1;else hi=mid;}
  const b=path.samples[lo],a=path.samples[Math.max(0,lo-1)],span=b.length-a.length;
  const t=span>0?(a.segment===b.segment?a.t:0)+(b.t-(a.segment===b.segment?a.t:0))*(d-a.length)/span:b.t;
  return bezier(path.nodes[b.segment],path.nodes[b.segment+1],t);
}
export function parseGuide(guide){
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=20000&&Math.abs(p.y)<=20000;
  if(!guide||typeof guide.enabled!=='boolean'||!Array.isArray(guide.nodes)||guide.nodes.length>256||guide.nodes.some(n=>!point(n)||!point(n.in)||!point(n.out)))throw new Error('The project contains an invalid guide path.');
  return {enabled:guide.enabled,nodes:guide.nodes.map(n=>({x:n.x,y:n.y,in:{x:n.in.x,y:n.in.y},out:{x:n.out.x,y:n.out.y}}))};
}
