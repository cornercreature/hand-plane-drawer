/** Geometry is stored in a fixed 1200 × 800 artboard, independently of display size. */
export const WIDTH = 1200;
export const HEIGHT = 800;
export const LIMIT = 6000;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const movement = (a, b) => Math.max(...a.map((p, i) => distance(p, b[i])));
const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function validQuad(points) {
  if (points.length !== 4 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  // Convex quads only: also excludes bow ties, collinear edges and collapsed pinches.
  const turns = points.map((p,i) => cross(p, points[(i+1)%4], points[(i+2)%4]));
  return (turns.every(t=>t>1) || turns.every(t=>t< -1)) && Math.abs(points.reduce((s,p,i)=>s+p.x*points[(i+1)%4].y-p.y*points[(i+1)%4].x,0))/2 > 100;
}
export function contains(points, p) {
  const turns = points.map((a,i)=>cross(a,points[(i+1)%4],p));
  return turns.some(t=>Math.abs(t)>1e-8) && (turns.every(t=>t>=0) || turns.every(t=>t<=0));
}
export function cameraPoint(p, videoWidth, videoHeight) {
  const scale = Math.max(WIDTH/videoWidth, HEIGHT/videoHeight);
  return { x: WIDTH-(p.x*videoWidth*scale-(videoWidth*scale-WIDTH)/2), y:p.y*videoHeight*scale-(videoHeight*scale-HEIGHT)/2 };
}
export function demoQuad(x,y,angle=0,size=1) {
  return [{x:-105,y:-75},{x:112,y:-52},{x:80,y:85},{x:-88,y:54}].map(p=>({x:x+size*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:y+size*(p.x*Math.sin(angle)+p.y*Math.cos(angle))}));
}
// Fit orthogonal plane axes in camera space, retaining perspective taper and tilt.
export function stabilizePlane(points) {
  if(!validQuad(points)) return points;
  const p=points.map(p=>({x:(p.x-WIDTH/2)/WIDTH,y:(p.y-HEIGHT/2)/WIDTH}));
  const dx=p[0].x-p[1].x+p[2].x-p[3].x,dy=p[0].y-p[1].y+p[2].y-p[3].y;
  const ax=p[1].x-p[2].x,ay=p[1].y-p[2].y,bx=p[3].x-p[2].x,by=p[3].y-p[2].y,det=ax*by-bx*ay;
  if(Math.abs(det)<1e-8) return points;
  const g=(dx*by-bx*dy)/det,h=(ax*dy-dx*ay)/det;
  const u=[p[1].x-p[0].x+g*p[1].x,p[1].y-p[0].y+g*p[1].y,g],v=[p[3].x-p[0].x+h*p[3].x,p[3].y-p[0].y+h*p[3].y,h];
  const lu=Math.hypot(...u),lv=Math.hypot(...v),a=u.map(n=>n/lu),b=v.map(n=>n/lv);
  const sum=a.map((n,i)=>n+b[i]),diff=a.map((n,i)=>n-b[i]),ls=Math.hypot(...sum),ld=Math.hypot(...diff);
  if(Math.min(lu,lv,ls,ld)<1e-6) return points;
  const ru=sum.map((n,i)=>(n/ls+diff[i]/ld)*lu/Math.SQRT2),rv=sum.map((n,i)=>(n/ls-diff[i]/ld)*lv/Math.SQRT2);
  const center=[p[0].x,p[0].y,1].map((n,i)=>n+(u[i]+v[i])/2);
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([s,t])=>center.map((n,i)=>n+(s*ru[i]+t*rv[i])/2));
  if(corners.some(p=>p[2]<.05)) return points;
  const result=corners.map(([x,y,z])=>({x:WIDTH/2+WIDTH*x/z,y:HEIGHT/2+WIDTH*y/z}));
  return validQuad(result)?result:points;
}
// Shared screen-space extrusion keeps preview, exports, and picking identical.
export function planeFaces(plane) {
  const {points,style}=plane,t=style.thickness??1;
  if(t<=1) return [plane];
  const back=points.map(p=>({x:p.x+t*.6,y:p.y+t*.8}));
  const shade=style.color.replace(/[0-9a-f]{2}/gi,c=>Math.round(parseInt(c,16)*.65).toString(16).padStart(2,'0'));
  return [{...plane,points:back},...points.map((p,i)=>({...plane,points:[p,points[(i+1)%4],back[(i+1)%4],back[i]],style:{...style,color:shade}})),plane];
}
/** @param {any[]} planes @param {string | null} background */
export function svgDocument(planes, background=null) {
  const polygon = p => `<polygon points="${p.points.map(q=>`${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}" fill="${p.style.fill ? p.style.color : 'none'}" fill-opacity="${p.style.opacity}" stroke="${p.style.edge}" stroke-width="${p.style.width}" stroke-linejoin="round"/>`;
  const groups = new Map();
  for(const p of planes) { if(!groups.has(p.stroke)) groups.set(p.stroke,[]); groups.get(p.stroke).push(...planeFaces(p)); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><title>Plane studio drawing</title>${background?`<rect width="100%" height="100%" fill="${background}"/>`:''}${[...groups].map(([id,ps])=>`<g id="stroke-${id}">${ps.map(polygon).join('')}</g>`).join('')}</svg>`;
}
export function parseProject(text) {
  const data=JSON.parse(text);
  const color = v=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
  if(data.version!==1 || data.width!==WIDTH || data.height!==HEIGHT || !Array.isArray(data.planes) || data.planes.length>LIMIT) throw new Error('This is not a supported Plane project.');
  return data.planes.map(p=>{
    if(p?.style?.thickness!==undefined && (!Number.isFinite(p.style.thickness)||p.style.thickness<1||p.style.thickness>30)) throw new Error('Plane thickness must be between 1 and 30 px.');
    if(!p || !Array.isArray(p.points) || !validQuad(p.points) || p.points.some(q=>Math.abs(q.x)>20000 || Math.abs(q.y)>20000) || !Number.isSafeInteger(p.stroke) || p.stroke<0 || !p.style || !color(p.style.color) || !color(p.style.edge) || typeof p.style.fill!=='boolean' || !Number.isFinite(p.style.opacity) || p.style.opacity<0 || p.style.opacity>1 || !Number.isFinite(p.style.width) || p.style.width<0 || p.style.width>10) throw new Error('The project contains invalid plane data.');
    return {stroke:p.stroke,points:p.points.map(q=>({x:q.x,y:q.y})),style:{color:p.style.color,edge:p.style.edge,fill:p.style.fill,opacity:p.style.opacity,width:p.style.width,...(p.style.thickness===undefined?{}:{thickness:p.style.thickness})}};
  });
}
