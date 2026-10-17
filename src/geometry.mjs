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
  return turns.every(t=>t>=0) || turns.every(t=>t<=0);
}
export function cameraPoint(p, videoWidth, videoHeight) {
  const scale = Math.max(WIDTH/videoWidth, HEIGHT/videoHeight);
  return { x: WIDTH-(p.x*videoWidth*scale-(videoWidth*scale-WIDTH)/2), y:p.y*videoHeight*scale-(videoHeight*scale-HEIGHT)/2 };
}
export function demoQuad(x,y,angle=0,size=1) {
  return [{x:-105,y:-75},{x:112,y:-52},{x:80,y:85},{x:-88,y:54}].map(p=>({x:x+size*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:y+size*(p.x*Math.sin(angle)+p.y*Math.cos(angle))}));
}
/** @param {any[]} planes @param {string | null} background */
export function svgDocument(planes, background=null) {
  const polygon = p => `<polygon points="${p.points.map(q=>`${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}" fill="${p.style.fill ? p.style.color : 'none'}" fill-opacity="${p.style.opacity}" stroke="${p.style.edge}" stroke-width="${p.style.width}" stroke-linejoin="round"/>`;
  const groups = new Map();
  for(const p of planes) { if(!groups.has(p.stroke)) groups.set(p.stroke,[]); groups.get(p.stroke).push(p); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><title>Plane studio drawing</title>${background?`<rect width="100%" height="100%" fill="${background}"/>`:''}${[...groups].map(([id,ps])=>`<g id="stroke-${id}">${ps.map(polygon).join('')}</g>`).join('')}</svg>`;
}
export function parseProject(text) {
  const data=JSON.parse(text);
  const color = v=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
  if(data.version!==1 || data.width!==WIDTH || data.height!==HEIGHT || !Array.isArray(data.planes) || data.planes.length>LIMIT) throw new Error('This is not a supported Plane project.');
  return data.planes.map(p=>{
    if(!p || !Array.isArray(p.points) || !validQuad(p.points) || p.points.some(q=>Math.abs(q.x)>20000 || Math.abs(q.y)>20000) || !Number.isSafeInteger(p.stroke) || p.stroke<0 || !p.style || !color(p.style.color) || !color(p.style.edge) || typeof p.style.fill!=='boolean' || !Number.isFinite(p.style.opacity) || p.style.opacity<0 || p.style.opacity>1 || !Number.isFinite(p.style.width) || p.style.width<0 || p.style.width>10) throw new Error('The project contains invalid plane data.');
    return {stroke:p.stroke,points:p.points.map(q=>({x:q.x,y:q.y})),style:{color:p.style.color,edge:p.style.edge,fill:p.style.fill,opacity:p.style.opacity,width:p.style.width}};
  });
}
