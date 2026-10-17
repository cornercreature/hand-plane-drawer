import test from 'node:test';
import assert from 'node:assert/strict';
import {validQuad,movement,contains,cameraPoint,demoQuad,svgDocument,parseProject,stabilizePlane,planeFaces,validSize} from '../src/geometry.mjs';
const points=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
const plane={points,stroke:1,style:{color:'#d6f39a',edge:'#d6f39a',fill:true,opacity:.12,width:1.2}};
test('rejects crossed, collapsed, and nonfinite geometry but accepts rotated planes',()=>{
  assert.equal(validQuad(points),true);
  assert.equal(validQuad([points[0],points[2],points[1],points[3]]),false);
  assert.equal(validQuad(points.map(p=>({...p,y:0}))),false);
  assert.equal(validQuad([{x:NaN,y:0},...points.slice(1)]),false);
  assert.equal(validQuad(demoQuad(600,400,2.7,.8)),true);
});
test('camera coordinates mirror and account for the same cover crop as video',()=>{
  assert.deepEqual(cameraPoint({x:.5,y:.5},1920,1080),{x:600,y:400});
  assert.equal(cameraPoint({x:0,y:0},1200,800).x,1200);
  assert.ok(cameraPoint({x:0,y:0},1920,1080).x>1200);
});
test('spacing responds to rotation and shape changes, not just centroid motion',()=>{
  const rotated=demoQuad(600,400,.2);assert.ok(movement(rotated,demoQuad(600,400,0))>18);
  assert.equal(movement(points,points),0);
});
test('hit testing works with either winding and excludes outside points',()=>{
  assert.equal(contains(points,{x:50,y:50}),true);
  assert.equal(contains([...points].reverse(),{x:50,y:50}),true);
  assert.equal(contains(points,{x:150,y:50}),false);
});
test('SVG preserves independent planes, stroke groups and transparent background',()=>{
  const svg=svgDocument([plane,{...plane,stroke:2}]);assert.equal((svg.match(/<polygon/g)||[]).length,2);
  assert.ok(svg.includes('id="stroke-2"'));assert.ok(!svg.includes('<rect'));
  assert.ok(svgDocument([plane],'#20241e').includes('<rect'));
});
test('project roundtrip and validation reject unsafe style strings and oversized inputs',()=>{
  const data={version:1,width:1200,height:800,planes:[plane]};assert.deepEqual(parseProject(JSON.stringify(data)),{width:1200,height:800,planes:[plane]});
  assert.throws(()=>parseProject(JSON.stringify({...data,planes:[{...plane,style:{...plane.style,color:'"><script/>'}}]})));
  assert.throws(()=>parseProject(JSON.stringify({...data,planes:Array(6001).fill(plane)})));
  assert.throws(()=>parseProject(JSON.stringify({...data,version:2})));
});
test('stabilizer removes shear and preserves a perspective-projected rectangle',()=>{
  const skew=[{x:400,y:300},{x:650,y:300},{x:690,y:500},{x:440,y:500}],fixed=stabilizePlane(skew);
  const u={x:fixed[1].x-fixed[0].x,y:fixed[1].y-fixed[0].y},v={x:fixed[3].x-fixed[0].x,y:fixed[3].y-fixed[0].y};
  assert.ok(Math.abs(u.x*v.x+u.y*v.y)<1e-6);assert.ok(validQuad(fixed));
  const projected=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([s,t])=>({x:600+1200*(s*.2*.8)/(1+s*.2*.6),y:400+1200*t*.15/(1+s*.2*.6)}));
  assert.ok(movement(stabilizePlane(projected),projected)<1e-8);
  assert.ok(movement(stabilizePlane(fixed),fixed)<1e-8);
  assert.deepEqual(stabilizePlane([points[0],points[2],points[1],points[3]]),[points[0],points[2],points[1],points[3]]);
});
test('thickness produces block faces shared by SVG and picking, with legacy thin behavior',()=>{
  assert.equal(planeFaces(plane).length,1);
  const thick={...plane,style:{...plane.style,thickness:30}},faces=planeFaces(thick);
  assert.equal(faces.length,6);assert.equal(Math.hypot(faces[0].points[0].x,faces[0].points[0].y),30);
  assert.ok(faces.some(f=>contains(f.points,{x:110,y:110})));
  assert.equal((svgDocument([thick]).match(/<polygon/g)||[]).length,6);
  const data={version:1,width:1200,height:800,planes:[thick]};assert.deepEqual(parseProject(JSON.stringify(data)),{width:1200,height:800,planes:[thick]});
  for(const thickness of [0,31,null,'30'])assert.throws(()=>parseProject(JSON.stringify({...data,planes:[{...plane,style:{...plane.style,thickness}}]})));
});

test('custom artboards validate sizes and preserve dimensions through project and SVG export',()=>{
  const data={version:1,width:800,height:1200,planes:[plane]};
  assert.deepEqual(parseProject(JSON.stringify(data)),{width:800,height:1200,planes:[plane]});
  assert.ok(svgDocument([plane],null,800,1200).includes('width="800" height="1200" viewBox="0 0 800 1200"'));
  for(const width of [0,63,4097,800.5,'800',null]){assert.equal(validSize(width,800),false);assert.throws(()=>parseProject(JSON.stringify({...data,width})));}
  assert.equal(validSize(64,4096),true);
});
test('custom camera mapping keeps mirrored cover cropping centered for portrait and landscape',()=>{
  for(const [w,h] of [[800,1200],[1920,1080],[1000,1000]]){
    assert.deepEqual(cameraPoint({x:.5,y:.5},1920,1080,w,h),{x:w/2,y:h/2});
    const flat=[{x:w/2-100,y:h/2-100},{x:w/2+100,y:h/2-100},{x:w/2+100,y:h/2+100},{x:w/2-100,y:h/2+100}];
    assert.ok(movement(stabilizePlane(flat,w,h),flat)<1e-8);
  }
});
