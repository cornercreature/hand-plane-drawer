// Shared, plane-aligned lighting for Canvas and vector exports.
export function materialGradient(points,color,material){
  if(!material||material==='flat')return null;
  const mix=(amount)=>'#'+color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*(1-Math.abs(amount))+(amount>0?255*amount:0)).toString(16).padStart(2,'0')).join('');
  const stops=material==='matte'?[[0,.12],[.55,0],[1,-.18]]:[[0,-.4],[.32,.12],[.46,.8],[.53,.95],[.6,-.25],[1,.25]];
  return {from:points[0],to:points[2],stops:stops.map(([offset,light])=>({offset,color:mix(light)}))};
}
