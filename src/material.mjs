// Lift a quadrilateral into a coplanar surface without changing its projection.
export function planeVertices(points,width,height){
  const [a,b,c,d]=points,dx=a.x-b.x+c.x-d.x,dy=a.y-b.y+c.y-d.y;
  const ax=b.x-c.x,ay=b.y-c.y,bx=d.x-c.x,by=d.y-c.y,det=ax*by-bx*ay;
  const g=Math.abs(det)>1e-8?(dx*by-bx*dy)/det:0,h=Math.abs(det)>1e-8?(ax*dy-dx*ay)/det:0;
  let depths=[1,1+g,1+g+h,1+h];
  if(depths.some(z=>z<.01||!Number.isFinite(z)))depths=[1,1,1,1];
  const mean=depths.reduce((s,z)=>s+z,0)/4;
  return points.map((p,i)=>{const z=depths[i]/mean;return [(p.x-width/2)*z/width,(height/2-p.y)*z/width,-z];});
}
export const materials={flat:{roughness:1,metalness:0},matte:{roughness:.92,metalness:0},satin:{roughness:.42,metalness:0},reflective:{roughness:.12,metalness:0},metallic:{roughness:.2,metalness:1}};
