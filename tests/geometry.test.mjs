import test from 'node:test';
import assert from 'node:assert/strict';
import {validQuad,movement,contains,cameraPoint,demoQuad,svgDocument,parseProject} from '../src/geometry.mjs';
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
  const data={version:1,width:1200,height:800,planes:[plane]};assert.deepEqual(parseProject(JSON.stringify(data)),[plane]);
  assert.throws(()=>parseProject(JSON.stringify({...data,planes:[{...plane,style:{...plane.style,color:'"><script/>'}}]})));
  assert.throws(()=>parseProject(JSON.stringify({...data,planes:Array(6001).fill(plane)})));
  assert.throws(()=>parseProject(JSON.stringify({...data,version:2})));
});
